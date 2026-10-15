import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Package,
  Layers,
  Copy,
  Trash2,
  FileDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { AnuncioSummary } from '../types/index.ts';
import {
  fetchAnuncios,
  deleteAnuncio,
  deleteBatch,
  duplicateAnuncio,
  duplicateBatch,
} from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { Modal } from '../components/Modal.tsx';

interface MeusAnunciosProps {
  onSelectAnuncio: (id: number) => void;
  searchTermInitial?: string;
  onNavigateToImport: () => void;
}

export const MeusAnuncios: React.FC<MeusAnunciosProps> = ({
  onSelectAnuncio,
  searchTermInitial = '',
  onNavigateToImport,
}) => {
  const [items, setItems] = useState<AnuncioSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState(searchTermInitial);
  const [categoria, setCategoria] = useState('');
  const [status, setStatus] = useState('todos');
  const [precoMin, setPrecoMin] = useState<string>('');
  const [precoMax, setPrecoMax] = useState<string>('');
  const [sortBy, setSortBy] = useState('data_importacao');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const limit = 15;

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [deleteModal, setDeleteModal] = useState<{ id?: number; isBatch?: boolean } | null>(null);
  const [exportModal, setExportModal] = useState<boolean>(false);

  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAnuncios({
        search,
        categoria: categoria || undefined,
        status: status !== 'todos' ? status : undefined,
        precoMin: precoMin ? Number(precoMin) : undefined,
        precoMax: precoMax ? Number(precoMax) : undefined,
        limit,
        offset: page * limit,
        sortBy,
        sortOrder,
      });

      setItems(data.items);
      setTotal(data.total);
      setCategories(data.categories);
    } catch (err: any) {
      addToast('erro', 'Erro ao carregar anúncios', err.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoria, status, precoMin, precoMax, sortBy, sortOrder, page, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAllOnPage = () => {
    if (selectedIds.length === items.length && items.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSingleDelete = async () => {
    if (!deleteModal?.id) return;
    try {
      await deleteAnuncio(deleteModal.id);
      addToast('sucesso', 'Anúncio excluído com sucesso');
      setDeleteModal(null);
      setSelectedIds((prev) => prev.filter((i) => i !== deleteModal.id));
      loadData();
    } catch (err: any) {
      addToast('erro', 'Erro ao excluir anúncio', err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatch(selectedIds);
      addToast('sucesso', `${selectedIds.length} anúncios excluídos com sucesso`);
      setDeleteModal(null);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addToast('erro', 'Erro na exclusão em lote', err.message);
    }
  };

  const handleSingleDuplicate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await duplicateAnuncio(id);
      addToast('sucesso', 'Anúncio duplicado com sucesso!', `Novo registro #${res.newId}`);
      loadData();
    } catch (err: any) {
      addToast('erro', 'Erro ao duplicar', err.message);
    }
  };

  const handleBatchDuplicate = async () => {
    if (selectedIds.length === 0) return;
    try {
      const createdIds = await duplicateBatch(selectedIds);
      addToast('sucesso', `${createdIds.length} anúncios duplicados com sucesso!`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addToast('erro', 'Erro na duplicação em lote', err.message);
    }
  };

  const handleBatchExport = (format: 'zip' | 'csv') => {
    if (selectedIds.length === 0) return;
    // Trigger download via POST form or fetch blob
    fetch('/api/anuncios/exportar-lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, formato: format }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anuncios_exportados_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        addToast('sucesso', 'Download da exportação iniciado!');
        setExportModal(false);
      })
      .catch((err) => addToast('erro', 'Erro ao exportar', err.message));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por MLB, Título, SKU ou EAN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Categoria Filter */}
          <div className="md:col-span-3">
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="todos">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="paused">Pausados</option>
              <option value="closed">Fechados</option>
            </select>
          </div>

          {/* Clear Filters / Refresh */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={() => {
                setSearch('');
                setCategoria('');
                setStatus('todos');
                setPrecoMin('');
                setPrecoMax('');
                setPage(0);
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-colors text-center"
            >
              Limpar
            </button>
            <button
              onClick={loadData}
              title="Recarregar tabela"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Additional Filters: Preço min/max and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Faixa de Preço (R$):</span>
            <input
              type="number"
              placeholder="Mín"
              value={precoMin}
              onChange={(e) => {
                setPrecoMin(e.target.value);
                setPage(0);
              }}
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
            <span className="text-slate-400">até</span>
            <input
              type="number"
              placeholder="Máx"
              value={precoMax}
              onChange={(e) => {
                setPrecoMax(e.target.value);
                setPage(0);
              }}
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="data_importacao">Data de Importação</option>
              <option value="preco">Preço</option>
              <option value="quantidade">Estoque</option>
              <option value="vendidos">Vendidos</option>
              <option value="titulo">Título</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Batch Operations Floating Bar (when items selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 p-3 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold">
              {selectedIds.length}
            </span>
            <span className="font-semibold">anúncios selecionados</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Exportar selecionados</span>
            </button>
            <button
              onClick={handleBatchDuplicate}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicar selecionados</span>
            </button>
            <button
              onClick={() => setDeleteModal({ isBatch: true })}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir selecionados</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white ml-1"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Buscando anúncios...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Nenhum anúncio encontrado
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os filtros de busca ou importe novos anúncios do Mercado Livre.
              </p>
            </div>
            <button
              onClick={onNavigateToImport}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
            >
              Importar Anúncio Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <button
                      onClick={handleSelectAllOnPage}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {selectedIds.length === items.length && items.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-16">Imagem</th>
                  <th className="p-3.5 w-32">MLB</th>
                  <th className="p-3.5 min-w-[240px]">Título</th>
                  <th className="p-3.5">Preço</th>
                  <th className="p-3.5">Estoque</th>
                  <th className="p-3.5">Vendidos</th>
                  <th className="p-3.5">Data Importação</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectAnuncio(item.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectOne(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-amber-500"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Imagem */}
                      <td className="p-3.5">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.imagem_capa ? (
                            <img
                              src={item.imagem_capa}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* MLB ID */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[11px] border border-amber-300/40">
                            {item.mlb_id}
                          </span>
                          {item.sku && (
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Título & Categoria */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-amber-600 dark:hover:text-amber-400">
                            {item.titulo}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{item.categoria_nome || 'Sem categoria'}</span>
                            {item.total_variacoes > 0 && (
                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                • {item.total_variacoes} variações
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Preço */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                          R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                        </div>
                        {item.preco_promocional && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Promoção ativa
                          </span>
                        )}
                      </td>

                      {/* Estoque */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                            item.quantidade > 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {item.quantidade} un
                        </span>
                      </td>

                      {/* Vendidos */}
                      <td className="p-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {item.vendidos}
                      </td>

                      {/* Data de Importação */}
                      <td className="p-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(item.data_importacao).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectAnuncio(item.id)}
                            title="Visualizar e Editar"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleSingleDuplicate(e, item.id)}
                            title="Duplicar Anúncio"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/anuncios/${item.id}/exportar-imagens-zip`}
                            download
                            title="Baixar Pacote de Imagens (.zip)"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <a
                            href={`/api/anuncios/${item.id}/exportar/zip`}
                            download
                            title="Exportar Pacote Completo (ZIP)"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setDeleteModal({ id: item.id })}
                            title="Excluir Anúncio"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {items.length} de {total} anúncios
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Página {page + 1} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      <Modal
        isOpen={Boolean(deleteModal)}
        onClose={() => setDeleteModal(null)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Atenção: Ação irreversível!</p>
              <p className="mt-1">
                {deleteModal?.isBatch
                  ? `Deseja realmente excluir ${selectedIds.length} anúncios selecionados do banco SQLite? Todos os atributos, variações e fotos associadas serão removidos.`
                  : 'Deseja excluir este anúncio do banco de dados local?'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={deleteModal?.isBatch ? handleBatchDelete : handleSingleDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md"
            >
              Excluir Definitivamente
            </button>
          </div>
        </div>
      </Modal>

      {/* BATCH EXPORT MODAL */}
      <Modal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        title="Exportar Anúncios Selecionados"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Você tem <strong>{selectedIds.length}</strong> anúncios selecionados. Escolha o formato desejado para exportação:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleBatchExport('zip')}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400 text-left space-y-1.5 transition-colors group"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500">
                <FileDown className="w-4 h-4 text-amber-500" />
                <span>Pacote ZIP Completo</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gera pastas individuais por MLB com imagens, JSON, CSVs de variações e atributos, e tabela mestre.
              </p>
            </button>

            <button
              onClick={() => handleBatchExport('csv')}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400 text-left space-y-1.5 transition-colors group"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500">
                <FileDown className="w-4 h-4 text-emerald-500" />
                <span>Planilha CSV Única</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gera um único arquivo CSV compatível com Excel no Windows (UTF-8 BOM) com os dados tabulares.
              </p>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
