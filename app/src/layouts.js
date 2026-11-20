// Panel layouts for the cover: each layout is three polygons in normalised
// coordinates (0..1), tiling the whole canvas with no gaps. The polygons share
// edges, so the white gutters drawn over them read as one diagonal grid,
// the multi-panel poster look. The same polygons scale to every export size.

/** The three layouts the editor offers, keyed by id. */
export const LAYOUTS = {
  diagonal: {
    name: 'Diagonal',
    panels: [
      // Big top-left hero panel.
      [[0, 0], [0.62, 0], [0.54, 0.58], [0, 0.66]],
      // Top-right panel.
      [[0.62, 0], [1, 0], [1, 0.46], [0.54, 0.58]],
      // Wide bottom panel, where the caption sits.
      [[0, 0.66], [0.54, 0.58], [1, 0.46], [1, 1], [0, 1]],
    ],
  },
  hero: {
    name: 'Hero + Duo',
    panels: [
      // Tall hero panel on the left.
      [[0, 0], [0.58, 0], [0.5, 1], [0, 1]],
      // Top-right panel.
      [[0.58, 0], [1, 0], [1, 0.5], [0.54, 0.5]],
      // Bottom-right panel.
      [[0.54, 0.5], [1, 0.5], [1, 1], [0.5, 1]],
    ],
  },
  triptych: {
    name: 'Triptych',
    panels: [
      // Three diagonal slices, left to right.
      [[0, 0], [0.36, 0], [0.28, 1], [0, 1]],
      [[0.36, 0], [0.68, 0], [0.6, 1], [0.28, 1]],
      [[0.68, 0], [1, 0], [1, 1], [0.6, 1]],
    ],
  },
};

/** Scales a normalised polygon to canvas pixels. */
export function scalePolygon(polygon, width, height) {
  return polygon.map(([x, y]) => [x * width, y * height]);
}

/** Bounding box of a pixel polygon, as [x, y, w, h]. */
export function polygonBounds(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

/** True when pixel point (px, py) lies inside the polygon (ray casting). */
export function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
