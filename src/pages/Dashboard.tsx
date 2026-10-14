import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  Boxes,
  CheckCircle2,
  PauseCircle,
  TrendingUp,
  Tag,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  Download,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { DashboardStats } from '../types/index.ts';
import { fetchStats, duplicateAnuncio } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface DashboardProps {
  onNavigateTab: (tab: 'dashboard' | 'importar' | 'anuncios' | 'exportacoes' | 'configuracoes') => void;
  onSelectAnuncio: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, onSelectAnuncio }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err: any) {
      addToast('erro', 'Erro ao carregar dashboard', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleDuplicate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await duplicateAnuncio(id);
      addToast('sucesso', 'Anúncio duplicado com sucesso!', `Novo ID #${res.newId}`);
      loadStats();
    } catch (err: any) {
      addToast('erro', 'Erro ao duplicar', err.message);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Carregando métricas e dados...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Anúncios',
      value: stats?.totalAnuncios || 0,
      icon: Package,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Produtos em Estoque',
      value: (stats?.totalEstoque || 0).toLocaleString('pt-BR'),
      icon: Boxes,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Total de SKUs',
      value: stats?.totalSkus || 0,
      icon: Tag,
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Total de Variações',
      value: stats?.totalVariacoes || 0,
      icon: Layers,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Anúncios Ativos',
      value: stats?.totalAtivos || 0,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-green-600',
      bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Anúncios Pausados',
      value: stats?.totalPausados || 0,
      icon: PauseCircle,
      color: 'from-slate-500 to-slate-700',
      bgColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    },
    {
      title: 'Preço Médio',
      value: `R$ ${(stats?.precoMedio || 0).toFixed(2).replace('.', ',')}`,
      icon: TrendingUp,
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
    {
      title: 'Total Vendidos',
      value: (stats?.totalVendidos || 0).toLocaleString('pt-BR'),
      icon: ShoppingBag,
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Call to Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 border border-slate-700 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30 mb-2">
              <span>Banco SQLite Local Ativo</span>
              <span>•</span>
              <span>mercadolivre.db</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Gestão de Anúncios Mercado Livre
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              Importe anúncios completos via URL ou ID MLB, armazene especificações e variações localmente, faça edições, cópias e exportações para JSON, CSV e ZIP com imagens.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('importar')}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <span>Importar Anúncio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={loadStats}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Recarregar Métricas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.bgColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content Sections: Recent Listings and Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Listings (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Últimos Anúncios Importados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anúncios armazenados recentemente no banco SQLite
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('anuncios')}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {(!stats?.ultimosAnuncios || stats.ultimosAnuncios.length === 0) ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhum anúncio importado ainda</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comece colando o link de um produto do Mercado Livre na aba de importação.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('importar')}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 hover:bg-amber-300 transition-colors"
              >
                Importar Primeiro Anúncio
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              {stats.ultimosAnuncios.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectAnuncio(item.id)}
                  className="p-3.5 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imagem_capa ? (
                      <img
                        src={item.imagem_capa}
                        alt={item.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300/40">
                        {item.mlb_id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          item.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        {item.categoria_nome}
                      </span>
                    </div>

                    <h4 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {item.titulo}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                      </span>
                      <span>Estoque: <strong>{item.quantidade}</strong></span>
                      <span>Vendidos: <strong>{item.vendidos}</strong></span>
                      {item.total_variacoes > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {item.total_variacoes} variações
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDuplicate(e, item.id)}
                      title="Duplicar Anúncio"
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`/api/anuncios/${item.id}/exportar/zip`}
                      download
                      title="Baixar ZIP Completo"
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories Distribution & Quick Tools (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center justify-between">
              <span>Categorias Principais</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </h3>

            {(!stats?.categoriasDist || stats.categoriasDist.length === 0) ? (
              <p className="text-xs text-slate-400 italic">Sem categorias cadastradas.</p>
            ) : (
              <div className="space-y-3">
                {stats.categoriasDist.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={cat.categoria}>
                        {cat.categoria}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{cat.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{
                          width: `${Math.min(100, (cat.count / (stats.totalAnuncios || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Operações Rápidas
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('importar')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Importação em Lote de MLBs</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigateTab('exportacoes')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Exportar Catálogo em CSV / ZIP</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigateTab('configuracoes')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Criar Backup do Banco SQLite</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
