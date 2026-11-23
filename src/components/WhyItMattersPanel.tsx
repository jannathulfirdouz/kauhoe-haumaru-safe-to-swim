import { CloudRain, Clock, Droplets, ShieldCheck } from 'lucide-react';

export function WhyItMattersPanel() {
  // SVG coordinate system: plot x in [44, 404] (0h to 72h -> 120px per 24h), y in [26, 166]
  const linePath =
    'M 44 148 C 54 96, 62 38, 92 36 C 128 34, 176 38, 224 52 C 252 60, 268 80, 284 104 C 308 134, 344 148, 404 152';
  const areaPath = `${linePath} L 404 166 L 44 166 Z`;

  return (
    <section
      id="why-section"
      aria-label="Why rainfall affects Auckland water quality"
      className="bg-white rounded-2xl border border-[#D3E4EE] p-5 sm:p-6 space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Explanation + 3-stage cards */}
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-[#0B2538] tracking-tight">
              Why it matters · Te Pūtake o te Haumaru
            </h2>
            <p className="text-sm text-[#324D5E] leading-relaxed">
              Across Tāmaki Makaurau, heavy rain causes stormwater runoff and wastewater network overflows into our harbours and beaches. This raises bacteria levels (such as{' '}
              <span className="font-semibold text-[#0B2538]">Enterococci</span>) and makes swimming unsafe for{' '}
              <span className="font-semibold text-[#0B2538] tabular-nums">up to 48 hours</span> after the rain stops.
            </p>
          </div>

          {/* 3-stage coastal overflow timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#F4F9FC] border border-[#DCEBF3] p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#026699]/10 text-[#026699] flex items-center justify-center shrink-0">
                  <CloudRain className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0B2538]">01. Ua Nui · Heavy Rain</p>
                  <p className="text-xs text-[#456173]">Stormwater &amp; runoff</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#324D5E] leading-relaxed">
                Rainwater washes street pollutants into stormwater pipes and can overwhelm older combined wastewater systems across Auckland.
              </p>
            </div>

            <div className="rounded-xl bg-[#FFFBF0] border border-[#FCD38D] p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#C27200]/15 text-[#92400E] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0B2538] tabular-nums">
                    02. 24–48 Haora · Wait Period
                  </p>
                  <p className="text-xs text-[#92400E]">Elevated bacteria risk</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#324D5E] leading-relaxed">
                Overflows and stream plumes raise bacteria levels for 24 to 48 hours, even when the sun comes back out and the sea looks clear.
              </p>
            </div>

            <div className="rounded-xl bg-[#F2FBF6] border border-[#A7DFC1] p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0D8A4E]/15 text-[#065F46] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0B2538]">03. Haumaru · Safe Return</p>
                  <p className="text-xs text-[#065F46]">Tides &amp; UV disperse risk</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#324D5E] leading-relaxed">
                Tidal flushing and sunlight naturally clear the water. Always verify Safeswim and on-site signs before heading in.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Stacked below cards on mobile): Rain -> Risk timeline chart */}
        <div className="lg:col-span-5 rounded-xl bg-[#F8FBFD] border border-[#D3E4EE] p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#0B2538] tracking-tight">
              Rain → Risk timeline · Te wā mōrearea
            </h3>
            <span className="text-[11px] font-medium text-[#456173]">
              Illustrative pattern, not live data
            </span>
          </div>

          <div className="w-full">
            <svg
              viewBox="0 0 420 202"
              className="w-full h-auto block"
              role="img"
              aria-label="Illustrative chart showing relative bacteria risk from 0 to 72 hours after heavy rain: Red zone from 0 to 24 hours with rapid rise and peak risk, Amber zone from 24 to 48 hours with elevated risk tapering down, and Green zone from 48 to 72 hours returning to low risk."
            >
              <defs>
                <linearGradient id="riskAreaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0.28" />
                  <stop offset="33.3%" stopColor="#DC2626" stopOpacity="0.24" />
                  <stop offset="33.4%" stopColor="#D97706" stopOpacity="0.24" />
                  <stop offset="66.6%" stopColor="#D97706" stopOpacity="0.18" />
                  <stop offset="66.7%" stopColor="#059669" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id="riskLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#B91C1C" />
                  <stop offset="33.3%" stopColor="#B91C1C" />
                  <stop offset="33.4%" stopColor="#B45309" />
                  <stop offset="66.6%" stopColor="#B45309" />
                  <stop offset="66.7%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>

              {/* Coloured risk zones: Red (0-24h), Amber (24-48h), Green (48h+) */}
              <rect x="44" y="24" width="120" height="142" fill="#FEE2E2" fillOpacity="0.65" />
              <rect x="164" y="24" width="120" height="142" fill="#FEF3C7" fillOpacity="0.65" />
              <rect x="284" y="24" width="120" height="142" fill="#D1FAE5" fillOpacity="0.55" />

              {/* Zone top labels */}
              <text
                x="104"
                y="16"
                textAnchor="middle"
                fill="#991B1B"
                fontSize="10"
                fontWeight="700"
              >
                0–24h · Red
              </text>
              <text
                x="224"
                y="16"
                textAnchor="middle"
                fill="#92400E"
                fontSize="10"
                fontWeight="700"
              >
                24–48h · Amber
              </text>
              <text
                x="344"
                y="16"
                textAnchor="middle"
                fill="#065F46"
                fontSize="10"
                fontWeight="700"
              >
                48h+ · Green
              </text>

              {/* Horizontal guide lines */}
              <line x1="44" y1="62" x2="404" y2="62" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="44" y1="114" x2="404" y2="114" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

              {/* Zone vertical dividers */}
              <line x1="164" y1="24" x2="164" y2="166" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="284" y1="24" x2="284" y2="166" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />

              {/* Y-axis & X-axis lines */}
              <line x1="44" y1="24" x2="44" y2="166" stroke="#94A3B8" strokeWidth="1.25" />
              <line x1="44" y1="166" x2="404" y2="166" stroke="#94A3B8" strokeWidth="1.25" />

              {/* Y-axis label */}
              <text
                x="14"
                y="95"
                textAnchor="middle"
                fill="#456173"
                fontSize="10"
                fontWeight="600"
                transform="rotate(-90 14 95)"
              >
                Relative bacteria risk
              </text>

              {/* Area + Risk curve */}
              <path d={areaPath} fill="url(#riskAreaGradient)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#riskLineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Key marker dots on curve */}
              <circle cx="44" cy="148" r="3.5" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="92" cy="36" r="3.5" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="164" cy="40" r="3.5" fill="#B45309" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="284" cy="104" r="3.5" fill="#047857" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="404" cy="152" r="3.5" fill="#047857" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* X-axis tick labels */}
              <text x="44" y="182" textAnchor="middle" fill="#324D5E" fontSize="11" fontWeight="700">
                0h
              </text>
              <text x="164" y="182" textAnchor="middle" fill="#324D5E" fontSize="11" fontWeight="700">
                24h
              </text>
              <text x="284" y="182" textAnchor="middle" fill="#324D5E" fontSize="11" fontWeight="700">
                48h
              </text>
              <text x="404" y="182" textAnchor="middle" fill="#324D5E" fontSize="11" fontWeight="700">
                72h
              </text>

              <text x="224" y="198" textAnchor="middle" fill="#456173" fontSize="10" fontWeight="500">
                Hours after heavy rain · Ngā haora i muri i te ua
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-medium">
            <div className="rounded-lg bg-[#FEF4F4] border border-[#F9B4B4] px-2.5 py-1.5 text-[#991B1B]">
              <span className="font-bold tabular-nums block">0–24h · Avoid</span>
              <span>Peak overflow risk</span>
            </div>
            <div className="rounded-lg bg-[#FFFBF0] border border-[#FCD38D] px-2.5 py-1.5 text-[#92400E]">
              <span className="font-bold tabular-nums block">24–48h · Caution</span>
              <span>Levels still settling</span>
            </div>
            <div className="rounded-lg bg-[#F2FBF6] border border-[#A7DFC1] px-2.5 py-1.5 text-[#065F46]">
              <span className="font-bold tabular-nums block">48h+ · Lower</span>
              <span>Check Safeswim</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bilingual key for swimmers */}
      <div className="pt-4 border-t border-[#E6F0F6] space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0B2538]">
          <Droplets className="w-4 h-4 text-[#026699]" aria-hidden="true" />
          <span>Bilingual Swim Safety Guide · Ngā Tohu Kauhoe</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
          <div className="rounded-xl bg-[#F2FBF6] border border-[#A7DFC1] px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="font-bold text-[#065F46]">Haumaru</span>
            <span className="text-[#324D5E] font-medium">Green · Safe to swim</span>
          </div>
          <div className="rounded-xl bg-[#FFFBF0] border border-[#FCD38D] px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="font-bold text-[#92400E]">Tūpato</span>
            <span className="text-[#324D5E] font-medium">Amber · Caution</span>
          </div>
          <div className="rounded-xl bg-[#FEF4F4] border border-[#F9B4B4] px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="font-bold text-[#991B1B]">Kaua e kauhoe</span>
            <span className="text-[#324D5E] font-medium">Red · Do not swim</span>
          </div>
        </div>
      </div>
    </section>
  );
}
