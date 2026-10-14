import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Importar } from './pages/Importar.tsx';
import { MeusAnuncios } from './pages/MeusAnuncios.tsx';
import { DetalhesAnuncio } from './pages/DetalhesAnuncio.tsx';
import { Exportacoes } from './pages/Exportacoes.tsx';
import { Configuracoes } from './pages/Configuracoes.tsx';
import { fetchStats } from './services/api.ts';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedAnuncioId, setSelectedAnuncioId] = useState<number | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [totalAnuncios, setTotalAnuncios] = useState(0);

  const refreshCounts = () => {
    fetchStats()
      .then((data) => setTotalAnuncios(data.totalAnuncios))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCounts();
  }, [currentTab, selectedAnuncioId]);

  const handleSelectTab = (tab: NavTab) => {
    setSelectedAnuncioId(null);
    setCurrentTab(tab);
  };

  const handleSelectAnuncio = (id: number) => {
    setSelectedAnuncioId(id);
  };

  const handleBackToAnuncios = () => {
    setSelectedAnuncioId(null);
    setCurrentTab('anuncios');
  };

  const handleGlobalSearch = (term: string) => {
    setGlobalSearch(term);
    setSelectedAnuncioId(null);
    setCurrentTab('anuncios');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Fixed Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        totalAnuncios={totalAnuncios}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onNavigate={handleSelectTab}
          onSearch={handleGlobalSearch}
          selectedAnuncioTitle={selectedAnuncioId ? `Visualizando anúncio #${selectedAnuncioId}` : null}
          onBackToAnuncios={selectedAnuncioId ? handleBackToAnuncios : undefined}
        />

        <main className="flex-1 overflow-y-auto">
          {selectedAnuncioId ? (
            <DetalhesAnuncio
              anuncioId={selectedAnuncioId}
              onBack={handleBackToAnuncios}
              onDuplicateSuccess={(newId) => {
                setSelectedAnuncioId(newId);
                refreshCounts();
              }}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <Dashboard
                  onNavigateTab={handleSelectTab}
                  onSelectAnuncio={handleSelectAnuncio}
                />
              )}
              {currentTab === 'importar' && (
                <Importar
                  onSuccess={(id) => {
                    refreshCounts();
                    handleSelectAnuncio(id);
                  }}
                  onNavigateToAnuncios={() => setCurrentTab('anuncios')}
                />
              )}
              {currentTab === 'anuncios' && (
                <MeusAnuncios
                  onSelectAnuncio={handleSelectAnuncio}
                  searchTermInitial={globalSearch}
                  onNavigateToImport={() => setCurrentTab('importar')}
                />
              )}
              {currentTab === 'exportacoes' && (
                <Exportacoes onSelectAnuncio={handleSelectAnuncio} />
              )}
              {currentTab === 'configuracoes' && <Configuracoes />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ThemeProvider>
  );
}
