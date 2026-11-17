/* ============================================================
   ПОРТАЛ ПРОЕКТОВ СОЧИГУ — поведение и анимации
   ============================================================ */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, n) { return a + (b - a) * n; };

  var params = new URLSearchParams(location.search);
  var shotParam = params.has('shot') ? params.get('shot') : null;
  var isShot = shotParam !== null;
  var staticMode = params.has('static');

  if (isShot || staticMode) {
    var st = document.createElement('style');
    st.textContent = '*{transition-duration:.001ms!important;animation-duration:.001ms!important;animation-delay:0s!important;transition-delay:0s!important}';
    document.head.appendChild(st);
  }
  if (staticMode || isShot) doc.classList.add('static-mode');
  if (params.has('lowpower')) { doc.classList.add('low-power'); window.__lowPower = true; }

  /* ---------------------------------------------------------
     1. LOADER
     --------------------------------------------------------- */
  var loader = $('.loader');

  function finishLoading() {
    if (loader) loader.classList.add('is-done');
    body.classList.remove('is-locked');
    var hero = $('.hero');
    if (hero) hero.classList.add('is-ready');
    var title = $('.hero__title');
    if (title) title.classList.add('is-chars-in');
    var rail = $('.rail');
    if (rail) rail.classList.add('is-ready');
  }

  if (loader && !isShot) {
    body.classList.add('is-locked');
    setTimeout(finishLoading, 1750);
  } else {
    finishLoading();
  }

  /* ---------------------------------------------------------
     2. SMOOTH SCROLL
     --------------------------------------------------------- */
  var lenis = null;
  if (window.Lenis && !reduced && !isTouch && !isShot && !staticMode) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.8
    });
  }
  if (lenis) doc.classList.add('lenis');

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var toTop = (id === '#top');
      if (lenis) {
        lenis.scrollTo(toTop ? 0 : target, { offset: 0, duration: 1.4 });
      } else {
        var y = toTop ? 0 : target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  });

  /* ---------------------------------------------------------
     3. TEXT SPLITTING
     --------------------------------------------------------- */
  function splitIntoChars(root) {
    var chars = [];
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var text = child.nodeValue;
          if (!text) return;
          var frag = document.createDocumentFragment();
          for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (c === '\n' || c === '\t') continue;
            var s = document.createElement('span');
            if (c === ' ') {
              s.className = 'ch ch--sp';
              s.innerHTML = '&nbsp;';
            } else {
              s.className = 'ch';
              s.textContent = c;
            }
            frag.appendChild(s);
            chars.push(s);
          }
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          // treat inline elements (e.g. <em>) as a single animated unit
          if (child.classList && child.classList.contains('ch')) { return; }
          var unit = document.createElement('span');
          unit.className = 'ch';
          child.parentNode.insertBefore(unit, child);
          unit.appendChild(child);
          chars.push(unit);
        }
      });
    }
    walk(root);
    chars.forEach(function (c, i) {
      c.style.transitionDelay = (i * 0.018).toFixed(3) + 's';
    });
    return chars;
  }

  var heroTitle = $('.hero__title');
  if (heroTitle) {
    $$('.hero__title-line', heroTitle).forEach(splitIntoChars);
  }

  $$('[data-split="chars"]').forEach(function (el) {
    if (el.classList.contains('hero__title')) return;
    $$('.hero__title-line, .ln', el).forEach(splitIntoChars);
  });

  $$('[data-split="lines"]').forEach(function (el) {
    var html = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = html.map(function (line) {
      return '<span class="ln"><span class="ln-in">' + line.trim() + '</span></span>';
    }).join('');
  });

  // project titles: line masks + per-char
  $$('.project__title').forEach(function (t) {
    var parts = t.innerHTML.split(/<br\s*\/?>/i);
    if (parts.length > 1) {
      t.innerHTML = parts.map(function (l) {
        return '<span class="ln"><span class="ln-in">' + l.trim() + '</span></span>';
      }).join('');
      $$('.ln-in', t).forEach(function (l) { splitIntoChars(l); });
    } else {
      splitIntoChars(t);
    }
  });

  // scrub words
  var scrubEl = $('[data-scrub-words]');
  var scrubWords = [];
  if (scrubEl) {
    var wordList = scrubEl.textContent.trim().split(/\s+/);
    scrubEl.innerHTML = '';
    wordList.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      scrubEl.appendChild(s);
      if (i < wordList.length - 1) scrubEl.appendChild(document.createTextNode(' '));
      scrubWords.push(s);
    });
  }

  /* ---------------------------------------------------------
     4. REVEAL OBSERVER
     --------------------------------------------------------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  $$('.reveal').forEach(function (el) { revealObserver.observe(el); });

  var projectObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        projectObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -10% 0px' });

  $$('.project').forEach(function (p) {
    projectObserver.observe(p);
    $$('.project__body > *', p).forEach(function (el, i) {
      if (el.classList.contains('project__title')) return;
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
      el.style.transitionDelay = (0.12 + i * 0.07).toFixed(2) + 's';
      revealObserver.observe(el);
    });
    var t = $('.project__title', p);
    if (t) {
      var to = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting) {
            t.classList.add('is-chars-in');
            to.unobserve(t);
          }
        });
      }, { threshold: 0.3 });
      to.observe(t);
    }
  });

  // pause looping CSS animations in sections that are off screen
  var visObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('is-visible', e.isIntersecting); });
  }, { rootMargin: '12% 0px' });
  $$('.hero, .about, .project, .ftr').forEach(function (el) { visObserver.observe(el); });

  $$('.index__title').forEach(function (el) {
    var o = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          el.classList.add('is-in');
          o.unobserve(el);
        }
      });
    }, { threshold: 0.25 });
    o.observe(el);
  });

  /* ---------------------------------------------------------
     5. COUNTERS
     --------------------------------------------------------- */
  $$('.stat__num').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count') || '0', 10);
    var done = false;
    var o = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting || done) return;
        done = true;
        var t0 = performance.now();
        var dur = 1400;
        (function step(now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * e);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        o.unobserve(el);
      });
    }, { threshold: 0.6 });
    o.observe(el);
  });

  /* ---------------------------------------------------------
     6. POINTER (native cursor is kept — no custom cursor)
     --------------------------------------------------------- */
  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  if (!isTouch) {
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     7. MAGNETIC
     --------------------------------------------------------- */
  if (!isTouch) {
    $$('[data-magnetic]').forEach(function (el) {
      var strength = 0.22;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var ox = (e.clientX - r.left - r.width / 2) * strength;
        var oy = (e.clientY - r.top - r.height / 2) * strength * 1.3;
        el.style.transform = 'translate3d(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px,0)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     8. WEBGL AURORA
     --------------------------------------------------------- */
  (function aurora() {
    var canvas = document.getElementById('aurora');
    if (!canvas) return;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' })
      || canvas.getContext('experimental-webgl');
    if (!gl) { canvas.style.display = 'none'; return; }

    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

    var FS = [
      'precision highp float;',
      'uniform vec2 u_res;uniform float u_t;uniform vec2 u_m;uniform float u_s;',
      'vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453123);}',
      'float noise(vec2 p){',
      '  vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
      '  return mix(mix(dot(hash2(i+vec2(0.,0.)),f-vec2(0.,0.)),dot(hash2(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),',
      '             mix(dot(hash2(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(hash2(i+vec2(1.,1.)),f-vec2(1.,1.)),u.x),u.y);',
      '}',
      'float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.05;a*=.5;}return v;}',
      'void main(){',
      '  vec2 p=(gl_FragCoord.xy-.5*u_res.xy)/max(u_res.y,1.);',
      '  float t=u_t*.03;',
      '  vec2 q=vec2(fbm(p*1.05+vec2(0.,t)),fbm(p*1.05+vec2(5.2,-t)));',
      '  float f=fbm(p*1.30+q*1.25);',
      '  float n=smoothstep(-.28,.82,f);',
      '  vec3 deep=vec3(.026,.048,.100);',
      '  vec3 mid=vec3(.062,.135,.315);',
      '  vec3 hi=vec3(.150,.360,.900);',
      '  vec3 ice=vec3(.780,.870,1.0);',
      '  vec3 col=mix(deep,mid,smoothstep(.02,.80,n));',
      '  col=mix(col,hi,smoothstep(.46,.92,n)*.62);',
      '  col+=ice*pow(smoothstep(.72,1.,n),3.)*.24;',
      '  float d=length(p-vec2(.30+(u_m.x-.5)*.28,.04+(u_m.y-.5)*.22));',
      '  col+=vec3(.10,.22,.58)*exp(-d*1.7)*.55;',
      '  float d2=length(p-vec2(-.55,-.28));',
      '  col+=vec3(.06,.13,.36)*exp(-d2*1.25)*.40;',
      '  float vig=smoothstep(1.48,.10,length(p*vec2(.80,1.)));',
      '  col*=mix(.32,1.16,vig);',
      '  col*=1.0+u_s*.08;',
      '  gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('shader', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    var vs = sh(gl.VERTEX_SHADER, VS);
    var fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uT = gl.getUniformLocation(prog, 'u_t');
    var uM = gl.getUniformLocation(prog, 'u_m');
    var uS = gl.getUniformLocation(prog, 'u_s');

    // the aurora is soft and slow: render it at half resolution and upscale.
    // this cuts the shaded pixel count ~4x with no visible difference.
    var RES = isTouch ? 0.40 : 0.50;
    var MAX_W = 720, MAX_H = 450;

    var mouse = { x: 0.5, y: 0.5 }, ms = { x: 0.5, y: 0.5 };
    var scrollN = 0, lastTime = 0, paused = false, lastDraw = 0;
    var dts = [], low = false, prevTime = 0, winStart = 0, slowWin = 0;

    function goLowPower() {
      low = true;
      window.__lowPower = true;
      doc.classList.add('low-power');
      canvas.style.display = 'none';
    }

    function draw() {
      gl.uniform1f(uT, reduced ? 0 : lastTime * 0.001);
      gl.uniform2f(uM, ms.x, ms.y);
      gl.uniform1f(uS, scrollN);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function resize() {
      var w = Math.min(Math.round(canvas.clientWidth * RES), MAX_W);
      var h = Math.min(Math.round(canvas.clientHeight * RES), MAX_H);
      if (w < 2 || h < 2) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      draw(); // resizing clears the drawing buffer, so repaint immediately
    }
    resize();
    window.addEventListener('resize', function () { clearTimeout(resize._t); resize._t = setTimeout(resize, 180); });

    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1 - e.clientY / window.innerHeight;
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (!paused) draw();
    });

    window.__auroraTick = function (time, scrollRatio) {
      if (paused) return;
      lastTime = time;

      // Rolling frame-time window. If the device clearly cannot hold ~40fps we
      // switch to the static CSS background — once, and never back (avoids flicker).
      // Sampling starts after the intro so the loader frames do not skew it.
      if (!low && time > 2000) {
        if (!winStart) winStart = time;
        if (prevTime) dts.push(time - prevTime);
        if (time - winStart > 1100 && dts.length >= 8) {
          var sorted = dts.slice().sort(function (a, b) { return a - b; });
          var median = sorted[sorted.length >> 1];
          window.__auroraDbg = { n: dts.length, median: Math.round(median), low: low, t: Math.round(time) };
          if (median > 26) {
            slowWin++;
            // two slow windows in a row, so a single GC hitch does not degrade the page
            if (slowWin >= 2) { goLowPower(); return; }
          } else {
            slowWin = 0;
          }
          dts = [];
          winStart = time;
        }
      }
      prevTime = time;

      // 30fps is plenty for a slow drifting gradient
      if (time - lastDraw < (staticMode ? 350 : 33)) return;
      lastDraw = time;

      ms.x = lerp(ms.x, mouse.x, 0.05);
      ms.y = lerp(ms.y, mouse.y, 0.05);
      scrollN = lerp(scrollN, scrollRatio, 0.06);
      draw();
    };
  })();

  /* ---------------------------------------------------------
     9. SCROLL ENGINE
     --------------------------------------------------------- */
  var progressEl = $('.progress');
  var header = $('.hdr');
  var rail = $('.rail');
  var railItems = $$('.rail__item');
  var indexEl = $('.index');
  var hero = $('.hero');
  var heroOrbits = $('.hero__orbits');
  var marquee = $('.marquee');
  var aboutEl = $('.about');
  var projects = $$('.project');
  var numEls = [];
  projects.forEach(function (p) {
    var n = $('.project__num', p);
    if (n) numEls.push({ el: n, sec: p });
  });
  var artLayers = $$('.a2-layer');
  var artWraps = $$('.art-wrap');
  var mascotEl = $('.mascot');
  var tiltX = 0, tiltY = 0;

  var lastY = window.scrollY;
  var vel = 0;
  var headerHidden = false;

  function sectionIndexForScroll() {
    var mid = window.scrollY + window.innerHeight * 0.42;
    var best = 0;
    for (var i = 0; i < projects.length; i++) {
      var r = projects[i].getBoundingClientRect();
      var top = r.top + window.scrollY;
      if (mid >= top) best = i + 1;
    }
    return best;
  }

  function update(time) {
    var y = window.scrollY;
    var vh = window.innerHeight;
    var maxScroll = Math.max(1, doc.scrollHeight - vh);
    var ratio = clamp(y / maxScroll, 0, 1);

    if (progressEl) progressEl.style.setProperty('--p', ratio.toFixed(4));

    // header
    if (header) {
      var stuck = y > 40;
      header.classList.toggle('is-stuck', stuck);
      if (y > vh * 0.7) {
        var dy = y - lastY;
        if (dy > 1.2 && !headerHidden) { header.classList.add('is-hidden'); headerHidden = true; }
        else if (dy < -1.2 && headerHidden) { header.classList.remove('is-hidden'); headerHidden = false; }
      } else if (headerHidden) {
        header.classList.remove('is-hidden');
        headerHidden = false;
      }
    }

    // rail
    if (railItems.length) {
      var idx = sectionIndexForScroll();
      for (var i = 0; i < railItems.length; i++) {
        railItems[i].classList.toggle('is-active', i === idx);
      }
    }
    if (rail && indexEl) {
      rail.classList.toggle('is-hidden', indexEl.getBoundingClientRect().top < vh * 0.55);
    }

    // hero parallax
    if (heroOrbits && y < vh * 1.3) {
      heroOrbits.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)';
    }

    // marquee velocity skew
    if (marquee) {
      var dv = y - lastY;
      vel = lerp(vel, dv, 0.12);
      var skew = clamp(vel * 0.10, -5, 5);
      marquee.style.transform = 'skewY(' + skew.toFixed(2) + 'deg)';
    }

    // ghost numbers parallax
    numEls.forEach(function (o) {
      var r = o.sec.getBoundingClientRect();
      var center = r.top + r.height / 2;
      var off = (center - vh / 2) / vh;
      o.el.style.transform = 'translate(-50%,-50%) translate3d(0,' + (off * -46).toFixed(1) + 'px,0)';
    });

    // mountain layers drift
    artLayers.forEach(function (l) {
      var d = parseFloat(l.getAttribute('data-depth') || '0.5');
      var r = l.getBoundingClientRect();
      var off = (r.top + r.height / 2 - vh / 2) / vh;
      l.style.transform = 'translate3d(0,' + (off * 22 * d).toFixed(1) + 'px,0)';
    });

    // about word scrub
    if (aboutEl && scrubWords.length) {
      var ar = aboutEl.getBoundingClientRect();
      var total = ar.height - vh;
      var p = clamp((-ar.top) / Math.max(1, total), 0, 1);
      var active = p * (scrubWords.length + 4) + 1.2;
      for (var w = 0; w < scrubWords.length; w++) {
        var o = clamp(active - w, 0, 1);
        scrubWords[w].style.opacity = (0.19 + o * 0.81).toFixed(3);
      }
    }

    // pointer parallax on artwork (uses the standalone `translate` property,
    // so it composes with the entrance `transform` instead of overriding it)
    if (!isTouch && !window.__lowPower) {
      tiltX = lerp(tiltX, (mx / window.innerWidth - 0.5) * -18, 0.06);
      tiltY = lerp(tiltY, (my / window.innerHeight - 0.5) * -14, 0.06);
      for (var k = 0; k < artWraps.length; k++) {
        artWraps[k].style.translate = tiltX.toFixed(1) + 'px ' + tiltY.toFixed(1) + 'px';
      }
      if (mascotEl) mascotEl.style.translate = (tiltX * -0.5).toFixed(1) + 'px ' + (tiltY * -0.5).toFixed(1) + 'px';
    }

    // aurora
    if (window.__auroraTick) window.__auroraTick(time, ratio);

    lastY = y;
  }

  var frameCount = 0;
  function frame(time) {
    if (lenis) lenis.raf(time);
    update(time);
    frameCount++;
    // in screenshot mode stop the loop so headless virtual-time can settle
    if (isShot && frameCount > 5) return;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------------------------------------------------
     10. SHOT MODE
     --------------------------------------------------------- */
  if (isShot) {
    var go = function () {
      var v = parseFloat(shotParam) || 0;
      window.scrollTo(0, v);
      update(performance.now());
      doc.setAttribute('data-shot-h', String(doc.scrollHeight));
      doc.setAttribute('data-shot-vh', String(window.innerHeight));
      doc.setAttribute('data-shot-y', String(window.scrollY));
      setTimeout(function () {
        window.scrollTo(0, v);
        update(performance.now());
      }, 120);
    };
    go();
    window.addEventListener('load', go);
  }

  /* ---------------------------------------------------------
     11. MISC
     --------------------------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  window.addEventListener('load', function () {
    $$('.reveal').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) el.classList.add('is-in');
    });
  });

})();
