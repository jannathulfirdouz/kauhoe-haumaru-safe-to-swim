import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  MapPin,
  OctagonAlert,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { Beach, BeachStatusResult, SwimStatus } from '../types.ts';

interface BeachStatusCardProps {
  beach: Beach | null;
  statusData: BeachStatusResult | null;
  isLoading: boolean;
  error: string | null;
  isDemo?: boolean;
  onRetry: () => void;
  onEnableDemoMode?: () => void;
}

function getStatusVisuals(status: SwimStatus) {
  switch (status) {
    case 'safe':
      return {
        bannerBg: 'bg-[#0D8A4E]',
        surfaceBg: 'bg-[#F2FBF6]',
        borderColor: 'border-[#A7DFC1]',
        textAccent: 'text-[#065F46]',
        Icon: ShieldCheck,
        enLabel: 'Safe to swim',
        miLabel: 'Haumaru',
      };
    case 'caution':
      return {
        bannerBg: 'bg-[#C27200]',
        surfaceBg: 'bg-[#FFFBF0]',
        borderColor: 'border-[#FCD38D]',
        textAccent: 'text-[#92400E]',
        Icon: AlertTriangle,
        enLabel: 'Swim with caution',
        miLabel: 'Tūpato',
      };
    case 'avoid':
      return {
        bannerBg: 'bg-[#C81E1E]',
        surfaceBg: 'bg-[#FEF4F4]',
        borderColor: 'border-[#F9B4B4]',
        textAccent: 'text-[#991B1B]',
        Icon: OctagonAlert,
        enLabel: 'Do not swim',
        miLabel: 'Kaua e kauhoe',
      };
    default:
      return {
        bannerBg: 'bg-[#026699]',
        surfaceBg: 'bg-white',
        borderColor: 'border-[#D3E4EE]',
        textAccent: 'text-[#026699]',
        Icon: MapPin,
        enLabel: 'Checking status',
        miLabel: 'Tirohia te āhua',
      };
  }
}

function formatCheckedAgo(checkedAt: string | undefined, nowMs: number): string | null {
  if (!checkedAt) return null;
  const checkedMs = new Date(checkedAt).getTime();
  if (Number.isNaN(checkedMs)) return null;
  const diffMin = Math.max(0, Math.floor((nowMs - checkedMs) / 60000));
  if (diffMin === 0) return 'Checked 0 min ago';
  if (diffMin === 1) return 'Checked 1 min ago';
  return `Checked ${diffMin} min ago`;
}

