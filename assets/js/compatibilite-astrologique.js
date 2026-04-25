/* compatibilite-astrologique.js — Logique specifique app compatibilite astrologique */
;(function () {
  'use strict';

  var app = {
    config: null,
    promptTemplate: '',
    signsData: null,
    matrixData: null,

    init: function () {
      this.config = VT.Config.load('vt-config-compat-astro');

      var promptEl = document.getElementById('vt-prompt-compat-astro');
      if (promptEl) this.promptTemplate = promptEl.textContent.trim();

      // Charger donnees astrologiques inline
      var signsEl = document.getElementById('vt-data-signs');
      if (signsEl) {
        try { this.signsData = JSON.parse(signsEl.textContent); } catch (e) { /* ignore */ }
      }
      var matrixEl = document.getElementById('vt-data-matrix');
      if (matrixEl) {
        try { this.matrixData = JSON.parse(matrixEl.textContent); } catch (e) { /* ignore */ }
      }

      VT.Counter.init(this.config.tirageId || 'compat-astro', this.config.counterBase || 3800);
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
      VT.App.checkRateLimit(this);
    },

    _bindEvents: function () {
      var self = this;

      VT.on('#vt-btn-start', 'click', function () {
        VT.Analytics.track('vt_tirage_started', { type: 'compatibilite-astrologique' });
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

      // Selection des signes
      VT.$$('.vt-astro-sign').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var group = btn.closest('.vt-astro-sign-group');
          var groupId = group ? group.dataset.group : '1';
          // Deselectionner dans le meme groupe
          group.querySelectorAll('.vt-astro-sign').forEach(function (b) {
            b.classList.remove('vt-astro-sign--selected');
          });
          btn.classList.add('vt-astro-sign--selected');
        });
      });
    },

    _getSelectedSign: function (groupId) {
      var group = VT.$('.vt-astro-sign-group[data-group="' + groupId + '"]');
      if (!group) return null;
      var selected = group.querySelector('.vt-astro-sign--selected');
      return selected ? selected.dataset.sign : null;
    },

    _lookupScore: function (sign1, sign2) {
      if (!this.matrixData) return null;
      var key1 = sign1 + '-' + sign2;
      var key2 = sign2 + '-' + sign1;
      return this.matrixData[key1] || this.matrixData[key2] || null;
    },

    _doTirage: function () {
      var self = this;
      var tirageId = this.config.tirageId || 'compat-astro';

      if (!VT.RateLimiter.canDoTirage(tirageId)) {
        VT.Analytics.track('vt_rate_limit_hit', { type: 'compatibilite-astrologique' });
        VT.App.showRateLimitModal();
        return;
      }

      var sign1 = this._getSelectedSign('1');
      var sign2 = this._getSelectedSign('2');

      if (!sign1 || !sign2) {
        VT.App.showError(this, 'Veuillez selectionner deux signes astrologiques.');
        return;
      }

      var sign1Name = sign1;
      var sign2Name = sign2;
      if (this.signsData) {
        var s1 = this.signsData[sign1];
        var s2 = this.signsData[sign2];
        if (s1) sign1Name = s1.name;
        if (s2) sign2Name = s2.name;
      }

      var baseScore = this._lookupScore(sign1, sign2);

      // Etape rituelle
      VT.StepEngine.goTo(2);

      // Mettre a jour les noms dans le rituel
      var nameEls = VT.$$('.vt-astro-ritual-name');
      if (nameEls[0]) nameEls[0].textContent = sign1Name;
      if (nameEls[1]) nameEls[1].textContent = sign2Name;

      var prompt = this._buildPrompt(sign1Name, sign2Name, baseScore);

      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);

      VT.AI.generate(prompt, this.promptTemplate)
        .then(function (response) {
          var result = self._parseResponse(response);
          if (result) {
            if (baseScore) result.score = baseScore;
            self._showResult(result);
            VT.RateLimiter.recordTirage(tirageId);
            VT.Counter.increment();
            VT.Analytics.track('vt_tirage_completed', { type: 'compatibilite-astrologique', score: result.score });
          } else {
            VT.App.showError(self, 'Impossible d\'interpreter le resultat. Reessayez.');
          }
        })
        .catch(function (err) {
          console.error('[VT] Erreur IA :', err);
          VT.App.showError(self, 'Nos voyants sont tres sollicites en ce moment. Reessayez dans quelques instants.');
        });
    },

    _buildPrompt: function (name1, name2, baseScore) {
      var parts = [
        'Signe 1 : ' + name1,
        'Signe 2 : ' + name2
      ];
      if (baseScore) parts.push('Score de base : ' + baseScore + '/100');
      return parts.join('\n');
    },

    _parseResponse: function (response) {
      try {
        var jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        var data = JSON.parse(jsonMatch[0]);
        if (!data.score && !data.profilCombine) return null;
        return {
          score: Math.min(100, Math.max(1, parseInt(data.score, 10) || 50)),
          profilCombine: data.profilCombine || '',
          traits: data.traits || [],
          conseils: data.conseils || ''
        };
      } catch (e) {
        console.error('[VT] Parsing resultat :', e);
        return null;
      }
    },

    _showResult: function (result) {
      VT.StepEngine.goTo(3);

      var scoreEl = VT.$('#vt-result-score');
      if (scoreEl) VT.App.animateScore(scoreEl, result.score);

      var barFill = VT.$('.vt-astro-score-bar-fill');
      if (barFill) barFill.style.width = result.score + '%';

      var profileEl = VT.$('#vt-result-profile');
      if (profileEl) profileEl.textContent = result.profilCombine;

      var traitsEl = VT.$('#vt-result-traits');
      if (traitsEl) traitsEl.innerHTML = result.traits.map(function (t) {
        return '<li>' + VT.App.sanitize(t) + '</li>';
      }).join('');

      var adviceEl = VT.$('#vt-result-advice');
      if (adviceEl) adviceEl.textContent = result.conseils;

      var ttsText = result.profilCombine + ' ' + result.conseils;
      VT.TTS.speak(ttsText);

      var self = this;
      var emailConfig = this.config.emailCapture || {};
      if (emailConfig.enabled) {
        setTimeout(function () {
          self._showEmailModal();
          VT.Analytics.track('vt_email_shown');
        }, 3000);
      }
    },

    _hideError: function () {
      var errorEl = VT.$('#vt-error');
      if (errorEl) errorEl.classList.add('vt-hidden');
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
          VT.Analytics.track('vt_email_submitted', { type: 'compatibilite-astrologique' });
          var formEl = VT.$('#vt-email-form');
          var successEl = VT.$('.vt-email-success');
          if (formEl) formEl.classList.add('vt-hidden');
          if (successEl) successEl.classList.remove('vt-hidden');
        })
        .catch(function () {
          VT.App.showError(self, 'Erreur lors de l\'envoi. Reessayez.');
        });
    },

    _extendRateLimit: function () {
      var email = VT.$('#vt-extend-email').value.trim();
      if (!email || !email.includes('@')) return;

      var tirageId = this.config.tirageId || 'compat-astro';
      VT.RateLimiter.extendLimit(tirageId);
      VT.Analytics.track('vt_rate_limit_extended', { type: 'compatibilite-astrologique' });

      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.remove('vt-modal--open');
      this._doTirage();
    },

    _restart: function () {
      VT.TTS.stop();

      // Reset signes selectionnes
      VT.$$('.vt-astro-sign--selected').forEach(function (b) {
        b.classList.remove('vt-astro-sign--selected');
      });

      var scoreEl = VT.$('#vt-result-score');
      if (scoreEl) scoreEl.textContent = '0%';

      var barFill = VT.$('.vt-astro-score-bar-fill');
      if (barFill) barFill.style.width = '0%';

      VT.$$('.vt-modal-overlay').forEach(function (m) {
        m.classList.remove('vt-modal--open');
      });

      var emailForm = VT.$('#vt-email-form');
      var emailSuccess = VT.$('.vt-email-success');
      if (emailForm) emailForm.classList.remove('vt-hidden');
      if (emailSuccess) emailSuccess.classList.add('vt-hidden');

      this._hideError();
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
