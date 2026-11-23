import type { Beach, BeachStatusResult, GroundingSource, SwimStatus } from '../types.ts';

interface DemoBeachTemplate {
  status: SwimStatus;
  statusLabelEn: string;
  statusLabelMi: string;
  reason: string;
  maoriSummary: string;
  adviceBullets: string[];
}

export const SAFESWIM_SOURCES: GroundingSource[] = [
  {
    title: 'Safeswim Auckland (safeswim.org.nz)',
    uri: 'https://www.safeswim.org.nz/',
    kind: 'web',
  },
];

const DEMO_STATUS_TEMPLATES: Record<string, DemoBeachTemplate> = {
  'mission-bay': {
    status: 'safe',
    statusLabelEn: 'Safe to swim',
    statusLabelMi: 'Haumaru',
    reason:
      'Strong Waitematā tidal flushing and dry conditions keep faecal indicator bacteria levels low at Mission Bay.',
    maoriSummary: 'He haumaru te wai o Mission Bay mō te kauhoe i tēnei rā.',
    adviceBullets: [
      'Low bacteria risk across the main swimming bay.',
      'Check on-site council signage before entering the water.',
    ],
  },
  takapuna: {
    status: 'safe',
    statusLabelEn: 'Safe to swim',
    statusLabelMi: 'Haumaru',
    reason:
      'Clear Hauraki Gulf water circulation keeps bacteria levels well below safety thresholds at Takapuna today.',
    maoriSummary: 'He pai, he haumaru te āhua o te wai ki Takapuna i tēnei rā.',
    adviceBullets: [
      'Calm coastal water quality along Takapuna Beach.',
      'Check official beach signage and local surf conditions before swimming.',
    ],
  },
  piha: {
    status: 'caution',
    statusLabelEn: 'Swim with caution',
    statusLabelMi: 'Tūpato',
    reason:
      'Moderate West Coast swell, changing rip currents, and minor runoff near the Piha Lagoon outflow warrant extra caution.',
    maoriSummary: 'Kia tūpato i te kauhoe ki Te Piha nā ngā ngaru me te wai rere.',
    adviceBullets: [
      'Swim strictly between the Surf Life Saving patrol flags and avoid the lagoon mouth.',
      'Check Safeswim and lifeguard warnings on site.',
    ],
  },
  'point-chevalier': {
    status: 'avoid',
    statusLabelEn: 'Do not swim',
    statusLabelMi: 'Kaua e kauhoe',
    reason:
      'Inner Waitematā stormwater runoff and a recent wastewater overflow warning have raised bacteria levels for 24–48 hours.',
    maoriSummary: 'Kaua e kauhoe ki Te Rae o Kāhu i tēnei wā nā te pikinga huakita.',
    adviceBullets: [
      'Avoid water contact until the overflow alert clears and 48 hours pass.',
      'Choose a Green (Haumaru) beach such as Mission Bay or Cheltenham today.',
    ],
  },
  cheltenham: {
    status: 'safe',
    statusLabelEn: 'Safe to swim',
    statusLabelMi: 'Haumaru',
    reason:
      'Steady outer Waitematā channel currents keep Cheltenham clean and safe for swimming with low bacteria risk.',
    maoriSummary: 'He haumaru te wai o Te Haukapua mō te kauhoe i tēnei rā.',
    adviceBullets: [
      'Good water clarity and low stormwater impact.',
      'Watch for ferry wakes near the harbour channel.',
    ],
  },
  'long-bay': {
    status: 'safe',
    statusLabelEn: 'Safe to swim',
    statusLabelMi: 'Haumaru',
    reason:
      'Open Hauraki Gulf exchange and low urban runoff keep water quality safe along Long Bay Regional Park.',
    maoriSummary: 'He haumaru te wai ki Oneroa (Long Bay) i tēnei rā.',
    adviceBullets: [
      'Low bacteria levels along the main bay.',
      'Stay clear of Awaruku Stream if local showers pass through.',
    ],
  },
  kohimarama: {
    status: 'caution',
    statusLabelEn: 'Swim with caution',
    statusLabelMi: 'Tūpato',
    reason:
      'Local stormwater stream runoff is still clearing near Kohimarama; avoid swallowing water and keep away from drain outlets.',
    maoriSummary: 'Kia tūpato i te kauhoe ki Kohimarama i te wā e mahea haere ana te wai.',
    adviceBullets: [
      'Moderate bacteria risk near stormwater outlets while tides flush the bay.',
      'Nearby Mission Bay and Cheltenham are currently rated Safe (Haumaru).',
    ],
  },
};