export function BeachStatusCard({
  beach,
  statusData,
  isLoading,
  error,
  isDemo = false,
  onRetry,
  onEnableDemoMode,
}: BeachStatusCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    if (!statusData?.checkedAt) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, [statusData?.checkedAt]);

  if (!beach) {
    return (
      <div className="bg-white rounded-2xl border border-[#D3E4EE] p-5 sm:p-6 space-y-3">
        <h3 className="text-base sm:text-lg font-bold text-[#0B2538]">
          Tap a beach to check · Pāwhiria he tātahi
        </h3>
        <p className="text-sm text-[#456173] leading-relaxed">
          {isDemo
            ? 'Tap any marker on the Auckland map or choose a beach button above to view sample water quality advice.'
            : 'Tap any marker on the Auckland map or choose a beach button above to check live water quality from Safeswim and Auckland Council.'}
        </p>
        <p className="text-xs font-semibold text-[#324D5E] pt-2 border-t border-[#E6F0F6]">
          Check official signage before swimming. · Tirohia ngā tohu mana i mua i te kauhoe.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D3E4EE] overflow-hidden">
        <div className="bg-[#026699] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-sky-100">
              Checking live sources · E kimi ana i ngā pārongo
            </p>
            <h3 className="text-xl font-bold tracking-tight mt-0.5">{beach.name}</h3>
          </div>
          <Loader2 className="w-6 h-6 animate-spin shrink-0 text-white" />
        </div>
        <div className="p-5 space-y-3">
          <div className="h-4 bg-[#E7F2F8] rounded w-3/4" />
          <div className="h-4 bg-[#E7F2F8] rounded w-full" />
          <div className="h-4 bg-[#E7F2F8] rounded w-2/3" />
          <p className="text-xs text-[#456173] pt-1">
            Searching Safeswim and Auckland Council advisories for {beach.name}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#F9B4B4] overflow-hidden">
        <div className="bg-[#C81E1E] text-white px-5 py-4">
          <p className="text-xs font-medium text-red-100">Could not load water quality</p>
          <h3 className="text-xl font-bold mt-0.5">{beach.name}</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#456173] leading-relaxed">{error}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#026699] hover:bg-[#024E78] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try again · Ngana anō</span>
            </button>
            {onEnableDemoMode && (
              <button
                type="button"
                onClick={onEnableDemoMode}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Use Demo mode (sample data)</span>
              </button>
            )}
            <a
              href="https://www.safeswim.org.nz/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D3E4EE] hover:bg-[#F0F7FB] text-[#026699] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Open Safeswim</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs font-medium text-[#456173] pt-2 border-t border-[#E6F0F6]">
            Check official signage before swimming. · Tirohia ngā tohu mana i mua i te kauhoe.
          </p>
        </div>
      </div>
    );
  }

  const visuals = getStatusVisuals(statusData?.status || 'unknown');
  const StatusIcon = visuals.Icon;
  const checkedAgoText = formatCheckedAgo(statusData?.checkedAt, nowMs);

  return (
    <article
      aria-live="polite"
      className={`rounded-2xl border ${visuals.borderColor} ${visuals.surfaceBg} overflow-hidden shadow-xs`}
    >
      {/* Large high-contrast Status Banner (Green / Amber / Red) */}
      <div className={`${visuals.bannerBg} text-white px-5 py-4 sm:px-6 sm:py-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <StatusIcon className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white/95">
                {statusData?.statusLabelMi || visuals.miLabel} · {statusData?.statusLabelEn || visuals.enLabel}
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight leading-tight mt-0.5">
                {beach.name}
              </h3>
            </div>
          </div>
          {isDemo && (
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white whitespace-nowrap shrink-0">
              Sample result
            </span>
          )}
        </div>
      </div>

      {/* Plain-English Reason + Bilingual Summary + Sources */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-sm sm:text-base text-[#0B2538] leading-relaxed font-medium">
            {statusData?.reason}
          </p>
          {statusData?.maoriSummary && (
            <p className={`text-xs sm:text-sm font-semibold ${visuals.textAccent}`}>
              {statusData.maoriSummary}
            </p>
          )}
        </div>

        {statusData?.adviceBullets && statusData.adviceBullets.length > 0 && (
          <ul className="space-y-1.5 text-xs sm:text-sm text-[#324D5E] border-t border-black/8 pt-3">
            {statusData.adviceBullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-[#026699] mt-0.5" aria-hidden="true">
                  •
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Grounded Sources + Cache Timestamp & Refresh */}
        <div className="border-t border-black/8 pt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#456173]">
            <span className="font-semibold text-[#0B2538]">
              {isDemo ? 'Sample References · Ngā Tauira' : 'Sources · Ngā Pūtake Kōrero'}
            </span>
            <div className="flex items-center gap-2.5">
              {isDemo && (
                <span className="font-semibold text-[#92400E]">Sample data</span>
              )}
              {checkedAgoText && (
                <span className="font-mono tabular-nums text-[#456173]">
                  {checkedAgoText}
                </span>
              )}
              {!isDemo && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[#C7DCE8] bg-white hover:bg-[#EAF4FA] disabled:opacity-50 text-[#026699] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>

          {statusData?.sources && statusData.sources.length > 0 ? (
            <ul className="space-y-1.5">
              {statusData.sources.slice(0, 4).map((source) => (
                <li key={source.uri}>
                  <a
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#026699] hover:text-[#024E78] underline underline-offset-2 break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{source.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#456173]">
              Check live updates directly on{' '}
              <a
                href="https://www.safeswim.org.nz/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#026699] underline underline-offset-2"
              >
                Safeswim (safeswim.org.nz)
              </a>
              .
            </p>
          )}

          {beach.googleMapsUri && (
            <div className="pt-1">
              <a
                href={beach.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#456173] hover:text-[#026699] underline underline-offset-2"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>Open {beach.name} in Google Maps</span>
              </a>
            </div>
          )}
        </div>

        {/* Mandatory Disclaimer */}
        <p className="text-xs font-semibold text-[#324D5E] pt-2 border-t border-black/8">
          Check official signage before swimming. · Tirohia ngā tohu mana i mua i te kauhoe.
        </p>
      </div>
    </article>
  );
}
