export interface Message {
  id: string;
  text: string;
  sender: "me" | "friend";
  timestamp: Date;
  originalLang?: string;
  translatedText?: string;
  isTranslating?: boolean;
  showOriginal?: boolean;
  // Photo message
  photoUrl?: string;
  photoText?: string;
  translatedPhotoText?: string;
  otherLangPhotoText?: string;
  isProcessingPhoto?: boolean;
  // Voice message
  audioUrl?: string;
  audioBlob?: Blob;
  transcribedText?: string;
  translatedAudioText?: string;
  isTranscribing?: boolean;
}

export type Language = "en" | "vi";

export const FRIEND_PROFILE = {
  name: "Minh Anh",
  avatar: "A",
  status: "online",
};

export const MY_PROFILE = {
  name: "User",
  avatar: "U",
};