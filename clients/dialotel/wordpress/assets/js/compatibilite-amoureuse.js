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
      var self = this;

      /* --- Collecte des données du résultat --- */
      var scoreText = (VT.$('#vt-result-score') || {}).textContent || '0%';
      var score   = parseInt(scoreText, 10) || 0;
      var resume  = (VT.$('#vt-result-resume') || {}).textContent || '';
      var conseil = (VT.$('#vt-result-advice') || {}).textContent || '';
      var pfArr = [], tArr = [];
      VT.$$('#vt-result-strengths li').forEach(function (li) { pfArr.push(li.textContent.trim()); });
      VT.$$('#vt-result-tensions  li').forEach(function (li) { tArr .push(li.textContent.trim()); });
      var name1 = this._name1 || '', name2 = this._name2 || '';
      var sign1 = this._sign1, sign2 = this._sign2;

      var ZODIAC = {
        aries:'♈', taurus:'♉', gemini:'♊', cancer:'♋', leo:'♌',    virgo:'♍',
        libra:'♎', scorpio:'♏', sagittarius:'♐', capricorn:'♑', aquarius:'♒', pisces:'♓'
      };

      /* --- Mise en page --- */
      var SC = 2, W = 800, PAD = 40, CW = W - PAD * 2;

      /* roundRect avec fallback pour anciens navigateurs */
      function rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
      }

      /* --- Fonction de rendu sur contexte 2D --- */
      function render(ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, 3000);

        var y = PAD;

        /* Titre site */
        ctx.save();
        ctx.fillStyle = '#7c3aed';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Hexagon Voyance', W / 2, y + 14);
        ctx.restore();
        y += 44;

        /* Séparateur */
        ctx.save();
        ctx.strokeStyle = '#ede9fe'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
        ctx.restore();
        y += 22;

        /* --- Zone personnes + cœur --- */
        var HW = 120, HH = Math.round(HW * 145 / 160); /* 109 px */
        var BR = 30;   /* rayon badge */
        var midY = y + Math.round(HH / 2);
        var bx1 = PAD + 75, bx2 = W - PAD - 75;

        /* Cœur en Path2D */
        ctx.save();
        ctx.translate(W / 2 - HW / 2, y);
        ctx.scale(HW / 160, HH / 145);
        var hPath = new Path2D('M80 140 C80 140 5 95 5 52 C5 25 25 5 50 5 C63 5 74 12 80 24 C86 12 97 5 110 5 C135 5 155 25 155 52 C155 95 80 140 80 140Z');
        var hGrad = ctx.createLinearGradient(0, 0, 0, 145);
        hGrad.addColorStop(0,   '#f5a0ef');
        hGrad.addColorStop(0.4, '#ed8ce6');
        hGrad.addColorStop(1,   '#d66bc8');
        ctx.fillStyle = hGrad;
        ctx.fill(hPath);
        ctx.restore();

        /* Score centré dans le cœur */
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(score + '%', W / 2, y + Math.round(HH * 0.58));
        ctx.restore();

        /* Badges zodiaque */
        function drawBadge(bx, signData) {
          ctx.save();
          ctx.beginPath(); ctx.arc(bx, midY, BR, 0, Math.PI * 2);
          var g = ctx.createRadialGradient(bx, midY - 8, 4, bx, midY, BR);
          g.addColorStop(0, '#c084fc'); g.addColorStop(1, '#7c3aed');
          ctx.fillStyle = g; ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '22px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var sym = (signData && ZODIAC[signData.key]) ? ZODIAC[signData.key] : '★';
          ctx.fillText(sym, bx, midY);
          ctx.restore();
        }
        drawBadge(bx1, sign1);
        drawBadge(bx2, sign2);

        /* Noms + signes sous les badges */
        function personLabel(bx, name, sign) {
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 14px Arial, sans-serif';
          ctx.fillText(name, bx, midY + BR + 10);
          if (sign) {
            ctx.fillStyle = '#a855f7';
            ctx.font = '12px Arial, sans-serif';
            ctx.fillText(sign.name, bx, midY + BR + 28);
          }
          ctx.restore();
        }
        personLabel(bx1, name1, sign1);
        personLabel(bx2, name2, sign2);

        y += HH + 58; /* 167 — noms à midY+BR+28 = y_zone+112 < 167 ✓ */

        /* Label "de compatibilité" */
        ctx.save();
        ctx.fillStyle = '#9ca3af'; ctx.font = '13px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('de compatibilité', W / 2, y);
        ctx.restore();
        y += 26;

        /* Barre de score */
        rr(ctx, PAD, y, CW, 10, 5);
        ctx.fillStyle = '#f3e8ff'; ctx.fill();
        if (score > 0) {
          rr(ctx, PAD, y, CW * score / 100, 10, 5);
          var barGrad = ctx.createLinearGradient(PAD, 0, PAD + CW, 0);
          barGrad.addColorStop(0, '#f5a0ef'); barGrad.addColorStop(1, '#d66bc8');
          ctx.fillStyle = barGrad; ctx.fill();
        }
        y += 30;

        /* --- Cartes de contenu --- */
        var CP = 16, LH = 22, IH = 26;

        function card(title, icon, accent, content, isArr, italic) {
          if (!content || (isArr && !content.length) || (!isArr && !content.trim())) return;
          ctx.font = '14px Arial, sans-serif';
          var innerW = CW - CP * 2;
          var contentH;
          if (isArr) {
            contentH = content.length * IH;
          } else {
            var wds = content.split(' '), l = '', n = 1;
            wds.forEach(function (w) {
              var t = l + w + ' ';
              if (l && ctx.measureText(t).width > innerW) { n++; l = w + ' '; } else l = t;
            });
            contentH = n * LH;
          }
          var cH = CP + 28 + 6 + contentH + CP;

          ctx.save();
          ctx.fillStyle = '#faf5ff'; rr(ctx, PAD, y, CW, cH, 8); ctx.fill();
          ctx.fillStyle = accent;    ctx.fillRect(PAD, y, 4, cH);
          ctx.fillStyle = accent;
          ctx.font = 'bold 13px Arial, sans-serif';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(icon + ' ' + title, PAD + CP, y + CP + 14);
          ctx.fillStyle = '#374151';
          ctx.font = (italic ? 'italic ' : '') + '14px Arial, sans-serif';
          ctx.textBaseline = 'top';
          var ty = y + CP + 28 + 6;
          if (isArr) {
            content.forEach(function (item, i) {
              ctx.fillText('• ' + item, PAD + CP, ty + i * IH);
            });
          } else {
            var wds2 = content.split(' '), l2 = '', li2 = 0;
            wds2.forEach(function (w) {
              var t2 = l2 + w + ' ';
              if (l2 && ctx.measureText(t2).width > innerW) {
                ctx.fillText(l2.trim(), PAD + CP, ty + li2 * LH); li2++; l2 = w + ' ';
              } else l2 = t2;
            });
            ctx.fillText(l2.trim(), PAD + CP, ty + li2 * LH);
          }
          ctx.restore();
          y += cH + 12;
        }

        card('En résumé',          '♥', '#d66bc8', resume,  false, true);
        card('Points forts',       '✦', '#7c3aed', pfArr,   true,  false);
        card('Points de tension',  '⚡', '#f59e0b', tArr,    true,  false);
        card('Conseil des étoiles','✧', '#059669', conseil, false, true);

        /* Pied de page */
        y += 8;
        ctx.save();
        ctx.fillStyle = '#c084fc'; ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('hexagon-voyance.com', W / 2, y);
        ctx.restore();
        y += 38;

        return y;
      }

      /* Rendu sur canvas de travail (hauteur généreuse) */
      var wk = document.createElement('canvas');
      wk.width = W * SC; wk.height = 3000;
      var wkCtx = wk.getContext('2d');
      wkCtx.scale(SC, SC);
      var endY = render(wkCtx);

      /* Canvas final rogné à la hauteur réelle */
      var out = document.createElement('canvas');
      out.width  = W * SC;
      out.height = Math.ceil(endY * SC);
      out.getContext('2d').drawImage(wk, 0, 0);

      /* Affichage dans la modale */
      var dataURL = out.toDataURL('image/png');
      var modal   = document.getElementById('vt-share-modal');
      var preview = document.getElementById('vt-share-preview');
      var dlBtn   = document.getElementById('vt-share-download');
      if (!modal) return;
      if (preview) preview.src  = dataURL;
      if (dlBtn)   dlBtn.href   = dataURL;
      modal.style.display = 'flex';

      VT.Analytics.track('vt_share', { platform: 'image', type: 'compatibilite-amoureuse' });
    }
  };

  // Demarrage au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { app.init(); });
  } else {
    app.init();
  }
})();
