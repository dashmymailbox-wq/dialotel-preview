/* compatibilite-amoureuse.js — Logique specifique app compatibilite amoureuse */
;(function () {
  'use strict';

  var app = {
    config: null,
    promptTemplate: '',

    init: function () {
      // Charger config
      this.config = VT.Config.load('vt-config-compat-amour');

      // Charger prompt IA
      var promptEl = document.getElementById('vt-prompt-compat-amour');
      if (promptEl) this.promptTemplate = promptEl.textContent.trim();

      // Initialiser les modules
      VT.Counter.init(this.config.tirageId || 'compat-amour', this.config.counterBase || 4200);
      VT.RateLimiter.init(this.config.rateLimit || {});
      VT.TTS.init(this.config.tts || {});
      VT.Email.init(this.config.emailCapture || {});

      // Charger i18n
      var i18nEl = document.getElementById('vt-amoureuse-i18n');
      if (i18nEl) {
        try { VT.I18n.init(JSON.parse(i18nEl.textContent)); } catch (e) { /* ignore */ }
      }

      // Initialiser le moteur d'etapes
      VT.StepEngine.init('.vt-app', '.vt-step');

      // Initialiser le switch light/dark
      VT.Theme.init();

      // Binder les evenements
      this._bindEvents();

      // Verifier le limiteur
      VT.App.checkRateLimit(this);
    },

    _bindEvents: function () {
      var self = this;

      // Bouton commencer
      VT.on('#vt-amoureuse-btn-start', 'click', function () {
        VT.Analytics.track('vt_tirage_started', { type: 'compatibilite-amoureuse' });
        VT.StepEngine.next();
      });

      // Bouton lancer le tirage
      VT.on('#vt-amoureuse-btn-tirage', 'click', function () {
        self._doTirage();
      });

      // Bouton rejouer
      VT.on('#vt-amoureuse-btn-restart', 'click', function () {
        self._restart();
      });

      // Bouton TTS
      VT.on('.vt-tts-btn', 'click', function () {
        VT.TTS.toggle();
      });

      // Email form submit
      VT.on('#vt-amoureuse-email-form', 'submit', function (e) {
        e.preventDefault();
        VT.App.submitEmail(self);
      });

      // Rate limit email extend
      VT.on('#vt-amoureuse-extend-form', 'submit', function (e) {
        e.preventDefault();
        VT.App.extendRateLimit(self);
      });

      // Bouton "Partager mon score"
      VT.on('#vt-amoureuse-btn-share', 'click', function () { self._shareImage(); });

      // Boutons modale partage
      VT.on('#vt-amoureuse-share-copy-link', 'click', function () { self._copyLink(); });

      // Exposer _shareImage globalement pour le onclick inline du bouton
      window._vtShareImage = function () { self._shareImage(); };
    },

    _doTirage: function () {
      var self = this;
      var tirageId = this.config.tirageId || 'compat-amour';

      // Verifier limite
      if (!VT.RateLimiter.canDoTirage(tirageId)) {
        VT.Analytics.track('vt_rate_limit_hit', { type: 'compatibilite-amoureuse' });
        VT.App.showRateLimitModal();
        return;
      }

      // Recuperer les donnees
      var name1 = VT.$('#vt-amoureuse-name1').value.trim();
      var name2 = VT.$('#vt-amoureuse-name2').value.trim();
      var birth1 = VT.$('#vt-amoureuse-birth1').value;
      var birth2 = VT.$('#vt-amoureuse-birth2').value;

      if (!name1 || !name2) {
        VT.App.showError(this, 'Veuillez entrer les deux prenoms.');
        return;
      }

      var namePattern = /^[a-zA-ZÀ-ÿ\s\-']{1,50}$/;
      if (!namePattern.test(name1) || !namePattern.test(name2)) {
        VT.App.showError(this, 'Les prenoms ne doivent contenir que des lettres (50 caracteres max).');
        return;
      }

      if (birth1 && !/^\d{4}-\d{2}-\d{2}$/.test(birth1)) {
        VT.App.showError(this, 'Format de date invalide.');
        return;
      }
      if (birth2 && !/^\d{4}-\d{2}-\d{2}$/.test(birth2)) {
        VT.App.showError(this, 'Format de date invalide.');
        return;
      }

      // Stocker les noms et calculer les signes astrologiques
      this._name1 = name1;
      this._name2 = name2;
      this._sign1 = birth1 ? this._getZodiacSign(birth1) : null;
      this._sign2 = birth2 ? this._getZodiacSign(birth2) : null;

      // Etape rituelle
      VT.StepEngine.goTo(2);

      // Mettre a jour les noms dans le rituel
      var nameEls = VT.$$('.vt-am-ritual-name');
      if (nameEls[0]) nameEls[0].textContent = name1;
      if (nameEls[1]) nameEls[1].textContent = name2;

      // Mettre a jour les signes astro dans le rituel
      var signEl1 = VT.$('#vt-amoureuse-ritual-sign1');
      var signEl2 = VT.$('#vt-amoureuse-ritual-sign2');
      if (signEl1) signEl1.innerHTML = this._sign1 ? '<div class="vt-sign-badge"><svg><use href="#sign-' + this._sign1.key + '"/></svg></div><span>' + this._sign1.name + '</span>' : '';
      if (signEl2) signEl2.innerHTML = this._sign2 ? '<div class="vt-sign-badge"><svg><use href="#sign-' + this._sign2.key + '"/></svg></div><span>' + this._sign2.name + '</span>' : '';

      // Construire le prompt
      var prompt = this._buildPrompt(name1, name2, birth1, birth2);

      // Appel IA avec delai minimum du rituel (6s)
      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);
      var ritualStart = Date.now();
      var MIN_RITUAL = 6000;

      // Messages de patience cycles pendant l'appel IA
      var _pMsgs = [
        'Les astres analysent votre compatibilite...',
        'L\'energie de l\'amour se concentre...',
        'Les esprits s\'alignent pour vous...',
        'Votre destinee se revele...',
      ];
      var _pIdx = 0;
      var _pEl = VT.$('.vt-am-ritual-text');
      var _pTimer = setInterval(function () {
        _pIdx = (_pIdx + 1) % _pMsgs.length;
        if (_pEl) _pEl.textContent = _pMsgs[_pIdx];
      }, 3000);

      VT.AI.generate(prompt, this.promptTemplate)
        .then(function (response) {
          clearInterval(_pTimer);
          var result = self._parseResponse(response);
          if (result) {
            var elapsed = Date.now() - ritualStart;
            var wait = Math.max(0, MIN_RITUAL - elapsed);
            setTimeout(function () {
              self._showResult(result);
              VT.RateLimiter.recordTirage(tirageId);
              VT.Counter.increment();
              VT.Analytics.track('vt_tirage_completed', { type: 'compatibilite-amoureuse', score: result.score });
            }, wait);
          } else {
            VT.App.showError(self, 'Impossible d\'interpreter le resultat. Reessayez.');
          }
        })
        .catch(function (err) {
          clearInterval(_pTimer);
          console.error('[VT] Erreur IA :', err);
          VT.App.showError(self, 'Nos voyants sont tres sollicites en ce moment. Reessayez dans quelques instants.');
        });
    },

    _buildPrompt: function (name1, name2, birth1, birth2) {
      var parts = [
        'Prenom 1 : ' + name1,
        'Prenom 2 : ' + name2
      ];
      if (birth1) parts.push('Date de naissance 1 : ' + birth1);
      if (birth2) parts.push('Date de naissance 2 : ' + birth2);
      return parts.join('\n');
    },

    _parseResponse: function (response) {
      try {
        // Extraire le JSON de la reponse (au cas ou il y a du texte autour)
        var jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        var data = JSON.parse(jsonMatch[0]);
        if (!data.score || !data.resume) return null;
        return {
          score: Math.min(100, Math.max(1, parseInt(data.score, 10))),
          resume: data.resume || '',
          pointsFort: data.pointsFort || [],
          tensions: data.tensions || [],
          conseil: data.conseil || ''
        };
      } catch (e) {
        console.error('[VT] Parsing resultat :', e);
        return null;
      }
    },

    _showResult: function (result) {
      VT.StepEngine.goTo(3);

      // Header avec noms et signes astrologiques
      var headerEl = VT.$('#vt-amoureuse-result-header');
      if (headerEl) {
        var html = '<div class="vt-result-person">';
        if (this._sign1) html += '<div class="vt-sign-badge vt-sign-badge--result"><svg><use href="#sign-' + this._sign1.key + '"/></svg></div>';
        html += '<span class="vt-result-person-name">' + VT.App.sanitize(this._name1 || '') + '</span></div>';
        html += '<span class="vt-result-person-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>';
        html += '<div class="vt-result-person">';
        if (this._sign2) html += '<div class="vt-sign-badge vt-sign-badge--result"><svg><use href="#sign-' + this._sign2.key + '"/></svg></div>';
        html += '<span class="vt-result-person-name">' + VT.App.sanitize(this._name2 || '') + '</span></div>';
        headerEl.innerHTML = html;
      }

      // Score
      var scoreEl = VT.$('#vt-amoureuse-result-score');
      if (scoreEl) VT.App.animateScore(scoreEl, result.score);

      // Barre
      var barFill = VT.$('.vt-am-score-bar-fill');
      if (barFill) barFill.style.width = result.score + '%';

      // Resume
      var resumeEl = VT.$('#vt-amoureuse-result-resume');
      if (resumeEl) resumeEl.textContent = result.resume;

      // Points forts
      var strengthsEl = VT.$('#vt-amoureuse-result-strengths');
      var self2 = this;
      if (strengthsEl) strengthsEl.innerHTML = result.pointsFort.map(function (p) {
        return '<li>' + self2._sanitize(p) + '</li>';
      }).join('');

      // Tensions
      var tensionsEl = VT.$('#vt-amoureuse-result-tensions');
      if (tensionsEl) tensionsEl.innerHTML = result.tensions.map(function (p) {
        return '<li>' + self2._sanitize(p) + '</li>';
      }).join('');

      // Conseil
      var conseilEl = VT.$('#vt-amoureuse-result-advice');
      if (conseilEl) conseilEl.textContent = result.conseil;

      // TTS
      var ttsText = result.resume + ' ' + result.conseil;
      VT.TTS.speak(ttsText);

      // Email capture (apres delai)
      var self = this;
      var emailConfig = this.config.emailCapture || {};
      if (emailConfig.enabled) {
        setTimeout(function () {
          VT.App.showEmailModal();
          VT.Analytics.track('vt_email_shown');
        }, 3000);
      }
    },

    _getZodiacSign: function (dateStr) {
      if (!dateStr) return null;
      var parts = dateStr.split('-');
      var month = parseInt(parts[1], 10);
      var day = parseInt(parts[2], 10);
      var d = month * 100 + day;

      if (d >= 321 && d <= 419) return { key: 'aries', name: 'Belier' };
      if (d >= 420 && d <= 520) return { key: 'taurus', name: 'Taureau' };
      if (d >= 521 && d <= 620) return { key: 'gemini', name: 'Gemeaux' };
      if (d >= 621 && d <= 722) return { key: 'cancer', name: 'Cancer' };
      if (d >= 723 && d <= 822) return { key: 'leo', name: 'Lion' };
      if (d >= 823 && d <= 922) return { key: 'virgo', name: 'Vierge' };
      if (d >= 923 && d <= 1022) return { key: 'libra', name: 'Balance' };
      if (d >= 1023 && d <= 1121) return { key: 'scorpio', name: 'Scorpion' };
      if (d >= 1122 && d <= 1221) return { key: 'sagittarius', name: 'Sagittaire' };
      if (d >= 1222 || d <= 119) return { key: 'capricorn', name: 'Capricorne' };
      if (d >= 120 && d <= 218) return { key: 'aquarius', name: 'Verseau' };
      return { key: 'pisces', name: 'Poissons' };
    },

    _restart: function () {
      VT.TTS.stop();

      // Reset formulaire
      var inputs = VT.$$('.vt-am-form input');
      inputs.forEach(function (input) { input.value = ''; });

      // Reset resultats
      var scoreEl = VT.$('#vt-amoureuse-result-score');
      if (scoreEl) scoreEl.textContent = '0%';

      var barFill = VT.$('.vt-am-score-bar-fill');
      if (barFill) barFill.style.width = '0%';

      // Reset header
      var headerEl = VT.$('#vt-amoureuse-result-header');
      if (headerEl) headerEl.innerHTML = '';

      // Fermer les modales
      VT.$$('.vt-modal-overlay').forEach(function (m) {
        m.classList.remove('vt-modal--open');
      });

      // Reset email form
      var emailForm = VT.$('#vt-email-form');
      var emailSuccess = VT.$('.vt-email-success');
      if (emailForm) emailForm.classList.remove('vt-hidden');
      if (emailSuccess) emailSuccess.classList.add('vt-hidden');

      VT.App.hideError(this);
      VT.App.checkRateLimit(this);

      // Re-afficher le splash
      var appEl = VT.$('.vt-app');
      var container = VT.$('.vt-container');
      if (appEl && container) {
        var splash = document.createElement('div');
        splash.className = 'vt-splash';
        splash.id = 'vt-amoureuse-splash';
        splash.setAttribute('aria-hidden', 'true');
        splash.innerHTML = '<img class="vt-splash-logo" src="assets/logo-hexagon-voyance.webp" alt="Hexagon Voyance">';
        appEl.insertBefore(splash, appEl.firstChild);
        container.classList.remove('vt-ready');
        container.style.opacity = '0';

        setTimeout(function () {
          splash.classList.add('vt-splash--hiding');
          setTimeout(function () {
            splash.remove();
            container.classList.add('vt-ready');
            container.style.opacity = '';
          }, 600);
        }, 2600);
      }

      VT.StepEngine.goTo(0);
    },

    /* ===== Partage social ===== */

    _getShareData: function () {
      var scoreEl = VT.$('#vt-amoureuse-result-score');
      var score = scoreEl ? scoreEl.textContent.trim() : '';
      var name1 = this._name1 || '';
      var name2 = this._name2 || '';
      var text = name1 + ' + ' + name2 + ' = ' + score + ' de compatibilite !';
      var resumeEl = VT.$('#vt-amoureuse-result-resume');
      var caption = text;
      if (resumeEl && resumeEl.textContent.trim()) {
        caption += '\n' + resumeEl.textContent.trim();
      }
      return { name1: name1, name2: name2, score: score, text: text, caption: caption, url: window.location.href };
    },

    _copyLink: function () {
      var url = window.location.href;
      this._copyToClipboard(url, 'Lien copie !');
    },

    _copyToClipboard: function (text, msg) {
      var self = this;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          self._showToast(msg);
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        self._showToast(msg);
      }
    },

    _showToast: function (msg) {
      var toast = document.getElementById('vt-amoureuse-share-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('vt-share-toast--visible');
      setTimeout(function () { toast.classList.remove('vt-share-toast--visible'); }, 2500);
    },

    _shareImage: function () {
      /* --- Collecte --- */
      var scoreText = (VT.$('#vt-amoureuse-result-score') || {}).textContent || '0%';
      var score   = parseInt(scoreText, 10) || 0;
      var name1 = this._name1 || '', name2 = this._name2 || '';
      var sign1 = this._sign1, sign2 = this._sign2;

      var ZODIAC = {
        aries:'♈', taurus:'♉', gemini:'♊', cancer:'♋', leo:'♌',    virgo:'♍',
        libra:'♎', scorpio:'♏', sagittarius:'♐', capricorn:'♑', aquarius:'♒', pisces:'♓'
      };

      /* Résumé IA du tirage */
      var resumeEl = VT.$('#vt-amoureuse-result-resume');
      var phrase = resumeEl ? resumeEl.textContent.trim() : '';

      /* --- Dimensions 9:16 --- */
      var SC = 2, W = 512, H = 896;

      /* --- Rendu principal --- */
      function doRender(logo) {
        var canvas = document.createElement('canvas');
        canvas.width  = W * SC;
        canvas.height = H * SC;
        var ctx = canvas.getContext('2d');
        ctx.scale(SC, SC);

        /* Fond dégradé radial (identique au thème Dialotel) */
        var bg = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, H*0.85);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.5, '#f8f0ff');
        bg.addColorStop(1, '#f0e6f6');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* Mandala hexagonal en fond */
        ctx.save();
        ctx.globalAlpha = 0.5;
        VT.App.drawMandala(ctx, W, H);
        ctx.globalAlpha = 1;
        ctx.restore();

        /* Voile radial pour adoucir le mandala */
        var veil = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, H*0.65);
        veil.addColorStop(0, 'rgba(255,255,255,0.3)');
        veil.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, W, H);

        /* === LAYOUT DYNAMIQUE — gaps homogènes === */

        /* Dimensions fixes */
        var MARGIN = 30;
        var logoW = 200;
        var logoH = Math.round(logoW * 216 / 636);           // ≈ 68
        var HW = 240, HH = Math.round(HW * 145 / 160);      // ≈ 218
        var BR = 34;
        var urlH = 16;

        /* Hauteur d'un bloc personne (depuis le haut du badge jusqu'au bas du texte) */
        function personH(s) { return BR + (s ? 50 : 24); }   // 84 avec signe, 58 sans

        /* Pré-calcul des lignes de phrase pour connaître sa hauteur */
        ctx.save();
        ctx.font = '16px "Lato", Arial, sans-serif';
        var phraseMaxW = W - 70;
        var pWords = phrase.split(' '), pLine = '', pLines = [];
        pWords.forEach(function (w) {
          var test = pLine + w + ' ';
          if (pLine && ctx.measureText(test).width > phraseMaxW) {
            pLines.push(pLine.trim());
            pLine = w + ' ';
          } else { pLine = test; }
        });
        if (pLine.trim()) pLines.push(pLine.trim());
        ctx.restore();
        var pLineH = 20;
        var phraseH = pLines.length * pLineH;

        /* GAP uniforme entre chaque élément (5 intervalles) */
        var totalContent = logoH + HH + personH(sign1) + phraseH + personH(sign2) + urlH;
        var GAP = Math.max(12, Math.floor((H - MARGIN * 2 - totalContent) / 5));

        /* --- Curseur Y --- */
        var cursorY = MARGIN;

        /* --- 1. Logo --- */
        if (logo) {
          ctx.drawImage(logo, W/2 - logoW/2, cursorY, logoW, logoH);
        } else {
          ctx.save();
          ctx.beginPath();
          var hcx = W/2, hcy = cursorY + logoH / 2, hcr = 28;
          for (var k = 0; k < 6; k++) {
            var ang = Math.PI/180*(60*k-30);
            if (k===0) ctx.moveTo(hcx+hcr*Math.cos(ang), hcy+hcr*Math.sin(ang));
            else        ctx.lineTo(hcx+hcr*Math.cos(ang), hcy+hcr*Math.sin(ang));
          }
          ctx.closePath();
          var hexG = ctx.createLinearGradient(hcx-hcr, hcy-hcr, hcx+hcr, hcy+hcr);
          hexG.addColorStop(0, '#c084fc'); hexG.addColorStop(1, '#7c3aed');
          ctx.fillStyle = hexG; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('HV', hcx, hcy);
          ctx.restore();
        }
        cursorY += logoH + GAP;

        /* --- 2. Cœur central --- */
        var heartTopY = cursorY;

        /* Halo rose */
        var halo = ctx.createRadialGradient(W/2, heartTopY + HH*0.5, 0, W/2, heartTopY + HH*0.5, 170);
        halo.addColorStop(0, 'rgba(237,140,230,0.3)');
        halo.addColorStop(1, 'rgba(237,140,230,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(W/2-170, heartTopY-30, 340, HH+60);

        /* Cœur Path2D */
        ctx.save();
        ctx.translate(W/2 - HW/2, heartTopY);
        ctx.scale(HW/160, HH/145);
        var hPath = new Path2D('M80 140 C80 140 5 95 5 52 C5 25 25 5 50 5 C63 5 74 12 80 24 C86 12 97 5 110 5 C135 5 155 25 155 52 C155 95 80 140 80 140Z');
        var hGrad = ctx.createLinearGradient(0, 0, 0, 145);
        hGrad.addColorStop(0, '#f5a0ef'); hGrad.addColorStop(0.4, '#ed8ce6'); hGrad.addColorStop(1, '#d66bc8');
        ctx.fillStyle = hGrad; ctx.fill(hPath);
        var reflectGrad = ctx.createLinearGradient(30, 0, 130, 60);
        reflectGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
        reflectGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = reflectGrad; ctx.fill(hPath);
        ctx.restore();

        /* Score dans le cœur */
        ctx.save();
        ctx.fillStyle = '#e2ed77'; ctx.font = 'bold 48px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10;
        ctx.fillText(score + '%', W/2, heartTopY + HH * 0.48);
        ctx.shadowBlur = 0;
        ctx.restore();

        /* Sparkles */
        var sparkles = [
          { x: W/2 - 150, y: heartTopY + 40, r: 3.5 },
          { x: W/2 + 145, y: heartTopY + 60, r: 3 },
          { x: W/2 - 130, y: heartTopY + HH - 20, r: 2.5 },
          { x: W/2 + 135, y: heartTopY + HH - 10, r: 3.5 },
          { x: W/2, y: heartTopY - 20, r: 3 },
          { x: W/2 - 85, y: heartTopY - 8, r: 2 },
          { x: W/2 + 90, y: heartTopY + HH + 8, r: 2 }
        ];
        sparkles.forEach(function (sp) {
          var spGrad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
          spGrad.addColorStop(0, 'rgba(226,237,119,0.6)');
          spGrad.addColorStop(1, 'rgba(226,237,119,0)');
          ctx.fillStyle = spGrad;
          ctx.fillRect(sp.x - sp.r*3, sp.y - sp.r*3, sp.r*6, sp.r*6);
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI*2);
          ctx.fillStyle = '#e2ed77'; ctx.fill();
        });

        cursorY += HH + GAP;

        /* --- 3. Personne 1 --- */
        function drawPersonBlock(cx, cy, signData, personName) {
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, BR, 0, Math.PI*2);
          var g = ctx.createRadialGradient(cx, cy-8, 3, cx, cy, BR);
          g.addColorStop(0, '#c084fc'); g.addColorStop(1, '#7c3aed');
          ctx.fillStyle = g; ctx.fill();
          ctx.beginPath(); ctx.arc(cx, cy, BR + 4, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(237,140,230,0.35)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '24px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText((signData && ZODIAC[signData.key]) ? ZODIAC[signData.key] : '★', cx, cy);
          ctx.restore();
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = '#2d1b3d'; ctx.font = 'bold 17px Arial, sans-serif';
          ctx.fillText(personName || '', cx, cy + BR + 12);
          if (signData) {
            ctx.fillStyle = '#a855f7'; ctx.font = '14px Arial, sans-serif';
            ctx.fillText(signData.name, cx, cy + BR + 32);
          }
          ctx.restore();
        }

        drawPersonBlock(W/2, cursorY + BR, sign1, name1);
        cursorY += personH(sign1) + GAP;

        /* --- 4. Résumé --- */
        ctx.save();
        var titleGrad = ctx.createLinearGradient(W/2 - 130, 0, W/2 + 130, 0);
        titleGrad.addColorStop(0, '#c084fc');
        titleGrad.addColorStop(0.5, '#ed8ce6');
        titleGrad.addColorStop(1, '#c084fc');
        ctx.fillStyle = titleGrad;
        ctx.font = '16px "Lato", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        pLines.forEach(function (ln, i) {
          ctx.fillText(ln, W/2, cursorY + i * pLineH);
        });
        ctx.restore();
        cursorY += phraseH + GAP;

        /* --- 5. Personne 2 --- */
        drawPersonBlock(W/2, cursorY + BR, sign2, name2);
        cursorY += personH(sign2) + GAP;

        /* --- 6. Footer URL --- */
        ctx.save();
        ctx.fillStyle = '#a855f7'; ctx.font = '13px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('hexagon-voyance.com', W/2, cursorY);
        ctx.restore();

        /* Affichage dans la modale */
        var dataURL = canvas.toDataURL('image/png');
        var modal   = document.getElementById('vt-amoureuse-share-modal');
        var preview = document.getElementById('vt-amoureuse-share-preview');
        var dlBtn   = document.getElementById('vt-amoureuse-share-download');
        if (!modal) return;
        if (preview) preview.src  = dataURL;
        if (dlBtn)   dlBtn.href   = dataURL;
        modal.style.display = 'flex';

        VT.Analytics.track('vt_share', { platform: 'image', type: 'compatibilite-amoureuse' });
      }

      /* Chargement logo (async) — fallback hexagone si erreur */
      var logoImg = new Image();
      logoImg.onload  = function () { doRender(logoImg); };
      logoImg.onerror = function () { doRender(null); };
      logoImg.src = (app.config && app.config.logoUrl) || '../wordpress/assets/logo-hexagon-voyance.webp';
    }
  };

  // Demarrage au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
