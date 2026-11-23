import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, MapPin, MessageCircleQuestion, Waves } from 'lucide-react';
import { AucklandBeachMap } from './components/AucklandBeachMap.tsx';
import { BeachStatusCard } from './components/BeachStatusCard.tsx';
import { SwimChatBox } from './components/SwimChatBox.tsx';
import { WhyItMattersPanel } from './components/WhyItMattersPanel.tsx';
import { AUCKLAND_BEACHES } from './data/beaches.ts';
import { getDemoBeachStatus } from './data/demoData.ts';
import type { Beach, BeachStatusResult } from './types.ts';

type MobileTab = 'map' | 'ask' | 'why';

const CLIENT_STATUS_CACHE_KEY = 'kauhoe_haumaru_status_cache_v1';
const DEMO_MODE_SESSION_KEY = 'kauhoe_haumaru_demo_session_v1';
const CLIENT_STATUS_TTL_MS = 30 * 60 * 1000;

function isStatusFresh(entry: BeachStatusResult | undefined): entry is BeachStatusResult {
  if (!entry?.checkedAt) return false;
  const checkedMs = new Date(entry.checkedAt).getTime();
  if (Number.isNaN(checkedMs)) return false;
  return Date.now() - checkedMs < CLIENT_STATUS_TTL_MS;
}

