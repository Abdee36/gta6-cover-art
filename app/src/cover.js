// Draws the cover: three diagonal photo panels, a sunset or neon colour grade,
// comic halftone shading, white gutters, and the bold condensed caption.
// Every photo is drawn from the user's own machine; nothing is fetched.

import { LAYOUTS, scalePolygon, polygonBounds } from './layouts.js';

/** Colour themes: grade overlays, caption gradient and accent. */
export const THEMES = {
  sunset: {
    name: 'Sunset',
    filter: 'saturate(1.45) contrast(1.1) brightness(1.02)',
    topTint: 'rgba(255, 140, 60, 0.30)',
    bottomTint: 'rgba(200, 30, 120, 0.55)',
    accent: '#ff5e3a',
    captionFrom: '#ffffff',
    captionTo: '#ffd76a',
    captionStroke: '#2a0b33',
  },
  neon: {
    name: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.12) hue-rotate(-14deg)',
    topTint: 'rgba(0, 220, 255, 0.24)',
    bottomTint: 'rgba(255, 30, 140, 0.58)',
    accent: '#ff2e88',
    captionFrom: '#ffffff',
    captionTo: '#7df9ff',
    captionStroke: '#12002e',
  },
  teal: {
    name: 'Teal Dusk',
    filter: 'saturate(1.2) hue-rotate(16deg) contrast(1.08)',
    topTint: 'rgba(0, 230, 190, 0.2)',
    bottomTint: 'rgba(20, 60, 140, 0.55)',
    accent: '#00e5c0',
    captionFrom: '#ffffff',
    captionTo: '#ffe9a8',
    captionStroke: '#06232b',
  },
  mono: {
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.14) brightness(1.02)',
    topTint: 'rgba(255, 255, 255, 0.10)',
    bottomTint: 'rgba(0, 0, 0, 0.45)',
    accent: '#e8e8e8',
    captionFrom: '#ffffff',
    captionTo: '#d8d8d8',
    captionStroke: '#111111',
  },
};

/** Export sizes the app offers, in pixels. */
export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

