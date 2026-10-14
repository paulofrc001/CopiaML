import React from 'react';
import {
  LayoutDashboard,
  DownloadCloud,
  PackageCheck,
  FileDown,
  Settings,
  Database,
  ExternalLink,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'importar' | 'anuncios' | 'exportacoes' | 'configuracoes';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  totalAnuncios?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, totalAnuncios = 0 }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'importar' as NavTab, label: 'Importar anúncio', icon: DownloadCloud },
    { id: 'anuncios' as NavTab, label: 'Meus anúncios', icon: PackageCheck, badge: totalAnuncios > 0 ? totalAnuncios : undefined },
    { id: 'exportacoes' as NavTab, label: 'Exportações', icon: FileDown },
    { id: 'configuracoes' as NavTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-yellow-500/20 text-slate-950 font-black text-xl">
          ML
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
            ML Manager
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400">Gestão & Exportação</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
          Menu Principal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Database & System Info Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-2">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-slate-300">SQLite Conectado</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
        </div>
        <p className="text-[11px] text-slate-400 truncate font-mono">
          database/mercadolivre.db
        </p>

        <a
          href="https://developers.mercadolivre.com.br"
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-between text-[11px] text-slate-400 hover:text-amber-300 transition-colors pt-2 border-t border-slate-800/60"
        >
          <span>API Mercado Livre</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </aside>
  );
};
