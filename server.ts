import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { AUCKLAND_BEACHES } from './src/data/beaches.ts';
import type { BeachStatusResult, GroundingSource, SwimStatus } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getMapsApiKey(): string {
  const raw = (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
  if (!raw || raw.startsWith('MY_') || raw.startsWith('YOUR_')) {
    return '';
  }
  return raw;
}

const statusCache = new Map<string, { data: BeachStatusResult; expiresAt: number }>();
const inFlightStatusRequests = new Map<string, Promise<BeachStatusResult>>();
const STATUS_CACHE_TTL_MS = 30 * 60 * 1000;

interface RawGroundingChunk {
  web?: { uri?: string; title?: string };
}

function extractWebSources(chunks: RawGroundingChunk[] | undefined): GroundingSource[] {
  if (!chunks || !Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const result: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      result.push({ title: title || 'Source', uri, kind: 'web' });
    }
  }
  return result;
}

function normalizeStatus(raw: string | undefined): SwimStatus {
  const value = (raw || '').toLowerCase().trim();
  if (value.includes('avoid') || value.includes('red') || value.includes('do not swim') || value.includes('kaua')) {
    return 'avoid';
  }
  if (value.includes('caution') || value.includes('amber') || value.includes('yellow') || value.includes('warning') || value.includes('tūpato') || value.includes('tupato')) {
    return 'caution';
  }
  if (value.includes('safe') || value.includes('green') || value.includes('low risk') || value.includes('haumaru')) {
    return 'safe';
  }
  return 'caution';
}

function getBilingualStatusLabels(status: SwimStatus): { en: string; mi: string } {
  switch (status) {
    case 'safe':
      return { en: 'Safe to swim', mi: 'Haumaru' };
    case 'caution':
      return { en: 'Swim with caution', mi: 'Tūpato' };
    case 'avoid':
      return { en: 'Do not swim', mi: 'Kaua e kauhoe' };
    default:
      return { en: 'Check status', mi: 'Tirohia te āhua' };
  }
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error || '');
  return (
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('"code":429') ||
    raw.includes('429')
  );
}

