import React, { useEffect, useState } from 'react';
import {
  FileDown,
  Archive,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { fetchAnuncios } from '../services/api.ts';
import { AnuncioSummary } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';

interface ExportacoesProps {
  onSelectAnuncio: (id: number) => void;
}

export const Exportacoes: React.FC<ExportacoesProps> = ({ onSelectAnuncio }) => {
  const [items, setItems] = useState<AnuncioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
    fetchAnuncios({ limit: 100 })
      .then((data) => {
        setItems(data.items);
        // By default, select all
        setSelectedIds(data.items.map((i) => i.id));
      })
      .catch((err) => addToast('erro', 'Erro ao carregar anúncios para exportação', err.message))
      .finally(() => setLoading(false));
  }, [addToast]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const handleExportBatch = async (format: 'zip' | 'csv') => {
    if (selectedIds.length === 0) {
      addToast('aviso', 'Nenhum anúncio selecionado', 'Selecione pelo menos um anúncio para exportar.');
      return;
    }

    setDownloadingFormat(format);
    try {
      const res = await fetch('/api/anuncios/exportar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, formato: format }),
      });

      if (!res.ok) throw new Error('Erro ao gerar arquivo no servidor');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo_ml_${format}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      addToast('sucesso', 'Download concluído com sucesso!');
    } catch (err: any) {
      addToast('erro', 'Falha ao exportar', err.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileDown className="w-6 h-6 text-amber-500" />
          <span>Central de Exportação de Anúncios</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Exporte seus anúncios armazenados para formatos padrão: JSON, CSV, TXT e pacotes ZIP completos com imagens.
        </p>
      </div>

      {/* Formats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ZIP Package Card */}
        <div className="p-5 rounded-2xl border border-amber-300/40 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-slate-900 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-amber-400 text-slate-950 w-fit shadow-md">
              <Archive className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Pacote ZIP Completo
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inclui <code className="text-amber-700 dark:text-amber-400 font-mono">anuncio.json</code>,{' '}
              <code className="text-amber-700 dark:text-amber-400 font-mono">anuncio.csv</code>,{' '}
              <code className="text-amber-700 dark:text-amber-400 font-mono">descricao.txt</code>,{' '}
              <code className="text-amber-700 dark:text-amber-400 font-mono">/imagens/</code>,{' '}
              <code className="text-amber-700 dark:text-amber-400 font-mono">variacoes.csv</code> e{' '}
              <code className="text-amber-700 dark:text-amber-400 font-mono">atributos.csv</code>.
            </p>
          </div>
          <button
            onClick={() => handleExportBatch('zip')}
            disabled={downloadingFormat === 'zip' || selectedIds.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {downloadingFormat === 'zip' ? 'Gerando ZIP...' : `Exportar ZIP (${selectedIds.length})`}
          </button>
        </div>

        {/* CSV Excel Card */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Planilha CSV (Excel Windows)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Planilha com codificação UTF-8 BOM para abertura perfeita no Microsoft Excel no Windows sem erros de acentuação.
            </p>
          </div>
          <button
            onClick={() => handleExportBatch('csv')}
            disabled={downloadingFormat === 'csv' || selectedIds.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {downloadingFormat === 'csv' ? 'Gerando CSV...' : `Exportar CSV (${selectedIds.length})`}
          </button>
        </div>

        {/* JSON Card */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Formato JSON
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Estrutura de dados completa para integrações com APIs, ERPs, bancos NoSQL e migrações.
            </p>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Disponível individualmente na página de detalhes de cada anúncio ou incluído no ZIP.
          </p>
        </div>

        {/* TXT Card */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Texto TXT Estruturado
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Contém título, preço, link, especificações e texto da descrição preservando quebras de linha.
            </p>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Disponível na aba Descrição e incluído no pacote ZIP de cada anúncio.
          </p>
        </div>
      </div>

      {/* Select Items for Export */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Selecionar Anúncios para Exportação
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {selectedIds.length} selecionados
            </span>
          </div>

          <button
            onClick={handleSelectAll}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            {selectedIds.length === items.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum anúncio armazenado para exportar.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />

                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[11px] shrink-0 border border-amber-300/40">
                      {item.mlb_id}
                    </span>

                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.titulo}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-slate-500 text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                    </span>
                    <span>Estoque: {item.quantidade}</span>
                    <a
                      href={`/api/anuncios/${item.id}/exportar-imagens-zip`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 font-bold text-[10px]"
                      title="Baixar apenas fotos do anúncio em alta resolução"
                    >
                      Fotos (ZIP)
                    </a>
                    <a
                      href={`/api/anuncios/${item.id}/exportar/zip`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-bold"
                    >
                      ZIP Completo
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
