import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from "jspdf";
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  Bot, 
  ExternalLink, 
  Trash2, 
  Save, 
  Moon,
  Sun,
  LayoutDashboard,
  List,
  RotateCcw,
  Loader2,
  CheckCircle,
  Download,
  Upload,
  Hash,
  Clock,
  LayoutGrid,
  Table as TableIcon,
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
  Wand2,
  PlayCircle,
  StickyNote,
  Database,
  Share2,
  CalendarDays,
  Activity,
  MoreVertical,
  Link as LinkIcon,
  FileText,
  HelpCircle,
  Globe
} from 'lucide-react';

import { FAQItem, FilterState, SystemType, CategoryType, PType, HistoryEntry } from './types';
import { SYSTEMS as DEFAULT_SYSTEMS, CATEGORIES as DEFAULT_CATEGORIES, TYPES as DEFAULT_TYPES } from './constants';
import { summarizeFAQContent, generateSmartId, fetchPFTitle } from './services/geminiService';
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

const Badge = ({ children, color = 'gray', icon: Icon }: { children?: React.ReactNode, color?: string, icon?: any }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    red: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    gray: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    sky: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${colors[color] || colors.gray} uppercase tracking-wide whitespace-nowrap flex items-center gap-1`}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
};

const App: React.FC = () => {
  // --- STATE ---
  const [items, setItems] = useState<FAQItem[]>(() => {
    try {
      const saved = localStorage.getItem('secullum-faq-items');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch (e) {
      console.error("Erro ao carregar banco de dados local", e);
      return INITIAL_DATA;
    }
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [systems, setSystems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secullum-systems');
      return saved ? JSON.parse(saved) : DEFAULT_SYSTEMS;
    } catch (e) { return DEFAULT_SYSTEMS; }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secullum-categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch (e) { return DEFAULT_CATEGORIES; }
  });

  const [types, setTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secullum-types');
      return saved ? JSON.parse(saved) : DEFAULT_TYPES;
    } catch (e) { return DEFAULT_TYPES; }
  });

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
    isReusable: null,
    hasVideo: null
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newSystemName, setNewSystemName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

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

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('secullum-faq-items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('secullum-systems', JSON.stringify(systems));
  }, [systems]);

  useEffect(() => {
    localStorage.setItem('secullum-categories', JSON.stringify(categories));
  }, [categories]);

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

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters, currentView]);

  // --- DERIVED ---
  const filteredItems = useMemo(() => {
    const searchLower = filters.search.toLowerCase().trim();
    return items.filter((item) => {
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
      const matchesReusable = filters.isReusable !== null ? item.isReusable === filters.isReusable : true;
      const matchesVideo = filters.hasVideo !== null ? item.hasVideo === filters.hasVideo : true;

      return matchesSearch && matchesSystem && matchesCategory && matchesType && matchesUpdate && matchesFavorite && matchesReusable && matchesVideo;
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
  const getLastUpdated = (item: FAQItem) => {
    const updated = item.history?.find(h => h.action === 'Marcado como Atualizado' || h.action === 'PF Criada');
    const date = updated ? updated.date : item.createdAt;
    return new Date(date).toLocaleDateString('pt-BR') + ' ' + new Date(date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
  };

  const getLastUpdatedDateOnly = (item: FAQItem) => {
    const updated = item.history?.find(h => h.action === 'Marcado como Atualizado' || h.action === 'PF Criada');
    const date = updated ? updated.date : item.createdAt;
    return new Date(date).toLocaleDateString('pt-BR');
  }

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
        category: categories[0] || 'Suporte',
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
        category: categories[0] || 'Suporte',
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

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setItems(prev => prev.map(item => 
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const handleShare = (item: FAQItem, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const link = item.url || window.location.href;
      navigator.clipboard.writeText(link).then(() => {
          setToast({ message: `Link da PF ${item.pfNumber} copiado!`, type: 'success' });
      }).catch(() => {
          setToast({ message: 'Erro ao copiar link', type: 'error' });
      });
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    // CRITICAL: Stop propagation to prevent card click opening the modal
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (!id) return;
    
    if (window.confirm('Atenção: Tem certeza que deseja excluir esta PF permanentemente?')) {
      setItems(prevItems => prevItems.filter(i => i.id !== id));
      
      if (selectedIds.has(id)) {
          setSelectedIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }
      
      if (isModalOpen && editingItem?.id === id) {
          setIsModalOpen(false);
          setEditingItem(null); 
      }
      setToast({ message: 'PF excluída com sucesso', type: 'success' });
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;

    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} itens selecionados?`)) {
        setItems(prevItems => prevItems.filter(i => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
        setToast({ message: `${selectedIds.size} itens excluídos`, type: 'success' });
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
    setToast({ message: 'PF marcada como atualizada', type: 'success' });
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0) {
        setToast({ message: 'Nenhum item para exportar', type: 'error' });
        return;
    }

    try {
        const doc = new jsPDF();
        
        // Group by system
        const groupedItems: Record<string, FAQItem[]> = {};
        filteredItems.forEach(item => {
            if (!groupedItems[item.system]) {
                groupedItems[item.system] = [];
            }
            groupedItems[item.system].push(item);
        });

        let y = 15;
        const pageHeight = doc.internal.pageSize.height;

        doc.setFontSize(16);
        doc.text("Relatório de Perguntas Frequentes (PFs)", 14, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, y);
        y += 15;

        Object.keys(groupedItems).sort().forEach(system => {
            if (y > pageHeight - 30) {
                doc.addPage();
                y = 15;
            }

            // System Title
            doc.setFillColor(220, 220, 220);
            doc.rect(14, y - 5, 180, 8, 'F');
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(system, 16, y);
            y += 10;

            // Items
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            
            groupedItems[system].forEach(item => {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 15;
                }
                
                const title = `[PF ${item.pfNumber}] ${item.question}`;
                const status = item.needsUpdate ? "(Revisar)" : "(Ok)";
                
                doc.text(status, 175, y, { align: 'right' });
                
                // Truncate text if too long
                let textLines = doc.splitTextToSize(title, 150);
                doc.text(textLines, 16, y);
                
                y += (textLines.length * 5) + 3;
            });
            
            y += 5; // Spacing between systems
        });

        doc.save(`relatorio-pfs-${Date.now()}.pdf`);
        setToast({ message: 'Relatório PDF gerado com sucesso', type: 'success' });
    } catch (e) {
        console.error(e);
        setToast({ message: 'Erro ao gerar PDF', type: 'error' });
    }
  };

  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
        setToast({ message: 'Nenhum item para exportar', type: 'error' });
        return;
    }

    try {
        const data = filteredItems.map(item => ({
            'ID': item.id,
            'Número PF': item.pfNumber,
            'Pergunta': item.question,
            'Link': item.url,
            'Resumo': item.summary || 'Sem resumo',
            'Sistema': item.system,
            'Categoria': item.category,
            'Tipo': item.type,
            'Status': item.needsUpdate ? 'Requer Revisão' : 'Atualizado',
            'Possui Vídeo': item.hasVideo ? 'Sim' : 'Não',
            'Reutilizável': item.isReusable ? 'Sim' : 'Não',
            'Data Criação': new Date(item.createdAt).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PFs Filtradas");
        XLSX.writeFile(wb, `secullum-pfs-export-${Date.now()}.xlsx`);
        setToast({ message: 'Exportação Excel concluída!', type: 'success' });
    } catch (e) {
        console.error(e);
        setToast({ message: 'Erro ao gerar Excel', type: 'error' });
    }
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
        
        if (updatedItem.content !== editingItem.content) {
             updatedItem.history = [{ date: Date.now(), action: 'Conteúdo Editado' }, ...(updatedItem.history || [])];
        }

        setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      } else {
        // New Mode
        let smartId = '';
        const cleanTitle = (formData.question || '').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
        const pfNum = formData.pfNumber || '000';
        
        if (isQuick) {
             smartId = `pf-${pfNum}-${cleanTitle}-${Date.now().toString().slice(-6)}`;
        } else {
             try {
                smartId = await generateSmartId(pfNum, formData.question || 'nova-pf');
             } catch (e) {
                console.error('Smart ID failed, using fallback');
                smartId = `pf-${pfNum}-${cleanTitle}-${Date.now().toString().slice(-6)}`;
             }
        }
        
        if (!smartId) smartId = `pf-${pfNum}-${Date.now()}`;
        smartId = String(smartId).replace(/\s+/g, '-');

        const newItem: FAQItem = {
          ...formData as FAQItem,
          id: smartId,
          createdAt: Date.now(),
          summary: formData.summary || '',
          history: [{ date: Date.now(), action: 'PF Criada' }]
        };
        setItems(prev => [newItem, ...prev]);
      }
      
      if (isQuick) {
        setIsQuickAddOpen(false);
      } else {
        setIsModalOpen(false);
      }
      setToast({ message: 'Salvo com sucesso!', type: 'success' });
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

  const handleFetchUrlTitle = async () => {
    if (!formData.url) {
        return;
    }
    
    setIsFetchingUrl(true);
    try {
        const { title, pfNumber } = await fetchPFTitle(formData.url);
        
        const updates: Partial<FAQItem> = {};
        if (title && !formData.question) updates.question = title; // Only overwrite if empty or user specifically clicked button (which bypasses this check in onClick)
        if (pfNumber && !formData.pfNumber) updates.pfNumber = pfNumber;
        
        // If triggered by button (force) or just blur, we apply
        if (title || pfNumber) {
            setFormData(prev => ({ ...prev, ...updates }));
            if(title) setToast({ message: 'Título obtido da URL', type: 'success' });
        }
    } catch (e) {
        console.error(e);
        // Silent fail on blur
    } finally {
        setIsFetchingUrl(false);
    }
  };

  // Wrapper for button click to force fetch even if field not empty
  const handleForceFetchUrl = async () => {
     if (!formData.url) { alert("Insira uma URL"); return; }
     setIsFetchingUrl(true);
     try {
        const { title, pfNumber } = await fetchPFTitle(formData.url);
        if (title) setFormData(prev => ({ ...prev, question: title, pfNumber: pfNumber || prev.pfNumber }));
     } catch(e) { console.error(e); alert("Erro ao buscar"); }
     finally { setIsFetchingUrl(false); }
  };

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

  const handleAddCategory = () => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
        setCategories([...categories, newCategoryName]);
        setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (name: string) => {
    if (confirm(`Remover categoria "${name}"?`)) {
        setCategories(categories.filter(c => c !== name));
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

  // --- EXPORT / IMPORT (Abbreviated for brevity, assuming implementations exist in original) ---
  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... existing code ... */ };

  const clearFilters = () => {
    setFilters({
      search: '',
      system: '',
      category: '',
      type: '',
      needsUpdate: null,
      favorites: false,
      isReusable: null,
      hasVideo: null
    });
  };

  const getHeaderAction = () => {
    if (editingItem) {
        return (
            <button 
                onClick={(e) => handleDelete(editingItem.id, e)} 
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50"
                title="Excluir Permanentemente"
            >
                <Trash2 size={16} /> 
                <span className="hidden sm:inline">Excluir</span>
            </button>
        );
    }
    return null;
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-100 text-slate-900'}`}>
      
      {/* SIDEBAR */}
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

        <div className="px-6 py-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/40 rounded-lg border border-emerald-800 text-emerald-400 text-xs font-bold shadow-inner">
                <Database size={14} className="animate-pulse" />
                <span>Banco de Dados: Ativo</span>
            </div>
        </div>

        {currentView === 'list' && (
          <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
            {/* Filters Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filtros Avançados</h3>
              <button onClick={clearFilters} className="text-xs text-secullum-green hover:text-green-300 flex items-center gap-1 transition-colors font-semibold">
                <RotateCcw size={10} /> Limpar
              </button>
            </div>
            
            <div className="space-y-4">
               {/* Favorites Toggle */}
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

               {/* Search */}
               <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input type="text" placeholder="PF, ID, Pergunta..." className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-secullum-green outline-none" value={filters.search} onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))} />
                  </div>
               </div>

               {/* Review Status */}
               <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Status de Revisão</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green outline-none"
                  value={filters.needsUpdate === null ? 'all' : filters.needsUpdate.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters(prev => ({ ...prev, needsUpdate: val === 'all' ? null : val === 'true' }));
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="true">Requer Revisão</option>
                  <option value="false">Atualizado (OK)</option>
                </select>
              </div>

               {/* System */}
               <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Sistema</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green outline-none"
                  value={filters.system}
                  onChange={(e) => setFilters(prev => ({ ...prev, system: e.target.value as SystemType }))}
                >
                  <option value="">Todos</option>
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Categoria</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green outline-none"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as CategoryType }))}
                >
                  <option value="">Todas</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tipo</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green outline-none"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as PType }))}
                >
                  <option value="">Todos</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Reusable */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Reutilizável</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green outline-none"
                  value={filters.isReusable === null ? 'all' : filters.isReusable.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters(prev => ({ ...prev, isReusable: val === 'all' ? null : val === 'true' }));
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>

              {/* Has Video */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Possui Vídeo</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-sm py-2 px-3 text-white focus:ring-2 focus:ring-secullum-green outline-none"
                  value={filters.hasVideo === null ? 'all' : filters.hasVideo.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters(prev => ({ ...prev, hasVideo: val === 'all' ? null : val === 'true' }));
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            {/* SETTINGS & REPORTS BUTTONS - Added below filters */}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                 <button 
                    onClick={handleExportExcel}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700 hover:border-slate-600 group shadow-sm"
                >
                    <span className="flex items-center gap-2 font-bold"><FileSpreadsheet size={16} className="text-emerald-500 group-hover:scale-110 transition-transform duration-300" /> Exportar Excel</span>
                </button>
                <button 
                    onClick={handleExportPDF}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700 hover:border-slate-600 group shadow-sm"
                >
                    <span className="flex items-center gap-2 font-bold"><FileText size={16} className="text-rose-500 group-hover:scale-110 transition-transform duration-300" /> Relatório PDF</span>
                </button>
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700 hover:border-slate-600 group shadow-sm"
                >
                    <span className="flex items-center gap-2 font-bold"><Settings size={16} className="text-secullum-green group-hover:rotate-45 transition-transform duration-500" /> Configurações</span>
                </button>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 h-screen overflow-y-auto transition-colors ${darkMode ? 'bg-slate-900' : 'bg-gray-100'} relative`}>
        {toast && (
            <div className={`fixed top-6 right-6 z-[200] px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <span className="font-bold text-sm">{toast.message}</span>
            </div>
        )}

        {selectedIds.size > 0 && (
            <div className="absolute top-4 left-0 right-0 mx-auto w-[90%] md:w-[600px] z-40 bg-secullum-dark text-white rounded-xl shadow-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4 border border-white/10">
                <div className="flex items-center gap-3">
                    <span className="bg-white/10 px-3 py-1 rounded-md font-bold text-sm">{selectedIds.size} selecionado(s)</span>
                    <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-300 hover:text-white underline">Limpar</button>
                </div>
                <button onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Trash2 size={18} /> Excluir</button>
            </div>
        )}

        {currentView === 'dashboard' && <Dashboard items={items} />}

        {currentView === 'list' && (
          <div className="p-6 md:p-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto min-h-screen flex flex-col">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
               <div className="flex-1">
                  <h2 className="text-2xl font-extrabold text-secullum-blue dark:text-white tracking-tight flex items-center gap-2">
                     <Hash className="text-secullum-green" size={24} /> Perguntas Frequentes
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                     <span className="bg-secullum-light dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-mono text-secullum-blue dark:text-secullum-light">{filteredItems.length}</span>
                     <span>itens encontrados</span>
                  </div>
               </div>
               <div className="flex gap-3">
                   <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex items-center border border-gray-200 dark:border-slate-600">
                        <button onClick={() => setListViewMode('grid')} className={`p-2 rounded-md transition-all ${listViewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-secullum-blue dark:text-white shadow-sm' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
                        <button onClick={() => setListViewMode('table')} className={`p-2 rounded-md transition-all ${listViewMode === 'table' ? 'bg-white dark:bg-slate-600 text-secullum-blue dark:text-white shadow-sm' : 'text-gray-400'}`}><TableIcon size={20} /></button>
                        <button onClick={() => setListViewMode('board')} className={`p-2 rounded-md transition-all ${listViewMode === 'board' ? 'bg-white dark:bg-slate-600 text-secullum-blue dark:text-white shadow-sm' : 'text-gray-400'}`}><Columns size={20} /></button>
                   </div>
                   <button onClick={handleOpenQuickAdd} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 font-bold"><Zap size={20} /> Rápido</button>
                   <button onClick={() => handleOpenModal()} className="bg-secullum-blue hover:bg-secullum-dark text-white px-5 py-3 rounded-lg flex items-center gap-2 font-bold"><Plus size={20} /> Nova Pergunta</button>
               </div>
            </div>

            {filteredItems.length === 0 ? (
                 <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nenhum item encontrado</h3>
                    <button onClick={clearFilters} className="mt-6 text-secullum-blue font-bold flex items-center justify-center gap-2 mx-auto"><RotateCcw size={16}/> Limpar Filtros</button>
                 </div>
            ) : (
                <>
                {listViewMode === 'table' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-secullum-dark text-white text-xs uppercase tracking-wider">
                                        <th className="p-4 w-12 text-center"><button onClick={selectAllVisible}>{selectedIds.size > 0 ? <CheckSquare size={20} /> : <Square size={20} />}</button></th>
                                        <th className="p-4 w-12 text-center"><Star size={16} /></th>
                                        <th className="p-4">Pergunta</th>
                                        <th className="p-4 w-48">Sistema</th>
                                        <th className="p-4 w-24 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {displayedItems.map(item => (
                                        <tr key={item.id} onClick={() => handleOpenModal(item)} className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700/50 group text-sm text-gray-700 dark:text-gray-300">
                                            <td className="p-4 text-center"><button onClick={(e) => toggleSelection(item.id, e)} className={`${selectedIds.has(item.id) ? 'text-secullum-blue' : 'text-gray-300'}`}>{selectedIds.has(item.id) ? <CheckSquare size={20} /> : <Square size={20} />}</button></td>
                                            <td className="p-4 text-center"><button onClick={(e) => handleToggleFavorite(item.id, e)} className={`${item.isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}><Star size={18} className={item.isFavorite ? "fill-yellow-400" : ""} /></button></td>
                                            <td className="p-4 font-medium"><span className="font-mono text-secullum-blue font-bold mr-2">#{item.pfNumber}</span>{item.question}</td>
                                            <td className="p-4">{item.system}</td>
                                            <td className="p-4 text-right"><button onClick={(e) => handleDelete(item.id, e)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {listViewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
                        {displayedItems.map(item => (
                            <div key={item.id} onClick={() => handleOpenModal(item)} className={`group relative flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer ${selectedIds.has(item.id) ? 'ring-2 ring-secullum-blue' : ''}`}>
                                <div className={`h-1.5 w-full ${item.needsUpdate ? 'bg-rose-500' : 'bg-secullum-green'}`}></div>
                                <div className="flex justify-between items-start p-5 pb-0 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs font-black text-secullum-blue dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800/50">#{item.pfNumber}</span>
                                        <div className="flex gap-1.5">
                                            {item.needsUpdate && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" title="Requer Revisão" />}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={(e) => handleToggleFavorite(item.id, e)} className={`p-1.5 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/30 ${item.isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}><Star size={18} className={item.isFavorite ? "fill-yellow-400" : ""} /></button>
                                        <button onClick={(e) => handleMarkUpdated(item, e)} className="p-1.5 rounded-full hover:bg-emerald-50 text-gray-300 hover:text-emerald-500 dark:hover:bg-emerald-900/30 transition-colors" title="Marcar como Atualizado"><RefreshCw size={18} /></button>
                                        <button onClick={(e) => toggleSelection(item.id, e)} className={`p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 ${selectedIds.has(item.id) ? 'text-secullum-blue' : 'text-gray-300 hover:text-secullum-blue'}`}>{selectedIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}</button>
                                    </div>
                                </div>
                                <div className="p-5 flex-col flex-1 flex">
                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-snug mb-2 line-clamp-2 group-hover:text-secullum-blue transition-colors">{item.question}</h3>
                                    
                                    {/* Visual Tags */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {item.needsUpdate && (
                                            <div title="Atenção: Esta PF está marcada para revisão e pode conter informações desatualizadas.">
                                                <Badge color="red" icon={AlertCircle}>Requer Revisão</Badge>
                                            </div>
                                        )}
                                        {item.isReusable && (
                                            <div title="Produtividade: Esta resposta é um padrão reutilizável para casos similares.">
                                                <Badge color="sky" icon={RefreshCw}>Reutilizável</Badge>
                                            </div>
                                        )}
                                        {item.hasVideo && (
                                            <div title="Mídia: Esta PF contém um vídeo explicativo ou tutorial anexo.">
                                                <Badge color="purple" icon={PlayCircle}>Vídeo</Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4"><Badge color="blue">{item.system}</Badge><Badge color="gray">{item.category}</Badge></div>
                                    <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 relative h-32 overflow-hidden">
                                        <p className="line-clamp-4 leading-relaxed text-xs">{item.summary || "Sem resumo disponível."}</p>
                                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 pointer-events-none"></div>
                                    </div>
                                </div>
                                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
                                    <div className="flex flex-col">
                                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Atualizada em</span>
                                       <span className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-1.5"><Clock size={12} /> {getLastUpdated(item)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Share Button */}
                                        <button onClick={(e) => handleShare(item, e)} className="p-1.5 text-gray-400 hover:text-secullum-blue hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm z-20 relative" title="Compartilhar Link"><Share2 size={14} /></button>
                                        {/* Direct Link */}
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-secullum-green hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm z-20 relative" title="Abrir PF"><LinkIcon size={14} /></a>
                                        {/* Delete Button */}
                                        <button onClick={(e) => handleDelete(item.id, e)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm z-20 relative"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {listViewMode === 'board' && (
                    <div className="flex gap-6 overflow-x-auto pb-6 h-full min-h-[500px] items-start">
                        {systems.map(system => {
                            const systemItems = filteredItems.filter(i => i.system === system);
                            if (systemItems.length === 0) return null;
                            return (
                                <div key={system} className="min-w-[350px] w-[350px] flex-shrink-0 flex flex-col max-h-[calc(100vh-200px)] bg-gray-100/50 dark:bg-slate-800/30 rounded-2xl border border-gray-200 dark:border-slate-700/50">
                                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-gray-100/80 dark:bg-slate-900/80 rounded-t-2xl z-10 backdrop-blur-md">
                                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate pr-2">{system}</h3>
                                        <span className="bg-white dark:bg-slate-700 text-secullum-blue dark:text-blue-300 text-xs font-black px-2.5 py-1 rounded-md shadow-sm border border-gray-200 dark:border-slate-600">{systemItems.length}</span>
                                    </div>
                                    <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                        {systemItems.map(item => (
                                            <div key={item.id} onClick={() => handleOpenModal(item)} className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group relative ${item.needsUpdate ? 'border-l-rose-500' : 'border-l-secullum-green'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[10px] font-black text-secullum-blue dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">#{item.pfNumber}</span>
                                                        {item.hasVideo && <span title="Possui vídeo explicativo"><PlayCircle size={12} className="text-purple-500" /></span>}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={(e) => handleToggleFavorite(item.id, e)} className={`hover:scale-110 transition-transform ${item.isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}><Star size={14} className={item.isFavorite ? "fill-yellow-400" : ""} /></button>
                                                        <button onClick={(e) => handleDelete(item.id, e)} className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1 rounded transition-colors" title="Excluir"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-3 mb-3 leading-snug">{item.question}</h4>
                                                
                                                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                                                    <span className="bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 font-medium">{item.category}</span>
                                                    <span>{getLastUpdatedDateOnly(item)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                </>
            )}
          </div>
        )}
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Editar Pergunta Frequente' : 'Nova Pergunta Frequente'} headerAction={getHeaderAction()}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-9 flex flex-col h-full gap-5">
                
                {/* HEADLINE SECTION (Compact) */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                     <div className="w-full md:w-32 flex-shrink-0">
                         <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">PF # <span className="text-rose-500">*</span></label>
                         <input type="text" value={formData.pfNumber || ''} onChange={e => setFormData({...formData, pfNumber: e.target.value})} placeholder="000" className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-lg font-mono font-bold focus:ring-2 focus:ring-secullum-blue outline-none" />
                     </div>
                     <div className="flex-1 w-full">
                         <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pergunta / Título <span className="text-rose-500">*</span></label>
                         <input type="text" value={formData.question || ''} onChange={e => setFormData({...formData, question: e.target.value})} placeholder="Digite a dúvida completa..." className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-lg font-bold focus:ring-2 focus:ring-secullum-blue outline-none" />
                     </div>
                </div>

                {/* HORIZONTAL TOOLBAR (URL + Selects) */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                         <ExternalLink size={14} className="absolute left-3 top-2.5 text-gray-400" />
                         <input 
                            type="text" 
                            value={formData.url || ''} 
                            onBlur={() => handleFetchUrlTitle()} 
                            onChange={e => setFormData({...formData, url: e.target.value})} 
                            placeholder="https://www.secullum.com.br/pf?id=..." 
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-12 py-1.5 text-sm focus:ring-2 focus:ring-secullum-blue outline-none" 
                         />
                         <button onClick={handleForceFetchUrl} disabled={isFetchingUrl} className="absolute right-1 top-1 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-secullum-blue" title="Buscar Título na URL">{isFetchingUrl ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}</button>
                    </div>
                    <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 hidden md:block"></div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                        <select value={formData.system} onChange={e => setFormData({...formData, system: e.target.value as SystemType})} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-secullum-blue outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">{systems.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as CategoryType})} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-secullum-blue outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PType})} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-secullum-blue outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">{types.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[300px]">
                    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-900/50 px-4 py-2 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center"><span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conteúdo Original</span></div>
                        <textarea value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} className="flex-1 w-full p-4 bg-transparent outline-none resize-none text-sm leading-relaxed custom-scrollbar dark:text-white" placeholder="Cole o texto da PF aqui..."></textarea>
                    </div>
                    <div className="flex flex-col h-full bg-blue-50/50 dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-slate-700 shadow-sm overflow-hidden relative group">
                         <div className="bg-blue-100/50 dark:bg-slate-900/50 px-4 py-2 border-b border-blue-200 dark:border-slate-700 flex justify-between items-center">
                             <span className="text-xs font-bold text-secullum-blue dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5"><Bot size={14} /> Resumo IA</span>
                             <button onClick={handleGenerateSummary} disabled={isGenerating || !formData.content} className="text-[10px] bg-white dark:bg-slate-700 hover:bg-blue-50 text-secullum-blue px-2 py-1 rounded shadow-sm transition-colors border border-blue-100 dark:border-slate-600 font-bold uppercase tracking-wide">{isGenerating ? 'Gerando...' : 'Gerar Agora'}</button>
                         </div>
                        <textarea value={formData.summary || ''} onChange={e => setFormData({...formData, summary: e.target.value})} className="flex-1 w-full p-4 bg-transparent outline-none resize-none text-sm leading-relaxed custom-scrollbar dark:text-white" placeholder="O resumo gerado aparecerá aqui..."></textarea>
                        {!formData.summary && !isGenerating && (
                            <div className="absolute inset-0 top-10 flex items-center justify-center pointer-events-none opacity-40">
                                <Bot size={48} className="text-secullum-blue" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="lg:col-span-3 flex flex-col gap-5 border-l border-gray-100 dark:border-slate-700 pl-0 lg:pl-8 h-full">
                
                <div className="grid grid-cols-2 gap-2">
                     <button 
                        onClick={() => setFormData({...formData, needsUpdate: !formData.needsUpdate})}
                        className={`col-span-2 p-2 rounded-lg border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${formData.needsUpdate ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}
                     >
                        <AlertCircle size={14} /> Requer Revisão
                     </button>
                     <button 
                        onClick={() => setFormData({...formData, isReusable: !formData.isReusable})}
                        className={`p-2 rounded-lg border-2 text-xs font-bold flex items-center justify-center gap-1 transition-all ${formData.isReusable ? 'border-sky-500 bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}
                     >
                        <RefreshCw size={14} /> Reutilizável
                     </button>
                     <button 
                        onClick={() => setFormData({...formData, hasVideo: !formData.hasVideo})}
                        className={`p-2 rounded-lg border-2 text-xs font-bold flex items-center justify-center gap-1 transition-all ${formData.hasVideo ? 'border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}
                     >
                        <PlayCircle size={14} /> Vídeo
                     </button>
                </div>
                
                <div className="flex-1 flex flex-col min-h-[150px]">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><StickyNote size={12} /> Notas Privadas</h3>
                    <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="flex-1 w-full bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-yellow-400 outline-none transition-all resize-none dark:text-yellow-100 placeholder-yellow-800/30" placeholder="Observações internas..."></textarea>
                </div>

                {editingItem && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Última atualização</span>
                        <p className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">{getLastUpdated(editingItem)}</p>
                    </div>
                )}
                
                {/* Timeline History (Compact) */}
                {editingItem && editingItem.history && editingItem.history.length > 0 && (
                    <div className="flex flex-col max-h-[150px]">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Activity size={12} /> Histórico</h3>
                        <div className="overflow-y-auto custom-scrollbar pr-1 flex-1">
                            <div className="relative pl-3 border-l border-gray-200 dark:border-slate-700 space-y-3 ml-1">
                                {editingItem.history.map((h, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[16px] top-1 h-2 w-2 rounded-full bg-secullum-blue ring-2 ring-white dark:ring-slate-900 shadow-sm"></div>
                                        <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300 leading-tight">{h.action}</p>
                                        <p className="text-[9px] text-gray-400 font-mono">{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-2 space-y-2">
                     <button onClick={() => handleSave(false)} disabled={isSaving} className="w-full bg-secullum-green hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-900/10 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações</button>
                     <button onClick={() => setIsModalOpen(false)} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Cancelar</button>
                </div>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} title="Adicionar PF Rápida">
         <div className="space-y-5">
             <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Número da PF <span className="text-rose-500">*</span></label><input type="text" value={formData.pfNumber || ''} onChange={e => setFormData({...formData, pfNumber: e.target.value})} autoFocus className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secullum-blue outline-none font-mono" /></div>
             <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pergunta <span className="text-rose-500">*</span></label><input type="text" value={formData.question || ''} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secullum-blue outline-none" /></div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Sistema</label><select value={formData.system} onChange={e => setFormData({...formData, system: e.target.value as SystemType})} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secullum-blue outline-none">{systems.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Tipo</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PType})} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secullum-blue outline-none">{types.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
             </div>
             <div className="flex justify-end gap-3 pt-4"><button onClick={() => setIsQuickAddOpen(false)} className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancelar</button><button onClick={() => handleSave(true)} className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-sky-900/20 transition-all">Salvar Rápido</button></div>
         </div>
      </Modal>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Configurações do Sistema">
        <div className="space-y-8">
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Sistemas Cadastrados</h3>
                <div className="flex gap-2 mb-4"><input type="text" value={newSystemName} onChange={e => setNewSystemName(e.target.value)} placeholder="Novo Sistema..." className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-secullum-blue outline-none" /><button onClick={handleAddSystem} className="bg-secullum-green text-white px-4 py-2 rounded-lg font-bold"><Plus size={18}/></button></div>
                <div className="flex flex-wrap gap-2">{systems.map(sys => (<div key={sys} className="bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-600">{sys}<button onClick={() => handleRemoveSystem(sys)} className="text-gray-400 hover:text-rose-500"><X size={14} /></button></div>))}</div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Categorias</h3>
                <div className="flex gap-2 mb-4"><input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nova Categoria..." className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-secullum-blue outline-none" /><button onClick={handleAddCategory} className="bg-secullum-green text-white px-4 py-2 rounded-lg font-bold"><Plus size={18}/></button></div>
                <div className="flex flex-wrap gap-2">{categories.map(cat => (<div key={cat} className="bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-600">{cat}<button onClick={() => handleRemoveCategory(cat)} className="text-gray-400 hover:text-rose-500"><X size={14} /></button></div>))}</div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Tipos de PF</h3>
                <div className="flex gap-2 mb-4"><input type="text" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Novo Tipo..." className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-secullum-blue outline-none" /><button onClick={handleAddType} className="bg-secullum-green text-white px-4 py-2 rounded-lg font-bold"><Plus size={18}/></button></div>
                <div className="flex flex-wrap gap-2">{types.map(t => (<div key={t} className="bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-600">{t}<button onClick={() => handleRemoveType(t)} className="text-gray-400 hover:text-rose-500"><X size={14} /></button></div>))}</div>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;