/** A fresh default state for the editor. */
export function defaultState() {
  return {
    size: 'square',
    layout: 'diagonal',
    theme: 'sunset',
    grade: 0.8,
    halftone: true,
    caption: 'SUNSET HEIST',
    tagline: 'A NEON SUNSET STORY',
    captionScale: 1,
    photos: [null, null, null],
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

function tracePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

/** Deterministic hash for the halftone jitter, so a cover redraws identically. */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Comic halftone dots growing into the shadowed lower part of a panel. */
function drawHalftone(ctx, points, width, height) {
  const [bx, by, bw, bh] = polygonBounds(points);
  const step = Math.max(8, width / 110);
  ctx.save();
  tracePath(ctx, points);
  ctx.clip();
  ctx.fillStyle = 'rgba(10, 4, 20, 0.28)';
  for (let gx = bx; gx < bx + bw + step; gx += step) {
    for (let gy = by; gy < by + bh + step; gy += step) {
      const depth = (gy - by) / Math.max(1, bh);
      const jitter = hash2(gx, gy) * 0.18;
      const v = depth + jitter - 0.18;
      if (v < 0.62) continue;
      const r = Math.min(step * 0.38, (v - 0.62) * step * 0.9);
      ctx.beginPath();
      ctx.arc(gx + step / 2, gy + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draws one panel: the photo cover-fit with pan and zoom, then the grade. */
function drawPanel(ctx, panel, photo, theme, grade, width, height) {
  const points = panel.points;
  const [bx, by, bw, bh] = polygonBounds(points);
  ctx.save();
  tracePath(ctx, points);
  ctx.clip();
  ctx.fillStyle = '#241534';
  ctx.fillRect(bx, by, bw, bh);
  if (photo) {
    const base = Math.max(bw / photo.naturalWidth, bh / photo.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    const cx = bx + bw / 2 + (panel.ox || 0) * bw * 0.25;
    const cy = by + bh / 2 + (panel.oy || 0) * bh * 0.25;
    ctx.filter = theme.filter;
    ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.filter = 'none';
    // Warm grade wash over the photo.
    const wash = ctx.createLinearGradient(0, by, 0, by + bh);
    wash.addColorStop(0, theme.topTint);
    wash.addColorStop(1, theme.bottomTint);
    ctx.globalAlpha = grade;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Fits the caption to the canvas width and draws it with outline and gradient. */
function drawCaption(ctx, state, width, height, theme) {
  const text = state.caption.trim().toUpperCase();
  const tag = state.tagline.trim().toUpperCase();
  const pad = width * 0.045;
  const maxW = width - pad * 2;
  // Caption size, fitted to the width.
  let size = Math.round(height * 0.115 * (state.captionScale || 1));
  ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 12) {
    size -= 2;
    ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  }
  const textW = ctx.measureText(text).width;
  // Stack from the bottom: accent bar, caption, then the tagline above it.
  const barH = Math.max(4, height * 0.006);
  const capBaseline = height - pad - barH - size * 0.18;
  const capTop = capBaseline - size;
  if (tag) {
    let tagSize = Math.round(height * 0.024);
    ctx.font = `${tagSize}px "Bebas Neue", sans-serif`;
    while (ctx.measureText(spread(tag)).width > maxW && tagSize > 10) {
      tagSize -= 1;
      ctx.font = `${tagSize}px "Bebas Neue", sans-serif`;
    }
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(spread(tag), pad, capTop - tagSize * 0.55);
  }
  if (!text) return;
  ctx.save();
  ctx.translate(pad, capBaseline);
  ctx.rotate(-0.015);
  const grad = ctx.createLinearGradient(0, -size, 0, size * 0.15);
  grad.addColorStop(0, theme.captionFrom);
  grad.addColorStop(1, theme.captionTo);
  ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = theme.captionStroke;
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  // Accent bar under the caption.
  ctx.fillStyle = theme.accent;
  ctx.fillRect(pad, capBaseline + size * 0.16, Math.min(maxW * 0.42, textW * 0.5), barH);
}

/** Letterspaces a string with hair spaces for the tagline. */
function spread(s) {
  return s.split('').join('\u200a');
}

/**
 * Draws the whole cover onto `canvas` at `width` x `height` pixels.
 * `state` holds photos, per-panel crop, layout, theme and caption.
 */
export function drawCover(canvas, state, width, height) {
  const ctx = canvas.getContext('2d');
  const theme = THEMES[state.theme] || THEMES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.diagonal;
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, width, height);
  const panels = layout.panels.map((poly) => ({ points: scalePolygon(poly, width, height) }));
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = slot.photo >= 0 ? state.photos[slot.photo] : null;
    drawPanel(ctx, panel, photo, theme, state.grade, width, height);
    if (state.halftone) drawHalftone(ctx, panel.points, width, height);
  });
  // One warm wash over the whole cover so the panels read as one sunset.
  const dusk = ctx.createLinearGradient(0, 0, 0, height);
  dusk.addColorStop(0, 'rgba(255, 120, 40, 0.08)');
  dusk.addColorStop(0.6, 'rgba(255, 80, 90, 0.10)');
  dusk.addColorStop(1, 'rgba(255, 40, 120, 0.16)');
  ctx.globalAlpha = state.grade;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // White gutters between panels and the outer frame.
  const gutter = Math.max(6, Math.round(width * 0.007));  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#f7f2ff';
  ctx.lineWidth = gutter;
  for (const panel of panels) {
    tracePath(ctx, panel.points);
    ctx.stroke();
  }
  ctx.lineWidth = gutter * 1.4;
  ctx.strokeRect(gutter / 2, gutter / 2, width - gutter, height - gutter);
  // Dark legibility band behind the caption.
  const band = ctx.createLinearGradient(0, height * 0.62, 0, height);
  band.addColorStop(0, 'rgba(12, 4, 22, 0)');
  band.addColorStop(1, 'rgba(12, 4, 22, 0.72)');
  ctx.fillStyle = band;
  ctx.fillRect(0, height * 0.62, width, height * 0.38);
  drawCaption(ctx, state, width, height, theme);
}
