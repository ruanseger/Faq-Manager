import React, { useMemo, useState } from 'react';
import { FAQItem } from '../types';
import { SYSTEMS, CATEGORIES, TYPES } from '../constants';
import { 
  PieChart, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  TrendingUp, 
  Tag, 
  RefreshCw, 
  Calendar, 
  Clock, 
  PlayCircle,
  Filter,
  X,
  Video,
  RotateCcw
} from 'lucide-react';

interface DashboardProps {
  items: FAQItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  // Local Filter State for Dashboard Analysis
  const [filters, setFilters] = useState({
    system: '',
    category: '',
    type: '',
    needsUpdate: false,
    isReusable: false,
    hasVideo: false,
  });

  const hasActiveFilters = filters.system || filters.category || filters.type || filters.needsUpdate || filters.isReusable || filters.hasVideo;

  const clearFilters = () => {
    setFilters({
      system: '',
      category: '',
      type: '',
      needsUpdate: false,
      isReusable: false,
      hasVideo: false,
    });
  };

  // Filter the items based on local dashboard filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filters.system && item.system !== filters.system) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.needsUpdate && !item.needsUpdate) return false;
      if (filters.isReusable && !item.isReusable) return false;
      if (filters.hasVideo && !item.hasVideo) return false;
      return true;
    });
  }, [items, filters]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const needsUpdate = filteredItems.filter(i => i.needsUpdate).length;
    const isReusable = filteredItems.filter(i => i.isReusable).length;
    const hasVideo = filteredItems.filter(i => i.hasVideo).length;
    const upToDate = total - needsUpdate;

    // Last 5 items added (from the filtered set)
    const recentItems = [...filteredItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

    const bySystem = filteredItems.reduce((acc, item) => {
      acc[item.system] = (acc[item.system] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = filteredItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSystems = Object.entries(bySystem)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);
      
    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => (b as number) - (a as number));

    return { total, needsUpdate, upToDate, topSystems, topCategories, isReusable, recentItems, hasVideo };
  }, [filteredItems]);

  const StatCard = ({ title, value, icon: Icon, color, gradient, subtext }: any) => (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start">
            <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
            <h3 className="text-4xl font-extrabold text-secullum-blue dark:text-white mt-2">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 shadow-inner`}>
            <Icon className={color.replace('bg-', 'text-')} size={28} />
            </div>
        </div>
        {subtext && <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1"><TrendingUp size={12}/> {subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-extrabold text-secullum-dark dark:text-white tracking-tight">Dashboard Geral</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
                {hasActiveFilters 
                    ? `Exibindo métricas filtradas (${stats.total} itens)` 
                    : "Métricas em tempo real da base de conhecimento completa."}
            </p>
        </div>
        
        {/* DASHBOARD FILTERS */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-2 text-gray-400 border-r border-gray-200 dark:border-slate-700 mr-1">
                <Filter size={16} />
                <span className="text-xs font-bold uppercase hidden sm:inline">Filtros</span>
            </div>

            <select 
                value={filters.system} 
                onChange={e => setFilters(prev => ({ ...prev, system: e.target.value }))}
                className="bg-gray-50 dark:bg-slate-700/50 border-0 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-8 focus:ring-2 focus:ring-secullum-blue cursor-pointer"
            >
                <option value="">Todos Sistemas</option>
                {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select 
                value={filters.category} 
                onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="bg-gray-50 dark:bg-slate-700/50 border-0 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-8 focus:ring-2 focus:ring-secullum-blue cursor-pointer"
            >
                <option value="">Todas Categorias</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
                value={filters.type} 
                onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="bg-gray-50 dark:bg-slate-700/50 border-0 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-8 focus:ring-2 focus:ring-secullum-blue cursor-pointer"
            >
                <option value="">Todos Tipos</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>

            <button 
                onClick={() => setFilters(prev => ({ ...prev, needsUpdate: !prev.needsUpdate }))}
                title="Apenas: Requer Revisão"
                className={`p-1.5 rounded-lg transition-all ${filters.needsUpdate ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 ring-2 ring-rose-500 ring-offset-1' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            >
                <AlertCircle size={16} />
            </button>

            <button 
                onClick={() => setFilters(prev => ({ ...prev, isReusable: !prev.isReusable }))}
                title="Apenas: Reutilizável"
                className={`p-1.5 rounded-lg transition-all ${filters.isReusable ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 ring-2 ring-sky-500 ring-offset-1' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            >
                <RefreshCw size={16} />
            </button>

            <button 
                onClick={() => setFilters(prev => ({ ...prev, hasVideo: !prev.hasVideo }))}
                title="Apenas: Possui Vídeo"
                className={`p-1.5 rounded-lg transition-all ${filters.hasVideo ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 ring-2 ring-purple-500 ring-offset-1' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            >
                <Video size={16} />
            </button>
            
            {hasActiveFilters && (
                <button 
                    onClick={clearFilters}
                    className="ml-1 p-1.5 text-xs font-bold text-secullum-blue hover:underline flex items-center gap-1"
                >
                    <RotateCcw size={12} /> Limpar
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Filtrado"
          value={stats.total}
          icon={Database}
          color="text-secullum-blue bg-secullum-blue"
          gradient="from-blue-400 to-secullum-blue"
          subtext="Itens exibidos"
        />
        <StatCard
          title="Desatualizadas"
          value={stats.needsUpdate}
          icon={AlertCircle}
          color="text-rose-600 bg-rose-600"
          gradient="from-rose-400 to-rose-600"
          subtext="Necessitam revisão"
        />
        <StatCard
          title="Possuem Vídeo"
          value={stats.hasVideo}
          icon={PlayCircle}
          color="text-purple-600 bg-purple-600"
          gradient="from-purple-400 to-purple-600"
          subtext="Conteúdo audiovisual"
        />
        <StatCard
          title="Reutilizáveis"
          value={stats.isReusable}
          icon={RefreshCw}
          color="text-sky-600 bg-sky-600"
          gradient="from-sky-400 to-sky-600"
          subtext="Padrões de resposta"
        />
      </div>
      
      {/* Content Insights Section */}
      <h3 className="text-lg font-bold text-secullum-dark dark:text-white flex items-center gap-2 pt-4">
            <TrendingUp size={20} className="text-secullum-green" />
            Insights de Conteúdo
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity List */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-gray-400" /> Atividade (Filtrada)
            </h3>
            <div className="space-y-4">
                {stats.recentItems.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                         <div className="mt-1 bg-secullum-light dark:bg-slate-700 text-secullum-blue dark:text-blue-300 font-mono text-xs font-bold px-1.5 py-0.5 rounded">
                            #{item.pfNumber}
                         </div>
                         <div>
                             <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{item.question}</p>
                             <p className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                         </div>
                    </div>
                ))}
                {stats.recentItems.length === 0 && <p className="text-sm text-gray-400 italic">Nenhuma atividade recente encontrada.</p>}
            </div>
         </div>

         {/* Volume Chart (Visual Only) */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" /> Tendência
            </h3>
            <div className="flex items-end justify-between h-40 gap-2 px-2">
                 {[40, 65, 45, 80, 55, 90].map((h, i) => (
                     <div key={i} className="w-full bg-blue-50 dark:bg-slate-700/50 rounded-t-lg relative group">
                         <div 
                            className="absolute bottom-0 left-0 right-0 bg-secullum-blue opacity-80 rounded-t-lg transition-all duration-1000 group-hover:opacity-100"
                            style={{ height: `${h}%` }}
                         ></div>
                     </div>
                 ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
                <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span>
            </div>
         </div>

         {/* Health Visual */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold text-secullum-dark dark:text-white mb-2">Saúde (Segmento)</h3>
            
            <div className="relative h-40 w-40 flex items-center justify-center my-4">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path
                        className="text-gray-100 dark:text-slate-700"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.8"
                    />
                    <path
                        className={`${stats.total > 0 && (stats.upToDate / stats.total) > 0.8 ? 'text-secullum-green' : 'text-secullum-blue'} transition-all duration-1000 ease-out`}
                        strokeDasharray={`${stats.total > 0 ? (stats.upToDate / stats.total) * 100 : 0}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.8"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-gray-800 dark:text-white">
                    {stats.total > 0 ? Math.round((stats.upToDate / stats.total) * 100) : 0}%
                </span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Systems Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-secullum-dark dark:text-white mb-8 flex items-center gap-2">
            <BarChart3 size={20} className="text-secullum-blue" />
            Distribuição (Top 5 neste filtro)
          </h3>
          <div className="space-y-6">
            {stats.topSystems.map(([system, count], index) => (
              <div key={system} className="relative group">
                <div className="flex justify-between text-sm mb-2 font-medium">
                  <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                     <span className="w-6 h-6 rounded-md bg-secullum-light dark:bg-slate-700 flex items-center justify-center text-xs text-secullum-blue dark:text-blue-300 font-bold">{index + 1}</span>
                     {system}
                  </span>
                  <span className="text-secullum-dark dark:text-white font-bold">{count}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-secullum-blue h-3 rounded-full transition-all duration-1000 group-hover:bg-blue-600 relative" 
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  >
                      <div className="absolute top-0 right-0 bottom-0 w-full bg-gradient-to-l from-white/20 to-transparent"></div>
                  </div>
                </div>
              </div>
            ))}
            {stats.topSystems.length === 0 && (
              <p className="text-gray-400 text-center py-4">Nenhum dado disponível para os filtros selecionados</p>
            )}
          </div>
        </div>

        {/* Categories & Health */}
        <div className="flex flex-col gap-6">
            {/* Category Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex-1">
                <h3 className="text-lg font-bold text-secullum-dark dark:text-white mb-6 flex items-center gap-2">
                    <Tag size={20} className="text-secullum-green" />
                    Por Categoria
                </h3>
                <div className="space-y-4">
                    {stats.topCategories.map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                            <span className="text-sm font-bold text-secullum-blue dark:text-white bg-white dark:bg-slate-600 px-2 py-1 rounded shadow-sm">
                                {count}
                            </span>
                        </div>
                    ))}
                    {stats.topCategories.length === 0 && <p className="text-xs text-gray-400 italic">Sem dados.</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};