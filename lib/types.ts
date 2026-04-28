export interface TextBlock {
  original: string;
  translated: string;
  x: number;      // center % of image width
  y: number;      // center % of image height
  width: number;  // % of image width
  fontSize: "small" | "medium" | "large";
}

export interface Message {
  id: string;
  text: string;
  sender: "me" | "friend";
  timestamp: Date;
  originalLang?: string;
  translatedText?: string;
  isTranslating?: boolean;
  showOriginal?: boolean;
  // Photo
  photoUrl?: string;
  photoBlocks?: TextBlock[];
  isProcessingPhoto?: boolean;
  // Voice
  audioUrl?: string;
  transcribedText?: string;
  translatedAudioText?: string;
  isTranscribing?: boolean;
}

export type Language = "en" | "vi";

export const FRIEND_PROFILE = {
  name: "Minh Anh",
  avatar: "MA",
  status: "online",
};

export const MY_PROFILE = {
  name: "User",
  avatar: "US",
};