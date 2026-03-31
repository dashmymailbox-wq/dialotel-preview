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

      // Etape rituelle
      VT.StepEngine.goTo(2);

      // Mettre a jour les noms dans le rituel
      var nameEls = VT.$$('.vt-am-ritual-name');
      if (nameEls[0]) nameEls[0].textContent = name1;
      if (nameEls[1]) nameEls[1].textContent = name2;

      // Construire le prompt
      var prompt = this._buildPrompt(name1, name2, birth1, birth2);

      // Appel IA
      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);

      VT.AI.generate(prompt, this.promptTemplate)
        .then(function (response) {
          var result = self._parseResponse(response);
          if (result) {
            self._showResult(result);
            VT.RateLimiter.recordTirage(tirageId);
            VT.Counter.increment();
            VT.Analytics.track('vt_tirage_completed', { type: 'compatibilite-amoureuse', score: result.score });
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
      VT.StepEngine.goTo(0);
    }
  };

  // Demarrage au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
