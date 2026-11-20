// Fixed scenes for screenshots: ?shot=editor shows the page with photos
// loaded; ?shot=cover shows the cover alone. Query params pick the scene:
// photos (comma list of samples, one per panel), caption, tagline, layout,
// theme, size and grade. window.__shotReady is set once painted.
export async function runShot(shot, query, state, loadSample, redraw) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photos') ?? 'pier,boulevard,pier').split(',');
  const caption = query.get('caption') ?? 'Sunset Heist';
  const tagline = query.get('tagline') ?? 'A Neon Sunset Story';
  state.layout = query.get('layout') ?? 'diagonal';
  state.theme = query.get('theme') ?? 'sunset';
  state.size = query.get('size') ?? 'square';
  state.grade = Number(query.get('grade') ?? '0.85');
  state.caption = caption;
  state.tagline = tagline;
  state.captionScale = Number(query.get('capscale') ?? '1');
  for (let i = 0; i < 3; i++) {
    await loadSample(i, photos[i] ?? photos[0]);
    state.panels[i].photo = i;
  }
  // Give each panel its own crop so the multi-panel look reads at a glance.
  state.panels[0].zoom = 1.15;
  state.panels[1].zoom = 1.25;
  state.panels[1].oy = -0.15;
  state.panels[2].zoom = 1.45;
  state.panels[2].ox = 0.2;
  document.getElementById('caption').value = caption;
  document.getElementById('tagline').value = tagline;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('on', b.dataset.theme === state.theme));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  await Promise.all([
    document.fonts.load('120px Anton'),
    document.fonts.load('40px "Bebas Neue"'),
  ]);
  await document.fonts.ready;
  redraw();
  if (shot === 'cover') {
    const canvas = document.getElementById('cover');
    const fit = () => {
      const scale = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
      canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
      canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
