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
      var resultEl = VT.$('.vt-result');
      if (typeof html2canvas === 'undefined') {
        alert('Connexion internet requise pour générer l\'image (chargement de html2canvas).');
        return;
      }
      if (!resultEl) {
        alert('Bloc résultat introuvable.');
        return;
      }

      var btn = document.getElementById('vt-btn-share');
      if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

      // Cloner l'élément — le DOM original n'est jamais modifié
      var clone = resultEl.cloneNode(true);
      var toRemove = ['.vt-tts-controls', '.vt-share', '.vt-am-divider', '.vt-email-inline', '.vt-cta-voyants', '.vt-result-actions'];
      toRemove.forEach(function (sel) {
        var el = clone.querySelector(sel);
        if (el) el.parentNode.removeChild(el);
      });

      // Positionner hors-écran
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '0';
      clone.style.width = resultEl.offsetWidth + 'px';
      clone.style.background = '#ffffff';
      document.body.appendChild(clone);

      html2canvas(clone, {
        allowTaint: true,
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      }).then(function (captured) {
        document.body.removeChild(clone);

        // Ajouter le logo en bas
        var logoH = 48;
        var pad = 20;
        var final = document.createElement('canvas');
        final.width = captured.width;
        final.height = captured.height + logoH + pad;
        var ctx = final.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, final.width, final.height);
        ctx.drawImage(captured, 0, 0);

        function showModal(dataURL) {
          var modal = document.getElementById('vt-share-modal');
          var preview = document.getElementById('vt-share-preview');
          var dlBtn = document.getElementById('vt-share-download');
          if (!modal) return;
          if (preview) preview.src = dataURL;
          if (dlBtn) dlBtn.href = dataURL;
          modal.style.display = 'flex';
        }

        var logo = new Image();
        logo.onload = function () {
          var ratio = logo.naturalWidth / logo.naturalHeight;
          var lw = Math.round((logoH - 8) * ratio);
          ctx.drawImage(logo, final.width - lw - pad, captured.height + 4, lw, logoH - 8);
          showModal(final.toDataURL('image/png'));
        };
        logo.onerror = function () { showModal(final.toDataURL('image/png')); };
        logo.src = '../wordpress/assets/logo-hexagon-voyance.webp';

        VT.Analytics.track('vt_share', { platform: 'image', type: 'compatibilite-amoureuse' });
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      }).catch(function (err) {
        if (clone.parentNode) document.body.removeChild(clone);
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
        alert('Erreur lors de la capture : ' + err.message);
      });
    }
  };

  // Demarrage au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