function loadCachedStatusMap(): Record<string, BeachStatusResult> {
  try {
    const raw = window.localStorage.getItem(CLIENT_STATUS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BeachStatusResult>;
    if (!parsed || typeof parsed !== 'object') return {};

    const fresh: Record<string, BeachStatusResult> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isStatusFresh(value)) {
        fresh[key] = value;
      }
    }
    if (Object.keys(fresh).length !== Object.keys(parsed).length) {
      window.localStorage.setItem(CLIENT_STATUS_CACHE_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveCachedStatusMap(map: Record<string, BeachStatusResult>) {
  try {
    const fresh: Record<string, BeachStatusResult> = {};
    for (const [key, value] of Object.entries(map)) {
      if (isStatusFresh(value)) {
        fresh[key] = value;
      }
    }
    window.localStorage.setItem(CLIENT_STATUS_CACHE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function loadInitialDemoMode(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1' || params.get('demo') === 'true') {
      return true;
    }
    return window.sessionStorage.getItem(DEMO_MODE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function buildAllDemoStatuses(beaches: Beach[]): Record<string, BeachStatusResult> {
  const map: Record<string, BeachStatusResult> = {};
  for (const beach of beaches) {
    map[beach.id] = getDemoBeachStatus(beach);
  }
  return map;
}

function isQuotaFailure(status: number, quotaFlag?: boolean, message?: string): boolean {
  if (status === 429 || quotaFlag) return true;
  const text = (message || '').toLowerCase();
  return text.includes('quota') || text.includes('resource_exhausted') || text.includes('429');
}

export default function App() {
  const [beaches] = useState<Beach[]>(AUCKLAND_BEACHES);
  const [demoMode, setDemoMode] = useState<boolean>(() => loadInitialDemoMode());
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(() => {
    try {
      return Boolean(
        (window as unknown as { __gmpQuotaExceeded?: boolean }).__gmpQuotaExceeded ||
          window.sessionStorage.getItem('kauhoe_gmp_fallback') === '1'
      );
    } catch {
      return Boolean((window as unknown as { __gmpQuotaExceeded?: boolean }).__gmpQuotaExceeded);
    }
  });
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  );

  const [selectedBeachId, setSelectedBeachId] = useState<string | null>(null);
  const [statusByBeach, setStatusByBeach] = useState<Record<string, BeachStatusResult>>(
    () => loadCachedStatusMap()
  );
  const [demoStatusByBeach, setDemoStatusByBeach] = useState<Record<string, BeachStatusResult>>(
    () => (loadInitialDemoMode() ? buildAllDemoStatuses(AUCKLAND_BEACHES) : {})
  );

  const [loadingStatusForId, setLoadingStatusForId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [checkAllProgress, setCheckAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const inFlightBeachIdsRef = useRef<Set<string>>(new Set());
  const statusByBeachRef = useRef(statusByBeach);
  const demoModeRef = useRef(demoMode);

  useEffect(() => {
    statusByBeachRef.current = statusByBeach;
  }, [statusByBeach]);

  useEffect(() => {
    demoModeRef.current = demoMode;
  }, [demoMode]);

  const [mobileTab, setMobileTab] = useState<MobileTab>('map');

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Persist demo mode state for the current session
  useEffect(() => {
    try {
      if (demoMode) {
        window.sessionStorage.setItem(DEMO_MODE_SESSION_KEY, '1');
      } else {
        window.sessionStorage.removeItem(DEMO_MODE_SESSION_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [demoMode]);

  // Only fetch server runtime Maps key when in live mode and key is not already present
  useEffect(() => {
    if (demoMode || mapsApiKey || quotaExceeded) return;
    let active = true;

    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg: { mapsApiKey?: string } | null) => {
        if (active && cfg?.mapsApiKey) {
          setMapsApiKey((prev) => prev || cfg.mapsApiKey || '');
        }
      })
      .catch(() => {
        // Map automatically falls back to Leaflet + OpenStreetMap
      });

    return () => {
      active = false;
    };
  }, [demoMode, mapsApiKey, quotaExceeded]);

  const setDemoModeActive = useCallback(
    (enabled: boolean) => {
      demoModeRef.current = enabled;
      setDemoMode(enabled);
      setStatusError(null);
      setLoadingStatusForId(null);
      setCheckAllProgress(null);

      if (enabled) {
        setDemoStatusByBeach((prev) =>
          Object.keys(prev).length === beaches.length ? prev : buildAllDemoStatuses(beaches)
        );
      }
    },
    [beaches]
  );

  const activateSessionDemoFallback = useCallback(
    (targetBeach?: Beach): BeachStatusResult | null => {
      demoModeRef.current = true;
      setDemoMode(true);
      setStatusError(null);
      setLoadingStatusForId(null);
      const allDemo = buildAllDemoStatuses(beaches);
      setDemoStatusByBeach(allDemo);
      return targetBeach ? allDemo[targetBeach.id] || getDemoBeachStatus(targetBeach) : null;
    },
    [beaches]
  );

  const fetchBeachStatus = useCallback(
    async (
      beach: Beach,
      forceRefresh = false
    ): Promise<{ result: BeachStatusResult | null; switchedToDemo: boolean }> => {
      if (demoModeRef.current) {
        const sample = getDemoBeachStatus(beach);
        setDemoStatusByBeach((prev) => ({ ...prev, [beach.id]: prev[beach.id] || sample }));
        return { result: sample, switchedToDemo: true };
      }

      // Prevent duplicate concurrent requests if a beach is tapped twice rapidly
      if (inFlightBeachIdsRef.current.has(beach.id)) {
        return { result: null, switchedToDemo: false };
      }

      inFlightBeachIdsRef.current.add(beach.id);
      setLoadingStatusForId(beach.id);
      setStatusError(null);

      try {
        const res = await fetch('/api/beaches/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beachId: beach.id,
            beachName: beach.name,
            maoriName: beach.maoriName,
            forceRefresh,
          }),
        });
        const data = (await res.json()) as BeachStatusResult & {
          error?: string;
          quotaExceeded?: boolean;
        };

        if (!res.ok) {
          if (isQuotaFailure(res.status, data.quotaExceeded, data.error)) {
            const sample = activateSessionDemoFallback(beach);
            return { result: sample, switchedToDemo: true };
          }
          throw new Error(data.error || `Could not check status for ${beach.name}.`);
        }

        setStatusByBeach((prev) => {
          const next = {
            ...prev,
            [beach.id]: data,
          };
          statusByBeachRef.current = next;
          saveCachedStatusMap(next);
          return next;
        });

        return { result: data, switchedToDemo: false };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '';
        if (isQuotaFailure(0, false, errMsg)) {
          const sample = activateSessionDemoFallback(beach);
          return { result: sample, switchedToDemo: true };
        }
        setStatusError(
          err instanceof Error ? err.message : `Unable to load water quality for ${beach.name}.`
        );
        return { result: null, switchedToDemo: false };
      } finally {
        inFlightBeachIdsRef.current.delete(beach.id);
        setLoadingStatusForId((current) => (current === beach.id ? null : current));
      }
    },
    [activateSessionDemoFallback]
  );

  const handleSelectBeach = useCallback(
    (beach: Beach) => {
      setSelectedBeachId(beach.id);
      setStatusError(null);

      // Demo mode uses sample data locally with zero Gemini or Maps calls
      if (demoModeRef.current) {
        setDemoStatusByBeach((prev) => ({
          ...prev,
          [beach.id]: prev[beach.id] || getDemoBeachStatus(beach),
        }));
        return;
      }

      // If this beach is already loading, do not send a second request
      if (inFlightBeachIdsRef.current.has(beach.id)) {
        return;
      }

      const cached = statusByBeach[beach.id];
      if (isStatusFresh(cached)) {
        return;
      }

      void fetchBeachStatus(beach, false);
    },
    [statusByBeach, fetchBeachStatus]
  );

  const handleCheckAllBeaches = useCallback(async () => {
    if (beaches.length === 0 || checkAllProgress !== null) return;
    setMobileTab('map');
    setFitAllTrigger((n) => n + 1);
    setStatusError(null);

    if (demoModeRef.current) {
      setDemoStatusByBeach(buildAllDemoStatuses(beaches));
      setSelectedBeachId((prev) => prev || beaches[0]?.id || null);
      return;
    }

    for (let i = 0; i < beaches.length; i++) {
      const beach = beaches[i];
      setCheckAllProgress({ current: i + 1, total: beaches.length });

      const cached = statusByBeachRef.current[beach.id];
      if (isStatusFresh(cached)) {
        setSelectedBeachId((prev) => prev || beach.id);
        continue;
      }

      setSelectedBeachId(beach.id);
      const { result, switchedToDemo } = await fetchBeachStatus(beach, false);
      if (switchedToDemo) {
        // Automatic fallback already populated all 7 sample results for the session
        break;
      }
      if (!result) {
        break;
      }
    }

    setCheckAllProgress(null);
  }, [beaches, checkAllProgress, fetchBeachStatus]);

  const activeStatusMap = useMemo(
    () => (demoMode ? demoStatusByBeach : statusByBeach),
    [demoMode, demoStatusByBeach, statusByBeach]
  );

  const selectedBeach = beaches.find((b) => b.id === selectedBeachId) || null;
  const selectedRawStatus = selectedBeach ? activeStatusMap[selectedBeach.id] : undefined;
  const selectedStatus = demoMode
    ? selectedRawStatus || null
    : isStatusFresh(selectedRawStatus)
      ? selectedRawStatus
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F9FC] text-[#0B2538]">
      {/* Demo Mode Yellow Banner at Top */}
      {demoMode && (
        <div
          role="status"
          className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 sm:px-6 py-2 text-center"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-2 text-xs sm:text-sm">
            <p className="font-semibold">
              Demo mode: sample data, not live conditions
            </p>
            <button
              type="button"
              onClick={() => setDemoModeActive(false)}
              className="font-bold underline underline-offset-2 text-amber-950 hover:text-amber-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              Switch to live data
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar with Demo mode toggle + Check Today */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D3E4EE]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
          <a
            href="#top"
            onClick={() => setMobileTab('map')}
            className="text-sm sm:text-lg font-extrabold tracking-tight text-[#026699] whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2"
          >
            <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-[#026699] shrink-0" aria-hidden="true" />
            <span>Kauhoe Haumaru</span>
          </a>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#324D5E]">
            <a
              href="#map-section"
              className="hover:text-[#026699] transition-colors whitespace-nowrap shrink-0"
            >
              Beaches · Ngā Tātahi
            </a>
            <a
              href="#ask-section"
              className="hover:text-[#026699] transition-colors whitespace-nowrap shrink-0"
            >
              Should I swim?
            </a>
            <a
              href="#why-section"
              className="hover:text-[#026699] transition-colors whitespace-nowrap shrink-0"
            >
              Why it matters
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => setDemoModeActive(!demoMode)}
              className={`min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl border text-[11px] sm:text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                demoMode
                  ? 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200'
                  : 'bg-white border-[#C7DCE8] text-[#324D5E] hover:bg-[#F0F7FB]'
              }`}
            >
              {demoMode ? 'Demo: On' : 'Demo mode'}
            </button>

            <button
              type="button"
              onClick={() => void handleCheckAllBeaches()}
              disabled={beaches.length === 0 || checkAllProgress !== null}
              className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-4 py-2 rounded-xl bg-[#026699] hover:bg-[#024E78] active:bg-[#013F61] disabled:bg-[#026699]/80 text-white text-[11px] sm:text-sm font-bold shadow-sm cursor-pointer disabled:cursor-wait transition-colors whitespace-nowrap shrink-0"
            >
              {checkAllProgress
                ? `Checking ${checkAllProgress.current}/${checkAllProgress.total}...`
                : 'Check Today'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 lg:pb-10 space-y-6 sm:space-y-8">
        {/* Compact Bilingual Hero Intro */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#DCEBF3]">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-semibold text-[#026699]">
              Tāmaki Makaurau · Safe to Swim Auckland
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B2538] tracking-tight leading-tight">
              Where is it safe to swim today?
            </h1>
            <p className="text-sm sm:text-base text-[#456173] leading-relaxed">
              Tap any Auckland beach to check live Safeswim and Auckland Council water quality advice in English and te reo Māori.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#456173]">
            <span className="font-semibold text-[#065F46]">Haumaru = Safe</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#92400E]">Tūpato = Caution</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#991B1B]">Kaua e kauhoe = Do not swim</span>
          </div>
        </section>

        {/* Desktop 2-Column Coastal Command + Mobile Tabbed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Map) */}
          <div
            id="map-section"
            className={`lg:col-span-7 space-y-6 ${
              mobileTab === 'map' ? 'block' : 'hidden lg:block'
            }`}
          >
            <AucklandBeachMap
              mapsApiKey={mapsApiKey}
              demoMode={demoMode}
              quotaExceeded={quotaExceeded}
              beaches={beaches}
              selectedBeachId={selectedBeachId}
              loadingBeachId={loadingStatusForId}
              isCheckingAll={checkAllProgress !== null}
              fitAllTrigger={fitAllTrigger}
              statusByBeach={activeStatusMap}
              mapsGroundingSummary=""
              mapsGroundingSources={[]}
              onSelectBeach={handleSelectBeach}
              onQuotaExceeded={() => setQuotaExceeded(true)}
            />

            {/* Mobile shows selected BeachStatusCard right under the map */}
            <div className="lg:hidden">
              <BeachStatusCard
                beach={selectedBeach}
                statusData={selectedStatus}
                isLoading={Boolean(!demoMode && selectedBeach && loadingStatusForId === selectedBeach.id)}
                error={demoMode ? null : statusError}
                isDemo={demoMode}
                onRetry={() => selectedBeach && void fetchBeachStatus(selectedBeach, true)}
                onEnableDemoMode={() => setDemoModeActive(true)}
              />
            </div>
          </div>

          {/* Right Column (Beach Status Card + Should I Swim Chat) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="hidden lg:block">
              <BeachStatusCard
                beach={selectedBeach}
                statusData={selectedStatus}
                isLoading={Boolean(!demoMode && selectedBeach && loadingStatusForId === selectedBeach.id)}
                error={demoMode ? null : statusError}
                isDemo={demoMode}
                onRetry={() => selectedBeach && void fetchBeachStatus(selectedBeach, true)}
                onEnableDemoMode={() => setDemoModeActive(true)}
              />
            </div>

            <div className={mobileTab === 'ask' ? 'block' : 'hidden lg:block'}>
              <SwimChatBox
                selectedBeachName={selectedBeach?.name || null}
                demoMode={demoMode}
                onEnableDemoMode={() => activateSessionDemoFallback(selectedBeach || undefined)}
              />
            </div>
          </div>
        </div>

        {/* Full-Width Why It Matters Section (Desktop full width, Mobile 'Why' tab) */}
        <div className={mobileTab === 'why' ? 'block' : 'hidden lg:block'}>
          <WhyItMattersPanel />
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="hidden lg:block border-t border-[#D3E4EE] bg-white py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#456173]">
          <p className="font-semibold text-[#0B2538]">
            Kauhoe Haumaru – Safe to Swim Auckland · Check official signage before swimming.
          </p>
          <p>
            Always verify live alerts at{' '}
            <a
              href="https://www.safeswim.org.nz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#026699] font-semibold underline underline-offset-2"
            >
              safeswim.org.nz
            </a>{' '}
            and Auckland Council beach signs.
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Tab Bar (60px height, total sticky <= 15% of mobile viewport) */}
      <nav
        aria-label="Mobile sections"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D3E4EE] pb-safe"
      >
        <div className="grid grid-cols-3 h-[60px]">
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              mobileTab === 'map' ? 'text-[#026699]' : 'text-[#456173]'
            }`}
          >
            <MapPin className="w-5 h-5" aria-hidden="true" />
            <span>Map · Mahere</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('ask')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              mobileTab === 'ask' ? 'text-[#026699]' : 'text-[#456173]'
            }`}
          >
            <MessageCircleQuestion className="w-5 h-5" aria-hidden="true" />
            <span>Ask · Pātai</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('why')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              mobileTab === 'why' ? 'text-[#026699]' : 'text-[#456173]'
            }`}
          >
            <BookOpen className="w-5 h-5" aria-hidden="true" />
            <span>Why · Pūtake</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
