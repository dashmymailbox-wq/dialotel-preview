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

    init: function (aiConfig) {
      this.config = aiConfig || { provider: 'mistral' };
      this.proxyUrl = aiConfig.proxyUrl || null;
    },

    generate: function (prompt, systemPrompt) {
      // Si proxy WP configure, router via le serveur
      if (this.proxyUrl) {
        return this._callProxy(this.proxyUrl, prompt, systemPrompt);
      }

      var provider = (this.config.provider || 'mistral').toLowerCase();
      var apiKey = this.config.apiKey;
      var model = this.config.model;

      switch (provider) {
        case 'mistral':
          return this._callMistral(apiKey, model || 'mistral-small-latest', prompt, systemPrompt);
        case 'openai':
          return this._callOpenAI(apiKey, model || 'gpt-4o-mini', prompt, systemPrompt);
        case 'gemini':
          return this._callGemini(apiKey, model || 'gemini-1.5-flash', prompt, systemPrompt);
        case 'anthropic':
          return this._callAnthropic(apiKey, model || 'claude-haiku-20240307', prompt, systemPrompt);
        default:
          return Promise.reject(new Error('Provider IA inconnu : ' + provider));
      }
    },

    _getNonce: function () {
      return (window.vtWpConfig && window.vtWpConfig.nonce) || '';
    },

    _callProxy: function (proxyUrl, prompt, systemPrompt) {
      var payload = { prompt: prompt, systemPrompt: systemPrompt || '', nonce: this._getNonce() };
      return fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('Proxy error ' + r.status);
        return r.json();
      }).then(function (data) {
        if (data.success === false) throw new Error(data.data && data.data.message || 'Erreur proxy');
        return data.data && data.data.content || data.content || data.text || JSON.stringify(data);
      });
    },

    _callMistral: function (apiKey, model, prompt, systemPrompt) {
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: model, messages: messages })
      }).then(function (r) {
        if (!r.ok) throw new Error('Mistral API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return data.choices[0].message.content;
      });
    },

    _callOpenAI: function (apiKey, model, prompt, systemPrompt) {
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: model, messages: messages })
      }).then(function (r) {
        if (!r.ok) throw new Error('OpenAI API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return data.choices[0].message.content;
      });
    },

    _callGemini: function (apiKey, model, prompt, systemPrompt) {
      var body = {
        contents: [{ parts: [{ text: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt }] }]
      };

      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) throw new Error('Gemini API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return data.candidates[0].content.parts[0].text;
      });
    },

    _callAnthropic: function (apiKey, model, prompt, systemPrompt) {
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
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) throw new Error('Anthropic API error ' + r.status);
        return r.json();
      }).then(function (data) {
        return data.content[0].text;
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
    },

    isSpeaking: function () {
      return this.synth && this.synth.speaking;
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
      return fetch(this.config.emailProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, nonce: nonce })
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
        return fetch(this.config.emailProxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, nonce: (window.vtWpConfig && window.vtWpConfig.nonce) || '' })
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
     11. HELPERS
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

  VT.off = function (el, event, fn) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) el.removeEventListener(event, fn);
  };

  /* ============================================================
     EXPORT
     ============================================================ */
  window.VT = VT;
})();
