
export type SystemType = string;

export type CategoryType = string;

export type PType = string;

export interface HistoryEntry {
  date: number;
  action: string;
  user?: string; // Future proofing
}

export interface FAQItem {
  id: string;
  pfNumber: string; // The "PF" ID visible to user
  url: string;
  question: string; // Title/Question
  content: string; // Raw text content for AI to analyze
  summary: string; // AI Summary
  notes: string; // User notes
  system: SystemType;
  category: CategoryType;
  type: PType;
  needsUpdate: boolean;
  isFavorite?: boolean; // New: Favorite status
  isReusable?: boolean; // New: Can be reused for newer content
  hasVideo?: boolean; // New: Indicates if the FAQ has a video
  createdAt: number;
  history: HistoryEntry[];
}

export interface FilterState {
  search: string; // Searches ID or Question
  system: SystemType | '';
  category: CategoryType | '';
  type: PType | '';
  needsUpdate: boolean | null; // null = all, true = yes, false = no
  favorites: boolean; // Show only favorites
  isReusable: boolean | null; // null = all
  hasVideo: boolean | null; // null = all
}