export function getDemoBeachStatus(beach: Beach): BeachStatusResult {
  const template = DEMO_STATUS_TEMPLATES[beach.id] || {
    status: 'caution' as SwimStatus,
    statusLabelEn: 'Swim with caution',
    statusLabelMi: 'Tūpato',
    reason: `Coastal runoff is still settling at ${beach.name}; avoid stormwater outlets and verify signage.`,
    maoriSummary: `Kia tūpato i te kauhoe ki ${beach.name} i tēnei rā.`,
    adviceBullets: ['Check safeswim.org.nz and on-site signage before swimming.'],
  };

  return {
    beachId: beach.id,
    beachName: beach.name,
    maoriName: beach.maoriName,
    status: template.status,
    statusLabelEn: template.statusLabelEn,
    statusLabelMi: template.statusLabelMi,
    reason: template.reason,
    maoriSummary: template.maoriSummary,
    adviceBullets: template.adviceBullets,
    checkedAt: new Date().toISOString(),
    sources: SAFESWIM_SOURCES,
    searchQueries: [],
  };
}

export const QUICK_TAP_QUESTIONS = [
  "Is it safe to swim at Takapuna after yesterday's rain?",
  'Which Auckland harbour beach is safest for swimming today?',
  'Are there any wastewater overflow warnings in Auckland today?',
] as const;

export function getDemoChatReply(
  question: string
): { reply: string; sources: GroundingSource[] } {
  const normalized = question.trim().toLowerCase();

  if (normalized === QUICK_TAP_QUESTIONS[0].toLowerCase()) {
    return {
      reply:
        'Sample answer (demo mode): Takapuna is rated Haumaru (Safe to swim) in today’s sample dataset, with clear Hauraki Gulf water circulation. However, if Auckland had heavy rain within the last 24–48 hours, stormwater runoff can still elevate bacteria near stream mouths.\n\nWait 24–48 hours after heavy rainfall near drains and check safeswim.org.nz plus official signage before swimming.',
      sources: SAFESWIM_SOURCES,
    };
  }

  if (normalized === QUICK_TAP_QUESTIONS[1].toLowerCase()) {
    return {
      reply:
        'Sample answer (demo mode): Mission Bay, Cheltenham, Takapuna, and Long Bay are Haumaru (Safe to swim) in today’s sample outlook.\n\nKohimarama and Piha are Tūpato (Caution), while Point Chevalier is Kaua e kauhoe (Do not swim). Always verify safeswim.org.nz and official beach signage before entering the water.',
      sources: SAFESWIM_SOURCES,
    };
  }

  if (normalized === QUICK_TAP_QUESTIONS[2].toLowerCase()) {
    return {
      reply:
        'Sample answer (demo mode): Yes — Point Chevalier is marked Kaua e kauhoe (Do not swim) due to inner Waitematā stormwater and wastewater overflow risk, which keeps bacteria elevated for 24 to 48 hours. Kohimarama also has a Tūpato (Caution) notice near stormwater outlets.\n\nPlease check safeswim.org.nz and on-site council signs before swimming.',
      sources: SAFESWIM_SOURCES,
    };
  }

  return {
    reply: 'Live answers are unavailable right now. Please check safeswim.org.nz.',
    sources: SAFESWIM_SOURCES,
  };
}
