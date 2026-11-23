import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  useApiIsLoaded,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { AlertTriangle, Check, ExternalLink, Navigation, OctagonAlert } from 'lucide-react';
import { LeafletBeachMap } from './LeafletBeachMap.tsx';
import type { Beach, BeachStatusResult, GroundingSource, SwimStatus } from '../types.ts';

interface AucklandBeachMapProps {
  mapsApiKey: string;
  demoMode: boolean;
  quotaExceeded: boolean;
  beaches: Beach[];
  selectedBeachId: string | null;
  loadingBeachId: string | null;
  isCheckingAll: boolean;
  fitAllTrigger: number;
  statusByBeach: Record<string, BeachStatusResult>;
  mapsGroundingSummary: string;
  mapsGroundingSources: GroundingSource[];
  onSelectBeach: (beach: Beach) => void;
  onQuotaExceeded: () => void;
}

const DEFAULT_AUCKLAND_VIEW = {
  lat: -36.82,
  lng: 174.66,
};

function getMarkerColors(status: SwimStatus | undefined, isSelected: boolean) {
  if (status === 'safe') {
    return {
      bg: '#0D8A4E',
      ring: isSelected ? 'ring-4 ring-emerald-200' : 'ring-2 ring-white',
      labelClass: isSelected
        ? 'bg-[#0D8A4E] text-white border-[#0A6E3E]'
        : 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]',
    };
  }
  if (status === 'caution') {
    return {
      bg: '#B45309',
      ring: isSelected ? 'ring-4 ring-amber-200' : 'ring-2 ring-white',
      labelClass: isSelected
        ? 'bg-[#B45309] text-white border-[#92400E]'
        : 'bg-[#FFFBEB] text-[#92400E] border-[#F59E0B]',
    };
  }
  if (status === 'avoid') {
    return {
      bg: '#C81E1E',
      ring: isSelected ? 'ring-4 ring-red-200' : 'ring-2 ring-white',
      labelClass: isSelected
        ? 'bg-[#C81E1E] text-white border-[#991B1B]'
        : 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]',
    };
  }
  return {
    bg: isSelected ? '#024E78' : '#026699',
    ring: isSelected ? 'ring-4 ring-sky-200' : 'ring-2 ring-white',
    labelClass: isSelected
      ? 'bg-[#024E78] text-white border-[#024E78]'
      : 'bg-white text-[#0B2538] border-sky-200/80',
  };
}

function getBeachButtonClasses(status: SwimStatus | undefined, isSelected: boolean) {
  const selectedRing = isSelected ? 'ring-2 ring-offset-2 ring-[#0B2538]' : '';
  if (status === 'safe') {
    return `bg-[#0D8A4E] text-white border-[#0A6E3E] hover:bg-[#0A7542] ${selectedRing}`;
  }
  if (status === 'caution') {
    return `bg-[#B45309] text-white border-[#92400E] hover:bg-[#92400E] ${selectedRing}`;
  }
  if (status === 'avoid') {
    return `bg-[#C81E1E] text-white border-[#991B1B] hover:bg-[#A61717] ${selectedRing}`;
  }
  if (isSelected) {
    return 'bg-[#026699] text-white border-[#026699] shadow-sm';
  }
  return 'bg-white text-[#0B2538] border-[#D3E4EE] hover:border-[#026699]/60 hover:bg-[#F0F7FB]';
}

function MapController({
  beaches,
  selectedBeachId,
  isCheckingAll,
  fitAllTrigger,
}: {
  beaches: Beach[];
  selectedBeachId: string | null;
  isCheckingAll: boolean;
  fitAllTrigger: number;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const fittedCountRef = useRef(0);
  const lastPanIdRef = useRef<string | null>(null);
  const lastFitTriggerRef = useRef(0);

  // Fit map bounds to include all 7 beach markers with padding on load or explicit fit-all trigger
  useEffect(() => {
    if (!map || !coreLib) return;
    const resolved = beaches.filter(
      (b): b is Beach & { lat: number; lng: number } => b.lat !== null && b.lng !== null
    );
    if (resolved.length === 0) return;

    const triggerChanged = fitAllTrigger !== lastFitTriggerRef.current;
    const shouldFitInitial = resolved.length > fittedCountRef.current && !selectedBeachId;

    if (shouldFitInitial || triggerChanged) {
      const bounds = new coreLib.LatLngBounds();
      for (const b of resolved) {
        bounds.extend({ lat: b.lat, lng: b.lng });
      }
      map.fitBounds(bounds, { top: 56, right: 52, bottom: 44, left: 52 });
      fittedCountRef.current = resolved.length;
      lastFitTriggerRef.current = fitAllTrigger;
      if (triggerChanged) {
        lastPanIdRef.current = selectedBeachId;
      }
    }
  }, [map, coreLib, beaches, selectedBeachId, fitAllTrigger]);

  // Smoothly pan to selected beach only when user taps a specific beach (not during Check Today sweep)
  useEffect(() => {
    if (!map || !selectedBeachId || isCheckingAll || lastPanIdRef.current === selectedBeachId) return;
    const target = beaches.find((b) => b.id === selectedBeachId);
    if (target && target.lat !== null && target.lng !== null) {
      lastPanIdRef.current = selectedBeachId;
      map.panTo({ lat: target.lat, lng: target.lng });
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 12) {
        map.setZoom(12);
      }
    }
  }, [map, selectedBeachId, isCheckingAll, beaches]);

  return null;
}

