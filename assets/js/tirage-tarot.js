/* tirage-tarot.js — Logique specifique app tirage tarot */
;(function () {
  'use strict';

  var app = {
    config: null,
    promptTemplate: '',
    tarotDeck: null,
    drawnCards: [],

    init: function () {
      this.config = VT.Config.load('vt-config-tarot');

      var promptEl = document.getElementById('vt-prompt-tarot');
      if (promptEl) this.promptTemplate = promptEl.textContent.trim();

      // Charger donnees tarot inline
      var tarotEl = document.getElementById('vt-data-tarot');
      if (tarotEl) {
        try { this.tarotDeck = JSON.parse(tarotEl.textContent); } catch (e) { /* ignore */ }
      }

      VT.Counter.init(this.config.tirageId || 'tirage-tarot', this.config.counterBase || 3500);
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
        VT.Analytics.track('vt_tirage_started', { type: 'tirage-tarot' });
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
      var tirageId = this.config.tirageId || 'tirage-tarot';
      var remaining = VT.RateLimiter.getRemaining(tirageId);
      var infoEl = VT.$('.vt-rate-info');
      if (infoEl && remaining !== Infinity) {
        infoEl.textContent = VT.I18n.t('rateLimiter.remaining', { count: remaining });
      }
    },

    _drawCards: function () {
      if (!this.tarotDeck || !this.tarotDeck.majorArcana) return [];
      var deck = this.tarotDeck.majorArcana.slice();
      var drawn = [];
      for (var i = 0; i < 3 && deck.length > 0; i++) {
        var idx = Math.floor(Math.random() * deck.length);
        drawn.push(deck.splice(idx, 1)[0]);
      }
      return drawn;
    },

    _doTirage: function () {
      var self = this;
      var tirageId = this.config.tirageId || 'tirage-tarot';

      if (!VT.RateLimiter.canDoTirage(tirageId)) {
        VT.Analytics.track('vt_rate_limit_hit', { type: 'tirage-tarot' });
        this._showRateLimitModal();
        return;
      }

      var question = '';
      var questionEl = VT.$('#vt-question');
      if (questionEl) question = questionEl.value.trim();

      // Tirer 3 cartes
      this.drawnCards = this._drawCards();
      if (this.drawnCards.length < 3) {
        this._showError('Donnees tarot indisponibles.');
        return;
      }

      // Etape rituelle
      VT.StepEngine.goTo(2);

      // Afficher le retournement des cartes
      this._showCardReveal();

      // Construire le prompt
      var prompt = this._buildPrompt(question);

      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);

      // Attendre 2.5s pour le rituel visuel avant d'appeler l'IA
      setTimeout(function () {
        VT.AI.generate(prompt, self.promptTemplate)
          .then(function (response) {
            var result = self._parseResponse(response);
            if (result) {
              self._showResult(result);
              VT.RateLimiter.recordTirage(tirageId);
              VT.Counter.increment();
              VT.Analytics.track('vt_tirage_completed', { type: 'tirage-tarot' });
            } else {
              self._showError('Impossible d\'interpreter le resultat. Reessayez.');
            }
          })
          .catch(function (err) {
            console.error('[VT] Erreur IA :', err);
            self._showError('Erreur de connexion au service. Verifiez votre cle API ou reessayez.');
          });
      }, 2500);
    },

    _showCardReveal: function () {
      var positions = ['passe', 'present', 'futur'];
      var self = this;

      positions.forEach(function (pos, i) {
        var cardEl = VT.$('.vt-tarot-card[data-position="' + pos + '"]');
        if (!cardEl) return;

        // Afficher le nom de la carte apres un delai
        setTimeout(function () {
          cardEl.classList.add('vt-tarot-card--revealed');
          var nameEl = cardEl.querySelector('.vt-tarot-card-name');
          if (nameEl && self.drawnCards[i]) {
            nameEl.textContent = self.drawnCards[i].name || self.drawnCards[i].nom || '';
          }
          var numEl = cardEl.querySelector('.vt-tarot-card-number');
          if (numEl && self.drawnCards[i]) {
            numEl.textContent = self.drawnCards[i].number || (i + 1);
          }
        }, 600 + (i * 800));
      });
    },

    _buildPrompt: function (question) {
      var parts = [];
      if (question) parts.push('Question : ' + question);

      var positions = ['Passe', 'Present', 'Futur'];
      for (var i = 0; i < this.drawnCards.length; i++) {
        var card = this.drawnCards[i];
        parts.push(positions[i] + ' : ' + (card.name || card.nom || 'Carte ' + (i + 1)));
        if (card.meaning || card.signification) {
          parts.push('Signification : ' + (card.meaning || card.signification));
        }
      }
      return parts.join('\n');
    },

    _parseResponse: function (response) {
      try {
        var jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        var data = JSON.parse(jsonMatch[0]);
        return {
          cartePasse: data.cartePasse || { nom: 'Inconnu', interpretation: '' },
          cartePresent: data.cartePresent || { nom: 'Inconnu', interpretation: '' },
          carteFutur: data.carteFutur || { nom: 'Inconnu', interpretation: '' },
          synthese: data.synthese || ''
        };
      } catch (e) {
        console.error('[VT] Parsing resultat :', e);
        return null;
      }
    },

    _showResult: function (result) {
      VT.StepEngine.goTo(3);

      // Carte Passe
      var passName = VT.$('#vt-result-card-passe-name');
      var passText = VT.$('#vt-result-card-passe-text');
      if (passName) passName.textContent = result.cartePasse.nom;
      if (passText) passText.textContent = result.cartePasse.interpretation;

      // Carte Present
      var presName = VT.$('#vt-result-card-present-name');
      var presText = VT.$('#vt-result-card-present-text');
      if (presName) presName.textContent = result.cartePresent.nom;
      if (presText) presText.textContent = result.cartePresent.interpretation;

      // Carte Futur
      var futName = VT.$('#vt-result-card-futur-name');
      var futText = VT.$('#vt-result-card-futur-text');
      if (futName) futName.textContent = result.carteFutur.nom;
      if (futText) futText.textContent = result.carteFutur.interpretation;

      // Synthese
      var synthEl = VT.$('#vt-result-synthese');
      if (synthEl) synthEl.textContent = result.synthese;

      // TTS
      var ttsText = result.synthese;
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
          VT.Analytics.track('vt_email_submitted', { type: 'tirage-tarot' });
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

      var tirageId = this.config.tirageId || 'tirage-tarot';
      VT.RateLimiter.extendLimit(tirageId);
      VT.Analytics.track('vt_rate_limit_extended', { type: 'tirage-tarot' });

      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.remove('vt-modal--open');
      this._doTirage();
    },

    _restart: function () {
      VT.TTS.stop();
      this.drawnCards = [];

      var questionEl = VT.$('#vt-question');
      if (questionEl) questionEl.value = '';

      // Reset cards
      VT.$$('.vt-tarot-card--revealed').forEach(function (c) {
        c.classList.remove('vt-tarot-card--revealed');
      });
      VT.$$('.vt-tarot-card-name').forEach(function (n) { n.textContent = ''; });
      VT.$$('.vt-tarot-card-number').forEach(function (n) { n.textContent = ''; });

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
