import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Beach, BeachStatusResult, SwimStatus } from '../types.ts';

interface LeafletBeachMapProps {
  beaches: Beach[];
  selectedBeachId: string | null;
  isCheckingAll: boolean;
  fitAllTrigger: number;
  statusByBeach: Record<string, BeachStatusResult>;
  onSelectBeach: (beach: Beach) => void;
}

const LEAFLET_CENTER: [number, number] = [-36.82, 174.66];
const LEAFLET_ZOOM = 10;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createMarkerIcon(beach: Beach, status: SwimStatus | undefined, isSelected: boolean) {
  let bg = isSelected ? '#024E78' : '#026699';
  let ringColor = isSelected ? '#BAE6FD' : '#FFFFFF';
  let labelBg = isSelected ? '#024E78' : '#FFFFFF';
  let labelText = isSelected ? '#FFFFFF' : '#0B2538';
  let labelBorder = isSelected ? '#024E78' : '#BAE6FD';
  let svgIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';

  if (status === 'safe') {
    bg = '#0D8A4E';
    ringColor = isSelected ? '#A7F3D0' : '#FFFFFF';
    labelBg = isSelected ? '#0D8A4E' : '#ECFDF5';
    labelText = isSelected ? '#FFFFFF' : '#065F46';
    labelBorder = isSelected ? '#0A6E3E' : '#10B981';
    svgIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  } else if (status === 'caution') {
    bg = '#B45309';
    ringColor = isSelected ? '#FDE68A' : '#FFFFFF';
    labelBg = isSelected ? '#B45309' : '#FFFBEB';
    labelText = isSelected ? '#FFFFFF' : '#92400E';
    labelBorder = isSelected ? '#92400E' : '#F59E0B';
    svgIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  } else if (status === 'avoid') {
    bg = '#C81E1E';
    ringColor = isSelected ? '#FECACA' : '#FFFFFF';
    labelBg = isSelected ? '#C81E1E' : '#FEF2F2';
    labelText = isSelected ? '#FFFFFF' : '#991B1B';
    labelBorder = isSelected ? '#991B1B' : '#EF4444';
    svgIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';
  }

  const ringWidth = isSelected ? '4px' : '2px';
  const scaleStyle = isSelected ? 'transform: scale(1.08);' : '';

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;${scaleStyle}">
      <span style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background-color:${bg};box-shadow:0 4px 10px rgba(11,37,56,0.22), 0 0 0 ${ringWidth} ${ringColor};">
        ${svgIcon}
      </span>
      <span style="margin-top:4px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;line-height:1.3;white-space:nowrap;background-color:${labelBg};color:${labelText};border:1px solid ${labelBorder};box-shadow:0 1px 4px rgba(11,37,56,0.12);font-family:'Plus Jakarta Sans',sans-serif;">
        ${escapeHtml(beach.name)}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'kauhoe-leaflet-marker',
    iconSize: [130, 62],
    iconAnchor: [65, 18],
  });
}

export function LeafletBeachMap({
  beaches,
  selectedBeachId,
  isCheckingAll,
  fitAllTrigger,
  statusByBeach,
  onSelectBeach,
}: LeafletBeachMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelectBeach);
  const lastFitTriggerRef = useRef(0);
  const lastPanIdRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelectBeach;
  }, [onSelectBeach]);

  // Initialize Leaflet map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: LEAFLET_CENTER,
      zoom: LEAFLET_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers and colors/labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set<string>();

    for (const beach of beaches) {
      if (beach.lat === null || beach.lng === null) continue;
      activeIds.add(beach.id);

      const isSelected = beach.id === selectedBeachId;
      const status = statusByBeach[beach.id]?.status;
      const icon = createMarkerIcon(beach, status, isSelected);
      const existing = markersRef.current.get(beach.id);

      if (existing) {
        existing.setLatLng([beach.lat, beach.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(isSelected ? 500 : 100);
      } else {
        const marker = L.marker([beach.lat, beach.lng], {
          icon,
          title: `${beach.name} (${beach.maoriName})`,
          zIndexOffset: isSelected ? 500 : 100,
        }).addTo(map);

        marker.on('click', () => {
          onSelectRef.current(beach);
        });
        markersRef.current.set(beach.id, marker);
      }
    }

    for (const [id, marker] of markersRef.current.entries()) {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [beaches, selectedBeachId, statusByBeach]);

  // Reset to Auckland overview when fitAllTrigger increments (Check Today)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitAllTrigger === lastFitTriggerRef.current) return;
    lastFitTriggerRef.current = fitAllTrigger;
    lastPanIdRef.current = selectedBeachId;
    map.setView(LEAFLET_CENTER, LEAFLET_ZOOM, { animate: true });
  }, [fitAllTrigger, selectedBeachId]);

  // Pan smoothly to selected beach when user taps one (not during Check Today sweep)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBeachId || isCheckingAll || lastPanIdRef.current === selectedBeachId) return;
    const target = beaches.find((b) => b.id === selectedBeachId);
    if (target && target.lat !== null && target.lng !== null) {
      lastPanIdRef.current = selectedBeachId;
      const nextZoom = Math.max(map.getZoom(), 11);
      map.setView([target.lat, target.lng], nextZoom, { animate: true });
    }
  }, [beaches, selectedBeachId, isCheckingAll]);

  return (
    <div className="relative isolate w-full h-[340px] sm:h-[420px] lg:h-[480px] rounded-2xl overflow-hidden border border-sky-200/80 bg-[#E7F2F8]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
