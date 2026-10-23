import { useCallback, useRef } from 'react';
import { formatHour, SUNRISE, SUNSET } from '../engine/solar';

const DIAL = { w: 220, h: 124, cx: 110, cy: 108, r: 86 };
const SPAN = SUNSET - SUNRISE;

function Section({ index, title, value, children }) {
  return (
    <section className="border-b border-white/5 px-6 py-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#C5A880]">
          <span className="mr-2 font-mono text-[#C5A880]/60">{index}</span>
          {title}
        </h3>
        {value && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F1F3F5]/80">{value}</span>}
      </div>
      {children}
    </section>
  );
}

function DaylightDial({ hour, onChange, sun, tint }) {
  const svgRef = useRef(null);
  const f = (hour - SUNRISE) / SPAN;
  const theta = Math.PI * (1 - f);
  const kx = DIAL.cx + DIAL.r * Math.cos(theta);
  const ky = DIAL.cy - DIAL.r * Math.sin(theta);

  const update = useCallback(
    (e) => {
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * DIAL.w;
      const y = ((e.clientY - rect.top) / rect.height) * DIAL.h;
      let a = Math.atan2(DIAL.cy - y, x - DIAL.cx);
      if (a < 0) a = x < DIAL.cx ? Math.PI : 0;
      const nf = 1 - a / Math.PI;
      onChange(Math.round((SUNRISE + nf * SPAN) * 12) / 12); // 5-minute steps
    },
    [onChange],
  );

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(SUNRISE, hour - 0.25));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(SUNSET, hour + 0.25));
    }
  };

  const arc = `M${DIAL.cx - DIAL.r} ${DIAL.cy} A${DIAL.r} ${DIAL.r} 0 0 1 ${DIAL.cx + DIAL.r} ${DIAL.cy}`;
  const progress = `M${DIAL.cx - DIAL.r} ${DIAL.cy} A${DIAL.r} ${DIAL.r} 0 0 1 ${kx.toFixed(2)} ${ky.toFixed(2)}`;

  return (
    <svg
      id="daylight-dial"
      ref={svgRef}
      viewBox={`0 0 ${DIAL.w} ${DIAL.h}`}
      className="w-full cursor-grab touch-none select-none outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]/50 active:cursor-grabbing"
      role="slider"
      tabIndex={0}
      aria-label="Solar simulator — time of day"
      aria-valuemin={SUNRISE}
      aria-valuemax={SUNSET}
      aria-valuenow={Number(hour.toFixed(2))}
      aria-valuetext={formatHour(hour)}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && update(e)}
    >
      <line x1={DIAL.cx - DIAL.r - 8} y1={DIAL.cy} x2={DIAL.cx + DIAL.r + 8} y2={DIAL.cy} stroke="rgba(241,243,245,.12)" strokeWidth="0.5" />
      <path d={arc} fill="none" stroke="rgba(241,243,245,.12)" strokeWidth="0.75" />
      <path d={progress} fill="none" stroke={tint.css} strokeWidth="1.25" />
      {Array.from({ length: SPAN + 1 }, (_, i) => {
        const t = Math.PI * (1 - i / SPAN);
        const r0 = DIAL.r + 4;
        const r1 = DIAL.r + (i % 5 === 0 ? 10 : 7);
        return (
          <line
            key={i}
            x1={DIAL.cx + r0 * Math.cos(t)}
            y1={DIAL.cy - r0 * Math.sin(t)}
            x2={DIAL.cx + r1 * Math.cos(t)}
            y2={DIAL.cy - r1 * Math.sin(t)}
            stroke="rgba(197,168,128,.45)"
            strokeWidth="0.5"
          />
        );
      })}
      <text x={DIAL.cx - DIAL.r} y={DIAL.cy + 12} textAnchor="middle" fontSize="6.5" letterSpacing="1.5" fill="#64748B" style={{ fontFamily: 'JetBrains Mono' }}>
        07:00
      </text>
      <text x={DIAL.cx + DIAL.r} y={DIAL.cy + 12} textAnchor="middle" fontSize="6.5" letterSpacing="1.5" fill="#64748B" style={{ fontFamily: 'JetBrains Mono' }}>
        18:00
      </text>
      <text x={DIAL.cx} y={DIAL.cy - 26} textAnchor="middle" fontSize="21" fontWeight="300" letterSpacing="1" fill="#F1F3F5" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        {formatHour(hour)}
      </text>
      <text x={DIAL.cx} y={DIAL.cy - 10} textAnchor="middle" fontSize="6.5" letterSpacing="1.8" fill="#94A3B8" style={{ fontFamily: 'JetBrains Mono' }}>
        AZ {sun.bearing}° · ALT {sun.altitudeDeg}°
      </text>
      <line x1={DIAL.cx} y1={DIAL.cy} x2={kx} y2={ky} stroke={tint.rgba(0.25)} strokeWidth="0.5" strokeDasharray="1 3" />
      <circle cx={kx} cy={ky} r="11" fill={tint.rgba(0.14)} />
      <circle cx={kx} cy={ky} r="4.5" fill={tint.css} stroke="#F1F3F5" strokeWidth="0.6" />
    </svg>
  );
}

