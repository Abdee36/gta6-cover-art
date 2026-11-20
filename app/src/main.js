// Wires the studio: photos in, caption typed, panels cropped by drag and
// wheel, one click to a PNG in any of the three post sizes. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, SIZES } from './cover.js';
import { LAYOUTS, scalePolygon, pointInPolygon } from './layouts.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let selectedPanel = 0;

const $ = (id) => document.getElementById(id);

function sizeOf() {
  return SIZES[state.size] || SIZES.square;
}

function redraw() {
  const { w, h } = sizeOf();
  drawCover(canvas, state, w, h);
  $('zoom').value = String(state.panels[selectedPanel].zoom);
  $('panx').value = String(state.panels[selectedPanel].ox);
  $('pany').value = String(state.panels[selectedPanel].oy);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Puts a loaded photo into a slot and points every panel using it at it. */
function setPhoto(slot, img) {
  state.photos[slot] = img;
  redraw();
}

async function loadFile(file, slot) {
  if (!file) return;
  setPhoto(slot, await loadImage(URL.createObjectURL(file)));
  status.textContent = `Photo ${slot + 1} loaded — drag it on the cover to position it.`;
}

async function loadSample(slot, name) {
  setPhoto(slot, await loadImage(`samples/${name}.jpg`));
  status.textContent = `Sample ${name} loaded into panel ${slot + 1}.`;
}

// Photo inputs: one per panel slot, plus sample shortcuts.
for (let slot = 0; slot < 3; slot++) {
  $(`photo${slot}`).addEventListener('change', (e) => loadFile(e.target.files[0], slot));
  $(`sample${slot}`).addEventListener('click', () => loadSample(slot, slot === 1 ? 'boulevard' : 'pier'));
}
$('onephoto').addEventListener('click', () => {
  const first = state.photos.find((p) => p);
  if (!first) { status.textContent = 'Load a photo first, then fill all panels with it.'; return; }
  state.photos = [first, first, first];
  redraw();
  status.textContent = 'One photo now fills all three panels — crop each one differently.';
});

// Panel selection: buttons, or click a panel on the cover itself.
function selectPanel(i) {
  selectedPanel = i;
  document.querySelectorAll('[data-panel]').forEach((b) => b.classList.toggle('on', Number(b.dataset.panel) === i));
  redraw();
}
document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => selectPanel(Number(b.dataset.panel))));

function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (canvas.width / r.width);
  const y = (clientY - r.top) * (canvas.height / r.height);
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, scalePolygon(layout.panels[i], canvas.width, canvas.height))) return i;
  }
  return -1;
}

let dragging = false;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  selectPanel(hit);
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.dataset.lx = e.clientX;
  canvas.dataset.ly = e.clientY;
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[selectedPanel];
  p.ox = clamp(p.ox + ((e.clientX - canvas.dataset.lx) / r.width) * 1.6, -1, 1);
  p.oy = clamp(p.oy + ((e.clientY - canvas.dataset.ly) / r.height) * 1.6, -1, 1);
  canvas.dataset.lx = e.clientX;
  canvas.dataset.ly = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selectedPanel];
  p.zoom = clamp(p.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 1, 3);
  redraw();
}, { passive: false });

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// Crop sliders for the selected panel.
$('zoom').addEventListener('input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value); redraw(); });
$('panx').addEventListener('input', (e) => { state.panels[selectedPanel].ox = Number(e.target.value); redraw(); });
$('pany').addEventListener('input', (e) => { state.panels[selectedPanel].oy = Number(e.target.value); redraw(); });
$('resetCrop').addEventListener('click', () => {
  state.panels[selectedPanel] = { ...state.panels[selectedPanel], zoom: 1, ox: 0, oy: 0 };
  redraw();
});

// Layout, theme, grade and halftone.
document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout;
  document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('on', x === b));
  redraw();
}));
document.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
  state.theme = b.dataset.theme;
  document.querySelectorAll('[data-theme]').forEach((x) => x.classList.toggle('on', x === b));
  redraw();
}));
$('grade').addEventListener('input', (e) => { state.grade = Number(e.target.value); redraw(); });
$('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; redraw(); });

// Caption and tagline.
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('capscale').addEventListener('input', (e) => { state.captionScale = Number(e.target.value); redraw(); });

// Export size, then the PNG download.
document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
  state.size = b.dataset.size;
  document.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('on', x === b));
  redraw();
}));
$('export').addEventListener('click', () => {
  const { w, h } = sizeOf();
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved cover-${w}x${h}.png`;
  }, 'image/png');
});

// Automation hook for screenshots and tests: render any size off-screen.
window.__studio = {
  state,
  redraw,
  loadSample,
  /** Draws the current cover at w x h and returns a PNG data URL. */
  renderExport(w, h) {
    const off = document.createElement('canvas');
    drawCover(off, state, w, h);
    return off.toDataURL('image/png');
  },
};

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, async (slot, sample) => { await loadSample(slot, sample); }, redraw);
} else {
  // Default scene: the two free samples fill the panels so the app opens alive.
  Promise.all([loadSample(0, 'pier'), loadSample(1, 'boulevard')]).then(() => {
    state.panels[2].photo = 0;
    state.panels[2].zoom = 1.4;
    redraw();
  });
  document.fonts.ready.then(redraw);
}
