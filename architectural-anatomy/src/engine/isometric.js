/**
 * Pure 30° affine isometric projection.
 * World axes: x = East, y = South, z = Up.
 */
export const ISO_COS = 0.866; // cos 30°
export const ISO_SIN = 0.5; // sin 30°

export function projectIso(x, y, z, cx = 400, cy = 420) {
  return {
    x: cx + (x - y) * ISO_COS,
    y: cy + (x + y) * ISO_SIN - z,
  };
}

export function toPoint(x, y, z) {
  const p = projectIso(x, y, z);
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

/** verts: [[x,y,z], ...] → SVG points string */
export function toPolygon(verts) {
  return verts.map((v) => toPoint(v[0], v[1], v[2])).join(' ');
}

/** Straight segment as an SVG path fragment. */
export function seg(a, b) {
  return `M${toPoint(a[0], a[1], a[2])}L${toPoint(b[0], b[1], b[2])}`;
}

/** n evenly spaced values in [a, b]. */
export function lin(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

/** Andrew's monotone-chain convex hull on screen-space points {x, y}. */
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
