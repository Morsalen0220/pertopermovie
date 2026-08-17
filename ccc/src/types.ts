export interface PeerInfo {
  peerId: string;
  username: string;
  isHost?: boolean;
}

export interface VideoState {
  url: string;
  title: string;
  videoType: "sample" | "url" | "local" | "youtube";
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  lastUpdated: number;
  hostName: string;
  youtubeId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xOffset: number;
}

export interface SampleMovie {
  id: string;
  title: string;
  url: string;
  poster: string;
  duration: string;
  genre: string;
  description: string;
  language: string;
}

export type ViewLayout = "cinema" | "theater";
export type Language = "en" | "bn";
