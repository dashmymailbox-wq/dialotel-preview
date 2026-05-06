/* core.js — Moteur partage : etapes, TTS, IA adapter, limiteur, analytics, i18n, compteur */
;(function () {
  'use strict';

  var VT = window.VT || {};

  /* ============================================================
     1. MOTEUR D'ETAPES
     ============================================================ */
  VT.StepEngine = {
    steps: [],
    current: 0,
    container: null,

    init: function (containerSelector, stepSelectors) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      this.container = document.querySelector(containerSelector);
      this.steps = Array.prototype.slice.call(
        this.container ? this.container.querySelectorAll(stepSelectors) : []
      );
      this.current = 0;
      this._show(0);
    },

    _show: function (index) {
      this.steps.forEach(function (step, i) {
        step.classList.remove('vt-step--active', 'vt-step--enter');
        if (i === index) {
          step.classList.add('vt-step--active', 'vt-step--enter');
        }
      });
      window.scrollTo(0, 0);
    },

    goTo: function (index) {
      if (index < 0 || index >= this.steps.length) return;
      this.current = index;
      this._show(index);
    },

    next: function () {
      this.goTo(this.current + 1);
    },

    prev: function () {
      this.goTo(this.current - 1);
    }
  };

  /* ============================================================
     2. COMPTEUR SOCIAL-PROOF
     ============================================================ */
  VT.Counter = {
    base: 0,
    key: '',

    init: function (tirageId, counterBase) {
      this.key = 'vt_counter_' + tirageId;
      this.base = counterBase || 0;
      this._display();
    },

    _getValue: function () {
      var now = new Date();
      var monthKey = now.getFullYear() + '-' + (now.getMonth() + 1);
      var stored = sessionStorage.getItem(this.key);

      if (stored) {
        try {
          var data = JSON.parse(stored);
          if (data.month === monthKey) return data.value;
        } catch (e) { /* ignore */ }
      }

      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var daysSinceStart = Math.floor((today - new Date(now.getFullYear(), now.getMonth(), 1)) / 86400000) + 1;
      var value = this.base + Math.floor(Math.random() * 300) + daysSinceStart * 47;

      sessionStorage.setItem(this.key, JSON.stringify({ month: monthKey, value: value }));
      return value;
    },

    _display: function () {
      var els = document.querySelectorAll('.vt-counter-value');
      var val = this._getValue();
      var self = this;
      els.forEach(function (el) {
        self._animateCount(el, val);
      });
    },

    _animateCount: function (el, target) {
      var start = 0;
      var duration = 1200;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('fr-FR');
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    },

    increment: function () {
      var stored = sessionStorage.getItem(this.key);
      if (stored) {
        try {
          var data = JSON.parse(stored);
          data.value += 1;
          sessionStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) { /* ignore */ }
      }
    }
  };

  /* ============================================================
     3. LIMITEUR DE TIRAGES
     ============================================================ */
  VT.RateLimiter = {
    config: null,

    init: function (rateLimitConfig) {
      this.config = rateLimitConfig || { enabled: false };
    },

    _getKey: function (tirageId) {
      var now = new Date();
      var dateStr = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
      return 'vt_rate_' + tirageId + '_' + dateStr;
    },

    _getCount: function (tirageId) {
      var val = localStorage.getItem(this._getKey(tirageId));
      return val ? parseInt(val, 10) : 0;
    },

    canDoTirage: function (tirageId) {
      if (!this.config.enabled) return true;
      var count = this._getCount(tirageId);
      var limit = this._getCurrentLimit(tirageId);
      return count < limit;
    },

    recordTirage: function (tirageId) {
      var key = this._getKey(tirageId);
      var count = this._getCount(tirageId) + 1;
      localStorage.setItem(key, count.toString());
    },

    _getCurrentLimit: function (tirageId) {
      var extendedKey = 'vt_extended_' + tirageId;
      if (localStorage.getItem(extendedKey)) {
        return this.config.extendedPerDay || this.config.freePerDay + 5;
      }
      return this.config.freePerDay || 3;
    },

    extendLimit: function (tirageId) {
      var extendedKey = 'vt_extended_' + tirageId;
      localStorage.setItem(extendedKey, '1');
    },

    getRemaining: function (tirageId) {
      if (!this.config.enabled) return Infinity;
      return this._getCurrentLimit(tirageId) - this._getCount(tirageId);
    }
  };

  /* ============================================================
     4. IA ADAPTER (multi-provider)
     ============================================================ */
  VT.AI = {
    config: null,
    proxyUrl: null,

    _abortController: null,

    init: function (aiConfig) {
      this.config = aiConfig || { provider: 'mistral' };
      this.proxyUrl = aiConfig.proxyUrl || null;
    },

    /** Annule l'appel IA en cours (appeler au restart) */
    abort: function () {
      if (this._abortController) {
        try { this._abortController.abort(); } catch (e) {}
        this._abortController = null;
      }
    },

    generate: function (prompt, systemPrompt) {
      // Annuler tout appel precedent
      this.abort();
      this._abortController = new AbortController();
      var signal = this._abortController.signal;
      var self = this;

      // Timeout 30s
      var timeoutId = setTimeout(function () { self.abort(); }, 30000);

      // Si proxy WP configure, router via le serveur
      if (this.proxyUrl) {
        return this._callProxy(this.proxyUrl, prompt, systemPrompt, signal, timeoutId);
      }

      var provider = (this.config.provider || 'mistral').toLowerCase();
      var apiKey = this.config.apiKey;
      var model = this.config.model;

      switch (provider) {
        case 'mistral':
          return this._callMistral(apiKey, model || 'mistral-small-latest', prompt, systemPrompt, signal, timeoutId);
        case 'openai':
          return this._callOpenAI(apiKey, model || 'gpt-4o-mini', prompt, systemPrompt, signal, timeoutId);
        case 'gemini':
          return this._callGemini(apiKey, model || 'gemini-1.5-flash', prompt, systemPrompt, signal, timeoutId);
        case 'anthropic':
          return this._callAnthropic(apiKey, model || 'claude-haiku-20240307', prompt, systemPrompt, signal, timeoutId);
        default:
          clearTimeout(timeoutId);
          return Promise.reject(new Error('Provider IA inconnu : ' + provider));
      }
    },

    _getNonce: function () {
      return (window.vtWpConfig && window.vtWpConfig.nonce) || '';
    },

    _callProxy: function (proxyUrl, prompt, systemPrompt, signal, timeoutId) {
      var params = new URLSearchParams();
      params.append('prompt', prompt);
      params.append('systemPrompt', systemPrompt || '');
      params.append('nonce', this._getNonce());
      return fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: signal
      }).then(function (r) {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('Proxy error ' + r.status);
        return r.json();
      }).then(function (data) {
        if (data.success === false) throw new Error(data.data && data.data.message || 'Erreur proxy');
        return data.data && data.data.content || data.content || data.text || JSON.stringify(data);
      }).catch(function (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('Requête annulée (timeout ou restart).');
        throw e;
      });
    },

    _callMistral: function (apiKey, model, prompt, systemPrompt, signal, timeoutId) {
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: model, messages: messages }),
        signal: signal
      }).then(function (r) {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('Mistral API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      }).catch(function (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('Requête annulée (timeout ou restart).');
        throw e;
      });
    },

    _callOpenAI: function (apiKey, model, prompt, systemPrompt, signal, timeoutId) {
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: model, messages: messages }),
        signal: signal
      }).then(function (r) {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('OpenAI API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      }).catch(function (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('Requête annulée (timeout ou restart).');
        throw e;
      });
    },

    _callGemini: function (apiKey, model, prompt, systemPrompt, signal, timeoutId) {
      var body = {
        contents: [{ parts: [{ text: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt }] }]
      };

      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: signal
      }).then(function (r) {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('Gemini API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
      }).catch(function (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('Requête annulée (timeout ou restart).');
        throw e;
      });
    },

    _callAnthropic: function (apiKey, model, prompt, systemPrompt, signal, timeoutId) {
      var body = {
        model: model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      };
      if (systemPrompt) body.system = systemPrompt;

      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: signal
      }).then(function (r) {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('Anthropic API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return (data.content && data.content[0] && data.content[0].text) || '';
      }).catch(function (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('Requête annulée (timeout ou restart).');
        throw e;
      });
    }
  };

  /* ============================================================
     5. TTS (Web Speech API)
     ============================================================ */
  VT.TTS = {
    synth: null,
    utterance: null,
    config: { enabled: true, autoplay: false },

    init: function (ttsConfig) {
      this.config = {
        enabled: ttsConfig ? ttsConfig.enabled !== false : true,
        autoplay: ttsConfig ? !!ttsConfig.autoplay : false
      };
      this.synth = window.speechSynthesis || null;
    },

    speak: function (text) {
      if (!this.config.enabled || !this.synth) return;
      this.stop();

      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.95;

      var voices = this.synth.getVoices();
      var frVoice = voices.find(function (v) { return v.lang.indexOf('fr') === 0; });
      if (frVoice) utterance.voice = frVoice;

      this.utterance = utterance;
      this.synth.speak(utterance);
      VT.Analytics.track('vt_tts_started');
    },

    stop: function () {
      if (this.synth) this.synth.cancel();
    },

    toggle: function () {
      if (!this.synth) return;
      if (this.synth.speaking) {
        this.synth.paused ? this.synth.resume() : this.synth.pause();
      }
    }
  };

  /* ============================================================
     6. ANALYTICS (GTM dataLayer)
     ============================================================ */
  VT.Analytics = {
    track: function (eventName, data) {
      var dl = window.dataLayer = window.dataLayer || [];
      var payload = { event: eventName };
      if (data) {
        for (var k in data) {
          if (data.hasOwnProperty(k)) payload[k] = data[k];
        }
      }
      dl.push(payload);
    }
  };

  /* ============================================================
     7. I18N
     ============================================================ */
  VT.I18n = {
    strings: {},
    locale: 'fr',

    init: function (stringsObj) {
      var htmlLang = document.documentElement.lang || 'fr';
      this.locale = htmlLang.split('-')[0];
      this.strings = stringsObj || {};
    },

    t: function (key, vars) {
      var str = this.strings[key] || key;
      if (vars) {
        for (var k in vars) {
          if (vars.hasOwnProperty(k)) {
            str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
          }
        }
      }
      return str;
    }
  };

  /* ============================================================
     8. EMAIL CAPTURE
     ============================================================ */
  VT.Email = {
    config: null,

    init: function (emailConfig) {
      this.config = emailConfig || { enabled: false };
    },

    submit: function (email, listId) {
      if (!this.config.enabled) return Promise.resolve();

      // Si un proxy URL est defini (mode WordPress), toujours passer par le proxy
      if (this.config.emailProxyUrl) {
        return this._viaProxy(email);
      }

      var provider = (this.config.provider || 'webhook').toLowerCase();

      switch (provider) {
        case 'brevo':
          return this._brevo(email, listId);
        case 'mailchimp':
          return this._mailchimp(email, listId);
        case 'webhook':
        default:
          return this._webhook(email);
      }
    },

    _viaProxy: function (email) {
      var nonce = (window.vtWpConfig && window.vtWpConfig.nonce) || '';
      var params = new URLSearchParams();
      params.append('email', email);
      params.append('nonce', nonce);
      return fetch(this.config.emailProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).then(function (r) {
        if (!r.ok) throw new Error('Erreur email ' + r.status);
        return r.json();
      }).then(function (data) {
        if (data.success === false) throw new Error(data.data && data.data.message || 'Erreur email');
      });
    },

    _brevo: function (email, listId) {
      // Mode WordPress : passer par le proxy PHP (cle API cote serveur)
      if (this.config.emailProxyUrl) {
        var brevoParams = new URLSearchParams();
        brevoParams.append('email', email);
        brevoParams.append('nonce', (window.vtWpConfig && window.vtWpConfig.nonce) || '');
        return fetch(this.config.emailProxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: brevoParams.toString()
        }).then(function (r) {
          if (!r.ok) throw new Error('Erreur email ' + r.status);
          return r.json();
        }).then(function (data) {
          if (data.success === false) throw new Error(data.data && data.data.message || 'Erreur email');
        });
      }
      // Mode autonome (cle API directe — hors WordPress)
      return fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey || ''
        },
        body: JSON.stringify({
          email: email,
          listIds: listId ? [listId] : [],
          updateEnabled: true
        })
      }).then(function (r) {
        if (!r.ok && r.status !== 204) throw new Error('Brevo error ' + r.status);
      });
    },

    _mailchimp: function (email, listId) {
      var dc = this.config.dataCenter || 'us1';
      var url = 'https://' + dc + '.api.mailchimp.com/3.0/lists/' + listId + '/members';
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'apikey ' + (this.config.apiKey || '')
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed'
        })
      }).then(function (r) {
        if (!r.ok && r.status !== 400) throw new Error('Mailchimp error ' + r.status);
      });
    },

    _webhook: function (email) {
      var url = this.config.webhookUrl || '';
      if (!url) return Promise.resolve();
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      }).then(function (r) {
        if (!r.ok) throw new Error('Webhook error ' + r.status);
      });
    }
  };

  /* ============================================================
     9. CONFIG LOADER
     ============================================================ */
  VT.Config = {
    data: null,

    load: function (scriptId) {
      var el = document.getElementById(scriptId);
      if (!el) {
        console.warn('[VT] Config introuvable : #' + scriptId);
        return {};
      }
      try {
        this.data = JSON.parse(el.textContent);
      } catch (e) {
        console.warn('[VT] Erreur parsing config :', e);
        this.data = {};
      }
      return this.data;
    },

    get: function (key, fallback) {
      if (!this.data) return fallback;
      return this.data[key] !== undefined ? this.data[key] : fallback;
    }
  };

  /* ============================================================
     10. THEME TOGGLE (dark/light)
     ============================================================ */
  VT.Theme = {
    STORAGE_KEY: 'vt_theme',
    DARK: 'dark',
    LIGHT: 'light',

    init: function () {
      var saved = localStorage.getItem(this.STORAGE_KEY);
      var theme = saved || this.DARK;
      this.apply(theme);

      var self = this;
      var toggleBtns = document.querySelectorAll('.vt-theme-toggle');
      toggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.toggle();
        });
      });
    },

    apply: function (theme) {
      var app = document.querySelector('.vt-app');
      if (!app) return;
      app.setAttribute('data-theme', theme);
      localStorage.setItem(this.STORAGE_KEY, theme);

      // Mettre a jour le fond du body aussi
      if (theme === this.LIGHT) {
        document.body.style.backgroundColor = '#faf5ff';
      } else {
        document.body.style.backgroundColor = '#0a0012';
      }
    },

    toggle: function () {
      var current = document.querySelector('.vt-app').getAttribute('data-theme') || this.DARK;
      var next = current === this.DARK ? this.LIGHT : this.DARK;
      this.apply(next);
      VT.Analytics.track('vt_theme_toggled', { theme: next });
    },

    isDark: function () {
      return (document.querySelector('.vt-app').getAttribute('data-theme') || this.DARK) === this.DARK;
    }
  };

  /* ============================================================
     11. APP HELPER — Methodes communes (factorisation)
     ============================================================ */
  VT.App = {
    checkRateLimit: function (app) {
      var tirageId = app.config.tirageId || 'tirage';
      var remaining = VT.RateLimiter.getRemaining(tirageId);
      var infoEl = VT.$('.vt-rate-info');
      if (infoEl && remaining !== Infinity) {
        infoEl.textContent = VT.I18n.t('rateLimiter.remaining', { count: remaining });
      }
    },

    showError: function (app, message) {
      VT.StepEngine.goTo(1);
      var errorEl = VT.$('#vt-error');
      if (errorEl) {
        errorEl.querySelector('p').textContent = message;
        errorEl.classList.remove('vt-hidden');
      }
    },

    hideError: function (selector) {
      var sel = selector || '#vt-error';
      var errorEl = VT.$(sel);
      if (errorEl) errorEl.classList.add('vt-hidden');
    },

    showRateLimitModal: function () {
      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.add('vt-modal--open');
    },

    showEmailModal: function () {
      var modal = VT.$('#vt-email-modal');
      if (modal) modal.classList.add('vt-modal--open');
    },

    submitEmail: function (app) {
      var email = VT.$('#vt-email-input').value.trim();
      if (!email || !email.includes('@')) return;

      var tirageId = app.config.tirageId || 'tirage';
      VT.Email.submit(email)
        .then(function () {
          VT.Analytics.track('vt_email_submitted', { type: tirageId });
          var formEl = VT.$('#vt-email-form');
          var successEl = VT.$('.vt-email-success');
          if (formEl) formEl.classList.add('vt-hidden');
          if (successEl) successEl.classList.remove('vt-hidden');
        })
        .catch(function () {
          VT.App.showError(app, 'Erreur lors de l\'envoi. Reessayez.');
        });
    },

    extendRateLimit: function (app) {
      var email = VT.$('#vt-extend-email').value.trim();
      if (!email || !email.includes('@')) return;

      var tirageId = app.config.tirageId || 'tirage';
      VT.RateLimiter.extendLimit(tirageId);
      VT.Analytics.track('vt_rate_limit_extended', { type: tirageId });

      var modal = VT.$('#vt-rate-limit-modal');
      if (modal) modal.classList.remove('vt-modal--open');

      app._doTirage();
    },

    /** Fermer les modales ouvertes avec Escape + focus trap basique */
    initModalAccessibility: function () {
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var openModals = VT.$$('.vt-modal-overlay.vt-modal--open');
        openModals.forEach(function (modal) {
          modal.classList.remove('vt-modal--open');
          // Retourner le focus au bouton qui a ouvert la modale
          var trigger = modal.dataset.triggerId && VT.$('#' + modal.dataset.triggerId);
          if (trigger) trigger.focus();
        });
      });
    },

    /** Bind le bouton TTS (.vt-tts-btn) au toggle global */
    initTTSButton: function () {
      VT.on('.vt-tts-btn', 'click', function () {
        VT.TTS.toggle();
      });
    },

    /** Ferme toutes les modales overlay ouvertes */
    closeAllModals: function () {
      VT.$$('.vt-modal-overlay').forEach(function (m) {
        m.classList.remove('vt-modal--open');
        m.style.display = '';
      });
    },

    /** Ferme une modale specifique par son ID */
    closeModal: function (id) {
      var modal = VT.$('#' + id);
      if (modal) modal.classList.remove('vt-modal--open');
    },

    animateScore: function (el, target) {
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

    sanitize: function (str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    },

    drawMandala: function (ctx, W, H) {
      var cx = W / 2, cy = H / 2;
      var s = Math.max(W, H) * 1.4 / 600;
      var LW = 18;

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
  };

  /* ============================================================
     12. HELPERS
     ============================================================ */
  VT.$ = function (selector) {
    return document.querySelector(selector);
  };

  VT.$$ = function (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  };

  VT.on = function (el, event, fn) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) el.addEventListener(event, fn);
  };

  /* ============================================================
     EXPORT
     ============================================================ */
  window.VT = VT;
})();
