/* numerologie.js — Logique specifique app numerologie */
;(function () {
  'use strict';

  var app = {
    config: null,
    promptTemplate: '',

    init: function () {
      this.config = VT.Config.load('vt-config-numero');

      var promptEl = document.getElementById('vt-prompt-numero');
      if (promptEl) this.promptTemplate = promptEl.textContent.trim();

      VT.Counter.init(this.config.tirageId || 'numerologie', this.config.counterBase || 3000);
      VT.RateLimiter.init(this.config.rateLimit || {});
      VT.TTS.init(this.config.tts || {});
      VT.Email.init(this.config.emailCapture || {});

      var i18nEl = document.getElementById('vt-i18n');
      if (i18nEl) {
        try { VT.I18n.init(JSON.parse(i18nEl.textContent)); } catch (e) { /* ignore */ }
      }

      VT.StepEngine.init('.vt-app', '.vt-step');
      VT.Theme.init();
      this._bindEvents();
      this._checkRateLimit();
    },

    _bindEvents: function () {
      var self = this;

      VT.on('#vt-btn-start', 'click', function () {
        VT.Analytics.track('vt_tirage_started', { type: 'numerologie' });
        VT.StepEngine.next();
      });

      VT.on('#vt-btn-tirage', 'click', function () {
        self._doTirage();
      });

      VT.on('#vt-btn-restart', 'click', function () {
        self._restart();
      });

      VT.on('.vt-tts-btn', 'click', function () {
        VT.TTS.toggle();
      });

      VT.on('#vt-email-form', 'submit', function (e) {
        e.preventDefault();
        self._submitEmail();
      });

      VT.on('#vt-extend-form', 'submit', function (e) {
        e.preventDefault();
        self._extendRateLimit();
      });
    },

    _checkRateLimit: function () {
      var tirageId = this.config.tirageId || 'numerologie';
      var remaining = VT.RateLimiter.getRemaining(tirageId);
      var infoEl = VT.$('.vt-rate-info');
      if (infoEl && remaining !== Infinity) {
        infoEl.textContent = VT.I18n.t('rateLimiter.remaining', { count: remaining });
      }
    },

    _calculateLifePath: function (dateStr) {
      if (!dateStr) return null;
      // Extraire tous les chiffres de la date
      var digits = dateStr.replace(/\D/g, '');
      var sum = 0;
      for (var i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i], 10);
      }
      // Reduire a un seul chiffre (sauf maitres 11, 22, 33)
      while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        var newSum = 0;
        var s = sum.toString();
        for (var j = 0; j < s.length; j++) {
          newSum += parseInt(s[j], 10);
        }
        sum = newSum;
      }
      return sum;
    },

    _doTirage: function () {
      var self = this;
      var tirageId = this.config.tirageId || 'numerologie';

      if (!VT.RateLimiter.canDoTirage(tirageId)) {
        VT.Analytics.track('vt_rate_limit_hit', { type: 'numerologie' });
        this._showRateLimitModal();
        return;
      }

      var fullName = '';
      var nameEl = VT.$('#vt-fullname');
      if (nameEl) fullName = nameEl.value.trim();

      var birthDate = '';
      var birthEl = VT.$('#vt-birthdate');
      if (birthEl) birthDate = birthEl.value;

      if (!fullName) {
        this._showError('Veuillez entrer votre prenom complet.');
        return;
      }
      if (!birthDate) {
        this._showError('Veuillez entrer votre date de naissance.');
        return;
      }

      var lifePath = this._calculateLifePath(birthDate);
      if (!lifePath) {
        this._showError('Date de naissance invalide.');
        return;
      }

      // Etape rituelle
      VT.StepEngine.goTo(2);

      // Afficher le chiffre anime dans le rituel
      var ritualNum = VT.$('#vt-numero-ritual-number');
      if (ritualNum) {
        this._animateNumber(ritualNum, lifePath);
      }

      var prompt = this._buildPrompt(fullName, birthDate, lifePath);

      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);

      // Attendre 2s pour le rituel visuel
      setTimeout(function () {
        VT.AI.generate(prompt, self.promptTemplate)
          .then(function (response) {
            var result = self._parseResponse(response);
            if (result) {
              result.chiffreDeVie = lifePath;
              self._showResult(result);
              VT.RateLimiter.recordTirage(tirageId);
              VT.Counter.increment();
              VT.Analytics.track('vt_tirage_completed', { type: 'numerologie', lifePath: lifePath });
            } else {
              self._showError('Impossible d\'interpreter le resultat. Reessayez.');
            }
          })
          .catch(function (err) {
            console.error('[VT] Erreur IA :', err);
            self._showError('Nos voyants sont tres sollicites en ce moment. Reessayez dans quelques instants.');
          });
      }, 2000);
    },

    _animateNumber: function (el, target) {
      var duration = 1200;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var random = Math.floor(Math.random() * 9) + 1;
        if (progress < 0.9) {
          el.textContent = random;
        } else {
          el.textContent = target;
        }
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    },

    _buildPrompt: function (fullName, birthDate, lifePath) {
      return [
        'Prenom complet : ' + fullName,
        'Date de naissance : ' + birthDate,
        'Chemin de vie calcule : ' + lifePath
      ].join('\n');
    },

    _parseResponse: function (response) {
      try {
        var jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        var data = JSON.parse(jsonMatch[0]);
        return {
          chiffreDeVie: data.chiffreDeVie || null,
          description: data.description || '',
          forces: data.forces || [],
          defis: data.defis || [],
          conseil: data.conseil || ''
        };
      } catch (e) {
        console.error('[VT] Parsing resultat :', e);
        return null;
      }
    },

    _showResult: function (result) {
      VT.StepEngine.goTo(3);

      // Chiffre de vie
      var numEl = VT.$('#vt-result-number');
      if (numEl) numEl.textContent = result.chiffreDeVie;

      // Description
      var descEl = VT.$('#vt-result-description');
      if (descEl) descEl.textContent = result.description;

      // Forces
      var forcesEl = VT.$('#vt-result-forces');
      if (forcesEl) forcesEl.innerHTML = result.forces.map(function (f) {
        return '<li>' + f + '</li>';
      }).join('');

      // Defis
      var defisEl = VT.$('#vt-result-defis');
      if (defisEl) defisEl.innerHTML = result.defis.map(function (d) {
        return '<li>' + d + '</li>';
      }).join('');

      // Conseil
      var conseilEl = VT.$('#vt-result-advice');
      if (conseilEl) conseilEl.textContent = result.conseil;

      // TTS
      var ttsText = 'Chemin de vie ' + result.chiffreDeVie + '. ' + result.description + ' ' + result.conseil;
      VT.TTS.speak(ttsText);

      // Email capture
      var self = this;
      var emailConfig = this.config.emailCapture || {};
      if (emailConfig.enabled) {
        setTimeout(function () {
          self._showEmailModal();
          VT.Analytics.track('vt_email_shown');
        }, 3000);
      }
    },

    _showError: function (message) {
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
      VT.Email.submit(email)
        .then(function () {
          VT.Analytics.track('vt_email_submitted', { type: 'numerologie' });
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

      var tirageId = this.config.tirageId || 'numerologie';
      VT.RateLimiter.extendLimit(tirageId);
      VT.Analytics.track('vt_rate_limit_extended', { type: 'numerologie' });

      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.remove('vt-modal--open');
      this._doTirage();
    },

    _restart: function () {
      VT.TTS.stop();

      var nameEl = VT.$('#vt-fullname');
      if (nameEl) nameEl.value = '';
      var birthEl = VT.$('#vt-birthdate');
      if (birthEl) birthEl.value = '';

      VT.$$('.vt-modal-overlay').forEach(function (m) {
        m.classList.remove('vt-modal--open');
      });

      var emailForm = VT.$('#vt-email-form');
      var emailSuccess = VT.$('.vt-email-success');
      if (emailForm) emailForm.classList.remove('vt-hidden');
      if (emailSuccess) emailSuccess.classList.add('vt-hidden');

      this._hideError();
      this._checkRateLimit();
      VT.StepEngine.goTo(0);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
