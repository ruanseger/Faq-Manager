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
  FileSpreadsheet
} from 'lucide-react';

import { FAQItem, FilterState, SystemType, CategoryType, PType, HistoryEntry } from './types';
import { SYSTEMS, CATEGORIES, TYPES } from './constants';
import { summarizeFAQContent, generateSmartId } from './services/geminiService';
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
    const saved = localStorage.getItem('secullum-faq-items');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
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
  const [listViewMode, setListViewMode] = useState<'grid' | 'table'>('grid'); // New: Toggle between Grid and Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    system: '',
    category: '',
    type: '',
    needsUpdate: null,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    history: []
  });

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('secullum-faq-items', JSON.stringify(items));
  }, [items]);

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
  }, [filters]);

  // --- DERIVED ---
  const filteredItems = useMemo(() => {
    const searchLower = filters.search.toLowerCase();
    return items.filter((item) => {
      const matchesSearch = 
        item.pfNumber.toLowerCase().includes(searchLower) || 
        item.question.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower);
      
      const matchesSystem = filters.system ? item.system === filters.system : true;
      const matchesCategory = filters.category ? item.category === filters.category : true;
      const matchesType = filters.type ? item.type === filters.type : true;
      const matchesUpdate = filters.needsUpdate !== null ? item.needsUpdate === filters.needsUpdate : true;

      return matchesSearch && matchesSystem && matchesCategory && matchesType && matchesUpdate;
    });
  }, [items, filters]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

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
        system: 'Secullum Ponto Web',
        category: 'Suporte',
        type: 'Erro',
        notes: '',
        needsUpdate: false,
        summary: '',
        history: []
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    // Explicitly prevent default browser behavior and bubbling
    e.preventDefault();
    e.stopPropagation(); 
    
    // Use a small timeout to ensure UI events clear if needed, though usually not strictly necessary with React
    if (window.confirm('Atenção: Tem certeza que deseja excluir esta PF permanentemente?')) {
      setItems(prev => prev.filter(i => i.id !== id));
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

  const handleSave = async () => {
    if (!formData.pfNumber || !formData.question) {
      alert('Por favor, preencha o número da PF e a pergunta.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingItem) {
        // Edit Mode
        const updatedItem = { ...formData } as FAQItem;
        
        // Add log if marked as needing update
        if (updatedItem.needsUpdate && !editingItem.needsUpdate) {
             updatedItem.history = [{ date: Date.now(), action: 'Solicitada Revisão' }, ...(updatedItem.history || [])];
        } else if (updatedItem.needsUpdate !== editingItem.needsUpdate) {
             updatedItem.history = [{ date: Date.now(), action: 'Status de Revisão Alterado' }, ...(updatedItem.history || [])];
        }

        // Add log if summary changed
        if (updatedItem.summary !== editingItem.summary) {
            updatedItem.history = [{ date: Date.now(), action: 'Resumo Editado' }, ...(updatedItem.history || [])];
        }

        setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      } else {
        // New Mode
        const smartId = await generateSmartId(formData.pfNumber, formData.question);
        
        const newItem: FAQItem = {
          ...formData as FAQItem,
          id: smartId,
          createdAt: Date.now(),
          summary: formData.summary || '',
          history: [{ date: Date.now(), action: 'PF Criada' }]
        };
        setItems(prev => [newItem, ...prev]);
      }
      setIsModalOpen(false);
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

  // --- EXPORT / IMPORT ---

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
    // Define headers
    const headers = ['ID Interno', 'Número PF', 'Pergunta', 'Sistema', 'Categoria', 'Tipo', 'Status', 'Link', 'Data Criação'];
    
    // Map items to CSV rows (using current filters)
    const rows = filteredItems.map(item => [
      item.id,
      item.pfNumber,
      `"${item.question.replace(/"/g, '""')}"`, // Escape quotes
      item.system,
      item.category,
      item.type,
      item.needsUpdate ? 'Requer Atualização' : 'Atualizado',
      item.url,
      new Date(item.createdAt).toLocaleDateString('pt-BR')
    ]);

    // Construct CSV content with BOM for Excel to read accents correctly
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
    // Reset input
    if (event.target) event.target.value = '';
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      system: '',
      category: '',
      type: '',
      needsUpdate: null,
    });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    // Explicitly set background colors here to ensure toggle works
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
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Buscar (PF, ID ou Texto)</label>
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    placeholder="Ex: 685, Erro..."
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
                  {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* NEW EXPORT BUTTON FOR REPORTS */}
            <div className="pt-4 mt-4 border-t border-white/10">
                <button 
                  onClick={handleExportExcel}
                  className="w-full bg-secullum-green hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                >
                    <FileSpreadsheet size={18} />
                    Exportar Relatório (XLS)
                </button>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-black/20 border-t border-white/5 space-y-2">
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
      <main className={`flex-1 h-screen overflow-y-auto transition-colors ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
        
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

              {/* VIEW TOGGLE AND ADD BUTTON */}
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
                </div>

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
                                {paginatedItems.map(item => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleOpenModal(item)}
                                        className="hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <td className="p-4 text-center">
                                            {item.needsUpdate ? (
                                                <div className="flex justify-center" title="Requer Atualização">
                                                    <AlertCircle size={18} className="text-rose-500" />
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
                                                    className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-500 rounded transition-colors"
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
                    {paginatedItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleOpenModal(item)}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-secullum-blue/30 dark:hover:border-blue-500/30 transition-all duration-300 p-0 flex flex-col h-full group cursor-pointer overflow-hidden relative"
                      >
                        {/* Status Strip */}
                        <div className={`h-1.5 w-full ${item.needsUpdate ? 'bg-rose-500' : 'bg-secullum-green'}`}></div>

                        <div className="p-6 flex flex-col h-full">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-extrabold bg-secullum-light dark:bg-slate-700 text-secullum-blue dark:text-blue-200 px-2.5 py-1 rounded border border-blue-100 dark:border-slate-600">
                                PF {item.pfNumber}
                                </span>
                                {item.needsUpdate && (
                                <div className="flex items-center text-rose-600 dark:text-rose-400 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full border border-rose-100 dark:border-rose-800 animate-pulse">
                                    <AlertCircle size={12} className="mr-1" />
                                    Revisar
                                </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                                {/* Updated Button */}
                                {item.needsUpdate && (
                                    <button 
                                        onClick={(e) => handleMarkUpdated(item, e)}
                                        className="p-2 hover:bg-green-50 dark:hover:bg-emerald-900/30 text-secullum-green dark:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                        title="Marcar como Atualizada (Salvar Log)"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                )}

                                {/* Delete Button */}
                                <button 
                                    onClick={(e) => handleDelete(item.id, e)} 
                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-rose-100 z-10" 
                                    title="Excluir PF Permanentemente"
                                >
                                    <Trash2 size={20} />
                                </button>
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
                                        className="text-xs font-bold text-secullum-blue dark:text-blue-400 hover:text-secullum-dark dark:hover:text-blue-200 flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                                    >
                                    <ExternalLink size={12} /> Link Original
                                    </a>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                {item.history && item.history.length > 0 && (
                                    <span className="flex items-center gap-1" title={`Última ação: ${item.history[0].action}`}>
                                        <Clock size={12} /> {formatDate(item.history[0].date).split(' ')[0]}
                                    </span>
                                )}
                                {item.notes && <span className="text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">★ Notas</span>}
                            </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
              )}
              
              {/* PAGINATION CONTROLS */}
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
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL FORM */}
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
                    <div className="relative">
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
                        {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
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
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                            {formData.needsUpdate ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <div>
                            <h4 className={`text-base font-extrabold ${formData.needsUpdate ? 'text-rose-600' : 'text-secullum-green'}`}>
                                {formData.needsUpdate ? 'Requer Revisão' : 'Atualizado'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Clique para alterar</p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-secullum-light/50 dark:bg-slate-800/50 p-4 rounded-xl border border-secullum-blue/10 dark:border-slate-700">
                    <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-2">
                        Anotações Privadas
                    </label>
                    <div className="relative">
                        <textarea
                            className="w-full rounded-xl p-4 h-48 text-sm focus:ring-secullum-green border-2 bg-white border-blue-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder-slate-400"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Ex: Verificar versão do firmware..."
                        />
                        <div className="absolute top-3 right-3 text-secullum-blue/30">
                            <FileText size={16} />
                        </div>
                    </div>
                </div>

                {/* Timeline History */}
                {editingItem && (
                    <div className="flex-1 min-h-[150px] bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                        <label className="block text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <History size={14} /> Linha do Tempo
                        </label>
                        <div className="relative border-l-2 border-secullum-blue/20 dark:border-slate-600 ml-3 space-y-6">
                            {formData.history && formData.history.length > 0 ? (
                                formData.history.map((log, idx) => (
                                    <div key={idx} className="relative pl-6">
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-secullum-green dark:bg-green-500 border-2 border-white dark:border-slate-800"></div>
                                        <p className="text-xs text-slate-400 font-mono mb-0.5">{formatDate(log.date)}</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{log.action}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="relative pl-6">
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                    <p className="text-xs text-slate-400 italic">Nenhum registro.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 mt-auto">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-4 py-3.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-[2] px-4 py-3.5 bg-secullum-green hover:bg-green-600 disabled:opacity-70 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all text-sm transform active:scale-95"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                        Salvar Alterações
                    </button>
                </div>
            </div>

        </div>
      </Modal>

    </div>
  );
};

export default App;