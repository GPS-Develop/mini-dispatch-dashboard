import { GoogleGenerativeAI } from '@google/generative-ai';

export const AI_CONFIG = {
  provider: 'gemini',
  model: 'gemini-pro',
  apiKey: process.env.GOOGLE_API_KEY,
  maxTokens: 1000,
  temperature: 0.1 // Low temperature for consistent structured output
};

export const getGeminiClient = () => {
  if (!AI_CONFIG.apiKey) {
    throw new Error('Google API key not configured');
  }
  return new GoogleGenerativeAI(AI_CONFIG.apiKey);
};

export interface ExtractedLoadData {
  referenceId?: string;
  loadType?: 'Reefer' | 'Dry Van' | 'Flatbed';
  temperature?: number;
  rate?: number;
  pickupLocations?: LocationData[];
  deliveryLocations?: LocationData[];
  brokerInfo?: BrokerInfo;
  confidence: number;
}

export interface LocationData {
  locationName?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateTime?: string;
}

export interface BrokerInfo {
  name?: string;
  contact?: string;
  email?: string;
}