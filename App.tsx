import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  Bot, 
  ExternalLink, 
  Trash2, 
  Save, 
  FileText,
  Moon,
  Sun,
  LayoutDashboard,
  List,
  RotateCcw,
  Loader2,
  CheckCircle,
  History,
  Download,
  Upload,
  Hash,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Columns,
  Zap,
  Settings,
  X,
  Star,
  CheckSquare,
  Square,
  CalendarClock,
  Printer,
  Maximize2,
  Minimize2,
  RefreshCw,
  PlayCircle,
  StickyNote,
  Database,
  Cloud
} from 'lucide-react';

import { FAQItem, FilterState, SystemType, CategoryType, PType, HistoryEntry } from './types';
import { SYSTEMS as DEFAULT_SYSTEMS, CATEGORIES, TYPES as DEFAULT_TYPES } from './constants';
import { summarizeFAQContent } from './services/geminiService';
import { Modal } from './components/Modal';
import { Dashboard } from './components/Dashboard';

// --- MOCK DATA FOR DEMO ---
const INITIAL_DATA: FAQItem[] = [
  {
    id: '1',
    pfNumber: '685',
    url: 'https://www.secullum.com.br/pf?id=685',
    question: 'Erro ao comunicar com equipamento Henry',
    content: 'Ao tentar comunicar apresenta erro de timeout. Verifique cabeamento e configurações de IP.',
    summary: 'O erro de timeout geralmente indica falhas físicas no cabeamento ou configurações de rede (IP/Porta) incorretas no equipamento Henry.',
    notes: 'Verificar se o firewall está bloqueando a porta 3000.',
    system: 'Secullum Ponto 4',
    category: 'Suporte',
    type: 'Comunicação Equipamentos',
    needsUpdate: false,
    isFavorite: false,
    isReusable: true,
    hasVideo: true,
    createdAt: Date.now(),
    history: [
      { date: Date.now(), action: 'PF Criada' }
    ]
  },
];

const Badge = ({ children, color = 'blue' }: { children?: React.ReactNode, color?: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-secullum-light text-secullum-blue border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    green: 'bg-green-50 text-secullum-green border-green-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    gray: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-bold border ${colors[color] || colors.gray} tracking-tight shadow-sm whitespace-nowrap`}>
      {children}
    </span>
  );
};

