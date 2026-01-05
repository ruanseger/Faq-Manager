
export type SystemType = string;

export type CategoryType = 'Suporte' | 'Comercial';

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
  createdAt: number;
  history: HistoryEntry[];
}

export interface FilterState {
  search: string; // Searches ID or Question
  system: SystemType | '';
  category: CategoryType | '';
  type: PType | '';
  needsUpdate: boolean | null; // null = all, true = yes, false = no
  favorites: boolean; // New: Show only favorites
}
