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

      var i18nEl = document.getElementById('vt-numero-i18n');
      if (i18nEl) {
        try { VT.I18n.init(JSON.parse(i18nEl.textContent)); } catch (e) { /* ignore */ }
      }

      VT.StepEngine.init('.vt-app', '.vt-step');
      VT.Theme.init();
      this._bindEvents();
      VT.App.checkRateLimit(this);
    },

    _bindEvents: function () {
      var self = this;

      VT.on('#vt-numero-btn-start', 'click', function () {
        VT.Analytics.track('vt_tirage_started', { type: 'numerologie' });
        VT.StepEngine.next();
      });

      VT.on('#vt-numero-btn-tirage', 'click', function () {
        self._doTirage();
      });

      VT.on('#vt-numero-btn-restart', 'click', function () {
        self._restart();
      });

      VT.on('.vt-tts-btn', 'click', function () {
        VT.TTS.toggle();
      });

      VT.on('#vt-numero-email-form', 'submit', function (e) {
        e.preventDefault();
        VT.App.submitEmail(self);
      });

      VT.on('#vt-numero-extend-form', 'submit', function (e) {
        e.preventDefault();
        VT.App.extendRateLimit(self);
      });
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
        VT.App.showRateLimitModal();
        return;
      }

      var fullName = '';
      var nameEl = VT.$('#vt-numero-fullname');
      if (nameEl) fullName = nameEl.value.trim();

      var birthDate = '';
      var birthEl = VT.$('#vt-numero-birthdate');
      if (birthEl) birthDate = birthEl.value;

      if (!fullName) {
        VT.App.showError(this, 'Veuillez entrer votre prenom complet.');
        return;
      }
      if (!birthDate) {
        VT.App.showError(this, 'Veuillez entrer votre date de naissance.');
        return;
      }

      var lifePath = this._calculateLifePath(birthDate);
      if (!lifePath) {
        VT.App.showError(this, 'Date de naissance invalide.');
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
              VT.App.showError(self, 'Impossible d\'interpreter le resultat. Reessayez.');
            }
          })
          .catch(function (err) {
            console.error('[VT] Erreur IA :', err);
            VT.App.showError(self, 'Nos voyants sont tres sollicites en ce moment. Reessayez dans quelques instants.');
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
      var numEl = VT.$('#vt-numero-result-number');
      if (numEl) numEl.textContent = result.chiffreDeVie;

      // Description
      var descEl = VT.$('#vt-numero-result-description');
      if (descEl) descEl.textContent = result.description;

      // Forces
      var forcesEl = VT.$('#vt-numero-result-forces');
      if (forcesEl) forcesEl.innerHTML = result.forces.map(function (f) {
        return '<li>' + f + '</li>';
      }).join('');

      // Defis
      var defisEl = VT.$('#vt-numero-result-defis');
      if (defisEl) defisEl.innerHTML = result.defis.map(function (d) {
        return '<li>' + d + '</li>';
      }).join('');

      // Conseil
      var conseilEl = VT.$('#vt-numero-result-advice');
      if (conseilEl) conseilEl.textContent = result.conseil;

      // TTS
      var ttsText = 'Chemin de vie ' + result.chiffreDeVie + '. ' + result.description + ' ' + result.conseil;
      VT.TTS.speak(ttsText);

      // Email capture
      var self = this;
      var emailConfig = this.config.emailCapture || {};
      if (emailConfig.enabled) {
        setTimeout(function () {
          VT.App.showEmailModal();
          VT.Analytics.track('vt_email_shown');
        }, 3000);
      }
    },

    _restart: function () {
      VT.TTS.stop();

      var nameEl = VT.$('#vt-numero-fullname');
      if (nameEl) nameEl.value = '';
      var birthEl = VT.$('#vt-numero-birthdate');
      if (birthEl) birthEl.value = '';

      VT.$$('.vt-modal-overlay').forEach(function (m) {
        m.classList.remove('vt-modal--open');
      });

      var emailForm = VT.$('#vt-numero-email-form');
      var emailSuccess = VT.$('.vt-email-success');
      if (emailForm) emailForm.classList.remove('vt-hidden');
      if (emailSuccess) emailSuccess.classList.add('vt-hidden');

      VT.App.hideError(this);
      VT.App.checkRateLimit(this);
      VT.StepEngine.goTo(0);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
