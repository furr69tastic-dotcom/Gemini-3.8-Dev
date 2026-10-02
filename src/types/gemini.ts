export type GeminiModelId = 
  | 'gemini-3.8-flash'
  | 'gemini-3.8-pro-extended'
  | 'gemini-3.8-live'
  | 'gemini-3.8-live-extended-thinking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  thoughtText?: string | null;
  thoughtDurationMs?: number;
  isThinking?: boolean;
  isStreaming?: boolean;
  images?: Array<{
    base64: string;
    mimeType?: string;
    name?: string;
  }>;
  searchQueries?: string[];
  searchSources?: Array<{
    title?: string;
    uri?: string;
  }>;
  audioBase64?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  model: GeminiModelId;
  extendedThinking: boolean;
}

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface AppSettings {
  voiceName: VoiceName;
  extendedThinkingDefault: boolean;
  groundingDefault: boolean;
  deviceFrame: boolean;
  systemPrompt: string;
}
