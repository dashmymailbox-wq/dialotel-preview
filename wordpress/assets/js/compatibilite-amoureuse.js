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
      /* --- Collecte --- */
      var scoreText = (VT.$('#vt-result-score') || {}).textContent || '0%';
      var score   = parseInt(scoreText, 10) || 0;
      var name1 = this._name1 || '', name2 = this._name2 || '';
      var sign1 = this._sign1, sign2 = this._sign2;

      var ZODIAC = {
        aries:'♈', taurus:'♉', gemini:'♊', cancer:'♋', leo:'♌',    virgo:'♍',
        libra:'♎', scorpio:'♏', sagittarius:'♐', capricorn:'♑', aquarius:'♒', pisces:'♓'
      };

      /* Phrase dynamique selon le score */
      var phrases = [
        { max: 25, text: 'Un chemin semé d\'épreuves, mais rien n\'est impossible' },
        { max: 50, text: 'Des défis à relever ensemble, patience et compréhension' },
        { max: 75, text: 'Une belle alchimie se dessine entre vous' },
        { max: 90, text: 'Les étoiles brillent sur votre union' },
        { max: 100, text: 'Une connexion rare et puissante vous unit' }
      ];
      var phrase = phrases[0].text;
      for (var pi = 0; pi < phrases.length; pi++) {
        if (score <= phrases[pi].max) { phrase = phrases[pi].text; break; }
      }

      /* --- Dimensions 9:16 --- */
      var SC = 2, W = 512, H = 896;

      /* Dessin du mandala hexagonal directement en Canvas */
      function drawMandala(ctx, W, H) {
        var cx = W / 2, cy = H / 2;
        var s = Math.max(W, H) * 1.4 / 600;
        var LW = 5;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);

        function hex(r) {
          ctx.beginPath();
          for (var i = 0; i < 6; i++) {
            var a = Math.PI / 3 * i;
            var x = Math.cos(a) * r, y = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
        }

        function ring(n, startDeg, dist, sc, fill, stroke, lw) {
          for (var i = 0; i < n; i++) {
            var deg = startDeg + (360 / n) * i;
            var rad = deg * Math.PI / 180;
            var tx = Math.cos(rad) * dist, ty = Math.sin(rad) * dist;
            ctx.save();
            ctx.translate(tx, ty);
            hex(sc);
            if (fill) { ctx.fillStyle = fill; ctx.fill(); }
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lw * LW;
            ctx.stroke();
            ctx.restore();
          }
        }

        /* Anneaux du mandala (reproduction exacte du SVG) */
        ring(1,  0,   0,   1.5,  null,                            'rgba(237,140,230,0.45)', 0.15);
        ring(6,  0,   10,  2,    null,                            'rgba(237,140,230,0.45)', 0.15);
        ring(6,  30,  22,  3,    'rgba(226,237,119,0.06)',        'rgba(226,237,119,0.3)',  0.18);
        ring(12, 0,   35,  3.5,  null,                            'rgba(226,237,119,0.4)',  0.12);
        ring(12, 15,  50,  5,    'rgba(237,140,230,0.06)',        'rgba(237,140,230,0.35)', 0.14);
        ring(12, 0,   60,  4,    null,                            'rgba(226,237,119,0.38)', 0.1);
        ring(12, 0,   72,  16,   null,                            'rgba(226,237,119,0.6)',  0.035);
        ring(12, 0,   72,  6,    'rgba(237,140,230,0.1)',         'rgba(237,140,230,0.5)',  0.07);
        ring(12, 15,  115, 22,   null,                            'rgba(237,140,230,0.6)',  0.03);
        ring(12, 15,  115, 8,    'rgba(226,237,119,0.08)',        'rgba(226,237,119,0.5)',  0.06);
        ring(12, 0,   158, 14,   null,                            'rgba(237,140,230,0.55)', 0.04);
        ring(12, 0,   158, 5,    'rgba(226,237,119,0.06)',        'rgba(226,237,119,0.4)',  0.09);
        ring(12, 15,  200, 26,   null,                            'rgba(226,237,119,0.55)', 0.025);
        ring(12, 15,  200, 10,   'rgba(237,140,230,0.08)',        'rgba(237,140,230,0.45)', 0.05);
        ring(12, 0,   242, 14,   null,                            'rgba(237,140,230,0.55)', 0.04);
        ring(12, 0,   242, 5,    'rgba(226,237,119,0.06)',        'rgba(226,237,119,0.4)',  0.09);
        ring(12, 15,  280, 10,   null,                            'rgba(226,237,119,0.45)', 0.04);

        ctx.restore();
      }

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
        ctx.globalAlpha = 0.3;
        drawMandala(ctx, W, H);
        ctx.globalAlpha = 1;
        ctx.restore();

        /* Voile radial pour adoucir le mandala */
        var veil = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, H*0.65);
        veil.addColorStop(0, 'rgba(255,255,255,0.6)');
        veil.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, W, H);

        /* === ORDRE : logo → cœur → signes → phrase → URL === */

        /* --- 1. Logo (proportions d'origine 636x216) --- */
        var logoY = 50;
        var logoW = 200;
        var logoH = Math.round(logoW * 216 / 636);
        if (logo) {
          ctx.drawImage(logo, W/2 - logoW/2, logoY, logoW, logoH);
        } else {
          /* Fallback : hexagone */
          ctx.save();
          ctx.beginPath();
          var hcx = W/2, hcy = logoY + 30, hcr = 28;
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

        /* --- 2. Cœur central --- */
        var heartTopY = 200;
        var HW = 200, HH = Math.round(HW * 145 / 160);

        /* Halo rose derrière le cœur */
        var halo = ctx.createRadialGradient(W/2, heartTopY + HH*0.5, 0, W/2, heartTopY + HH*0.5, 150);
        halo.addColorStop(0, 'rgba(237,140,230,0.3)');
        halo.addColorStop(1, 'rgba(237,140,230,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(W/2-150, heartTopY-30, 300, HH+60);

        /* Cœur Path2D */
        ctx.save();
        ctx.translate(W/2 - HW/2, heartTopY);
        ctx.scale(HW/160, HH/145);
        var hPath = new Path2D('M80 140 C80 140 5 95 5 52 C5 25 25 5 50 5 C63 5 74 12 80 24 C86 12 97 5 110 5 C135 5 155 25 155 52 C155 95 80 140 80 140Z');
        var hGrad = ctx.createLinearGradient(0, 0, 0, 145);
        hGrad.addColorStop(0, '#f5a0ef'); hGrad.addColorStop(0.4, '#ed8ce6'); hGrad.addColorStop(1, '#d66bc8');
        ctx.fillStyle = hGrad; ctx.fill(hPath);
        /* Reflet subtil */
        var reflectGrad = ctx.createLinearGradient(30, 0, 130, 60);
        reflectGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
        reflectGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = reflectGrad; ctx.fill(hPath);
        ctx.restore();

        /* Score parfaitement centré dans le cœur */
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 42px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8;
        var heartCenterY = heartTopY + HH * 0.53;
        ctx.fillText(score + '%', W/2, heartCenterY);
        ctx.shadowBlur = 0;
        ctx.restore();

        /* Sparkles autour du cœur */
        var sparkles = [
          { x: W/2 - 130, y: heartTopY + 35, r: 3 },
          { x: W/2 + 125, y: heartTopY + 55, r: 2.5 },
          { x: W/2 - 110, y: heartTopY + HH - 20, r: 2 },
          { x: W/2 + 115, y: heartTopY + HH - 10, r: 3 },
          { x: W/2, y: heartTopY - 15, r: 2.5 }
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

        /* --- 3. Signes zodiacaux + prénoms (gros) --- */
        var zodiacY = heartTopY + HH + 70;
        var BR = 32;
        var zodiacGap = 180;
        var bx1 = W/2 - zodiacGap/2, bx2 = W/2 + zodiacGap/2;

        function drawBadge(bx, signData) {
          ctx.save();
          ctx.beginPath(); ctx.arc(bx, zodiacY, BR, 0, Math.PI*2);
          var g = ctx.createRadialGradient(bx, zodiacY-8, 3, bx, zodiacY, BR);
          g.addColorStop(0, '#c084fc'); g.addColorStop(1, '#7c3aed');
          ctx.fillStyle = g; ctx.fill();
          /* Anneau lumineux */
          ctx.beginPath(); ctx.arc(bx, zodiacY, BR + 4, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(237,140,230,0.35)'; ctx.lineWidth = 2; ctx.stroke();
          /* Symbole */
          ctx.fillStyle = '#fff'; ctx.font = '24px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText((signData && ZODIAC[signData.key]) ? ZODIAC[signData.key] : '★', bx, zodiacY);
          ctx.restore();
        }

        function personLabel(bx, name, sign) {
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = '#2d1b3d'; ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillText(name || '', bx, zodiacY + BR + 14);
          if (sign) {
            ctx.fillStyle = '#a855f7'; ctx.font = '14px Arial, sans-serif';
            ctx.fillText(sign.name, bx, zodiacY + BR + 34);
          }
          ctx.restore();
        }

        drawBadge(bx1, sign1); personLabel(bx1, name1, sign1);
        drawBadge(bx2, sign2); personLabel(bx2, name2, sign2);

        /* ✦ entre les badges */
        ctx.save();
        ctx.fillStyle = '#e2ed77'; ctx.font = '18px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✦', W/2, zodiacY);
        ctx.restore();

        /* --- 4. Phrase dynamique --- */
        var phraseY = zodiacY + BR + 70;
        ctx.save();
        ctx.fillStyle = '#8a6fa0'; ctx.font = 'italic 15px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var maxPhraseW = W - 60;
        var words = phrase.split(' '), line = '', lineY = phraseY;
        words.forEach(function (w) {
          var test = line + w + ' ';
          if (line && ctx.measureText(test).width > maxPhraseW) {
            ctx.fillText(line.trim(), W/2, lineY);
            lineY += 20; line = w + ' ';
          } else { line = test; }
        });
        ctx.fillText(line.trim(), W/2, lineY);
        ctx.restore();

        /* --- 5. Footer URL --- */
        ctx.save();
        ctx.fillStyle = '#a855f7'; ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('hexagon-voyance.com', W/2, H - 30);
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

      /* Chargement logo (async) — fallback hexagone si erreur */
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
