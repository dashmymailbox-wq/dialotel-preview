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
      var i18nEl = document.getElementById('vt-i18n');
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
      this._checkRateLimit();
    },

    _bindEvents: function () {
      var self = this;

      // Bouton commencer
      VT.on('#vt-btn-start', 'click', function () {
        VT.Analytics.track('vt_tirage_started', { type: 'compatibilite-amoureuse' });
        VT.StepEngine.next();
      });

      // Bouton lancer le tirage
      VT.on('#vt-btn-tirage', 'click', function () {
        self._doTirage();
      });

      // Bouton rejouer
      VT.on('#vt-btn-restart', 'click', function () {
        self._restart();
      });

      // Bouton TTS
      VT.on('.vt-tts-btn', 'click', function () {
        VT.TTS.toggle();
      });

      // Email form submit
      VT.on('#vt-email-form', 'submit', function (e) {
        e.preventDefault();
        self._submitEmail();
      });

      // Rate limit email extend
      VT.on('#vt-extend-form', 'submit', function (e) {
        e.preventDefault();
        self._extendRateLimit();
      });

      // Exposer _shareImage globalement pour le onclick inline du bouton
      window._vtShareImage = function () { self._shareImage(); };
    },

    _checkRateLimit: function () {
      var tirageId = this.config.tirageId || 'compat-amour';
      var remaining = VT.RateLimiter.getRemaining(tirageId);
      var infoEl = VT.$('.vt-rate-info');
      if (infoEl && remaining !== Infinity) {
        infoEl.textContent = VT.I18n.t('rateLimiter.remaining', { count: remaining });
      }
    },

    _doTirage: function () {
      var self = this;
      var tirageId = this.config.tirageId || 'compat-amour';

      // Verifier limite
      if (!VT.RateLimiter.canDoTirage(tirageId)) {
        VT.Analytics.track('vt_rate_limit_hit', { type: 'compatibilite-amoureuse' });
        this._showRateLimitModal();
        return;
      }

      // Recuperer les donnees
      var name1 = VT.$('#vt-name1').value.trim();
      var name2 = VT.$('#vt-name2').value.trim();
      var birth1 = VT.$('#vt-birth1').value;
      var birth2 = VT.$('#vt-birth2').value;

      if (!name1 || !name2) {
        this._showError('Veuillez entrer les deux prenoms.');
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
      var signEl1 = VT.$('#vt-ritual-sign1');
      var signEl2 = VT.$('#vt-ritual-sign2');
      if (signEl1) signEl1.innerHTML = this._sign1 ? '<div class="vt-sign-badge"><svg><use href="#sign-' + this._sign1.key + '"/></svg></div><span>' + this._sign1.name + '</span>' : '';
      if (signEl2) signEl2.innerHTML = this._sign2 ? '<div class="vt-sign-badge"><svg><use href="#sign-' + this._sign2.key + '"/></svg></div><span>' + this._sign2.name + '</span>' : '';

      // Construire le prompt
      var prompt = this._buildPrompt(name1, name2, birth1, birth2);

      // Appel IA avec delai minimum du rituel (6s)
      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);
      var ritualStart = Date.now();
      var MIN_RITUAL = 6000;

      VT.AI.generate(prompt, this.promptTemplate)
        .then(function (response) {
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
            self._showError('Impossible d\'interpreter le resultat. Reessayez.');
          }
        })
        .catch(function (err) {
          console.error('[VT] Erreur IA :', err);
          self._showError('Erreur de connexion au service. Verifiez votre cle API ou reessayez.');
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
      var headerEl = VT.$('#vt-result-header');
      if (headerEl) {
        var html = '<div class="vt-result-person">';
        if (this._sign1) html += '<div class="vt-sign-badge vt-sign-badge--result"><svg><use href="#sign-' + this._sign1.key + '"/></svg></div>';
        html += '<span class="vt-result-person-name">' + (this._name1 || '') + '</span></div>';
        html += '<span class="vt-result-person-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>';
        html += '<div class="vt-result-person">';
        if (this._sign2) html += '<div class="vt-sign-badge vt-sign-badge--result"><svg><use href="#sign-' + this._sign2.key + '"/></svg></div>';
        html += '<span class="vt-result-person-name">' + (this._name2 || '') + '</span></div>';
        headerEl.innerHTML = html;
      }

      // Score
      var scoreEl = VT.$('#vt-result-score');
      if (scoreEl) this._animateScore(scoreEl, result.score);

      // Barre
      var barFill = VT.$('.vt-am-score-bar-fill');
      if (barFill) barFill.style.width = result.score + '%';

      // Resume
      var resumeEl = VT.$('#vt-result-resume');
      if (resumeEl) resumeEl.textContent = result.resume;

      // Points forts
      var strengthsEl = VT.$('#vt-result-strengths');
      if (strengthsEl) strengthsEl.innerHTML = result.pointsFort.map(function (p) {
        return '<li>' + p + '</li>';
      }).join('');

      // Tensions
      var tensionsEl = VT.$('#vt-result-tensions');
      if (tensionsEl) tensionsEl.innerHTML = result.tensions.map(function (p) {
        return '<li>' + p + '</li>';
      }).join('');

      // Conseil
      var conseilEl = VT.$('#vt-result-advice');
      if (conseilEl) conseilEl.textContent = result.conseil;

      // TTS
      var ttsText = result.resume + ' ' + result.conseil;
      VT.TTS.speak(ttsText);

      // Email capture (apres delai)
      var self = this;
      var emailConfig = this.config.emailCapture || {};
      if (emailConfig.enabled) {
        setTimeout(function () {
          self._showEmailModal();
          VT.Analytics.track('vt_email_shown');
        }, 3000);
      }
    },

    _animateScore: function (el, target) {
      var start = 0;
      var duration = 1500;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target) + '%';
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    },

    _showError: function (message) {
      // Revenir a l'etape formulaire pour afficher l'erreur
      VT.StepEngine.goTo(1);
      var errorEl = VT.$('#vt-error');
      if (errorEl) {
        errorEl.querySelector('p').textContent = message;
        errorEl.classList.remove('vt-hidden');
      }
    },

    _hideError: function () {
      var errorEl = VT.$('#vt-error');
      if (errorEl) errorEl.classList.add('vt-hidden');
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

    _showRateLimitModal: function () {
      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.add('vt-modal--open');
    },

    _showEmailModal: function () {
      var modal = VT.$('#vt-email-modal');
      if (modal) modal.classList.add('vt-modal--open');
    },

    _submitEmail: function () {
      var email = VT.$('#vt-email-input').value.trim();
      if (!email || !email.includes('@')) return;

      var self = this;
      var emailConfig = this.config.emailCapture || {};

      VT.Email.submit(email)
        .then(function () {
          VT.Analytics.track('vt_email_submitted', { type: 'compatibilite-amoureuse' });
          var formEl = VT.$('#vt-email-form');
          var successEl = VT.$('.vt-email-success');
          if (formEl) formEl.classList.add('vt-hidden');
          if (successEl) successEl.classList.remove('vt-hidden');
        })
        .catch(function () {
          self._showError('Erreur lors de l\'envoi. Reessayez.');
        });
    },

    _extendRateLimit: function () {
      var email = VT.$('#vt-extend-email').value.trim();
      if (!email || !email.includes('@')) return;

      var tirageId = this.config.tirageId || 'compat-amour';
      VT.RateLimiter.extendLimit(tirageId);
      VT.Analytics.track('vt_rate_limit_extended', { type: 'compatibilite-amoureuse' });

      // Fermer la modale et lancer le tirage
      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.remove('vt-modal--open');

      this._doTirage();
    },

    _restart: function () {
      VT.TTS.stop();

      // Reset formulaire
      var inputs = VT.$$('.vt-am-form input');
      inputs.forEach(function (input) { input.value = ''; });

      // Reset resultats
      var scoreEl = VT.$('#vt-result-score');
      if (scoreEl) scoreEl.textContent = '0%';

      var barFill = VT.$('.vt-am-score-bar-fill');
      if (barFill) barFill.style.width = '0%';

      // Reset header
      var headerEl = VT.$('#vt-result-header');
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

      this._hideError();
      this._checkRateLimit();

      // Re-afficher le splash
      var appEl = VT.$('.vt-app');
      var container = VT.$('.vt-container');
      if (appEl && container) {
        var splash = document.createElement('div');
        splash.className = 'vt-splash';
        splash.id = 'vt-splash';
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

    _shareImage: function () {
      var self = this;

      /* --- Collecte des données du résultat --- */
      var scoreText = (VT.$('#vt-result-score') || {}).textContent || '0%';
      var score   = parseInt(scoreText, 10) || 0;
      var resume  = (VT.$('#vt-result-resume') || {}).textContent || '';
      var conseil = (VT.$('#vt-result-advice') || {}).textContent || '';
      var pfArr = [], tArr = [];
      VT.$$('#vt-result-strengths li').forEach(function (li) { pfArr.push(li.textContent.trim()); });
      VT.$$('#vt-result-tensions  li').forEach(function (li) { tArr .push(li.textContent.trim()); });
      var name1 = this._name1 || '', name2 = this._name2 || '';
      var sign1 = this._sign1, sign2 = this._sign2;

      var ZODIAC = {
        aries:'♈', taurus:'♉', gemini:'♊', cancer:'♋', leo:'♌',    virgo:'♍',
        libra:'♎', scorpio:'♏', sagittarius:'♐', capricorn:'♑', aquarius:'♒', pisces:'♓'
      };

      /* --- Dimensions 9:16 --- */
      var SC = 2, W = 630, H = 1120, PAD = 32, CW = W - PAD * 2;

      /* roundRect avec fallback */
      function rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
      }

      /* --- Rendu principal (async après chargement logo) --- */
      function doRender(logo) {
        var canvas = document.createElement('canvas');
        canvas.width  = W * SC;
        canvas.height = H * SC;
        var ctx = canvas.getContext('2d');
        ctx.scale(SC, SC);

        /* Étoiles pseudo-aléatoires seeded par le score */
        var seed = score + 1;
        function rng() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
        var stars = [];
        for (var i = 0; i < 90; i++) {
          stars.push({ x: rng()*W, y: rng()*H, r: rng()*1.1+0.4, a: rng()*0.25+0.15 });
        }

        /* Fond dégradé radial clair */
        var bg = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, H*0.8);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(1, '#f0e6f8');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* Étoiles violet doux */
        stars.forEach(function (s) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(192,132,252,' + s.a + ')';
          ctx.fill();
        });

        /* Halo rose pâle derrière le logo */
        var topHalo = ctx.createRadialGradient(W/2, 55, 0, W/2, 55, 190);
        topHalo.addColorStop(0, 'rgba(237,140,230,0.14)');
        topHalo.addColorStop(1, 'rgba(237,140,230,0)');
        ctx.fillStyle = topHalo;
        ctx.fillRect(W/2-190, 0, 380, 250);

        var y = 28;

        /* Logo */
        if (logo) {
          ctx.drawImage(logo, W/2-22, y, 44, 44);
        } else {
          /* Fallback : hexagone dessiné en code */
          ctx.save();
          ctx.beginPath();
          var hcx = W/2, hcy = y+22, hcr = 22;
          for (var k = 0; k < 6; k++) {
            var ang = Math.PI/180*(60*k-30);
            if (k===0) ctx.moveTo(hcx+hcr*Math.cos(ang), hcy+hcr*Math.sin(ang));
            else        ctx.lineTo(hcx+hcr*Math.cos(ang), hcy+hcr*Math.sin(ang));
          }
          ctx.closePath();
          var hexG = ctx.createLinearGradient(hcx-hcr, hcy-hcr, hcx+hcr, hcy+hcr);
          hexG.addColorStop(0, '#c084fc'); hexG.addColorStop(1, '#7c3aed');
          ctx.fillStyle = hexG; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('HV', hcx, hcy);
          ctx.restore();
        }
        y += 58;

        /* Titre site */
        ctx.save();
        ctx.fillStyle = '#2d1b3d'; ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('Hexagon Voyance', W/2, y);
        ctx.restore();
        y += 26;

        /* Sous-titre */
        ctx.save();
        ctx.fillStyle = '#8a6fa0'; ctx.font = '13px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('Compatibilité Amoureuse', W/2, y);
        ctx.restore();
        y += 22;

        /* Séparateur */
        ctx.save();
        ctx.strokeStyle = 'rgba(237,140,230,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W-PAD, y); ctx.stroke();
        ctx.restore();
        y += 18;

        /* --- Zone cœur + personnes (hauteur fixe 180px) --- */
        var HW = 130, HH = Math.round(HW * 145 / 160); /* 118 */
        var BR = 34;
        var heartTopY = y;
        var midY = heartTopY + Math.round(HH / 2);
        var bx1 = 88, bx2 = W - 88;

        /* Halo rose derrière le cœur */
        var halo = ctx.createRadialGradient(W/2, heartTopY+HH*0.5, 0, W/2, heartTopY+HH*0.5, 110);
        halo.addColorStop(0, 'rgba(237,140,230,0.32)');
        halo.addColorStop(1, 'rgba(237,140,230,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(W/2-110, heartTopY-20, 220, HH+40);

        /* Cœur Path2D */
        ctx.save();
        ctx.translate(W/2 - HW/2, heartTopY);
        ctx.scale(HW/160, HH/145);
        var hPath = new Path2D('M80 140 C80 140 5 95 5 52 C5 25 25 5 50 5 C63 5 74 12 80 24 C86 12 97 5 110 5 C135 5 155 25 155 52 C155 95 80 140 80 140Z');
        var hGrad = ctx.createLinearGradient(0, 0, 0, 145);
        hGrad.addColorStop(0, '#f5a0ef'); hGrad.addColorStop(0.4, '#ed8ce6'); hGrad.addColorStop(1, '#d66bc8');
        ctx.fillStyle = hGrad; ctx.fill(hPath);
        ctx.restore();

        /* Score dans le cœur */
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(score + '%', W/2, heartTopY + Math.round(HH * 0.58));
        ctx.restore();

        /* Badges zodiaque */
        function drawBadge(bx, signData) {
          ctx.save();
          ctx.beginPath(); ctx.arc(bx, midY, BR, 0, Math.PI*2);
          var g = ctx.createRadialGradient(bx, midY-8, 4, bx, midY, BR);
          g.addColorStop(0, '#c084fc'); g.addColorStop(1, '#7c3aed');
          ctx.fillStyle = g; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '22px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText((signData && ZODIAC[signData.key]) ? ZODIAC[signData.key] : '★', bx, midY);
          ctx.restore();
        }

        function personLabel(bx, name, sign) {
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = '#2d1b3d'; ctx.font = 'bold 13px Arial, sans-serif';
          ctx.fillText(name, bx, midY + BR + 10);
          if (sign) {
            ctx.fillStyle = '#a855f7'; ctx.font = '11px Arial, sans-serif';
            ctx.fillText(sign.name, bx, midY + BR + 27);
          }
          ctx.restore();
        }

        drawBadge(bx1, sign1); personLabel(bx1, name1, sign1);
        drawBadge(bx2, sign2); personLabel(bx2, name2, sign2);

        /* Fixer y à la position du score label (position fixe) */
        y = 320;

        /* Score label */
        ctx.save();
        ctx.fillStyle = '#8a6fa0'; ctx.font = '13px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(score + '% de compatibilité', W/2, y);
        ctx.restore();
        y += 28;

        /* Barre de score */
        rr(ctx, PAD, y, CW, 8, 4); ctx.fillStyle = '#f3e8ff'; ctx.fill();
        if (score > 0) {
          rr(ctx, PAD, y, CW * score / 100, 8, 4);
          var barG = ctx.createLinearGradient(PAD, 0, PAD+CW, 0);
          barG.addColorStop(0, '#f5a0ef'); barG.addColorStop(1, '#d66bc8');
          ctx.fillStyle = barG; ctx.fill();
        }
        y += 24;

        /* --- Cartes à hauteur fixe pour remplir exactement le 9:16 --- */
        var FOOTER_ZONE = 58, CARD_GAP = 10;
        var CARD_H = Math.floor((H - y - FOOTER_ZONE - 3 * CARD_GAP) / 4); /* ≈ 165 */
        var CP = 14, LH = 20, IH = 24;

        var cardDefs = [
          { title: 'En résumé',           icon: '♥', accent: '#d66bc8', content: resume,  isArr: false, italic: true  },
          { title: 'Points forts',        icon: '✦', accent: '#9333ea', content: pfArr,   isArr: true,  italic: false },
          { title: 'Points de tension',   icon: '⚡', accent: '#f59e0b', content: tArr,    isArr: true,  italic: false },
          { title: 'Conseil des étoiles', icon: '✧', accent: '#059669', content: conseil, isArr: false, italic: true  }
        ];

        cardDefs.forEach(function (def) {
          /* Ombre simulée */
          ctx.save();
          ctx.fillStyle = 'rgba(180,100,220,0.08)';
          rr(ctx, PAD+1, y+2, CW, CARD_H, 10); ctx.fill();
          /* Fond blanc */
          ctx.fillStyle = '#ffffff';
          rr(ctx, PAD, y, CW, CARD_H, 10); ctx.fill();
          /* Bordure */
          ctx.strokeStyle = 'rgba(237,140,230,0.40)'; ctx.lineWidth = 1;
          rr(ctx, PAD, y, CW, CARD_H, 10); ctx.stroke();
          /* Barre accent */
          var barG2 = ctx.createLinearGradient(0, y, 0, y+CARD_H);
          barG2.addColorStop(0, def.accent); barG2.addColorStop(1, def.accent + '88');
          ctx.fillStyle = barG2; ctx.fillRect(PAD, y+10, 3, CARD_H-20);
          /* Titre */
          ctx.fillStyle = def.accent; ctx.font = 'bold 12px Arial, sans-serif';
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(def.icon + ' ' + def.title, PAD+CP, y+CP);
          /* Contenu */
          ctx.fillStyle = '#2d1b3d';
          ctx.font = (def.italic ? 'italic ' : '') + '13px Arial, sans-serif';
          var innerW = CW - CP * 2;
          var ty = y + CP + 24;
          var maxContentH = CARD_H - CP - 24 - CP;
          if (def.isArr) {
            var maxItems = Math.floor(maxContentH / IH);
            def.content.slice(0, maxItems).forEach(function (item, i) {
              ctx.fillText('• ' + item, PAD+CP, ty + i*IH);
            });
          } else {
            var wds = (def.content || '').split(' '), l = '', li = 0;
            var maxLines = Math.floor(maxContentH / LH);
            wds.forEach(function (w) {
              if (li >= maxLines) return;
              var t = l + w + ' ';
              if (l && ctx.measureText(t).width > innerW) {
                ctx.fillText(l.trim(), PAD+CP, ty + li*LH); li++; l = w + ' ';
              } else l = t;
            });
            if (li < maxLines) ctx.fillText(l.trim(), PAD+CP, ty + li*LH);
          }
          ctx.restore();
          y += CARD_H + CARD_GAP;
        });

        /* Footer URL */
        ctx.save();
        ctx.fillStyle = '#a855f7'; ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('hexagon-voyance.com', W/2, H - 34);
        ctx.restore();

        /* Affichage dans la modale */
        var dataURL = canvas.toDataURL('image/png');
        var modal   = document.getElementById('vt-share-modal');
        var preview = document.getElementById('vt-share-preview');
        var dlBtn   = document.getElementById('vt-share-download');
        if (!modal) return;
        if (preview) preview.src  = dataURL;
        if (dlBtn)   dlBtn.href   = dataURL;
        modal.style.display = 'flex';

        VT.Analytics.track('vt_share', { platform: 'image', type: 'compatibilite-amoureuse' });
      }

      /* Chargement logo (async) — fallback hexagone si erreur file:// */
      var logoImg = new Image();
      logoImg.onload  = function () { doRender(logoImg); };
      logoImg.onerror = function () { doRender(null); };
      logoImg.src = '../wordpress/assets/logo-hexagon-voyance.webp';
    }
  };

  // Demarrage au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