function MapInner({
  beaches,
  selectedBeachId,
  isCheckingAll,
  fitAllTrigger,
  statusByBeach,
  onSelectBeach,
  onMapsFailed,
  onQuotaExceeded,
}: {
  beaches: Beach[];
  selectedBeachId: string | null;
  isCheckingAll: boolean;
  fitAllTrigger: number;
  statusByBeach: Record<string, BeachStatusResult>;
  onSelectBeach: (beach: Beach) => void;
  onMapsFailed: () => void;
  onQuotaExceeded: () => void;
}) {
  const isLoaded = useApiIsLoaded();
  const loadingStatus = useApiLoadingStatus();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const resolvedBeaches = useMemo(
    () => beaches.filter((b): b is Beach & { lat: number; lng: number } => b.lat !== null && b.lng !== null),
    [beaches]
  );

  // Detect SDK load failures or auth failures and defer unmount slightly
  useEffect(() => {
    if (loadingStatus !== APILoadingStatus.AUTH_FAILURE && loadingStatus !== APILoadingStatus.FAILED) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (loadingStatus === APILoadingStatus.AUTH_FAILURE) {
        onQuotaExceeded();
      }
      onMapsFailed();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loadingStatus, onQuotaExceeded, onMapsFailed]);

  // Fallback timeout if Google Maps fails to finish loading
  useEffect(() => {
    if (isLoaded) return;
    const timer = window.setTimeout(() => {
      onMapsFailed();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isLoaded, onMapsFailed]);

  // Detect Google Maps in-DOM error overlay (.gm-err-container) caused by quota/key errors
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let timer: number | null = null;
    const checkForErrorOverlay = () => {
      if (el.querySelector('.gm-err-container') && timer === null) {
        timer = window.setTimeout(() => {
          onQuotaExceeded();
          onMapsFailed();
        }, 80);
      }
    };

    checkForErrorOverlay();
    const observer = new MutationObserver(checkForErrorOverlay);
    observer.observe(el, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [onQuotaExceeded, onMapsFailed]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-[340px] sm:h-[420px] lg:h-[480px] rounded-2xl overflow-hidden border border-sky-200/80 bg-[#E7F2F8]"
    >
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#E7F2F8]/90 text-sm font-medium text-[#026699]">
          Loading Tāmaki Makaurau map...
        </div>
      )}
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={DEFAULT_AUCKLAND_VIEW}
        defaultZoom={10}
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController
          beaches={beaches}
          selectedBeachId={selectedBeachId}
          isCheckingAll={isCheckingAll}
          fitAllTrigger={fitAllTrigger}
        />

        {resolvedBeaches.map((beach) => {
          const isSelected = beach.id === selectedBeachId;
          const beachStatus = statusByBeach[beach.id]?.status;
          const palette = getMarkerColors(beachStatus, isSelected);

          return (
            <AdvancedMarker
              key={beach.id}
              position={{ lat: beach.lat, lng: beach.lng }}
              title={`${beach.name} (${beach.maoriName})`}
              zIndex={isSelected ? 50 : 10}
              onClick={() => onSelectBeach(beach)}
            >
              <button
                type="button"
                onClick={() => onSelectBeach(beach)}
                aria-label={`Check swim status for ${beach.name}`}
                className={`group flex flex-col items-center cursor-pointer transition-transform duration-150 focus-visible:outline-none ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-full shadow-md ${palette.ring}`}
                  style={{ backgroundColor: palette.bg }}
                >
                  {beachStatus === 'safe' ? (
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                  ) : beachStatus === 'caution' ? (
                    <AlertTriangle className="w-4 h-4 text-white" />
                  ) : beachStatus === 'avoid' ? (
                    <OctagonAlert className="w-4 h-4 text-white" />
                  ) : (
                    <Navigation className="w-4 h-4 text-white fill-white/20" />
                  )}
                </span>
                <span
                  className={`mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-sm border whitespace-nowrap ${palette.labelClass}`}
                >
                  {beach.name}
                </span>
              </button>
            </AdvancedMarker>
          );
        })}
      </GoogleMap>
    </div>
  );
}

export function AucklandBeachMap({
  mapsApiKey,
  demoMode,
  quotaExceeded,
  beaches,
  selectedBeachId,
  loadingBeachId,
  isCheckingAll,
  fitAllTrigger,
  statusByBeach,
  mapsGroundingSummary,
  mapsGroundingSources,
  onSelectBeach,
  onQuotaExceeded,
}: AucklandBeachMapProps) {
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);

  const handleMapsFailed = useCallback(() => {
    setGoogleMapsFailed(true);
  }, []);

  const useLeafletFallback = demoMode || quotaExceeded || !mapsApiKey || googleMapsFailed;

  return (
    <section aria-label="Auckland Beaches Map" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0B2538] tracking-tight">
            Auckland Beaches · Ngā Tātahi o Tāmaki Makaurau
          </h2>
          <p className="text-xs sm:text-sm text-[#456173] mt-0.5">
            {demoMode
              ? 'Tap a pin or beach below to view sample swim safety results.'
              : 'Tap a pin or beach below to check live Safeswim & Auckland Council water quality.'}
          </p>
        </div>
        {useLeafletFallback && (
          <p className="text-xs font-medium text-[#456173]">
            OpenStreetMap · Leaflet fallback active
          </p>
        )}
      </div>

      {/* Beach selector buttons: horizontal scroll on mobile, 2-line wrap on desktop */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:flex-wrap lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0"
        role="tablist"
        aria-label="Select an Auckland beach"
      >
        {beaches.map((beach) => {
          const isSelected = beach.id === selectedBeachId;
          const isChecking = beach.id === loadingBeachId;
          const status = statusByBeach[beach.id]?.status;
          const buttonClasses = getBeachButtonClasses(status, isSelected);

          return (
            <button
              key={beach.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectBeach(beach)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 border cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#026699] ${buttonClasses}`}
            >
              {status === 'safe' ? (
                <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
              ) : status === 'caution' ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : status === 'avoid' ? (
                <OctagonAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isSelected ? 'bg-white' : 'bg-[#026699]'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span>{isChecking ? `${beach.name}...` : beach.name}</span>
            </button>
          );
        })}
      </div>

      {useLeafletFallback ? (
        <LeafletBeachMap
          beaches={beaches}
          selectedBeachId={selectedBeachId}
          isCheckingAll={isCheckingAll}
          fitAllTrigger={fitAllTrigger}
          statusByBeach={statusByBeach}
          onSelectBeach={onSelectBeach}
        />
      ) : (
        <APIProvider apiKey={mapsApiKey} libraries={['marker', 'core']} language="en" region="NZ">
          <MapInner
            beaches={beaches}
            selectedBeachId={selectedBeachId}
            isCheckingAll={isCheckingAll}
            fitAllTrigger={fitAllTrigger}
            statusByBeach={statusByBeach}
            onSelectBeach={onSelectBeach}
            onMapsFailed={handleMapsFailed}
            onQuotaExceeded={onQuotaExceeded}
          />
        </APIProvider>
      )}

      {/* Optional map sources if available */}
      {(() => {
        const displaySources =
          mapsGroundingSources.length > 0
            ? mapsGroundingSources
            : beaches
                .filter((b): b is Beach & { googleMapsUri: string } => Boolean(b.googleMapsUri))
                .map((b) => ({
                  title: `${b.name} Beach`,
                  uri: b.googleMapsUri,
                  kind: 'maps' as const,
                }));

        if (!mapsGroundingSummary && displaySources.length === 0) return null;

        return (
          <div className="bg-white rounded-2xl border border-[#D3E4EE] p-4 space-y-2.5">
            {mapsGroundingSummary && (
              <p className="text-xs sm:text-sm text-[#324D5E] leading-relaxed">
                {mapsGroundingSummary}
              </p>
            )}
            {displaySources.length > 0 && (
              <div className={mapsGroundingSummary ? 'pt-2 border-t border-[#E6F0F6]' : ''}>
                <p className="text-xs font-semibold text-[#456173] mb-1.5">
                  Map Places · Ngā Wāhi Mahere
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {displaySources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#026699] hover:text-[#024E78] underline underline-offset-2"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}
