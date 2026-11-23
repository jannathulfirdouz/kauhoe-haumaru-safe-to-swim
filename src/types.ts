export type SwimStatus = 'safe' | 'caution' | 'avoid' | 'unknown';

export interface GroundingSource {
  title: string;
  uri: string;
  kind?: 'web' | 'maps';
}

export interface Beach {
  id: string;
  name: string;
  maoriName: string;
  coastArea: string;
  coastAreaMaori: string;
  searchQuery: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  formattedAddress: string | null;
  googleMapsUri: string | null;
  groundingSummary?: string;
}

export interface BeachStatusResult {
  beachId: string;
  beachName: string;
  maoriName: string;
  status: SwimStatus;
  statusLabelEn: string;
  statusLabelMi: string;
  reason: string;
  maoriSummary: string;
  adviceBullets: string[];
  checkedAt: string;
  sources: GroundingSource[];
  searchQueries: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
  createdAt: string;
  error?: boolean;
}