const FACE_LABELS = [
  { key: 'top', label: 'Roof Plate' },
  { key: 'right', label: 'East Elevation' },
  { key: 'left', label: 'South Elevation' },
];

export default function SalesControls({
  explode,
  onExplodeInput,
  onExplodePreset,
  hour,
  onHourChange,
  playing,
  onTogglePlay,
  xray,
  onToggleXray,
  lighting,
  tint,
  selectedTier,
  onShare,
}) {
  const mode = explode < 5 ? 'Stacked' : explode < 70 ? 'Cutaway' : 'Exploded';

  return (
    <div className="flex min-h-full flex-col">
      <Section index="01" title="Anatomy Separation" value={`${Math.round(explode)}% · ${mode}`}>
        <input
          id="explode-slider"
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={explode}
          onChange={(e) => onExplodeInput(Number(e.target.value))}
          className="anatomy-range"
          style={{ '--fill': `${explode}%` }}
          aria-label="Anatomy separation"
        />
        <div className="mt-1 flex justify-between">
          {[
            ['Stacked', 0],
            ['Cutaway', 50],
            ['Exploded', 100],
          ].map(([label, v]) => {
            const on = Math.abs(explode - v) < 2;
            return (
              <button
                key={label}
                id={`explode-preset-${label.toLowerCase()}`}
                type="button"
                onClick={() => onExplodePreset(v)}
                className={`border-b pb-1 text-[9px] uppercase tracking-[0.25em] transition-colors duration-300 ${
                  on ? 'border-[#C5A880] text-[#D4B895]' : 'border-transparent text-[#64748B] hover:text-[#F1F3F5]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section index="02" title="Solar Simulator" value={playing ? 'Time-lapse' : 'Manual'}>
        <DaylightDial hour={hour} onChange={onHourChange} sun={lighting.sun} tint={tint} />
        <button
          id="daylight-play"
          type="button"
          onClick={onTogglePlay}
          className="mt-3 flex w-full items-center justify-center gap-3 border border-white/10 py-2 text-[9px] uppercase tracking-[0.28em] text-[#F1F3F5]/80 transition-colors duration-300 hover:border-[#C5A880]/50 hover:text-[#D4B895]"
        >
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
            {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M7 5v14l12-7z" />}
          </svg>
          {playing ? 'Pause Study' : 'Sunrise → Twilight'}
        </button>

        <dl className="mt-5 divide-y divide-white/5 border-t border-white/5">
          {FACE_LABELS.map(({ key, label }) => {
            const face = lighting.faces[key];
            const pct = Math.min(100, (face.lux / 100000) * 100);
            return (
              <div key={key} className="py-2.5">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[9px] uppercase tracking-widest text-[#94A3B8]">{label}</dt>
                  <dd className="font-mono text-[11px] text-[#F1F3F5]">
                    {face.lux.toLocaleString('en-IN')} <span className="text-[#64748B]">lx</span>
                  </dd>
                </div>
                <div className="mt-2 h-px bg-white/[0.07]">
                  <div className="h-px transition-[width] duration-200" style={{ width: `${pct}%`, background: tint.css }} />
                </div>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section index="03" title="Structural X-Ray">
        <button id="xray-toggle" type="button" onClick={onToggleXray} aria-pressed={xray} className="group flex w-full items-center justify-between gap-4 text-left">
          <span className="text-[11px] leading-relaxed text-[#94A3B8]">
            Reduce envelope to 20% and reveal columns, piles &amp; MEP risers.
          </span>
          <span className={`relative h-3.5 w-8 shrink-0 border transition-colors duration-300 ${xray ? 'border-[#C5A880]' : 'border-white/20 group-hover:border-white/40'}`}>
            <span className={`absolute top-1/2 h-1.5 w-3 -translate-y-1/2 transition-all duration-300 ${xray ? 'left-[16px] bg-[#D4B895]' : 'left-[2px] bg-[#64748B]'}`} />
          </span>
        </button>
      </Section>

      <div className="mt-auto px-6 py-6">
        <button
          id="whatsapp-share"
          type="button"
          onClick={onShare}
          className="group relative flex w-full items-stretch overflow-hidden border border-white/10 bg-[#0B0D11]/60 text-left transition-colors duration-500 hover:border-[#C5A880]/40"
        >
          <span className="w-[2px] shrink-0 bg-gradient-to-b from-[#D4AF37] via-[#C5A880] to-[#0F766E] transition-all duration-500 group-hover:w-[4px]" />
          <span className="flex-1 px-4 py-3.5">
            <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-[#F1F3F5]">Transmit Private Buyer Capsule</span>
            <span className="mt-1.5 block text-[9px] uppercase tracking-[0.2em] text-[#C5A880]/80">
              Concierge · WhatsApp · {selectedTier.levelTag}
            </span>
          </span>
          <span className="flex items-center pr-4 text-[#C5A880] transition-transform duration-500 group-hover:translate-x-1">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <path d="M4 12h15M14 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
