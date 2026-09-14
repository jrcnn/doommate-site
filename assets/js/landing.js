// Landing page behaviour: typewriter, scroll reveals, the feed being shut off,
// the pinned phone in "the deal" and the payoff counter.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // ── Tween helper ────────────────────────────────────────

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  // Calls step(p) with p eased from 0 to 1 over `dur` ms. Instant when motion is reduced.
  function tween(dur, step) {
    if (reduceMotion || dur <= 0) { step(1); return; }
    var t0 = null;
    var done = false;
    function frame(ts) {
      if (done) return;
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      step(ease(p));
      if (p < 1) requestAnimationFrame(frame);
      else done = true;
    }
    requestAnimationFrame(frame);
    // Frames can be throttled (background tabs, some embedded browsers); the final value
    // must land regardless, so a timer finishes the tween if the frames never get there.
    setTimeout(function () {
      if (!done) { done = true; step(1); }
    }, dur + 250);
  }

  // ── Reveal registry ─────────────────────────────────────
  // Elements with .reveal fade up when they enter the viewport; some also run a
  // callback the first time they do.

  var onReveal = new Map();
  function whenRevealed(el, fn) { if (el) onReveal.set(el, fn); }
  function show(el) {
    el.classList.add('in');
    var fn = onReveal.get(el);
    if (fn) { onReveal.delete(el); fn(); }
  }

  // ── Typewriter ──────────────────────────────────────────
  // A web port of TypewriterEngine: same inline markup, same speed presets.
  // Haptic tokens have no web equivalent and are dropped.

  var SPEEDS = { rush: 18, normal: 40, slow: 80, crawl: 150 };
  var TOKEN = /\[(p|s|h|c):([^\]]+)\]|\[default\]/g;
  var LINE_HOLD_MS = 7000;

  function parse(src) {
    var ops = [];
    var speed = SPEEDS.normal;
    var color = 'normal';
    var last = 0;
    var m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      if (m.index > last) ops.push({ text: src.slice(last, m.index), speed: speed, color: color });
      last = TOKEN.lastIndex;
      if (m[0] === '[default]') { speed = SPEEDS.normal; color = 'normal'; continue; }
      var val = m[2];
      if (m[1] === 'p') ops.push({ pause: parseInt(val, 10) || 0 });
      else if (m[1] === 's') speed = SPEEDS[val] || parseInt(val, 10) || SPEEDS.normal;
      else if (m[1] === 'c') color = val;
    }
    if (last < src.length) ops.push({ text: src.slice(last), speed: speed, color: color });
    return ops;
  }

  function plain(ops) {
    return ops.map(function (o) { return o.text || ''; }).join('');
  }

  var box = document.getElementById('dialog');
  var out = document.getElementById('dialog-text');
  var live = document.getElementById('dialog-plain');
  var linesEl = document.getElementById('dialog-lines');

  if (box && out && linesEl) {
    var lines = JSON.parse(linesEl.textContent).map(parse);
    // First line matches the no-JS fallback; the rest play in random order.
    var order = lines.slice(1);
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    order.unshift(lines[0]);

    // Reserve the height of the longest line so the page never shifts as lines change.
    function reserveHeight() {
      var probe = out.cloneNode(false);
      probe.removeAttribute('id');
      probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;min-height:0;width:' + out.clientWidth + 'px';
      out.parentNode.appendChild(probe);
      var max = 0;
      lines.forEach(function (ops) {
        probe.textContent = plain(ops) + '█';
        max = Math.max(max, probe.offsetHeight);
      });
      probe.remove();
      out.style.minHeight = max + 'px';
    }
    reserveHeight();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserveHeight);
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reserveHeight, 150);
    });

    var idx = 0;
    var timer = null;
    var typing = false;
    var cursor = document.createElement('span');
    cursor.className = 'cursor';

    function spanFor(color) {
      var s = document.createElement('span');
      if (color !== 'normal') s.className = 'c-' + color;
      return s;
    }

    function renderFull(ops) {
      out.textContent = '';
      ops.forEach(function (o) {
        if (!o.text) return;
        var s = spanFor(o.color);
        s.textContent = o.text;
        out.appendChild(s);
      });
      out.appendChild(cursor);
    }

    function play(ops) {
      clearTimeout(timer);
      live.textContent = plain(ops);
      if (reduceMotion) { renderFull(ops); typing = false; return; }

      out.textContent = '';
      out.appendChild(cursor);
      typing = true;
      var op = 0, ch = 0, span = null;

      function step() {
        if (op >= ops.length) {
          typing = false;
          timer = setTimeout(next, LINE_HOLD_MS);
          return;
        }
        var o = ops[op];
        if (o.pause !== undefined) {
          op++;
          timer = setTimeout(step, o.pause);
          return;
        }
        if (ch === 0) {
          span = spanFor(o.color);
          out.insertBefore(span, cursor);
        }
        span.textContent += o.text.charAt(ch++);
        if (ch >= o.text.length) { op++; ch = 0; }
        timer = setTimeout(step, o.speed);
      }
      step();
    }

    function next() {
      idx = (idx + 1) % order.length;
      play(order[idx]);
    }

    // Tap skips to the end of the current line, or on to the next one.
    function interact() {
      if (typing) {
        clearTimeout(timer);
        typing = false;
        renderFull(order[idx]);
        timer = setTimeout(next, LINE_HOLD_MS);
      } else {
        next();
      }
    }

    box.addEventListener('click', interact);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
    });

    if (reduceMotion) { renderFull(order[0]); } else { timer = setTimeout(function () { play(order[0]); }, 900); }
  }

  // ── The feed: scrolls until Doommate shuts it off ───────

  var feed = document.getElementById('feed');
  var feedList = feed && feed.querySelector('.feed-list');

  if (feed && feedList) {
    // [media colour, media shape]; the list is written twice so the loop is seamless.
    var POSTS = [['m1', ''], ['m2', 'sq'], ['m3', 'wide'], ['m4', ''], ['m5', 'sq'], ['m6', 'wide']];
    var html = '';
    for (var pass = 0; pass < 2; pass++) {
      POSTS.forEach(function (p) {
        html += '<div class="post"><div class="post-head"><i class="av"></i><b></b><b class="short"></b></div>' +
          '<div class="media ' + p[0] + ' ' + p[1] + '"></div>' +
          '<div class="post-actions"><i></i><i></i><i></i></div></div>';
      });
    }
    feedList.innerHTML = html;

    // Let the feed run for a moment once it's on screen, then drop the block screen on it.
    whenRevealed(feed.querySelector('.feed-phone'), function () {
      setTimeout(function () { feed.classList.add('ended'); }, reduceMotion ? 0 : 2400);
    });
  }

  // ── The deal: pinned phone follows the beat in view ─────
  // The beat whose centre is nearest the middle of the viewport owns the phone.
  // Computed from positions on every scroll, so a jump or a fast fling can never
  // leave the wrong screen showing.

  var beats = document.querySelectorAll('.beat');
  var screens = document.querySelectorAll('.stage-screens img');

  if (beats.length && screens.length) {
    var activeStep = -1;
    var stageQueued = false;

    var syncStage = function () {
      stageQueued = false;
      var mid = window.innerHeight / 2;
      var best = 0, bestDist = Infinity;
      beats.forEach(function (b, k) {
        var r = b.getBoundingClientRect();
        var dist = Math.abs(r.top + r.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = k; }
      });
      if (best === activeStep) return;
      activeStep = best;
      screens.forEach(function (s, k) { s.classList.toggle('active', k === best); });
    };

    var queueStage = function () {
      if (stageQueued) return;
      stageQueued = true;
      requestAnimationFrame(syncStage);
      setTimeout(function () { if (stageQueued) syncStage(); }, 100);
    };

    window.addEventListener('scroll', queueStage, { passive: true });
    window.addEventListener('resize', queueStage);
    syncStage();
  }

  // ── Payoff: counter + 4-week heatmap ────────────────────

  var reclaim = document.getElementById('reclaim');
  var reclaimed = document.getElementById('reclaimed');
  var heat = reclaim && reclaim.querySelector('.heat');

  if (heat) {
    // 0 = idle day, 1–4 = activity level, f = still to come
    var WEEKS = [
      '0000034',
      '2334323',
      '3423330',
      '00fffff'
    ];
    var n = 0;
    WEEKS.join('').split('').forEach(function (c) {
      var cell = document.createElement('span');
      cell.className = 'cell ' + (c === 'f' ? 'lf' : c === '0' ? '' : 'l' + c);
      cell.style.setProperty('--i', n++);
      heat.appendChild(cell);
    });
  }

  if (reclaim && reclaimed) {
    var target = parseFloat(reclaimed.textContent);
    reclaimed.textContent = '0.0';
    whenRevealed(reclaim, function () {
      tween(1800, function (p) { reclaimed.textContent = (target * p).toFixed(1); });
    });
  }

  // ── Observe reveals (last, so every callback is registered) ──

  var revealEls = document.querySelectorAll('.reveal');
  if (!hasIO || reduceMotion) {
    revealEls.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        show(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (r) { io.observe(r); });

    // Whatever is on screen at load (the hero, or a section reached by #anchor) must never
    // wait on the observer's first callback. A short timeout keeps the fade-in and still fires
    // in contexts that throttle animation frames.
    setTimeout(function () {
      revealEls.forEach(function (r) {
        if (r.classList.contains('in')) return;
        var b = r.getBoundingClientRect();
        if (b.top < window.innerHeight && b.bottom > 0) { io.unobserve(r); show(r); }
      });
    }, 60);
  }
})();
