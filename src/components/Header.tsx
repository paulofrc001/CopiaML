import React from 'react';
import { Sun, Moon, PlusCircle, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { NavTab } from './Sidebar.tsx';

interface HeaderProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onSearch?: (term: string) => void;
  selectedAnuncioTitle?: string | null;
  onBackToAnuncios?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onSearch,
  selectedAnuncioTitle,
  onBackToAnuncios,
}) => {
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = () => {
    if (selectedAnuncioTitle) return 'Detalhes do Anúncio';
    switch (currentTab) {
      case 'dashboard':
        return 'Visão Geral & Métricas';
      case 'importar':
        return 'Importar Anúncios Mercado Livre';
      case 'anuncios':
        return 'Catálogo de Anúncios';
      case 'exportacoes':
        return 'Central de Exportação';
      case 'configuracoes':
        return 'Configurações & Backup';
      default:
        return 'Mercado Livre Manager';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        {selectedAnuncioTitle && onBackToAnuncios && (
          <button
            onClick={onBackToAnuncios}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ← Voltar para Anúncios
          </button>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {getPageTitle()}
          </h2>
          {selectedAnuncioTitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md truncate">
              {selectedAnuncioTitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search quick access if on Anúncios or Dashboard */}
        {onSearch && (
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por MLB, Título, SKU..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        )}

        {/* Quick Import Button */}
        {currentTab !== 'importar' && !selectedAnuncioTitle && (
          <button
            onClick={() => onNavigate('importar')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Anúncio</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