const App: React.FC = () => {
  // --- STATE ---
  const [items, setItems] = useState<FAQItem[]>(() => {
    // Persistent Database Load
    try {
      const saved = localStorage.getItem('secullum-faq-items');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch (e) {
      console.error("Erro ao carregar banco de dados local", e);
      return INITIAL_DATA;
    }
  });

  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dynamic Configuration State
  const [systems, setSystems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secullum-systems');
      return saved ? JSON.parse(saved) : DEFAULT_SYSTEMS;
    } catch (e) { return DEFAULT_SYSTEMS; }
  });

  const [types, setTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secullum-types');
      return saved ? JSON.parse(saved) : DEFAULT_TYPES;
    } catch (e) { return DEFAULT_TYPES; }
  });

  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [currentView, setCurrentView] = useState<'list' | 'dashboard'>('list');
  const [listViewMode, setListViewMode] = useState<'grid' | 'table' | 'board'>('grid');
  const [viewAllMode, setViewAllMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    system: '',
    category: '',
    type: '',
    needsUpdate: null,
    favorites: false,
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings Form State
  const [newSystemName, setNewSystemName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // Form State (New/Edit)
  const [formData, setFormData] = useState<Partial<FAQItem>>({
    pfNumber: '',
    url: '',
    question: '',
    content: '',
    system: 'Secullum Ponto Web',
    category: 'Suporte',
    type: 'Erro',
    notes: '',
    needsUpdate: false,
    isFavorite: false,
    isReusable: false,
    hasVideo: false,
    history: []
  });

  // --- EFFECTS (DATABASE PERSISTENCE) ---
  useEffect(() => {
    // Automatically save to local database on every change
    localStorage.setItem('secullum-faq-items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('secullum-systems', JSON.stringify(systems));
  }, [systems]);

  useEffect(() => {
    localStorage.setItem('secullum-types', JSON.stringify(types));
  }, [types]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters, currentView]);

  // --- DERIVED ---
  const filteredItems = useMemo(() => {
    const searchLower = filters.search.toLowerCase().trim();
    return items.filter((item) => {
      // COMPREHENSIVE SEARCH LOGIC
      const matchesSearch = 
        !searchLower ||
        item.pfNumber.toLowerCase().includes(searchLower) || 
        item.question.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (item.summary && item.summary.toLowerCase().includes(searchLower)) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
        (item.content && item.content.toLowerCase().includes(searchLower));
      
      const matchesSystem = filters.system ? item.system === filters.system : true;
      const matchesCategory = filters.category ? item.category === filters.category : true;
      const matchesType = filters.type ? item.type === filters.type : true;
      const matchesUpdate = filters.needsUpdate !== null ? item.needsUpdate === filters.needsUpdate : true;
      const matchesFavorite = filters.favorites ? item.isFavorite === true : true;

      return matchesSearch && matchesSystem && matchesCategory && matchesType && matchesUpdate && matchesFavorite;
    });
  }, [items, filters]);

  const displayedItems = useMemo(() => {
    if (viewAllMode && listViewMode === 'grid') {
      return filteredItems;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, viewAllMode, listViewMode]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // --- HANDLERS ---
  const handleOpenModal = (item?: FAQItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      setFormData({
        pfNumber: '',
        url: '',
        question: '',
        content: '',
        system: systems[0] || '',
        category: 'Suporte',
        type: types[0] || '',
        notes: '',
        needsUpdate: false,
        isFavorite: false,
        isReusable: false,
        hasVideo: false,
        summary: '',
        history: []
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenQuickAdd = () => {
    setFormData({
        pfNumber: '',
        url: '',
        question: '',
        content: '',
        system: systems[0] || '',
        category: 'Suporte',
        type: types[0] || '',
        notes: '',
        needsUpdate: false,
        isFavorite: false,
        isReusable: false,
        hasVideo: false,
        summary: '',
        history: []
      });
    setIsQuickAddOpen(true);
  }

  // --- SELECTION HANDLERS ---
  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault(); 
    }
    
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllVisible = () => {
    if (selectedIds.size === displayedItems.length && displayedItems.length > 0) {
        setSelectedIds(new Set());
    } else {
        const newSet = new Set(selectedIds);
        displayedItems.forEach(item => newSet.add(item.id));
        setSelectedIds(newSet);
    }
  };

  // --- ITEM ACTIONS ---
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setItems(prev => prev.map(item => 
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Explicit confirm
    if (window.confirm('Atenção: Tem certeza que deseja excluir esta PF permanentemente?')) {
      
      // 1. Close modal first if the item being deleted is currently open
      // This prevents the UI from trying to render properties of null/undefined
      if (isModalOpen && editingItem?.id === id) {
          setIsModalOpen(false);
          setEditingItem(null); 
      }

      // 2. Clear from selection if present
      if (selectedIds.has(id)) {
          setSelectedIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }

      // 3. Update State
      setItems(prevItems => prevItems.filter(i => i.id !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;

    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} itens selecionados?`)) {
        setItems(prevItems => prevItems.filter(i => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
    }
  };

  const handleMarkUpdated = (item: FAQItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newHistory: HistoryEntry = {
      date: Date.now(),
      action: 'Marcado como Atualizado'
    };
    
    setItems(prev => prev.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          needsUpdate: false,
          history: [newHistory, ...(i.history || [])]
        };
      }
      return i;
    }));
  };

  const handleSave = async (isQuick = false) => {
    if (!formData.pfNumber || !formData.question) {
      alert('Por favor, preencha o número da PF e a pergunta.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingItem && !isQuick) {
        // Edit Mode
        const updatedItem = { ...formData } as FAQItem;
        
        if (updatedItem.needsUpdate && !editingItem.needsUpdate) {
             updatedItem.history = [{ date: Date.now(), action: 'Solicitada Revisão' }, ...(updatedItem.history || [])];
        } else if (updatedItem.needsUpdate !== editingItem.needsUpdate) {
             updatedItem.history = [{ date: Date.now(), action: 'Status de Revisão Alterado' }, ...(updatedItem.history || [])];
        }

        if (updatedItem.summary !== editingItem.summary) {
            updatedItem.history = [{ date: Date.now(), action: 'Resumo Editado' }, ...(updatedItem.history || [])];
        }

        setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      } else {
        // New Mode - INSTANT SAVE
        // We removed the AI ID generation to make this instantaneous
        const cleanTitle = (formData.question || '').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
        const smartId = `pf-${formData.pfNumber}-${cleanTitle}-${Date.now().toString().slice(-6)}`;

        const newItem: FAQItem = {
          ...formData as FAQItem,
          id: smartId, 
          createdAt: Date.now(),
          summary: formData.summary || '',
          history: [{ date: Date.now(), action: 'PF Criada' }]
        };
        setItems(prev => [newItem, ...prev]);
      }
      
      // Close Modals immediately
      if (isQuick) {
        setIsQuickAddOpen(false);
      } else {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to save", error);
      alert("Ocorreu um erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!formData.content) {
      alert('Por favor, insira o conteúdo da PF para gerar o resumo.');
      return;
    }

    setIsGenerating(true);
    const summary = await summarizeFAQContent(
      formData.pfNumber || '',
      formData.question || '',
      formData.content || '',
      formData.system || ''
    );
    setFormData(prev => ({ ...prev, summary }));
    setIsGenerating(false);
  };

  // --- CONFIG HANDLERS ---
  const handleAddSystem = () => {
    if (newSystemName && !systems.includes(newSystemName)) {
        setSystems([...systems, newSystemName]);
        setNewSystemName('');
    }
  };

  const handleRemoveSystem = (name: string) => {
    if (confirm(`Remover sistema "${name}"?`)) {
        setSystems(systems.filter(s => s !== name));
    }
  };

  const handleAddType = () => {
    if (newTypeName && !types.includes(newTypeName)) {
        setTypes([...types, newTypeName]);
        setNewTypeName('');
    }
  };

  const handleRemoveType = (name: string) => {
    if (confirm(`Remover tipo "${name}"?`)) {
        setTypes(types.filter(t => t !== name));
    }
  };

  // --- EXPORT / IMPORT ---
  const handleExportPDF = () => {
    // Group by System
    const bySystem = filteredItems.reduce((acc, item) => {
        if (!acc[item.system]) acc[item.system] = [];
        acc[item.system].push(item);
        return acc;
    }, {} as Record<string, FAQItem[]>);

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de PFs - Secullum FAQ Manager</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 1000px; mx-auto; }
            .header { margin-bottom: 40px; border-bottom: 3px solid #7FBA00; padding-bottom: 20px; }
            h1 { color: #002F50; margin: 0; font-size: 28px; }
            .meta { color: #666; font-size: 14px; margin-top: 10px; }
            .system-group { margin-bottom: 40px; page-break-inside: avoid; }
            .system-header { 
                background-color: #f0f7fb; 
                padding: 12px 20px; 
                color: #00548E; 
                font-weight: bold; 
                font-size: 18px; 
                border-left: 6px solid #00548E; 
                margin-bottom: 15px;
            }
            .item { 
                margin-bottom: 20px; 
                border-bottom: 1px solid #eee; 
                padding-bottom: 15px; 
            }
            .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
            .item-title { font-weight: bold; font-size: 15px; color: #111; flex: 1; padding-right: 15px; }
            .pf-number { color: #00548E; font-family: monospace; font-weight: bold; margin-right: 8px; }
            .badge { 
                display: inline-block; 
                padding: 3px 8px; 
                border-radius: 4px; 
                font-size: 11px; 
                font-weight: bold; 
                text-transform: uppercase;
                white-space: nowrap;
            }
            .badge-alert { background: #fee2e2; color: #b91c1c; }
            .badge-ok { background: #d1fae5; color: #047857; }
            .badge-reusable { background: #e0f2fe; color: #0284c7; }
            .badge-video { background: #f3e8ff; color: #7e22ce; }
            .item-details { font-size: 12px; color: #666; margin-bottom: 8px; }
            .item-summary { font-size: 13px; line-height: 1.5; color: #444; background: #fafafa; padding: 10px; border-radius: 6px; }
            @media print {
                .system-group { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Perguntas Frequentes</h1>
            <div class="meta">
                Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br/>
                Total de itens: ${filteredItems.length}
            </div>
          </div>
          
          ${Object.entries(bySystem).sort().map(([sys, sysItems]) => {
            const items = sysItems as FAQItem[];
            return `
            <div class="system-group">
              <div class="system-header">${sys} (${items.length})</div>
              ${items.map(i => `
                <div class="item">
                  <div class="item-header">
                    <div class="item-title">
                        <span class="pf-number">#${i.pfNumber}</span> ${i.question}
                    </div>
                    <div>
                        ${i.hasVideo ? '<span class="badge badge-video" style="margin-right:4px">Vídeo</span>' : ''}
                        ${i.isReusable ? '<span class="badge badge-reusable" style="margin-right:4px">Reutilizável</span>' : ''}
                        ${i.needsUpdate 
                            ? '<span class="badge badge-alert">Requer Atualização</span>' 
                            : '<span class="badge badge-ok">Atualizado</span>'}
                    </div>
                  </div>
                  <div class="item-details">
                     Categoria: <strong>${i.category}</strong> | Tipo: <strong>${i.type}</strong>
                  </div>
                  ${i.summary ? `<div class="item-summary">${i.summary}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `}).join('')}
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
    } else {
        alert('Por favor, permita popups para gerar o PDF.');
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `secullum-faq-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const headers = ['ID Interno', 'Número PF', 'Pergunta', 'Sistema', 'Categoria', 'Tipo', 'Status', 'Reutilizável', 'Tem Vídeo', 'Link', 'Data Criação'];
    const rows = filteredItems.map(item => [
      item.id,
      item.pfNumber,
      `"${item.question.replace(/"/g, '""')}"`,
      item.system,
      item.category,
      item.type,
      item.needsUpdate ? 'Requer Atualização' : 'Atualizado',
      item.isReusable ? 'Sim' : 'Não',
      item.hasVideo ? 'Sim' : 'Não',
      item.url,
      new Date(item.createdAt).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(';'), 
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-pfs-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            if(confirm(`Deseja importar ${parsed.length} itens? Isso substituirá a lista atual.`)) {
                setItems(parsed);
            }
          } else {
            alert('Arquivo inválido.');
          }
        } catch (err) {
          alert('Erro ao ler arquivo JSON.');
        }
      };
      reader.readAsText(file);
    }
    if (event.target) event.target.value = '';
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      system: '',
      category: '',
      type: '',
      needsUpdate: null,
      favorites: false,
    });
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-100 text-slate-900'}`}>
      
      {/* SIDEBAR - SECULLUM STYLE */}
      <aside className="w-full md:w-72 bg-secullum-dark dark:bg-slate-950 text-white flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0 overflow-y-auto z-20 shadow-2xl">
        <div className="p-6 bg-opacity-20 bg-black">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
              <div className="bg-white p-1.5 rounded-lg shadow-lg">
                 <Bot size={20} className="text-secullum-blue" />
              </div>
              FAQ Manager
            </h1>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-white/10 text-white hover:text-secullum-green hover:bg-white/20 transition-colors backdrop-blur-sm"
              title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          
          {/* NAVIGATION */}
          <nav className="space-y-2">
            <button 
              onClick={() => setCurrentView('list')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border-l-4 ${currentView === 'list' 
                ? 'bg-white/10 border-secullum-green text-white shadow-inner' 
                : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <List size={18} />
              Base de Conhecimento
            </button>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border-l-4 ${currentView === 'dashboard' 
                ? 'bg-white/10 border-secullum-green text-white shadow-inner' 
                : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
          </nav>
        </div>

        {/* DATABASE STATUS INDICATOR */}
        <div className="px-6 py-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/40 rounded-lg border border-emerald-800 text-emerald-400 text-xs font-bold shadow-inner">
                <Database size={14} className="animate-pulse" />
                <span>Banco de Dados: Ativo</span>
            </div>
        </div>

        {/* FILTERS SECTION */}
        {currentView === 'list' && (
          <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filtros Avançados</h3>
              <button 
                onClick={clearFilters}
                className="text-xs text-secullum-green hover:text-green-300 flex items-center gap-1 transition-colors font-semibold"
              >
                <RotateCcw size={10} /> Limpar
              </button>
            </div>

            <div className="space-y-4">
               {/* FAVORITES FILTER */}
               <button 
                onClick={() => setFilters(prev => ({...prev, favorites: !prev.favorites}))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                    filters.favorites 
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
               >
                  <span className="flex items-center gap-2 font-bold"><Star size={16} className={filters.favorites ? "fill-yellow-500" : ""} /> Apenas Favoritos</span>
                  {filters.favorites && <CheckCircle size={14} />}
               </button>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Buscar (Tudo)</label>
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    placeholder="Busque PF, ID, texto, notas..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-secullum-green focus:border-transparent transition-all"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Status de Revisão</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green focus:border-transparent"
                  value={filters.needsUpdate === null ? 'all' : filters.needsUpdate.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters(prev => ({ ...prev, needsUpdate: val === 'all' ? null : val === 'true' }));
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="true">Requer Atualização</option>
                  <option value="false">Atualizado (OK)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Sistema</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green focus:border-transparent"
                  value={filters.system}
                  onChange={(e) => setFilters(prev => ({ ...prev, system: e.target.value as SystemType }))}
                >
                  <option value="">Todos</option>
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Categoria</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green focus:border-transparent"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as CategoryType }))}
                >
                  <option value="">Todas</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tipo</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green focus:border-transparent"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as PType }))}
                >
                  <option value="">Todos</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* NEW EXPORT BUTTON FOR REPORTS */}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                <button 
                  onClick={handleExportExcel}
                  className="w-full bg-secullum-green hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                >
                    <FileSpreadsheet size={18} />
                    Exportar Relatório (XLS)
                </button>
                 <button 
                  onClick={handleExportPDF}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/10"
                >
                    <Printer size={18} />
                    Gerar PDF por Sistema
                </button>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-black/20 border-t border-white/5 space-y-2">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors border border-white/5 mb-4"
            >
                <Settings size={14} /> Configurações
            </button>
            <button 
                onClick={handleExportJSON}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors border border-white/5"
            >
                <Download size={14} /> Backup (JSON)
            </button>
            <button 
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors border border-white/5"
            >
                <Upload size={14} /> Importar (JSON)
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
            />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 h-screen overflow-y-auto transition-colors ${darkMode ? 'bg-slate-900' : 'bg-gray-100'} relative`}>
        
        {/* BULK ACTIONS FLOATING BAR */}
        {selectedIds.size > 0 && (
            <div className="absolute top-4 left-0 right-0 mx-auto w-[90%] md:w-[600px] z-40 bg-secullum-dark text-white rounded-xl shadow-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4 border border-white/10">
                <div className="flex items-center gap-3">
                    <span className="bg-white/10 px-3 py-1 rounded-md font-bold text-sm">{selectedIds.size} selecionado(s)</span>
                    <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-300 hover:text-white underline">Limpar seleção</button>
                </div>
                <button 
                    onClick={handleBulkDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
                >
                    <Trash2 size={18} /> Excluir Selecionados
                </button>
            </div>
        )}

        {currentView === 'dashboard' && <Dashboard items={items} />}

        {currentView === 'list' && (
          <div className="p-6 md:p-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto min-h-screen flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold text-secullum-blue dark:text-white tracking-tight flex items-center gap-2">
                  <Hash className="text-secullum-green" size={24} />
                  Perguntas Frequentes
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    <span className="bg-secullum-light dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-mono text-secullum-blue dark:text-secullum-light">{filteredItems.length}</span>
                    <span>itens encontrados na base</span>
                </div>
              </div>

              {/* VIEW TOGGLE AND ADD BUTTONS */}
              <div className="flex gap-3">
                <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex items-center border border-gray-200 dark:border-slate-600">
                    <button 
                        onClick={() => setListViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${listViewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-secullum-blue dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Visualização em Grade"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button 
                        onClick={() => setListViewMode('table')}
                        className={`p-2 rounded-md transition-all ${listViewMode === 'table' ? 'bg-white dark:bg-slate-600 text-secullum-blue dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Visualização em Lista (Tabela)"
                    >
                        <TableIcon size={20} />
                    </button>
                    <button 
                        onClick={() => setListViewMode('board')}
                        className={`p-2 rounded-md transition-all ${listViewMode === 'board' ? 'bg-white dark:bg-slate-600 text-secullum-blue dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Visualização em Quadro (Sistemas)"
                    >
                        <Columns size={20} />
                    </button>
                    
                    {/* View All Toggle (Grid Only) */}
                    {listViewMode === 'grid' && (
                         <div className="w-px h-6 bg-gray-300 dark:bg-slate-500 mx-1"></div>
                    )}
                    {listViewMode === 'grid' && (
                        <button 
                            onClick={() => setViewAllMode(!viewAllMode)}
                            className={`p-2 rounded-md transition-all ${viewAllMode ? 'bg-secullum-green text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title={viewAllMode ? "Modo Paginado" : "Ver Tudo (Rolagem Infinita)"}
                        >
                            {viewAllMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                    )}
                </div>

                <button
                    onClick={handleOpenQuickAdd}
                    className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-sky-900/20 transition-all hover:scale-105 active:scale-95 font-bold whitespace-nowrap"
                    title="Adicionar rapidamente apenas com campos essenciais"
                >
                    <Zap size={20} />
                    Rápido
                </button>

                <button
                    onClick={() => handleOpenModal()}
                    className="bg-secullum-blue hover:bg-secullum-dark text-white px-5 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 font-bold whitespace-nowrap"
                >
                    <Plus size={20} />
                    Nova Pergunta
                </button>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <div className="mx-auto h-20 w-20 bg-gray-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nenhum item encontrado</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">Não encontramos nada com os filtros atuais. Verifique o número da PF ou os filtros selecionados.</p>
                <button onClick={clearFilters} className="mt-6 text-secullum-blue dark:text-blue-400 hover:underline font-bold flex items-center justify-center gap-2 mx-auto">
                    <RotateCcw size={16}/> Limpar Filtros
                </button>
              </div>
            ) : (
              <>
              {/* TABLE VIEW */}
              {listViewMode === 'table' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secullum-dark text-white text-xs uppercase tracking-wider">
                                    <th className="p-4 w-12 text-center">
                                         <button onClick={selectAllVisible} className="hover:text-gray-300">
                                            {selectedIds.size > 0 && selectedIds.size === displayedItems.length ? <CheckSquare size={20} /> : <Square size={20} />}
                                         </button>
                                    </th>
                                    <th className="p-4 w-20 text-center">Status</th>
                                    <th className="p-4 w-24">PF #</th>
                                    <th className="p-4">Pergunta</th>
                                    <th className="p-4 w-48">Sistema</th>
                                    <th className="p-4 w-32">Categoria</th>
                                    <th className="p-4 w-32">Tipo</th>
                                    <th className="p-4 w-24 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {displayedItems.map(item => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleOpenModal(item)}
                                        className={`cursor-pointer transition-colors group text-sm text-gray-700 dark:text-gray-300 ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={(e) => toggleSelection(item.id, e)} 
                                                className={`transition-colors ${selectedIds.has(item.id) ? 'text-secullum-blue' : 'text-gray-300 hover:text-gray-500'}`}
                                            >
                                                {selectedIds.has(item.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>
                                        </td>
                                        <td className="p-4 text-center">
                                            {item.needsUpdate ? (
                                                <div className="flex justify-center" title="Requer Atualização">
                                                    <CalendarClock size={18} className="text-rose-500" />
                                                </div>
                                            ) : (
                                                <div className="flex justify-center" title="Atualizado">
                                                    <CheckCircle size={18} className="text-secullum-green" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-secullum-blue dark:text-blue-300">
                                            {item.pfNumber}
                                        </td>
                                        <td className="p-4 font-medium max-w-lg truncate">
                                            {item.question}
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">
                                                {item.system}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {item.category}
                                        </td>
                                        <td className="p-4">
                                            {item.type}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button 
                                                    onClick={(e) => handleDelete(item.id, e)} 
                                                    className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-500 rounded transition-colors z-20 relative"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}

              {/* GRID VIEW */}
              {listViewMode === 'grid' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6">
                    {displayedItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleOpenModal(item)}
                        className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-2xl transition-all duration-300 p-0 flex flex-col h-full group cursor-pointer overflow-hidden relative ${
                            selectedIds.has(item.id) 
                            ? 'border-secullum-blue ring-2 ring-secullum-blue/20 dark:border-blue-500' 
                            : 'border-gray-200 dark:border-slate-700 hover:border-secullum-blue/30 dark:hover:border-blue-500/30'
                        }`}
                      >
                        {/* SELECTION CHECKBOX (Top Left) */}
                        <div className="absolute top-3 left-3 z-30">
                             <button 
                                onClick={(e) => toggleSelection(item.id, e)}
                                className={`p-1 rounded bg-white dark:bg-slate-800 shadow-sm transition-all ${
                                    selectedIds.has(item.id) 
                                    ? 'text-secullum-blue opacity-100' 
                                    : 'text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100'
                                }`}
                             >
                                 {selectedIds.has(item.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                             </button>
                        </div>

                        {/* FAVORITE STAR (Top Right) */}
                        <div className="absolute top-3 right-3 z-30">
                            <button 
                                onClick={(e) => handleToggleFavorite(item.id, e)}
                                className={`p-1.5 rounded-full transition-all hover:scale-110 shadow-sm ${
                                    item.isFavorite 
                                    ? 'text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' 
                                    : 'text-gray-300 hover:text-yellow-400 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700'
                                }`}
                                title={item.isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                            >
                                <Star size={20} className={item.isFavorite ? "fill-yellow-400" : ""} />
                            </button>
                        </div>

                        {/* Status Strip */}
                        <div className={`h-1.5 w-full ${item.needsUpdate ? 'bg-rose-500' : 'bg-secullum-green'}`}></div>

                        <div className="p-6 flex flex-col h-full">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 pl-8 pr-8">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-extrabold bg-secullum-light dark:bg-slate-700 text-secullum-blue dark:text-blue-200 px-2.5 py-1 rounded border border-blue-100 dark:border-slate-600">
                                PF {item.pfNumber}
                                </span>
                                {item.isReusable && (
                                    <div className="flex items-center text-sky-600 dark:text-sky-400 text-xs font-bold bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded border border-sky-100 dark:border-sky-800" title="Conteúdo Reutilizável">
                                        <RefreshCw size={12} className="mr-1" /> Reutilizável
                                    </div>
                                )}
                                {item.hasVideo && (
                                    <div className="flex items-center text-purple-600 dark:text-purple-400 text-xs font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-100 dark:border-purple-800" title="Possui Vídeo">
                                        <PlayCircle size={12} className="mr-1 fill-purple-600/10" /> Vídeo
                                    </div>
                                )}
                                {item.needsUpdate && (
                                <div className="flex items-center text-rose-600 dark:text-rose-400 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full border border-rose-100 dark:border-rose-800 animate-pulse">
                                    <CalendarClock size={12} className="mr-1" />
                                    Requer Atualização
                                </div>
                                )}
                            </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 leading-snug group-hover:text-secullum-blue dark:group-hover:text-blue-400 transition-colors">
                            {item.question}
                            </h3>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-5">
                            <Badge color="blue">{item.system}</Badge>
                            <Badge color="purple">{item.category}</Badge>
                            <Badge color="gray">{item.type}</Badge>
                            </div>

                            {/* AI Summary Preview */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-4 flex-grow text-sm text-gray-600 dark:text-gray-300 border border-slate-100 dark:border-slate-700 relative">
                            <div className="flex items-center gap-1.5 mb-2 text-secullum-blue dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                                <Bot size={14} /> Resumo Inteligente
                            </div>
                            {item.summary ? (
                                <p className="line-clamp-3 leading-relaxed">{item.summary}</p>
                            ) : (
                                <p className="text-gray-400 dark:text-gray-500 italic">Nenhum resumo gerado.</p>
                            )}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center pt-2 mt-auto">
                            <div className="flex items-center gap-4">
                                {item.url && (
                                    <a 
                                        href={item.url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs font-bold text-secullum-blue dark:text-blue-400 hover:text-secullum-dark dark:hover:text-blue-200 flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded z-10"
                                    >
                                    <ExternalLink size={12} /> Link Original
                                    </a>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {/* Updated Button */}
                                {item.needsUpdate && (
                                    <button 
                                        onClick={(e) => handleMarkUpdated(item, e)}
                                        className="p-2 hover:bg-green-50 dark:hover:bg-emerald-900/30 text-secullum-green dark:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-green-100 z-10"
                                        title="Marcar como Atualizada"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                )}

                                {/* Delete Button - Explicit Z-Index and StopPropagation */}
                                <button 
                                    onClick={(e) => handleDelete(item.id, e)} 
                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-rose-100 z-50 relative" 
                                    title="Excluir PF"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
              )}

              {/* BOARD (KANBAN) VIEW */}
              {listViewMode === 'board' && (
                <div className="flex gap-6 overflow-x-auto pb-6 h-full min-h-[500px] items-start">
                    {systems.map(system => {
                    const systemItems = filteredItems.filter(i => i.system === system);
                    if (systemItems.length === 0) return null;

                    return (
                        <div key={system} className="min-w-[320px] w-[320px] flex-shrink-0 flex flex-col max-h-full bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-gray-50 dark:bg-slate-800/50 rounded-t-xl z-10 backdrop-blur-sm">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate pr-2" title={system}>{system}</h3>
                            <span className="bg-white dark:bg-slate-700 text-secullum-blue dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{systemItems.length}</span>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(100vh-300px)]">
                            {systemItems.map(item => (
                                <div key={item.id} onClick={() => handleOpenModal(item)} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-[10px] font-bold text-gray-400">#{item.pfNumber}</span>
                                        <div className={`w-2 h-2 rounded-full ${item.needsUpdate ? 'bg-rose-500' : 'bg-secullum-green'}`}></div>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-3 mb-2 leading-relaxed">{item.question}</h4>
                                    <div className="flex gap-1 flex-wrap mb-2">
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-500 border border-slate-200 dark:border-slate-600">{item.category}</span>
                                        {item.type && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-500 border border-slate-200 dark:border-slate-600 truncate max-w-[150px]">{item.type}</span>}
                                    </div>
                                    
                                    {/* Action Buttons Overlay for Board Card */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 rounded-md shadow-sm p-1 border border-gray-100 dark:border-slate-700 z-50">
                                         {item.needsUpdate && (
                                            <button 
                                                onClick={(e) => handleMarkUpdated(item, e)}
                                                className="p-1 hover:bg-green-50 dark:hover:bg-emerald-900/30 text-secullum-green dark:text-emerald-400 rounded transition-colors"
                                                title="Marcar como Atualizada"
                                            >
                                                <CheckCircle size={14} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </div>
                    )
                    })}
                </div>
              )}
              
              {/* PAGINATION CONTROLS (Hide in Board View or if View All is active) */}
              {listViewMode !== 'board' && !viewAllMode && (
                <div className="py-6 flex justify-center items-center gap-4 mt-auto">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-bold text-secullum-dark dark:text-white">
                        Página <span className="text-secullum-blue dark:text-blue-400">{currentPage}</span> de {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
              )}
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL FORM (Full) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? `Editar PF #${editingItem.pfNumber}` : 'Nova PF'}
      >
        <div className="flex gap-8 flex-col lg:flex-row h-full">
            
            {/* MAIN FORM COLUMN */}
            <div className="flex-1 space-y-6">
                {/* Top Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">Número da PF</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400 font-bold">#</span>
                        <input
                            type="text"
                            className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2.5 pl-8 focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white transition-all font-mono font-bold text-lg"
                            value={formData.pfNumber}
                            onChange={(e) => setFormData({ ...formData, pfNumber: e.target.value })}
                            placeholder="000"
                        />
                    </div>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">Link (URL)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="url"
                                className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2.5 pl-10 focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white transition-all text-sm"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://www.secullum.com.br/pf?id=..."
                            />
                            <ExternalLink className="absolute left-3 top-3 text-slate-400" size={16} />
                        </div>
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">Pergunta / Título</label>
                    <input
                    type="text"
                    className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-3 focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white font-bold text-xl transition-all shadow-sm"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Digite o título da dúvida..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">Sistema</label>
                    <select
                        className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white text-sm"
                        value={formData.system}
                        onChange={(e) => setFormData({ ...formData, system: e.target.value as SystemType })}
                    >
                        {systems.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">Categoria</label>
                    <select
                        className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white text-sm"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">Tipo</label>
                    <select
                        className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white text-sm"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as PType })}
                    >
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    </div>
                </div>

                {/* AI Content Section */}
                <div className="bg-secullum-light dark:bg-slate-800 p-6 rounded-xl border border-blue-100 dark:border-slate-700 shadow-inner">
                    <label className="block text-sm font-bold text-secullum-blue dark:text-blue-300 mb-3 flex items-center gap-2">
                    <Bot size={20} className="text-secullum-blue dark:text-blue-400" /> 
                    Gerar Resumo com IA
                    </label>
                    <textarea
                    className="w-full border-blue-200 dark:border-slate-600 rounded-lg p-4 h-32 text-sm focus:ring-secullum-blue border bg-white dark:bg-slate-700 dark:text-white mb-4 placeholder-slate-400"
                    placeholder="Cole o texto completo da PF aqui para que a inteligência artificial possa processar..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                    <button 
                        onClick={handleGenerateSummary}
                        disabled={isGenerating || !formData.content}
                        className="w-full bg-secullum-blue hover:bg-secullum-dark disabled:bg-slate-400 text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md font-bold"
                    >
                        {isGenerating ? (
                        <><Loader2 size={16} className="animate-spin" /> Processando Inteligência...</>
                        ) : (
                        <>Gerar Resumo Inteligente</>
                        )}
                    </button>
                </div>

                 <div>
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                        Resumo Final
                    </label>
                    <textarea
                        className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-4 h-32 text-sm focus:ring-secullum-green border bg-white dark:bg-slate-700 dark:text-white leading-relaxed"
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        placeholder="O resumo gerado ou editado aparecerá aqui..."
                    />
                 </div>
            </div>

            {/* SIDE COLUMN (Notes + History + Actions) */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
                
                {/* Status Toggle Card */}
                <div 
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer transform hover:scale-102 ${
                        formData.needsUpdate 
                        ? 'bg-white border-rose-500 shadow-md shadow-rose-100 dark:bg-slate-800 dark:shadow-none' 
                        : 'bg-white border-secullum-green shadow-md shadow-green-100 dark:bg-slate-800 dark:shadow-none'
                    }`}
                    onClick={() => setFormData({ ...formData, needsUpdate: !formData.needsUpdate })}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${formData.needsUpdate ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-secullum-green'}`}>
                            {formData.needsUpdate ? <CalendarClock size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <div>
                            <h4 className={`text-base font-extrabold ${formData.needsUpdate ? 'text-rose-600' : 'text-secullum-green'}`}>
                                {formData.needsUpdate ? 'Requer Revisão' : 'Atualizado'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Clique para alterar</p>
                        </div>
                    </div>
                </div>

                {/* Reusable Toggle Card */}
                <div 
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer transform hover:scale-102 ${
                        formData.isReusable 
                        ? 'bg-sky-50 border-sky-500 shadow-md shadow-sky-100 dark:bg-slate-800 dark:border-sky-500' 
                        : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                    onClick={() => setFormData({ ...formData, isReusable: !formData.isReusable })}
                >
                    <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-full ${formData.isReusable ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-400 dark:bg-slate-700'}`}>
                            <RefreshCw size={24} />
                        </div>
                        <div>
                             <h4 className={`text-base font-extrabold ${formData.isReusable ? 'text-sky-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                {formData.isReusable ? 'Conteúdo Reutilizável' : 'Uso Único'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Clique para alterar</p>
                        </div>
                    </div>
                </div>

                {/* Video Toggle Card */}
                <div 
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer transform hover:scale-102 ${
                        formData.hasVideo 
                        ? 'bg-purple-50 border-purple-500 shadow-md shadow-purple-100 dark:bg-slate-800 dark:border-purple-500' 
                        : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                    onClick={() => setFormData({ ...formData, hasVideo: !formData.hasVideo })}
                >
                    <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-full ${formData.hasVideo ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400 dark:bg-slate-700'}`}>
                            <PlayCircle size={24} />
                        </div>
                        <div>
                             <h4 className={`text-base font-extrabold ${formData.hasVideo ? 'text-purple-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                {formData.hasVideo ? 'Possui Vídeo Explicativo' : 'Sem Vídeo'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Clique para alterar</p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-secullum-light/50 dark:bg-slate-800/50 p-4 rounded-xl border border-secullum-blue/10 dark:border-slate-700">
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                         <StickyNote size={14} className="text-yellow-500" /> Anotações Privadas
                    </label>
                    <div className="relative">
                        <textarea
                            className="w-full rounded-xl p-4 h-32 text-sm focus:ring-secullum-green border-2 bg-white border-blue-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder-slate-400"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Ex: Verificar versão do firmware..."
                        />
                        <div className="absolute top-3 right-3 text-secullum-blue/30">
                            <FileText size={16} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-4 mt-auto">
                    <div className="flex gap-3">
                         <button
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="flex-[2] px-4 py-3.5 bg-secullum-green hover:bg-green-600 disabled:opacity-70 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all text-sm transform active:scale-95"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                            Salvar Alterações
                        </button>
                    </div>
                    
                    {/* Explicit Delete Button in Modal */}
                    {editingItem && (
                         <button 
                            onClick={() => handleDelete(editingItem.id)}
                            className="w-full py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-rose-100"
                        >
                            <Trash2 size={16} /> Excluir esta PF
                        </button>
                    )}
                </div>
            </div>

        </div>
      </Modal>

      {/* QUICK ADD MODAL */}
       {isQuickAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg transition-colors border border-gray-200 dark:border-slate-800 p-6">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Zap size={24} className="text-yellow-500" /> Cadastro Rápido
                 </h2>
                 <button onClick={() => setIsQuickAddOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"><X size={20}/></button>
               </div>
               
               <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-1.5">PF #</label>
                             <input
                                type="text"
                                className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-secullum-green border bg-white dark:bg-slate-800 dark:text-white font-mono font-bold"
                                value={formData.pfNumber}
                                onChange={(e) => setFormData({ ...formData, pfNumber: e.target.value })}
                                placeholder="000"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-1.5">Categoria</label>
                             <select
                                className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-secullum-green border bg-white dark:bg-slate-800 dark:text-white text-sm"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-1.5">Pergunta</label>
                        <input
                            type="text"
                            className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-secullum-green border bg-white dark:bg-slate-800 dark:text-white font-bold"
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            placeholder="Título da PF"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-1.5">Sistema</label>
                             <select
                                className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-secullum-green border bg-white dark:bg-slate-800 dark:text-white text-sm"
                                value={formData.system}
                                onChange={(e) => setFormData({ ...formData, system: e.target.value as SystemType })}
                            >
                                {systems.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-1.5">Tipo</label>
                             <select
                                className="w-full border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-secullum-green border bg-white dark:bg-slate-800 dark:text-white text-sm"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as PType })}
                            >
                                {types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
               </div>

               <div className="mt-8 flex gap-3">
                   <button onClick={() => setIsQuickAddOpen(false)} className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
                   <button onClick={() => handleSave(true)} className="flex-[2] py-2.5 bg-secullum-green text-white font-bold rounded-lg hover:bg-green-600 shadow-lg">Salvar Rápido</button>
               </div>
            </div>
          </div>
       )}

       {/* SETTINGS MODAL */}
       {isSettingsOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-colors border border-gray-200 dark:border-slate-800 overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Settings size={22} /> Configurações de Listas</h2>
                        <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"><X size={24}/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar">
                        {/* SYSTEMS CONFIG */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-secullum-blue dark:text-blue-300 uppercase text-xs tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2">Gerenciar Sistemas</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-sm dark:text-white"
                                    placeholder="Novo Sistema..."
                                    value={newSystemName}
                                    onChange={(e) => setNewSystemName(e.target.value)}
                                />
                                <button onClick={handleAddSystem} className="bg-secullum-blue text-white px-3 py-2 rounded-md hover:bg-blue-700"><Plus size={18}/></button>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {systems.map(s => (
                                    <div key={s} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded shadow-sm group">
                                        <span className="text-sm dark:text-gray-300">{s}</span>
                                        <button onClick={() => handleRemoveSystem(s)} className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TYPES CONFIG */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-secullum-blue dark:text-blue-300 uppercase text-xs tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2">Gerenciar Tipos</h3>
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-sm dark:text-white"
                                    placeholder="Novo Tipo..."
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                />
                                <button onClick={handleAddType} className="bg-secullum-blue text-white px-3 py-2 rounded-md hover:bg-blue-700"><Plus size={18}/></button>
                            </div>
                             <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {types.map(t => (
                                    <div key={t} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded shadow-sm group">
                                        <span className="text-sm dark:text-gray-300">{t}</span>
                                        <button onClick={() => handleRemoveType(t)} className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
               </div>
           </div>
       )}

    </div>
  );
};

export default App;