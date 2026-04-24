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
}

export type Language = "en" | "vi";

export const FRIEND_PROFILE = {
  name: "Minh Anh",
  avatar: "MA",
  status: "online",
};

export const MY_PROFILE = {
  name: "Son",
  avatar: "S",
};