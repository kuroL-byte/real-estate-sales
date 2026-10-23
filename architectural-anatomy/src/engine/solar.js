/**
 * Solar model + Lambertian face shading.
 * World axes: x = East, y = South, z = Up.
 * Visible faces in our isometric view: Top (+z), Right = East façade (+x), Left = South façade (+y).
 */
export const SUNRISE = 7;
export const SUNSET = 18;
export const AMBIENT = 0.24;

export const FACE_NORMALS = {
  top: [0, 0, 1],
  right: [1, 0, 0],
  left: [0, 1, 0],
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const DEG = Math.PI / 180;

/** Sun direction unit vector for a given hour (7 → 18). Azimuth sweeps East → South → West. */
export function sunVector(hour) {
  const f = clamp((hour - SUNRISE) / (SUNSET - SUNRISE), 0, 1);
  const azimuth = Math.PI * f; // 0 = East, π/2 = South, π = West
  const altitude = (6 + 66 * Math.sin(Math.PI * f)) * DEG;
  const ca = Math.cos(altitude);
  return {
    x: ca * Math.cos(azimuth),
    y: ca * Math.sin(azimuth),
    z: Math.sin(altitude),
    azimuth,
    altitude,
    bearing: Math.round(90 + azimuth / DEG), // compass bearing (N = 0°)
    altitudeDeg: Math.round(altitude / DEG),
    f,
  };
}

/** Lambert's cosine law: I = max(0, N · L) */
export function lambert(n, s) {
  return Math.max(0, n[0] * s.x + n[1] * s.y + n[2] * s.z);
}

export function computeLighting(hour) {
  const sun = sunVector(hour);
  // Direct-normal illuminance with a simple air-mass attenuation, plus sky diffuse.
  const direct = 110000 * Math.exp(-0.2 / Math.max(sun.z, 0.05));
  const diffuse = 14000 * Math.sqrt(Math.max(sun.z, 0));
  const faces = {};
  for (const [key, n] of Object.entries(FACE_NORMALS)) {
    const dot = lambert(n, sun);
    faces[key] = {
      dot,
      intensity: AMBIENT + (1 - AMBIENT) * dot,
      lux: Math.round(diffuse + direct * dot),
    };
  }
  return { sun, faces, direct };
}

export function formatHour(h) {
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    hh += 1;
    mm = 0;
  }
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${suffix}`;
}

const GOLD = [212, 175, 55]; // #D4AF37 brushed gold
const MAUVE = [167, 139, 180]; // soft twilight mauve

/** Solar indicator colour: twilight mauve at the horizon → brushed gold at solar noon. */
export function sunTint(sun) {
  const k = Math.pow(Math.sin(Math.PI * sun.f), 0.7);
  const c = MAUVE.map((m, i) => Math.round(m + (GOLD[i] - m) * k));
  const base = `${c[0]} ${c[1]} ${c[2]}`;
  return { css: `rgb(${base})`, rgba: (a) => `rgb(${base} / ${a})` };
}

/** Obsidian architectural atmosphere with a faint solar bloom. */
export function skyAtmosphere(sun) {
  const tint = sunTint(sun);
  const s = Math.sin(Math.PI * sun.f);
  const gx = 82 - 64 * sun.f; // sun rises on the right (East) of the view
  const gy = 70 - 50 * s;
  return {
    background: 'radial-gradient(ellipse 120% 90% at 50% 38%, #14171F 0%, #10131A 45%, #0B0D11 80%)',
    glow: `radial-gradient(circle at ${gx.toFixed(1)}% ${gy.toFixed(1)}%, ${tint.rgba((0.14 - 0.05 * s).toFixed(3))} 0%, transparent 46%)`,
    tint,
  };
}
