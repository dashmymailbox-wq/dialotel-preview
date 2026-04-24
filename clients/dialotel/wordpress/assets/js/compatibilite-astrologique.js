/* compatibilite-astrologique.js — Logique specifique app compatibilite astrologique */
;(function () {
  'use strict';

  var app = {
    config: null,
    promptTemplate: '',
    signsData: null,
    matrixData: null,
    _sign1: null,
    _sign2: null,
    _theme: 'amour',

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
      this._checkRateLimit();
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

      window._vtShareImage = function () { self._shareImage(); };

      VT.on('#vt-email-form', 'submit', function (e) {
        e.preventDefault();
        self._submitEmail();
      });

      VT.on('#vt-extend-form', 'submit', function (e) {
        e.preventDefault();
        self._extendRateLimit();
      });

      // Selection du theme
      VT.$$('.vt-astro-theme-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          VT.$$('.vt-astro-theme-btn').forEach(function (b) { b.classList.remove('vt-astro-theme-btn--selected'); });
          btn.classList.add('vt-astro-theme-btn--selected');
          self._theme = btn.dataset.theme;
        });
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

    _checkRateLimit: function () {
      var tirageId = this.config.tirageId || 'compat-astro';
      var remaining = VT.RateLimiter.getRemaining(tirageId);
      var infoEl = VT.$('.vt-rate-info');
      if (infoEl && remaining !== Infinity) {
        infoEl.textContent = VT.I18n.t('rateLimiter.remaining', { count: remaining });
      }
    },

    _doTirage: function () {
      var self = this;
      var tirageId = this.config.tirageId || 'compat-astro';

      if (!VT.RateLimiter.canDoTirage(tirageId)) {
        VT.Analytics.track('vt_rate_limit_hit', { type: 'compatibilite-astrologique' });
        this._showRateLimitModal();
        return;
      }

      var sign1 = this._getSelectedSign('1');
      var sign2 = this._getSelectedSign('2');

      if (!sign1 || !sign2) {
        this._showError('Veuillez selectionner deux signes astrologiques.');
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

      this._sign1 = { key: sign1, name: sign1Name };
      this._sign2 = { key: sign2, name: sign2Name };

      var baseScore = this._lookupScore(sign1, sign2);

      // Etape rituelle
      VT.StepEngine.goTo(2);

      // Mettre a jour les noms dans le rituel
      var nameEls = VT.$$('.vt-astro-ritual-name');
      if (nameEls[0]) nameEls[0].innerHTML = '<svg class="vt-astro-ritual-sign-icon"><use href="#sign-' + sign1 + '"/></svg><span>' + sign1Name + '</span>';
      if (nameEls[1]) nameEls[1].innerHTML = '<svg class="vt-astro-ritual-sign-icon"><use href="#sign-' + sign2 + '"/></svg><span>' + sign2Name + '</span>';

      var themeLabels = { amour: 'Amour', amitie: 'Amitié', travail: 'Travail', famille: 'Famille' };
      var ritualThemeEl = VT.$('#vt-astro-ritual-theme');
      if (ritualThemeEl) ritualThemeEl.textContent = themeLabels[this._theme] || 'Amour';

      var prompt = this._buildPrompt(sign1Name, sign2Name, baseScore);

      var aiConfig = this.config.ai || {};
      VT.AI.init(aiConfig);

      // Messages de patience cycles pendant l'appel IA
      var _pMsgs = [
        'Les astres consultent votre destinee...',
        'L\'energie cosmique se concentre...',
        'Les constellations s\'alignent pour vous...',
        'Votre avenir se revele dans les etoiles...',
      ];
      var _pIdx = 0;
      var _pEl = VT.$('.vt-astro-ritual-text');
      var _pTimer = setInterval(function () {
        _pIdx = (_pIdx + 1) % _pMsgs.length;
        if (_pEl) _pEl.textContent = _pMsgs[_pIdx];
      }, 3000);

      VT.AI.generate(prompt, this.promptTemplate)
        .then(function (response) {
          clearInterval(_pTimer);
          var result = self._parseResponse(response);
          if (result) {
            if (baseScore) result.score = baseScore;
            try {
              self._showResult(result);
            } catch (e) {
              console.error('[VT] Erreur _showResult :', e);
            }
            VT.RateLimiter.recordTirage(tirageId);
            VT.Counter.increment();
            VT.Analytics.track('vt_tirage_completed', { type: 'compatibilite-astrologique', score: result.score });
          } else {
            self._showError('Impossible d\'interpreter le resultat. Reessayez.');
          }
        })
        .catch(function (err) {
          clearInterval(_pTimer);
          console.error('[VT] Erreur IA :', err);
          self._showError('Nos voyants sont tres sollicites en ce moment. Reessayez dans quelques instants.');
        });
    },

    _buildPrompt: function (name1, name2, baseScore) {
      var themeLabels = { amour: 'Amour', amitie: 'Amitie', travail: 'Travail', famille: 'Famille' };
      var parts = [
        'Signe 1 : ' + name1,
        'Signe 2 : ' + name2,
        'Theme : ' + (themeLabels[this._theme] || 'Amour')
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

      var ZODIAC = { aries:'♈', taurus:'♉', gemini:'♊', cancer:'♋', leo:'♌', virgo:'♍', libra:'♎', scorpio:'♏', sagittarius:'♐', capricorn:'♑', aquarius:'♒', pisces:'♓' };
      var headerEl = VT.$('#vt-result-header');
      if (headerEl && this._sign1 && this._sign2) {
        headerEl.innerHTML =
          '<div class="vt-result-person">' +
            '<div class="vt-sign-badge vt-sign-badge--result"><svg><use href="#sign-' + this._sign1.key + '"/></svg></div>' +
            '<span class="vt-result-person-name">' + this._sign1.name + '</span>' +
          '</div>' +
          '<span class="vt-result-person-link" style="font-size:1.1rem;">✦</span>' +
          '<div class="vt-result-person">' +
            '<div class="vt-sign-badge vt-sign-badge--result"><svg><use href="#sign-' + this._sign2.key + '"/></svg></div>' +
            '<span class="vt-result-person-name">' + this._sign2.name + '</span>' +
          '</div>';
      }

      var scoreEl = VT.$('#vt-result-score');
      if (scoreEl) this._animateScore(scoreEl, result.score);

      var barFill = VT.$('.vt-astro-score-bar-fill');
      if (barFill) barFill.style.width = result.score + '%';

      var profileEl = VT.$('#vt-result-profile');
      if (profileEl) profileEl.textContent = result.profilCombine;

      var traitsEl = VT.$('#vt-result-traits');
      if (traitsEl) traitsEl.innerHTML = result.traits.map(function (t) {
        return '<li>' + t + '</li>';
      }).join('');

      var adviceEl = VT.$('#vt-result-advice');
      if (adviceEl) adviceEl.textContent = result.conseils;

      var ttsText = result.profilCombine + ' ' + result.conseils;
      VT.TTS.speak(ttsText);

      if ((this.config.emailCapture || {}).enabled) {
        VT.Analytics.track('vt_email_shown');
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
          self._showError('Erreur lors de l\'envoi. Reessayez.');
        });
    },

    _shareImage: function () {
      var scoreText = (VT.$('#vt-result-score') || {}).textContent || '0%';
      var score = parseInt(scoreText, 10) || 0;
      var sign1 = this._sign1, sign2 = this._sign2;
      var ZODIAC = { aries:'♈', taurus:'♉', gemini:'♊', cancer:'♋', leo:'♌', virgo:'♍', libra:'♎', scorpio:'♏', sagittarius:'♐', capricorn:'♑', aquarius:'♒', pisces:'♓' };
      var profileEl = VT.$('#vt-result-profile');
      var phrase = profileEl ? profileEl.textContent.trim() : '';

      var SC = 2, W = 512, H = 896;

      function drawMandala(ctx, W, H) {
        var cx = W/2, cy = H/2, s = Math.max(W,H)*1.4/600, LW = 18;
        ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
        function hex(r){ ctx.beginPath(); for(var i=0;i<6;i++){var a=Math.PI/3*i;i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);} ctx.closePath(); }
        function ring(n,sd,dist,sc,fill,stroke,lw){ for(var i=0;i<n;i++){var rad=(sd+360/n*i)*Math.PI/180;ctx.save();ctx.translate(Math.cos(rad)*dist,Math.sin(rad)*dist);hex(sc);if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=lw*LW;ctx.stroke();ctx.restore();} }
        ring(1,0,0,1.5,null,'rgba(237,140,230,0.45)',0.15); ring(6,0,10,2,null,'rgba(237,140,230,0.45)',0.15);
        ring(6,30,22,3,'rgba(226,237,119,0.06)','rgba(226,237,119,0.3)',0.18); ring(12,0,35,3.5,null,'rgba(226,237,119,0.4)',0.12);
        ring(12,15,50,5,'rgba(237,140,230,0.06)','rgba(237,140,230,0.35)',0.14); ring(12,0,60,4,null,'rgba(226,237,119,0.38)',0.1);
        ring(12,0,72,16,null,'rgba(226,237,119,0.6)',0.035); ring(12,0,72,6,'rgba(237,140,230,0.1)','rgba(237,140,230,0.5)',0.07);
        ring(12,15,115,22,null,'rgba(237,140,230,0.6)',0.03); ring(12,15,115,8,'rgba(226,237,119,0.08)','rgba(226,237,119,0.5)',0.06);
        ring(12,0,158,14,null,'rgba(237,140,230,0.55)',0.04); ring(12,0,158,5,'rgba(226,237,119,0.06)','rgba(226,237,119,0.4)',0.09);
        ring(12,15,200,26,null,'rgba(226,237,119,0.55)',0.025); ring(12,15,200,10,'rgba(237,140,230,0.08)','rgba(237,140,230,0.45)',0.05);
        ring(12,0,242,14,null,'rgba(237,140,230,0.55)',0.04); ring(12,0,242,5,'rgba(226,237,119,0.06)','rgba(226,237,119,0.4)',0.09);
        ring(12,15,280,10,null,'rgba(226,237,119,0.45)',0.04);
        ctx.restore();
      }

      function doRender() {
        var canvas = document.createElement('canvas');
        canvas.width = W*SC; canvas.height = H*SC;
        var ctx = canvas.getContext('2d');
        ctx.scale(SC,SC);

        /* Fond */
        var bg = ctx.createRadialGradient(W/2,H*0.45,0,W/2,H*0.45,H*0.85);
        bg.addColorStop(0,'#ffffff'); bg.addColorStop(0.5,'#f8f0ff'); bg.addColorStop(1,'#f0e6f6');
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
        ctx.save(); ctx.globalAlpha=0.5; drawMandala(ctx,W,H); ctx.globalAlpha=1; ctx.restore();
        var veil=ctx.createRadialGradient(W/2,H*0.45,0,W/2,H*0.45,H*0.65);
        veil.addColorStop(0,'rgba(255,255,255,0.3)'); veil.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=veil; ctx.fillRect(0,0,W,H);

        var MARGIN=30, logoW=200, logoH=Math.round(logoW*216/636);
        var OR=100; /* rayon orbe central */
        var OD=OR*2; /* diamètre */
        var BR=34, urlH=16;

        /* Pré-calcul phrase */
        ctx.save(); ctx.font='16px "Lato",Arial,sans-serif';
        var phraseMaxW=W-70, pWords=phrase.split(' '), pLine='', pLines=[];
        pWords.forEach(function(w){var t=pLine+w+' ';if(pLine&&ctx.measureText(t).width>phraseMaxW){pLines.push(pLine.trim());pLine=w+' ';}else pLine=t;});
        if(pLine.trim())pLines.push(pLine.trim()); ctx.restore();
        var pLineH=20, phraseH=pLines.length*pLineH;

        function personH(s){ return BR+(s?50:24); }
        var totalContent=logoH+OD+personH(sign1)+phraseH+personH(sign2)+urlH;
        var GAP=Math.max(12,Math.floor((H-MARGIN*2-totalContent)/5));
        var cursorY=MARGIN;

        /* 1. Badge theme */
        var themeLabels2={'amour':'Amour','amitie':'Amitie','travail':'Travail','famille':'Famille'};
        var themeLabel=themeLabels2[self._theme]||'Amour';
        var pillW=140,pillH=46,pillR=23;
        var pillX=W/2-pillW/2,pillY=cursorY+(logoH-pillH)/2;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pillX+pillR,pillY);
        ctx.lineTo(pillX+pillW-pillR,pillY);
        ctx.arcTo(pillX+pillW,pillY,pillX+pillW,pillY+pillH,pillR);
        ctx.lineTo(pillX+pillW,pillY+pillH-pillR);
        ctx.arcTo(pillX+pillW,pillY+pillH,pillX+pillW-pillR,pillY+pillH,pillR);
        ctx.lineTo(pillX+pillR,pillY+pillH);
        ctx.arcTo(pillX,pillY+pillH,pillX,pillY+pillH-pillR,pillR);
        ctx.lineTo(pillX,pillY+pillR);
        ctx.arcTo(pillX,pillY,pillX+pillR,pillY,pillR);
        ctx.closePath();
        var pillG=ctx.createLinearGradient(pillX,pillY,pillX+pillW,pillY+pillH);
        pillG.addColorStop(0,'#f5a0ef'); pillG.addColorStop(1,'#c055b8');
        ctx.fillStyle=pillG; ctx.fill();
        ctx.fillStyle='#fff'; ctx.font='bold 20px Arial,sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(themeLabel,W/2,pillY+pillH/2);
        ctx.restore();
        cursorY+=logoH+GAP;

        /* 2. Orbe central avec score */
        var oCx=W/2, oCy=cursorY+OR;

        /* Halo */
        var halo=ctx.createRadialGradient(oCx,oCy,0,oCx,oCy,OR+60);
        halo.addColorStop(0,'rgba(237,140,230,0.28)'); halo.addColorStop(1,'rgba(237,140,230,0)');
        ctx.fillStyle=halo; ctx.fillRect(oCx-(OR+60),oCy-(OR+60),(OR+60)*2,(OR+60)*2);

        /* Cercle extérieur (anneau) */
        ctx.beginPath(); ctx.arc(oCx,oCy,OR+8,0,Math.PI*2);
        ctx.strokeStyle='rgba(226,237,119,0.5)'; ctx.lineWidth=1.5; ctx.stroke();

        /* Cercle principal */
        ctx.beginPath(); ctx.arc(oCx,oCy,OR,0,Math.PI*2);
        var oGrad=ctx.createRadialGradient(oCx,oCy-OR*0.25,OR*0.1,oCx,oCy,OR);
        oGrad.addColorStop(0,'#f5a0ef'); oGrad.addColorStop(0.45,'#ed8ce6'); oGrad.addColorStop(1,'#c055b8');
        ctx.fillStyle=oGrad; ctx.fill();

        /* Reflet */
        var refGrad=ctx.createLinearGradient(oCx-OR*0.4,oCy-OR,oCx+OR*0.4,oCy-OR*0.1);
        refGrad.addColorStop(0,'rgba(255,255,255,0.28)'); refGrad.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=refGrad;
        ctx.beginPath(); ctx.arc(oCx,oCy,OR,0,Math.PI*2); ctx.fill();

        /* Score */
        ctx.save();
        ctx.fillStyle='#e2ed77'; ctx.font='bold 52px Arial,sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='rgba(0,0,0,0.25)'; ctx.shadowBlur=10;
        ctx.fillText(score+'%',oCx,oCy);
        ctx.shadowBlur=0; ctx.restore();

        /* Sparkles */
        [[oCx-OR-18,oCy-20,3],[oCx+OR+14,oCy+25,2.5],[oCx-OR+10,oCy+OR-10,2],
         [oCx+OR-8,oCy-OR+15,3.5],[oCx,oCy-OR-18,2.5],[oCx-60,oCy+OR+10,2]].forEach(function(sp){
          var spG=ctx.createRadialGradient(sp[0],sp[1],0,sp[0],sp[1],sp[2]*3);
          spG.addColorStop(0,'rgba(226,237,119,0.7)'); spG.addColorStop(1,'rgba(226,237,119,0)');
          ctx.fillStyle=spG; ctx.fillRect(sp[0]-sp[2]*3,sp[1]-sp[2]*3,sp[2]*6,sp[2]*6);
          ctx.beginPath(); ctx.arc(sp[0],sp[1],sp[2],0,Math.PI*2);
          ctx.fillStyle='#e2ed77'; ctx.fill();
        });

        cursorY+=OD+GAP;

        /* 3 & 5. Blocs signe */
        function drawSignBlock(cx,cy,signData){
          ctx.save();
          ctx.beginPath(); ctx.arc(cx,cy,BR,0,Math.PI*2);
          var g=ctx.createRadialGradient(cx,cy-8,3,cx,cy,BR);
          g.addColorStop(0,'#c084fc'); g.addColorStop(1,'#7c3aed');
          ctx.fillStyle=g; ctx.fill();
          ctx.beginPath(); ctx.arc(cx,cy,BR+4,0,Math.PI*2);
          ctx.strokeStyle='rgba(237,140,230,0.35)'; ctx.lineWidth=2; ctx.stroke();
          ctx.fillStyle='#fff'; ctx.font='24px Arial,sans-serif';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText((signData&&ZODIAC[signData.key])||'★',cx,cy);
          ctx.restore();
          if(signData){
            ctx.save(); ctx.textAlign='center'; ctx.textBaseline='top';
            ctx.fillStyle='#2d1b3d'; ctx.font='bold 18px Arial,sans-serif';
            ctx.fillText(signData.name,cx,cy+BR+12); ctx.restore();
          }
        }

        drawSignBlock(W/2,cursorY+BR,sign1);
        cursorY+=personH(sign1)+GAP;

        /* 4. Phrase */
        ctx.save();
        var tGrad=ctx.createLinearGradient(W/2-130,0,W/2+130,0);
        tGrad.addColorStop(0,'#c084fc'); tGrad.addColorStop(0.5,'#ed8ce6'); tGrad.addColorStop(1,'#c084fc');
        ctx.fillStyle=tGrad; ctx.font='16px "Lato",Arial,sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='top';
        pLines.forEach(function(ln,i){ ctx.fillText(ln,W/2,cursorY+i*pLineH); });
        ctx.restore();
        cursorY+=phraseH+GAP;

        drawSignBlock(W/2,cursorY+BR,sign2);
        cursorY+=personH(sign2)+GAP;

        /* 6. Footer */
        ctx.save(); ctx.fillStyle='#a855f7'; ctx.font='13px Arial,sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText('hexagon-voyance.com',W/2,cursorY); ctx.restore();

        var dataURL;
        try { dataURL=canvas.toDataURL('image/png'); }
        catch(e) { console.error('[VT] canvas.toDataURL failed:',e); return; }
        var modal=document.getElementById('vt-share-modal');
        var preview=document.getElementById('vt-share-preview');
        var dlBtn=document.getElementById('vt-share-download');
        if(!modal) return;
        if(preview) preview.src=dataURL;
        if(dlBtn){ dlBtn.href=dataURL; dlBtn.download='compatibilite-astrologique.png'; }
        modal.style.display='flex';
        VT.Analytics.track('vt_share',{platform:'image',type:'compatibilite-astrologique'});
      }

      try { doRender(); } catch(e) { console.error('[VT] doRender failed:',e); }
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
