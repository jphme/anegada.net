/* Anegada UG — particle intro for the ANEGADA wordmark.
   Small coloured dots drift across the logo area and settle into the letters,
   then the crisp SVG wordmark fades back in. Plain canvas, no dependencies.
   Without JavaScript, or with "reduce motion" switched on, only the SVG shows. */

(function () {
  var wrap = document.querySelector(".logo-wrap");
  if (!wrap) return;
  var svg = wrap.querySelector("svg.logo");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!svg || reduce || !document.createElement("canvas").getContext) return;

  var VIEW_W = 1349, VIEW_H = 148;          // wordmark viewBox (glyphs reach y = -3 … 148)
  var COLORS = ["#ff6b4a", "#ff9f1c", "#f7c948", "#3ec28f", "#22b8cf", "#4c6ef5", "#9b5de5", "#f15bb5"];

  // Glyph outlines from the SVG: each <path> as is, each <use> as its referenced path with x offset.
  var shapes = [];
  svg.querySelectorAll("g > path, g > use").forEach(function (el) {
    var src = el.tagName.toLowerCase() === "use"
      ? svg.querySelector(el.getAttribute("href")) : el;
    shapes.push({ d: src.getAttribute("d"), x: +(el.getAttribute("x") || 0) });
  });

  var canvas = document.createElement("canvas");
  canvas.className = "logo-canvas";
  canvas.setAttribute("aria-hidden", "true");
  wrap.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var particles = [], box, dpr, step = 7, start = null, raf = 0;

  function sampleTargets(step) {
    // Rasterise the wordmark once in viewBox units and keep one point per grid cell inside a glyph.
    var off = document.createElement("canvas");
    off.width = VIEW_W; off.height = VIEW_H + 6;
    var o = off.getContext("2d");
    o.translate(0, 3);
    shapes.forEach(function (s) {
      o.save(); o.translate(s.x, 0); o.fill(new Path2D(s.d), "evenodd"); o.restore();
    });
    var data = o.getImageData(0, 0, off.width, off.height).data, pts = [];
    for (var y = step / 2; y < off.height; y += step) {
      for (var x = step / 2; x < off.width; x += step) {
        if (data[((y | 0) * off.width + (x | 0)) * 4 + 3] > 128) pts.push([x, y - 3]);
      }
    }
    return pts;
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect(), s = svg.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    // Logo position inside the canvas (CSS px) and px per viewBox unit.
    box = { x: s.left - r.left, y: s.top - r.top, k: s.width / VIEW_W, w: r.width, h: r.height };
  }

  function build() {
    layout();
    step = box.k * VIEW_W < 300 ? 10 : 7;   // fewer, larger dots on small screens
    var targets = sampleTargets(step);
    var u, v;
    particles = targets.map(function (t, i) {
      return {
        tx: t[0], ty: t[1],
        sx: 0.5 + (u = Math.sqrt(Math.random()) * 0.5) * Math.cos(v = Math.random() * 6.2832),
        sy: 0.5 + u * Math.sin(v),                                  // start: soft elliptical cloud, as canvas fraction
        ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.6,
        delay: 0.35 + (t[0] / VIEW_W) * 0.7 + Math.random() * 0.5,  // gentle left-to-right sweep
        c: COLORS[i % COLORS.length], r: 0.7 + Math.random() * 0.35
      };
    });
  }

  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var FLY = 1.7, SETTLE_END = 3.2, FADE = 0.9;

  function frame(now) {
    // data-end="solid" (default): dots hand over to the SVG; data-end="dots": the dots stay.
    var END = wrap.dataset.end || "solid";
    if (start === null) start = now;
    var t = (now - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);

    var handover = END === "solid" ? Math.min(Math.max((t - SETTLE_END) / FADE, 0), 1) : 0;
    svg.style.opacity = handover;
    ctx.globalAlpha = 1 - handover;

    var dot = Math.max(box.k * step * 0.62, 1.1);   // radius relative to the grid spacing
    particles.forEach(function (p) {
      // Wandering position: slow drift around the starting point.
      var wx = p.sx * box.w + Math.sin(t * p.sp + p.ph) * 18;
      var wy = p.sy * box.h + Math.cos(t * p.sp * 0.8 + p.ph) * 12;
      var gx = box.x + p.tx * box.k, gy = box.y + p.ty * box.k;
      var a = ease(Math.min(Math.max((t - p.delay) / FLY, 0), 1));
      // Once settled, a faint breathing jitter keeps the dots alive.
      var j = a === 1 ? Math.sin(t * 2 + p.ph) * 0.25 : 0;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(wx + (gx - wx) * a + j, wy + (gy - wy) * a, dot * p.r * (0.6 + 0.4 * a), 0, Math.PI * 2);
      ctx.fill();
    });

    if (END === "solid" && handover >= 1) { canvas.style.display = "none"; return; }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    cancelAnimationFrame(raf);
    canvas.style.display = "";
    svg.style.opacity = 0;
    build();
    start = null;
    raf = requestAnimationFrame(frame);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (canvas.style.display !== "none") play(); }, 150);
  });

  wrap.replay = play;
  play();
})();