function formatGeminiError(error: unknown): {
  status: number;
  message: string;
  quotaExceeded: boolean;
} {
  const raw = error instanceof Error ? error.message : String(error || 'Unknown Gemini API error');
  if (raw.includes('GEMINI_API_KEY')) {
    return {
      status: 500,
      message: 'Gemini API key is not configured. Please check Settings > Secrets.',
      quotaExceeded: false,
    };
  }
  if (isQuotaError(error)) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached for your current API key. Please check or update your billing-enabled API key in Settings > Secrets, or try again shortly.',
      quotaExceeded: true,
    };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key permission error. Please check your API key in Settings > Secrets.',
      quotaExceeded: false,
    };
  }
  return {
    status: 502,
    message: 'Unable to fetch live grounded water quality data right now. Please try again.',
    quotaExceeded: false,
  };
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: unknown;
    config: Record<string, unknown>;
    fallbackConfig?: Record<string, unknown>;
  }
) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: params.contents as never,
      config: params.config as never,
    });
  } catch (err) {
    if (!isQuotaError(err)) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    return await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: params.contents as never,
      config: (params.fallbackConfig || params.config) as never,
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/config', (_req, res) => {
    res.json({
      mapsApiKey: getMapsApiKey(),
    });
  });

  app.get('/api/beaches', (_req, res) => {
    res.json({
      beaches: AUCKLAND_BEACHES,
      mapsGroundingSummary: '',
      mapsGroundingSources: [],
      quotaExceeded: false,
    });
  });

  app.post('/api/beaches/status', async (req, res) => {
    const { beachId, beachName, maoriName, forceRefresh } = req.body as {
      beachId?: string;
      beachName?: string;
      maoriName?: string;
      forceRefresh?: boolean;
    };

    if (!beachName || typeof beachName !== 'string') {
      res.status(400).json({ error: 'beachName is required.' });
      return;
    }

    const cacheKey = (beachId || beachName).toLowerCase();
    const cached = statusCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      res.json(cached.data);
      return;
    }

    if (!forceRefresh) {
      const existingInFlight = inFlightStatusRequests.get(cacheKey);
      if (existingInFlight) {
        try {
          const sharedResult = await existingInFlight;
          res.json(sharedResult);
          return;
        } catch (error) {
          const formatted = formatGeminiError(error);
          res.status(formatted.status).json({
            error: formatted.message,
            quotaExceeded: formatted.quotaExceeded,
          });
          return;
        }
      }
    }

    const fetchPromise = (async (): Promise<BeachStatusResult> => {
      const ai = getAiClient();
      const todayIso = new Date().toISOString().slice(0, 10);

      const prompt = `Search for the latest swim water quality advice, Safeswim (safeswim.org.nz) status, and Auckland Council beach advisories for ${beachName}, Auckland, New Zealand as of ${todayIso}.
Check if there are any recent rainfall alerts, stormwater or wastewater overflow warnings, high bacteria alerts, or surf/hazard advisories affecting ${beachName}.

Return ONLY a valid JSON object with these exact keys:
{
  "status": "safe" | "caution" | "avoid",
  "reason": "A clear 2-3 sentence plain-English explanation of today's water quality and swim advice for ${beachName}, mentioning Safeswim or Auckland Council findings and any recent rain/overflow or coastal conditions.",
  "maoriSummary": "A short natural 1-sentence summary in te reo Māori reflecting the swim status (e.g., 'He pai te wai o ${beachName} mō te kauhoe i tēnei rā.' for safe, 'Kia tūpato i te kauhoe ki ${beachName} nā te āhua o te wai.' for caution, or 'Kaua e kauhoe ki ${beachName} i tēnei wā.' for avoid).",
  "adviceBullets": ["Short practical bullet 1", "Short practical bullet 2"]
}

Classification guidance:
- "safe" (Green / Haumaru): Safeswim or Auckland Council indicates low risk / safe to swim and no recent overflow or contamination warning.
- "caution" (Amber / Tūpato): Recent rain within 24-48h, forecast caution, mild water quality uncertainty, or surf/jellyfish/coastal caution.
- "avoid" (Red / Kaua e kauhoe): Safeswim red/black alert, wastewater overflow, high bacteria/faecal indicator warning, or closed beach advisory.
If live real-time Safeswim data for the exact hour is not indexed in search results, base your classification cautiously on the latest available Safeswim/Auckland Council page and recent Auckland weather/rainfall search results, and clearly state that in the reason.`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
        fallbackConfig: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = response.text || '';
      const parsed = extractJsonObject(rawText);
      const status = normalizeStatus(typeof parsed?.status === 'string' ? parsed.status : rawText);
      const labels = getBilingualStatusLabels(status);

      const reason =
        typeof parsed?.reason === 'string' && parsed.reason.trim().length > 0
          ? parsed.reason.trim()
          : rawText.trim() ||
            `Latest grounded water quality search for ${beachName} completed. Always verify the live Safeswim map and on-site beach signage before entering the water.`;

      const maoriSummary =
        typeof parsed?.maoriSummary === 'string' && parsed.maoriSummary.trim().length > 0
          ? parsed.maoriSummary.trim()
          : status === 'safe'
            ? `He haumaru te āhua o te wai ki ${beachName}.`
            : status === 'avoid'
              ? `Kaua e kauhoe ki ${beachName} i tēnei wā.`
              : `Kia tūpato i mua i te kauhoe ki ${beachName}.`;

      const adviceBullets = Array.isArray(parsed?.adviceBullets)
        ? parsed.adviceBullets.filter((b): b is string => typeof b === 'string').slice(0, 3)
        : [];

      const groundingMeta = response.candidates?.[0]?.groundingMetadata;
      const sources = extractWebSources(groundingMeta?.groundingChunks as RawGroundingChunk[] | undefined);
      const searchQueries = Array.isArray(groundingMeta?.webSearchQueries)
        ? groundingMeta.webSearchQueries
        : [];

      const result: BeachStatusResult = {
        beachId: beachId || cacheKey,
        beachName,
        maoriName: maoriName || beachName,
        status,
        statusLabelEn: labels.en,
        statusLabelMi: labels.mi,
        reason,
        maoriSummary,
        adviceBullets,
        checkedAt: new Date().toISOString(),
        sources,
        searchQueries,
      };

      statusCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
      });

      return result;
    })();

    inFlightStatusRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      if (!isQuotaError(error)) {
        console.error(`Error fetching swim status for ${beachName}:`, formatted.message);
      }
      res.status(formatted.status).json({
        error: formatted.message,
        quotaExceeded: formatted.quotaExceeded,
      });
    } finally {
      if (inFlightStatusRequests.get(cacheKey) === fetchPromise) {
        inFlightStatusRequests.delete(cacheKey);
      }
    }
  });

  app.post('/api/chat', async (req, res) => {
    const { message, history, selectedBeachName } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
      selectedBeachName?: string;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Please enter a swimming question.' });
      return;
    }

    try {
      const ai = getAiClient();
      const todayIso = new Date().toISOString().slice(0, 10);

      const contents = [
        ...(Array.isArray(history)
          ? history.slice(-6).map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            }))
          : []),
        {
          role: 'user' as const,
          parts: [
            {
              text: selectedBeachName
                ? `[User currently viewing ${selectedBeachName}, Auckland] ${message.trim()}`
                : message.trim(),
            },
          ],
        },
      ];

      const systemInstructionText = `You are Kauhoe Haumaru, a helpful Auckland water safety assistant helping Aucklanders decide where and when it is safe to swim today (${todayIso}).
Always use Google Search grounding to check recent Auckland rainfall, Safeswim (safeswim.org.nz), Auckland Council water quality notices, and Watercare wastewater overflow advisories before answering.
Rules:
1. Give a clear, direct, plain-English recommendation early in your response, using the bilingual terms Haumaru (Safe), Tūpato (Caution), or Kaua e kauhoe (Do not swim) where helpful.
2. Explain stormwater and wastewater overflow risk after heavy rain (bacteria levels stay elevated for 24 to 48 hours after heavy rainfall) whenever rain is relevant.
3. Keep answers concise and scannable on a mobile phone (2–4 short paragraphs or bullets).
4. Always remind the swimmer to check Safeswim and official beach signage before entering the water.
5. Never invent URLs; rely on Google Search grounding citations.`;

      const response = await generateWithFallback(ai, {
        contents,
        config: {
          systemInstruction: systemInstructionText,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
        fallbackConfig: {
          systemInstruction: systemInstructionText,
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingMeta = response.candidates?.[0]?.groundingMetadata;
      const sources = extractWebSources(groundingMeta?.groundingChunks as RawGroundingChunk[] | undefined);
      const searchQueries = Array.isArray(groundingMeta?.webSearchQueries)
        ? groundingMeta.webSearchQueries
        : [];

      res.json({
        reply:
          (response.text || '').trim() ||
          'I could not find current water quality details for that question. Please check Safeswim and official beach signage before swimming.',
        sources,
        searchQueries,
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      if (!isQuotaError(error)) {
        console.error('Error in /api/chat:', formatted.message);
      }
      res.status(formatted.status).json({
        error: formatted.message,
        quotaExceeded: formatted.quotaExceeded,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kauhoe Haumaru server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
