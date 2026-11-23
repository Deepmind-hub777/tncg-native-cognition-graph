export function clientToViewBox(clientX, clientY, rect, viewBox = { x: 0, y: 0, width: 1024, height: 1024 }) {
  if (!rect?.width || !rect?.height) return { x: 0, y: 0 };
  return { x: viewBox.x + (clientX - rect.left) * viewBox.width / rect.width, y: viewBox.y + (clientY - rect.top) * viewBox.height / rect.height };
}

export function redrawStrokes(context, strokes, dpr = 1, viewport = { width: 1024, height: 1024 }) {
  const logicalWidth = viewport.logicalWidth || 1024, logicalHeight = viewport.logicalHeight || 1024;
  const width = viewport.width || logicalWidth, height = viewport.height || logicalHeight;
  context.setTransform(dpr * width / logicalWidth, 0, 0, dpr * height / logicalHeight, 0, 0);
  context.clearRect(0, 0, logicalWidth, logicalHeight);
  context.lineWidth = 7 * logicalWidth / width; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#2d241d';
  for (const points of strokes) {
    if (!points.length) continue;
    context.beginPath(); context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();
  }
}

export function createWritingSurface({ root, character, strokeData, mode = 'trace', document: doc = globalThis.document, window: win = globalThis.window }) {
  const guide = root.querySelector('.stroke-guide') ?? root.querySelector('svg'); const canvas = root.querySelector('canvas');
  if (!guide || !canvas || !strokeData?.strokes || !strokeData?.medians) throw new TypeError('A guide surface, writing canvas and standard stroke data are required');
  const ctx = canvas.getContext('2d'); const viewBox = { x: 0, y: 0, width: 1024, height: 1024 };
  const paths = [];
  let active = null, destroyed = false, writer = null;
  guide.setAttribute?.('aria-label', `${character} standard stroke order`);
  root.classList?.toggle('is-tracing', mode === 'trace');
  const redraw = () => redrawStrokes(ctx, paths, win?.devicePixelRatio || 1, { width: canvas.clientWidth || 1024, height: canvas.clientHeight || 1024 });
  const resize = () => {
    const rect = canvas.getBoundingClientRect(); const dpr = win?.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    writer?.updateDimensions?.({ width: rect.width, height: rect.height, padding: 0 });
    redraw();
  };
  const point = (event) => clientToViewBox(event.clientX, event.clientY, canvas.getBoundingClientRect(), viewBox);
  const down = (event) => { if (destroyed) return; event.preventDefault?.(); canvas.setPointerCapture?.(event.pointerId); active = [point(event)]; paths.push(active); redraw(); };
  const move = (event) => { if (!active || destroyed) return; event.preventDefault?.(); active.push(point(event)); redraw(); };
  const finish = (event) => { if (!active) return; active = null; try { canvas.releasePointerCapture?.(event.pointerId); } catch {} };
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish); canvas.addEventListener('lostpointercapture', finish);
  win?.addEventListener?.('resize', resize); win?.addEventListener?.('orientationchange', resize);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; observer?.observe(canvas); resize();
  const Writer = win?.HanziWriter ?? globalThis.HanziWriter;
  if (Writer?.create) {
    try {
      writer = Writer.create(guide, character, { width: canvas.clientWidth || 1024, height: canvas.clientHeight || 1024, padding: 0, charDataLoader: () => strokeData, showCharacter: false, showOutline: true, outlineColor: '#b8a78e', strokeColor: '#29231e', radicalColor: '#875b2c', drawingWidth: 6, delayBetweenStrokes: 350 });
    } catch { writer = null; }
  }
  if (!writer) guide.innerHTML = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><g class="glyph-guide">${strokeData.strokes.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;
  guide.style.visibility = mode === 'trace' ? 'visible' : 'hidden';
  return {
    async animate() {
      const localWriter = writer ?? (win?.HanziWriter ?? globalThis.HanziWriter)?.create?.(guide, character, { width: canvas.clientWidth || 1024, height: canvas.clientHeight || 1024, padding: 0, charDataLoader: () => strokeData, showCharacter: false, showOutline: true, outlineColor: '#b8a78e', strokeColor: '#29231e', delayBetweenStrokes: 350 });
      if (localWriter) { writer = localWriter; await writer.animateCharacter(); return; }
      guide.innerHTML = '';
      const group = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); group.setAttribute('viewBox', '0 0 1024 1024'); guide.append(group);
      for (let i = 0; i < strokeData.medians.length; i++) {
        if (destroyed) return;
        const points = strokeData.medians[i]; const path = doc.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        path.setAttribute('points', points.map(([x,y]) => `${x},${y}`).join(' ')); path.setAttribute('class','stroke-order-step'); path.setAttribute('data-stroke', String(i + 1)); group.append(path);
        await new Promise((resolve) => { path.addEventListener('animationend', resolve, { once: true }); setTimeout(resolve, 650); });
      }
    },
    setMode(next) { mode = next; root.classList?.toggle('is-tracing', mode === 'trace'); guide.style.visibility = mode === 'trace' ? 'visible' : 'hidden'; },
    clear() { paths.length = 0; active = null; redraw(); },
    get strokes() { return paths.map((stroke) => stroke.map((p) => ({ ...p }))); },
    destroy() { destroyed = true; observer?.disconnect(); canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointermove',move); canvas.removeEventListener('pointerup',finish); canvas.removeEventListener('pointercancel',finish); canvas.removeEventListener('lostpointercapture',finish); win?.removeEventListener?.('resize',resize); win?.removeEventListener?.('orientationchange',resize); }
  };
}
