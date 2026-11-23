import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const GMP_FALLBACK_SESSION_KEY = 'kauhoe_gmp_fallback';

function isGmpFallbackCached(): boolean {
  try {
    return window.sessionStorage.getItem(GMP_FALLBACK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function setGmpFallbackCached() {
  try {
    window.sessionStorage.setItem(GMP_FALLBACK_SESSION_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

let fallbackScheduled = false;

function scheduleGmpFallback() {
  (window as unknown as { __gmpQuotaExceeded?: boolean }).__gmpQuotaExceeded = true;
  setGmpFallbackCached();
  if (fallbackScheduled) return;
  fallbackScheduled = true;

  // Defer React unmount slightly so Google Maps JS callbacks finish cleanly without throwing
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }, 80);
}

if (isGmpFallbackCached()) {
  (window as unknown as { __gmpQuotaExceeded?: boolean }).__gmpQuotaExceeded = true;
}

function isGoogleMapsSdkError(msg: string): boolean {
  return (
    msg.includes('Google Maps JavaScript API error') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('RefererNotAllowedMapError') ||
    msg.includes('ApiNotActivatedMapError') ||
    msg.includes('ExpiredKeyMapError') ||
    msg.includes('InvalidKeyMapError') ||
    msg.includes('ApiProjectMapError') ||
    msg.includes('NotLoadingAPIFromGoogleMapsError')
  );
}

// Tier 1 Google Maps Platform quota & auth failure listener
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  scheduleGmpFallback();
};

const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (isGoogleMapsSdkError(msg)) {
    scheduleGmpFallback();
    console.warn('[Kauhoe Haumaru] Google Maps unavailable; switching to OpenStreetMap fallback.');
    return;
  }
  origError.apply(console, args);
};

// Catch cross-origin Script error. or <script> load errors from maps.googleapis.com
window.addEventListener(
  'error',
  (event) => {
    const filename = event.filename || '';
    const message = event.message || '';
    const targetSrc =
      event.target instanceof HTMLScriptElement ? event.target.src || '' : '';

    if (
      message === 'Script error.' ||
      filename.includes('maps.googleapis.com') ||
      targetSrc.includes('maps.googleapis.com') ||
      isGoogleMapsSdkError(message)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      scheduleGmpFallback();
    }
  },
  true
);

const origOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  const msgStr = String(message || '');
  const srcStr = String(source || '');
  if (
    msgStr === 'Script error.' ||
    srcStr.includes('maps.googleapis.com') ||
    isGoogleMapsSdkError(msgStr)
  ) {
    scheduleGmpFallback();
    return true;
  }
  if (origOnError) {
    return origOnError(message, source, lineno, colno, error);
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
