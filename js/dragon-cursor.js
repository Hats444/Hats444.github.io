/**
 * Cursor Dragão — SVG; corpo com espaçamento fixo (sem vão no follow).
 */
(function (global) {
  "use strict";

  function drawHybridLegs(ctx, elems, sizeScale, frm, w, h) {
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    ctx.strokeStyle = "rgba(160, 230, 180, 0.72)";
    ctx.lineWidth = 1.15 + sizeScale * 0.35;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const legAt = [5, 10, 15, 20, 25, 30, 35];
    for (let idx = 0; idx < legAt.length; idx++) {
      const i = legAt[idx];
      const ep = elems[i - 1];
      const e = elems[i];
      if (!ep || !e) continue;
      const mx = (ep.x + e.x) / 2;
      const my = (ep.y + e.y) / 2;
      const a = Math.atan2(e.y - ep.y, e.x - ep.x);
      const side = idx % 2 === 0 ? 1 : -1;
      const s = sizeScale * 2.4;
      const wave = Math.sin(frm * 4 + idx) * 0.35;
      const j1x = mx + Math.cos(a + side * 1.2) * s * 3.2;
      const j1y = my + Math.sin(a + side * 1.2) * s * 3.2;
      const j2x = j1x + Math.cos(a + side * 0.5 + wave) * s * 4.5;
      const j2y = j1y + Math.sin(a + side * 0.5 + wave) * s * 4.5;
      const fx = j2x + Math.cos(a + side * 0.2) * s * 2.8;
      const fy = j2y + Math.sin(a + side * 0.2) * s * 2.8;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(j1x, j1y);
      ctx.lineTo(j2x, j2y);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
  }

  function initDragonCursor(opts) {
    const screen = opts && opts.screenEl ? opts.screenEl : document.getElementById("screen");
    if (!screen) return null;

    const getPointer = opts.getPointer;
    const sizeScale = opts.scale != null ? opts.scale : 1;
    const boundsEl = opts.boundsEl || null;
    const hybridCentipede = Boolean(opts.hybridCentipede);
    const legsCanvas = opts.legsCanvas || null;
    const legsCtx = legsCanvas ? legsCanvas.getContext("2d", { alpha: true }) : null;
    const xmlns = "http://www.w3.org/2000/svg";
    const xlinkns = "http://www.w3.org/1999/xlink";
    const externalTick = Boolean(opts.externalTick);

    const measure = () => {
      if (boundsEl) return { width: boundsEl.clientWidth, height: boundsEl.clientHeight };
      return { width: window.innerWidth, height: window.innerHeight };
    };

    let width;
    let height;
    const resize = () => {
      const m = measure();
      width = m.width;
      height = m.height;
      if (legsCanvas && boundsEl) {
        const dpr = 1;
        legsCanvas.width = Math.floor(width * dpr);
        legsCanvas.height = Math.floor(height * dpr);
        legsCanvas.style.width = width + "px";
        legsCanvas.style.height = height + "px";
        if (legsCtx) legsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    window.addEventListener("resize", resize, false);
    resize();

    const N = 40;
    const elems = [];
    for (let i = 0; i < N; i++) elems[i] = { use: null, x: width / 2, y: height / 2 };

    const prepend = (use, i) => {
      const elem = document.createElementNS(xmlns, "use");
      elems[i].use = elem;
      elem.setAttributeNS(xlinkns, "xlink:href", "#" + use);
      screen.prepend(elem);
    };

    for (let i = 1; i < N; i++) {
      if (i === 1) prepend("Cabeza", i);
      else if (hybridCentipede && (i === 8 || i === 14)) prepend("Espina", i);
      else if (i === 8 || i === 14) prepend("Aletas", i);
      else prepend("Espina", i);
    }

    if (hybridCentipede) screen.setAttribute("class", "mutant-dragon-centipede-screen");

    const pointer = { x: width / 2, y: height / 2 };
    const radm = Math.min(pointer.x, pointer.y) - 20;
    let frm = Math.random();
    let rad = 0;
    let raf = 0;
    let lastT = performance.now();
    let lastTx = width / 2;
    let lastTy = height / 2;
    const partnerMode = Boolean(getPointer);
    const chaseK = 0.36;
    const spacingK = 0.58;

    const onMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      rad = 0;
    };
    if (!getPointer) window.addEventListener("pointermove", onMove, false);

    const tick = (now) => {
      const dt = Math.min(0.033, (now - lastT) / 1000 || 0.016);
      lastT = now;

      const target = getPointer ? getPointer() : pointer;
      const tvx = (target.x - lastTx) / dt;
      const tvy = (target.y - lastTy) / dt;
      lastTx = target.x;
      lastTy = target.y;
      const speed = Math.min(1, Math.hypot(tvx, tvy) / 900);

      let e = elems[0];
      const ax = (Math.cos(3 * frm) * rad * width) / height;
      const ay = (Math.sin(4 * frm) * rad * height) / width;
      const glide = { x: 0, y: 0 };
      const headK = partnerMode ? chaseK : 1 - Math.exp(-dt * 10);
      e.x += (ax + target.x + glide.x - e.x) * headK;
      e.y += (ay + target.y + glide.y - e.y) * headK;

      for (let i = 1; i < N; i++) {
        e = elems[i];
        const ep = elems[i - 1];
        const a = Math.atan2(e.y - ep.y, e.x - ep.x);
        const s = ((162 + 4 * (1 - i)) / 50) * sizeScale;
        const linkLen = Math.max(1.6, ((100 - i) / 5) * sizeScale * spacingK + s * 1.05);
        e.x = ep.x + Math.cos(a) * linkLen;
        e.y = ep.y + Math.sin(a) * linkLen;
        e.use.setAttribute(
          "transform",
          "translate(" +
            (ep.x * 0.28 + e.x * 0.72) +
            "," +
            (ep.y * 0.28 + e.y * 0.72) +
            ") rotate(" +
            (180 / Math.PI) * a +
            ") scale(" +
            s +
            "," +
            s +
            ")"
        );
      }

      if (hybridCentipede && legsCtx) {
        drawHybridLegs(legsCtx, elems, sizeScale, frm, width, height);
      }

      if (!getPointer) {
        if (rad < radm) rad++;
        frm += 0.003;
        if (rad > 60) {
          pointer.x += (width / 2 - pointer.x) * 0.05;
          pointer.y += (height / 2 - pointer.y) * 0.05;
        }
      } else {
        frm += 0.003 + speed * 0.004;
      }
    };

    const run = (now) => {
      raf = requestAnimationFrame(run);
      tick(now);
    };
    if (!externalTick) requestAnimationFrame(run);

    return {
      tick: tick,
      destroy() {
        cancelAnimationFrame(raf);
        if (!getPointer) window.removeEventListener("pointermove", onMove, false);
        window.removeEventListener("resize", resize, false);
        while (screen.firstChild) screen.removeChild(screen.firstChild);
        if (legsCtx) legsCtx.clearRect(0, 0, legsCanvas.width, legsCanvas.height);
      },
    };
  }

  global.initDragonCursor = initDragonCursor;
})(typeof window !== "undefined" ? window : global);
