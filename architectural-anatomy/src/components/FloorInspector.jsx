import { SPEC_LABELS } from '../data/towerData';

const parsePercent = (s) => {
  const m = /(\d+(?:\.\d+)?)%/.exec(s ?? '');
  return m ? parseFloat(m[1]) : null;
};
const parseArea = (s) => parseInt(String(s).replace(/,/g, ''), 10) || 0;

const micro = 'text-[9px] uppercase tracking-widest text-[#94A3B8]';

function VastuGauge({ value }) {
  const pct = parsePercent(value);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 52 52" className="h-12 w-12 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(241,243,245,.08)" strokeWidth="1" />
        {pct !== null && (
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke="#C5A880"
            strokeWidth="1.5"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
            style={{ transition: 'stroke-dasharray 700ms cubic-bezier(.2,.8,.2,1)' }}
          />
        )}
      </svg>
      <div>
        <div className="font-['Cinzel'] text-2xl text-[#F1F3F5]">{pct !== null ? `${pct}%` : '—'}</div>
        <div className="mt-0.5 text-[10px] tracking-wide text-[#94A3B8]">{value}</div>
      </div>
    </div>
  );
}

export default function FloorInspector({ tier, tiers, selectedId, onSelect }) {
  const specEntries = Object.entries(SPEC_LABELS).filter(([k]) => k !== 'vastu' && tier.specs[k]);
  const maxArea = tier.rooms ? Math.max(...tier.rooms.map((r) => parseArea(r.area))) : 1;
  const priceIsMoney = tier.specs.price.startsWith('₹');

  return (
    <div className="flex flex-col">
      <article key={tier.id} className="panel-enter border-b border-white/5 px-7 py-7">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.25em] text-[#C5A880]">{tier.levelTag}</span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#64748B]">Floor Inspector</span>
        </div>
        <h2 className="mt-4 font-['Cinzel'] text-[19px] leading-snug tracking-[0.06em] text-[#F1F3F5]">{tier.name}</h2>
        <div className="mt-5 flex items-baseline gap-3 border-t border-[#C5A880]/20 pt-4">
          <span className={micro}>{priceIsMoney ? 'Investment' : 'Allocation'}</span>
          <span className={`${priceIsMoney ? "font-['Cinzel'] text-2xl" : 'text-sm uppercase tracking-[0.18em]'} text-[#D4B895]`}>{tier.specs.price}</span>
        </div>

        <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
          {specEntries.map(([k, label]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-3">
              <dt className={micro}>{label}</dt>
              <dd className="text-right text-[13px] font-light text-[#F1F3F5]">{tier.specs[k]}</dd>
            </div>
          ))}
          <div className="py-4">
            <dt className={`${micro} mb-3`}>Vastu Conformance</dt>
            <dd>
              <VastuGauge value={tier.specs.vastu} />
            </dd>
          </div>
        </dl>

        {tier.rooms && (
          <div className="mt-7">
            <h3 className={`${micro} mb-2`}>Room Schedule</h3>
            <ul className="divide-y divide-white/5">
              {tier.rooms.map((r) => (
                <li key={r.name} className="py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-light text-[#F1F3F5]">{r.name}</span>
                    <span className="font-mono text-[11px] text-[#D4B895]">{r.area}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.07]">
                      <div className="h-px bg-[#C5A880]" style={{ width: `${(parseArea(r.area) / maxArea) * 100}%` }} />
                    </div>
                    <span className="w-28 text-right text-[9px] uppercase tracking-[0.18em] text-[#64748B]">{r.zone}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-7">
          <h3 className={`${micro} mb-3`}>Specification</h3>
          <ul className="space-y-2">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[12.5px] font-light leading-relaxed text-[#CBD5E1]">
                <span className="mt-[9px] h-px w-3 shrink-0 bg-[#C5A880]" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </article>

      {/* Level tags as a hairline building section */}
      <nav className="px-7 py-7" aria-label="Level tags">
        <h3 className={`${micro} mb-4`}>Section · Level Index</h3>
        <div className="flex flex-col items-center">
          {[...tiers].reverse().map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                id={`level-tag-${t.id}`}
                type="button"
                onClick={() => onSelect(t.id)}
                className={`-mt-px flex items-center justify-between border px-3 text-left transition-all duration-500 ${
                  active ? 'z-10 border-[#C5A880] bg-[#C5A880]/[0.08] text-[#D4B895]' : 'border-white/10 text-[#64748B] hover:border-white/25 hover:text-[#F1F3F5]'
                }`}
                style={{ width: `${(t.footprint.w / 135) * 100}%`, height: `${Math.max(24, t.baseHeight * 0.55)}px` }}
              >
                <span className="font-mono text-[9px] tracking-[0.2em]">{t.levelTag}</span>
                <span className="truncate pl-2 text-[9px] uppercase tracking-[0.18em]">{t.shortName}</span>
              </button>
            );
          })}
          <div className="mt-2 h-px w-[115%] bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent" />
        </div>
      </nav>
    </div>
  );
}
