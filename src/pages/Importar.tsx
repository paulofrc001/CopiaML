import React, { useState } from 'react';
import {
  DownloadCloud,
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  FolderDown,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { checkMlbExists, importListing, importBatch } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { Modal } from '../components/Modal.tsx';

interface ImportarProps {
  onSuccess: (id: number) => void;
  onNavigateToAnuncios: () => void;
}

export const Importar: React.FC<ImportarProps> = ({ onSuccess, onNavigateToAnuncios }) => {
  const [mode, setMode] = useState<'individual' | 'lote'>('individual');
  const [inputUrl, setInputUrl] = useState('');
  const [downloadImages, setDownloadImages] = useState(true);
  const [loading, setLoading] = useState(false);

  // Duplicidade modal
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    existingId: number;
    mlbId: string;
    titulo: string;
    preco: number;
    input: string;
  } | null>(null);

  // Lote state
  const [batchText, setBatchText] = useState('');
  const [batchProgress, setBatchProgress] = useState<{
    isRunning: boolean;
    total: number;
    current: number;
    currentId: string;
    results: any[];
  } | null>(null);

  const { addToast } = useToast();

  // Exemplos rápidos para facilitar testes imediatos pelo usuário
  const sampleItems = [
    { label: 'Exemplo Camiseta (MLBU)', id: 'https://www.mercadolivre.com.br/camiseta-masculina-basica-gola-redonda-algodao-varias-cores/up/MLBU4817623897' },
    { label: 'Exemplo MLB Tênis', id: 'MLB3564789123' },
    { label: 'Exemplo Fone Bluetooth', id: 'MLB2876543210' },
  ];

  const handleSingleImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      addToast('aviso', 'Campo vazio', 'Insira o ID ou URL do anúncio do Mercado Livre.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verifica se já existe no banco local
      const check = await checkMlbExists(trimmed);
      if (check.exists) {
        setDuplicateModal({
          isOpen: true,
          existingId: check.existingId,
          mlbId: check.mlbId,
          titulo: check.titulo,
          preco: check.preco,
          input: trimmed,
        });
        setLoading(false);
        return;
      }

      // 2. Não existe, prossegue com a importação
      const res = await importListing(trimmed, downloadImages, 'create');
      addToast('sucesso', 'Anúncio importado com sucesso!', `Anúncio ${res.id} salvo no SQLite.`);
      setInputUrl('');
      onSuccess(res.id);
    } catch (err: any) {
      addToast('erro', 'Falha na importação', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateAction = async (action: 'update' | 'copy') => {
    if (!duplicateModal) return;
    setLoading(true);
    try {
      if (action === 'update') {
        const res = await importListing(duplicateModal.input, downloadImages, 'update');
        addToast('sucesso', 'Anúncio atualizado com sucesso!', 'As informações foram sincronizadas e registradas no histórico.');
        setDuplicateModal(null);
        onSuccess(duplicateModal.existingId);
      } else {
        const res = await importListing(duplicateModal.input, downloadImages, 'create');
        addToast('sucesso', 'Nova cópia criada com sucesso!', 'Uma nova versão foi cadastrada no banco.');
        setDuplicateModal(null);
        onSuccess(res.id);
      }
    } catch (err: any) {
      addToast('erro', 'Erro ao processar', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBatch = async () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      addToast('aviso', 'Lista vazia', 'Insira pelo menos um ID ou URL por linha.');
      return;
    }

    setBatchProgress({
      isRunning: true,
      total: lines.length,
      current: 0,
      currentId: lines[0],
      results: [],
    });

    try {
      const results = await importBatch(lines, downloadImages);
      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              isRunning: false,
              current: lines.length,
              currentId: 'Finalizado',
              results,
            }
          : null
      );
      const successCount = results.filter((r: any) => r.success).length;
      addToast('sucesso', 'Importação em lote concluída!', `${successCount} de ${lines.length} anúncios importados com sucesso.`);
    } catch (err: any) {
      addToast('erro', 'Erro na importação em lote', err.message);
      setBatchProgress((prev) => (prev ? { ...prev, isRunning: false } : null));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DownloadCloud className="w-6 h-6 text-amber-500" />
            <span>Importação de Anúncios</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Conecte à API oficial do Mercado Livre para extrair títulos, variações, imagens e atributos completos.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMode('individual')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'individual'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setMode('lote')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'lote'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Em Lote
          </button>
        </div>
      </div>

      {mode === 'individual' ? (
        /* INDIVIDUAL IMPORT CARD */
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <form onSubmit={handleSingleImport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                URL ou ID do anúncio Mercado Livre
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://www.mercadolivre.com.br/.../up/MLBU4817623897 ou MLB1234567890"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-inner"
                  disabled={loading}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <span>Identifica automaticamente links no formato /up/MLBU..., /p/MLB..., URLs diretas e códigos MLB.</span>
              </p>
            </div>

            {/* Quick Sample Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-400">Exemplos rápidos:</span>
              {sampleItems.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputUrl(sample.id)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {/* Options */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderDown className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Baixar imagens para pasta local
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Salva automaticamente em /dados/anuncios/[MLB]/imagens/
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={downloadImages}
                  onChange={(e) => setDownloadImages(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !inputUrl.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CONECTANDO À API DO MERCADO LIVRE...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-5 h-5" />
                  <span>IMPORTAR ANÚNCIO</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* BATCH IMPORT CARD */
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Inserir múltiplos IDs ou URLs (um por linha)
            </label>
            <textarea
              rows={6}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`MLB1234567890\nMLB9876543210\nhttps://produto.mercadolivre.com.br/MLB-555444333...`}
              disabled={batchProgress?.isRunning}
              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-mono text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total informado: <strong>{batchText.split('\n').filter((l) => l.trim()).length}</strong> itens
            </span>
            <button
              onClick={handleStartBatch}
              disabled={batchProgress?.isRunning || !batchText.trim()}
              className="py-2.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {batchProgress?.isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PROCESSANDO LOTE...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>INICIAR IMPORTAÇÃO EM LOTE</span>
                </>
              )}
            </button>
          </div>

          {/* Batch Progress and Results */}
          {batchProgress && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Progresso da Importação:
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {batchProgress.current} de {batchProgress.total} processados
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{
                    width: `${Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Results list */}
              {batchProgress.results && batchProgress.results.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {batchProgress.results.map((res: any, i: number) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                        res.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {res.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-mono font-bold">{res.mlbId}</span>
                        <span className="truncate">{res.titulo || res.error}</span>
                      </div>
                      {res.success && (
                        <button
                          onClick={() => onSuccess(res.id)}
                          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                        >
                          Ver
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Information Banner */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-amber-500/5 text-slate-600 dark:text-slate-400 text-xs flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Armazenamento Integral no SQLite
          </p>
          <p>
            O sistema salva título, descrição sem formatação perdida, tabela de variações, todos os atributos técnicos e JSON bruto original na base <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">mercadolivre.db</code>.
          </p>
        </div>
      </div>

      {/* DUPLICATE MODAL */}
      <Modal
        isOpen={Boolean(duplicateModal?.isOpen)}
        onClose={() => setDuplicateModal(null)}
        title="Anúncio Já Cadastrado"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Este anúncio já está cadastrado no banco de dados.</p>
              <p className="mt-1">
                <strong>MLB:</strong> {duplicateModal?.mlbId}
              </p>
              <p>
                <strong>Título:</strong> {duplicateModal?.titulo}
              </p>
              <p>
                <strong>Preço Atual no Banco:</strong> R$ {duplicateModal?.preco?.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Você pode atualizar as informações existentes (registrando alterações no histórico) ou criar uma nova cópia independente para edição.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setDuplicateModal(null)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              CANCELAR
            </button>
            <button
              onClick={() => handleDuplicateAction('copy')}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100"
            >
              CRIAR NOVA CÓPIA
            </button>
            <button
              onClick={() => handleDuplicateAction('update')}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md"
            >
              ATUALIZAR DADOS
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
