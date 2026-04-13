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

    _callProxy: function (proxyUrl, prompt, systemPrompt) {
      return fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, systemPrompt: systemPrompt || '' })
      }).then(function (r) {
        if (!r.ok) throw new Error('Proxy error ' + r.status);
        return r.json();
      }).then(function (data) {
        return data.content || data.text || data.choices[0].message.content || JSON.stringify(data);
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

    _brevo: function (email, listId) {
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
     12. PARTAGE IMAGE (Canvas → Web Share API / téléchargement)
     ============================================================ */
  VT.ShareCard = {
    // Génère un canvas 1080×1080 avec le score et les données passées
    // data : { title, names, score, url }
    generate: function (data) {
      var canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      var ctx = canvas.getContext('2d');

      // Lire les couleurs depuis les variables CSS actives (thème Dialotel ou autre)
      var styles = getComputedStyle(document.documentElement);
      var appEl = document.querySelector('.vt-app');
      if (appEl) styles = getComputedStyle(appEl);
      var colorBg      = (styles.getPropertyValue('--theme-bg') || '#ffffff').trim();
      var colorPrimary = (styles.getPropertyValue('--theme-primary') || '#ed8ce6').trim();
      var colorSecondary = (styles.getPropertyValue('--theme-secondary') || '#e2ed77').trim();
      var colorText    = (styles.getPropertyValue('--theme-text') || '#000000').trim();
      var colorMuted   = (styles.getPropertyValue('--theme-text-muted') || '#666666').trim();

      var W = 1080, H = 1080;

      // Fond
      ctx.fillStyle = colorBg;
      ctx.fillRect(0, 0, W, H);

      // Bordure décorative (rose, 8px)
      ctx.strokeStyle = colorPrimary;
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      // Ligne décorative secondaire intérieure (jaune, 2px)
      ctx.strokeStyle = colorSecondary;
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, W - 72, H - 72);

      // Titre de l'app
      ctx.fillStyle = colorPrimary;
      ctx.font = 'bold 44px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(data.title || '', W / 2, 160);

      // Noms
      ctx.fillStyle = colorText;
      ctx.font = '500 56px Georgia, serif';
      ctx.fillText(data.names || '', W / 2, 290);

      // Score — très grand
      ctx.fillStyle = colorPrimary;
      ctx.font = 'bold 260px Georgia, serif';
      ctx.fillText(data.score || '', W / 2, 600);

      // Barre de score
      var barW = 560, barH = 22, barX = (W - barW) / 2, barY = 660;
      // fond barre
      ctx.fillStyle = colorMuted;
      ctx.beginPath();
      this._roundRect(ctx, barX, barY, barW, barH, barH / 2);
      ctx.fill();
      // remplissage barre (dégradé rose→jaune)
      var scoreNum = parseInt((data.score || '0').replace('%', ''), 10) || 0;
      var fillW = Math.round(barW * scoreNum / 100);
      if (fillW > 0) {
        var grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        grad.addColorStop(0, colorPrimary);
        grad.addColorStop(1, colorSecondary);
        ctx.fillStyle = grad;
        ctx.beginPath();
        this._roundRect(ctx, barX, barY, fillW, barH, barH / 2);
        ctx.fill();
      }

      // Label sous la barre
      ctx.fillStyle = colorMuted;
      ctx.font = '32px Georgia, serif';
      ctx.fillText('compatibilite amoureuse', W / 2, 740);

      // URL / branding
      ctx.fillStyle = colorPrimary;
      ctx.font = '28px Georgia, serif';
      ctx.fillText(data.url || '', W / 2, 980);

      return canvas;
    },

    // Tracé d'un rectangle arrondi compatible tous navigateurs
    _roundRect: function (ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    },

    // Retourne un dataURL PNG synchrone — à utiliser directement dans un handler de clic
    toDataURL: function (canvas) {
      return canvas.toDataURL('image/png');
    },

    // Retourne un File PNG via Promise — pour Web Share API mobile
    toFile: function (canvas, filename) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          resolve(new File([blob], filename || 'partage.png', { type: 'image/png' }));
        }, 'image/png');
      });
    }
  };

  /* ============================================================
     EXPORT
     ============================================================ */
  window.VT = VT;
})();
