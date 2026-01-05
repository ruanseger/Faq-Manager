export type SystemType =
  | 'Secullum Ponto Web'
  | 'Secullum Ponto Offline'
  | 'Secullum Ponto 4'
  | 'Secullum Acesso'
  | 'Secullum Academia'
  | 'Secullum Escola'
  | 'Secullum Clube'
  | 'Secullum Estacionamento'
  | 'Diversos'
  | 'Secullum Ponto Virtual'
  | 'Secullum Acesso Controlador'
  | 'Ponto Secullum 3'
  | 'Ponto Secullum 4'
  | 'Secullum Ponto Web Gateway';

export type CategoryType = 'Suporte' | 'Comercial';

export type PType =
  | 'Erro'
  | 'SQL'
  | 'Instalação'
  | 'Cálculos'
  | 'Configuração Equipamento'
  | 'Equipamentos Integrados'
  | 'Configuração em Geral'
  | 'Portaria'
  | 'Políticas'
  | 'Exposec'
  | 'Webinar'
  | 'Comunicação Equipamentos';

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
  createdAt: number;
  history: HistoryEntry[];
}

export interface FilterState {
  search: string; // Searches ID or Question
  system: SystemType | '';
  category: CategoryType | '';
  type: PType | '';
  needsUpdate: boolean | null; // null = all, true = yes, false = no
}
