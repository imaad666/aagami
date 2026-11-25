(function () {
  "use strict";

  var canvas = document.getElementById("glyphField");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.removeAttribute("data-theme");
  try { localStorage.removeItem("aagami-theme"); } catch (e) {}

  if (!canvas) return;
  var ctx = canvas.getContext("2d", { alpha: true });
  var hero = canvas.closest(".hero") || canvas.parentElement;

  var STRUCT = ["0", "1", "1", "0", ":", "+", "="];
  var AMBIENT = ["0", "1", "·", "-", ":", "~", "/", "\\", "|", "<", ">", "o"];

  var cellW = 14, cellH = 16, cols = 0, rows = 0, grid = [];
  var glyphFont = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
  var dpr = 1, t0 = 0, raf = 0, lastChurn = 0;
  var viewW = 0, viewH = 0;

  var T_BUILD = 5.8;
  var T_DNA = 10.5;
  var SAMPLES = 130;

  var pathA = [], pathB = [], rungs = [];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function smoother(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function resize() {
    viewW = hero.clientWidth || window.innerWidth;
    viewH = hero.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var small = viewW < 700;
    cellW = small ? 9 : 14;
    cellH = small ? 11 : 16;
    glyphFont = "500 " + (small ? 9 : 12) + "px 'IBM Plex Mono', ui-monospace, monospace";
    cols = Math.ceil(viewW / cellW) + 2;
    rows = Math.ceil(viewH / cellH) + 2;
    grid = new Array(rows);
    for (var r = 0; r < rows; r++) {
      grid[r] = new Array(cols);
      for (var c = 0; c < cols; c++) grid[r][c] = (Math.random() * AMBIENT.length) | 0;
    }
  }

  function waveField(x, y, t) {
    var n =
      Math.sin(x * 0.085 + t * 0.62) * 0.55 +
      Math.sin(y * 0.11 - t * 0.4) * 0.45 +
      Math.sin((x + y) * 0.05 + t * 0.3) * 0.75 +
      Math.sin(x * 0.02 - y * 0.03 + t * 0.18) * 1.15 +
      Math.sin(x * 0.13 - t * 0.5) * 0.25;
    var band = Math.sin(x * 0.04 + t * 0.48) * 20 + Math.cos(x * 0.018 - t * 0.22) * 30;
    var ridge = 1 - Math.min(1, Math.abs((y - (rows * 0.6 + band)) / (rows * 0.2)));
    var swell = 0.55 + 0.45 * Math.sin(x * 0.03 + y * 0.02 + t * 0.35);
    return n * 0.32 + ridge * 1.5 * swell;
  }

  function phases(t) {
    if (reduceMotion) return { build: 1, dna: 1, grow: 1, strandAmt: 1 };
    var buildLin = clamp(t / T_BUILD, 0, 1);
    var build = smoother(buildLin);
    var dna = smoother(smoothstep(T_BUILD, T_DNA, t));
    var grow = clamp(0.18 + buildLin * 0.82, 0, 1);
    var strandAmt = clamp(0.55 + build * 0.45, 0, 1);
    return { build: build, dna: dna, grow: grow, strandAmt: strandAmt };
  }

  function buildPaths(t, grow, dna) {
    pathA.length = 0;
    pathB.length = 0;
    rungs.length = 0;

    // Follow the screen diagonal on tall viewports so the whole helix fits.
    var ang = -Math.max(0.58, Math.atan2(rows, cols) * 0.95), cosA = Math.cos(ang), sinA = Math.sin(ang);
    var span = Math.sqrt(cols * cols + rows * rows) * 1.08;
    var ampMid = Math.min(cols, rows) * 0.075;
    var ampEnd = Math.min(cols, rows) * 0.3;
    var cx = cols * 0.5, cy = rows * 0.5;
    grow = clamp(grow, 0, 1);

    for (var i = 0; i < SAMPLES; i++) {
      var u = i / (SAMPLES - 1);
      var endness = Math.pow(Math.abs(u - 0.5) * 2, 1.35);
      var amp = lerp(ampMid, ampEnd, endness);

      var sprawl = lerp(1, 0.22, dna);
      var wander = (4.8 + Math.sin(u * Math.PI * 3.2 + t * 0.4) * 1.4) * sprawl;
      var lateral = (3.2 + Math.cos(u * Math.PI * 2.4 - t * 0.3) * 1.1) * sprawl;
      var pinkX = lerp(-4, cols * 0.78, u)
        + Math.sin(u * Math.PI * 2.4 + t * 0.55) * wander
        + Math.sin(u * Math.PI * 5.1 - t * 0.28) * lateral * 0.55;
      var pinkY = lerp(-4, rows * 0.78, u)
        + Math.cos(u * Math.PI * 1.9 - t * 0.4) * wander * 0.9
        + Math.cos(u * Math.PI * 4.2 + t * 0.22) * lateral * 0.45;
      var blueX = lerp(cols + 4, cols * 0.22, u)
        + Math.sin(u * Math.PI * 2.4 - t * 0.55) * wander
        + Math.sin(u * Math.PI * 5.1 + t * 0.28) * lateral * 0.55;
      var blueY = lerp(rows + 4, rows * 0.22, u)
        + Math.cos(u * Math.PI * 1.9 + t * 0.4) * wander * 0.9
        + Math.cos(u * Math.PI * 4.2 - t * 0.22) * lateral * 0.45;

      var along = (u - 0.5) * span;
      var phase = (u - 0.5) * Math.PI * 6.2 + t * 0.72;
      var s1 = Math.sin(phase) * amp;
      var s2 = Math.sin(phase + Math.PI) * amp;
      var dnaAx = along * cosA - s1 * sinA + cx;
      var dnaAy = along * sinA + s1 * cosA + cy;
      var dnaBx = along * cosA - s2 * sinA + cx;
      var dnaBy = along * sinA + s2 * cosA + cy;

      pathA.push({
        x: lerp(pinkX, dnaAx, dna),
        y: lerp(pinkY, dnaAy, dna),
        alive: u <= grow * 1.02,
        endness: endness
      });
      pathB.push({
        x: lerp(blueX, dnaBx, dna),
        y: lerp(blueY, dnaBy, dna),
        alive: u <= grow * 1.02,
        endness: endness
      });
    }

    if (dna > 0.2) {
      var rw = smoothstep(0.2, 0.75, dna);
      for (var j = 2; j < SAMPLES - 2; j += 5) {
        if (!pathA[j].alive || !pathB[j].alive) continue;
        rungs.push({
          ax: pathA[j].x, ay: pathA[j].y,
          bx: pathB[j].x, by: pathB[j].y,
          w: rw,
          endness: pathA[j].endness
        });
      }
    }
  }

  function dist2Seg(px, py, ax, ay, bx, by) {
    var abx = bx - ax, aby = by - ay;
    var apx = px - ax, apy = py - ay;
    var ab2 = abx * abx + aby * aby;
    var t = ab2 > 0 ? clamp((apx * abx + apy * aby) / ab2, 0, 1) : 0;
    var dx = px - (ax + abx * t), dy = py - (ay + aby * t);
    return dx * dx + dy * dy;
  }

  function nearestPathAlive(px, py, path) {
    var best = 1e9;
    var bestEnd = 0;
    for (var i = 0; i < path.length - 1; i++) {
      if (!path[i].alive || !path[i + 1].alive) continue;
      var d = dist2Seg(px, py, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
      if (d < best) {
        best = d;
        bestEnd = (path[i].endness + path[i + 1].endness) * 0.5;
      }
    }
    return { dist: Math.sqrt(best), endness: bestEnd };
  }

  function draw(now) {
    var t = (now - t0) * 0.001;
    var p = phases(t);
    var morphT = reduceMotion ? 0 : t;

    buildPaths(morphT, p.grow, p.dna);

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.font = glyphFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (!reduceMotion && now - lastChurn > 110) {
      lastChurn = now;
      var n = (cols * rows) * (p.dna > 0.7 ? 0.0012 : 0.0035);
      for (var i = 0; i < n; i++) {
        var rr = (Math.random() * rows) | 0;
        var cc = (Math.random() * cols) | 0;
        grid[rr][cc] = (grid[rr][cc] + 1) % AMBIENT.length;
      }
    }

    var fieldAmt = (1 - p.dna * 0.82) * lerp(1, 0.72, p.build);
    var strandAmt = p.strandAmt;
    var pathSigma = lerp(3.1, 0.78, clamp(p.build * 0.25 + p.dna * 0.9, 0, 1));

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var wave = waveField(c, r, morphT);
        var waveI = clamp((wave + 0.35) * 0.55, 0, 1) * fieldAmt;

        var hitA = nearestPathAlive(c, r, pathA);
        var hitB = nearestPathAlive(c, r, pathB);
        var which = hitA.dist <= hitB.dist ? 0 : 1;
        var dPath = which === 0 ? hitA.dist : hitB.dist;
        var endness = which === 0 ? hitA.endness : hitB.endness;
        var localSigma = pathSigma * lerp(1, 1.3, endness * p.dna);
        var pathGlow = strandAmt > 0.02
          ? Math.exp(-(dPath * dPath) / (2 * localSigma * localSigma)) * strandAmt
          : 0;

        var rungGlow = 0;
        if (rungs.length) {
          var bestR = 1e9;
          for (var k = 0; k < rungs.length; k++) {
            var rg = rungs[k];
            var rd = dist2Seg(c, r, rg.ax, rg.ay, rg.bx, rg.by);
            if (rd < bestR) bestR = rd;
          }
          bestR = Math.sqrt(bestR);
          var rungSigma = lerp(0.65, 0.95, endness);
          rungGlow = Math.exp(-(bestR * bestR) / (2 * rungSigma * rungSigma)) * rungs[0].w;
          if (rungGlow < 0.2) rungGlow = 0;
        }

        var pathI = Math.max(pathGlow, rungGlow * 0.8);
        if (pathI < 0.1) pathI = 0;

        var intensity = Math.max(waveI * 0.9, pathI);
        if (intensity < 0.05) continue;

        var onPath = pathI >= waveI * 0.9 && pathI > 0.2;
        var onRung = onPath && rungGlow > pathGlow;
        var gi = grid[r][c];
        var ch;
        if (onRung) {
          ch = STRUCT[(gi + r) % STRUCT.length];
        } else if (onPath) {
          ch = (gi % 4 === 0) ? STRUCT[(gi + which) % STRUCT.length] : (which === 0 ? "1" : "0");
        } else if (intensity > 0.78) {
          ch = "1";
        } else if (intensity > 0.55) {
          ch = (gi % 2 === 0) ? "0" : "1";
        } else if (intensity > 0.32) {
          ch = "·";
        } else {
          ch = "-";
        }

        var x = c * cellW + cellW * 0.5;
        var y = r * cellH + cellH * 0.5;
        var yFade = 0.4 + Math.pow(r / rows, 1.05) * 0.7;
        var a = intensity * yFade * (onPath ? 0.9 : 0.52);

        if (onPath && which === 0 && !onRung) {
          ctx.fillStyle = "rgba(220,70,140," + (a * 0.95) + ")";
        } else if (onPath && which === 1 && !onRung) {
          ctx.fillStyle = "rgba(40,110,200," + (a * 0.95) + ")";
        } else if (onRung) {
          ctx.fillStyle = "rgba(30,70,120," + (a * 0.72) + ")";
        } else if (intensity > 0.65) {
          ctx.fillStyle = "rgba(40,90,150," + (a * 0.55) + ")";
        } else {
          ctx.fillStyle = "rgba(90,130,175," + (a * 0.38) + ")";
        }
        ctx.fillText(ch, x, y);
      }
    }

    if (!reduceMotion) raf = requestAnimationFrame(draw);
  }

  function start() {
    cancelAnimationFrame(raf);
    resize();
    t0 = performance.now();
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", function () {
    resize();
  });

  start();
})();
