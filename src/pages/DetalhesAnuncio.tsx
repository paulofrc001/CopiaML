import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  Copy,
  Download,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
  FileText,
  Image as ImageIcon,
  SlidersHorizontal,
  History,
  Code,
  AlertCircle,
  Plus,
  Trash2,
  FileDown,
  Calendar,
  CheckCircle2,
  Info,
  HardDrive,
  FolderDown,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { AnuncioCompleto, AtributoItem, VariacaoItem } from '../types/index.ts';
import {
  fetchAnuncioById,
  updateAnuncio,
  syncAnuncioWithML,
  duplicateAnuncio,
  getExportUrl,
  getImagensZipUrl,
  downloadAllAnuncioImages,
  addAnuncioImage,
  deleteAnuncioImage,
} from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { Modal } from '../components/Modal.tsx';

interface DetalhesAnuncioProps {
  anuncioId: number;
  onBack: () => void;
  onDuplicateSuccess: (newId: number) => void;
}

type TabType =
  | 'geral'
  | 'descricao'
  | 'imagens'
  | 'atributos'
  | 'variacoes'
  | 'tecnicos'
  | 'json'
  | 'historico';

export const DetalhesAnuncio: React.FC<DetalhesAnuncioProps> = ({
  anuncioId,
  onBack,
  onDuplicateSuccess,
}) => {
  const [anuncio, setAnuncio] = useState<AnuncioCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form edit state
  const [formData, setFormData] = useState<any>({});

  // Diff / Sync modal
  const [diffModal, setDiffModal] = useState<{
    isOpen: boolean;
    changes: { campo: string; anterior: any; novo: any }[];
  } | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);

  // Image management and downloading
  const [downloadingDisk, setDownloadingDisk] = useState(false);
  const [addImageModal, setAddImageModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addingImage, setAddingImage] = useState(false);

  const { addToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAnuncioById(anuncioId);
      setAnuncio(data);
      setFormData({
        titulo: data.titulo,
        subtitulo: data.subtitulo || '',
        descricao: data.descricao,
        preco: data.preco,
        preco_promocional: data.preco_promocional || '',
        quantidade: data.quantidade,
        status: data.status,
        condicao: data.condicao,
        categoria_nome: data.categoria_nome,
        sku: data.sku || '',
        codigo_interno: data.codigo_interno || '',
        gtin: data.gtin || '',
        ean: data.ean || '',
        isbn: data.isbn || '',
        marca: data.marca || '',
        modelo: data.modelo || '',
        fabricante: data.fabricante || '',
        linha: data.linha || '',
        genero: data.genero || '',
        material: data.material || '',
        cor: data.cor || '',
        tamanho: data.tamanho || '',
        atributos: [...data.atributos],
        variacoes: [...data.variacoes],
      });
    } catch (err: any) {
      addToast('erro', 'Erro ao carregar anúncio', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anuncioId]);

  // Quick Copy Helper
  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('sucesso', `${label} copiado!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Save changes locally to SQLite
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAnuncio(anuncioId, formData);
      setAnuncio(updated);
      addToast('sucesso', 'Alterações salvas com sucesso no banco SQLite!');
    } catch (err: any) {
      addToast('erro', 'Erro ao salvar alterações', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sync / Update data from Mercado Livre official API
  const handleSyncWithML = async () => {
    setSyncing(true);
    try {
      const res = await syncAnuncioWithML(anuncioId);
      setAnuncio(res.anuncio);
      setFormData((prev: any) => ({
        ...prev,
        titulo: res.anuncio.titulo,
        subtitulo: res.anuncio.subtitulo || '',
        descricao: res.anuncio.descricao,
        preco: res.anuncio.preco,
        quantidade: res.anuncio.quantidade,
        status: res.anuncio.status,
        atributos: [...res.anuncio.atributos],
        variacoes: [...res.anuncio.variacoes],
      }));

      if (res.changes && res.changes.length > 0) {
        setDiffModal({ isOpen: true, changes: res.changes });
        addToast('sucesso', 'Dados atualizados!', `${res.changes.length} alterações detectadas.`);
      } else {
        addToast('aviso', 'Dados já atualizados', 'Nenhuma divergência encontrada entre o Mercado Livre e o banco local.');
      }
    } catch (err: any) {
      addToast('erro', 'Erro ao atualizar dados com o Mercado Livre', err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Duplicate Listing
  const handleDuplicate = async () => {
    try {
      const res = await duplicateAnuncio(anuncioId);
      addToast('sucesso', 'Anúncio duplicado com sucesso!', `Nova cópia criada com ID #${res.newId}`);
      onDuplicateSuccess(res.newId);
    } catch (err: any) {
      addToast('erro', 'Erro ao duplicar anúncio', err.message);
    }
  };

  // Baixar todas as fotos para o disco local (/dados/anuncios/{mlbId}/imagens/)
  const handleDownloadAllToDisk = async (force = false) => {
    setDownloadingDisk(true);
    try {
      const res = await downloadAllAnuncioImages(anuncioId, force);
      addToast('sucesso', 'Imagens baixadas com sucesso!', res.message);
      const updated = await fetchAnuncioById(anuncioId);
      setAnuncio(updated);
    } catch (err: any) {
      addToast('erro', 'Falha ao baixar imagens', err.message);
    } finally {
      setDownloadingDisk(false);
    }
  };

  // Adicionar imagem avulsa via URL
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    setAddingImage(true);
    try {
      await addAnuncioImage(anuncioId, newImageUrl.trim());
      addToast('sucesso', 'Imagem adicionada e salva com sucesso!');
      setNewImageUrl('');
      setAddImageModal(false);
      const updated = await fetchAnuncioById(anuncioId);
      setAnuncio(updated);
    } catch (err: any) {
      addToast('erro', 'Erro ao adicionar imagem', err.message);
    } finally {
      setAddingImage(false);
    }
  };

  // Excluir imagem
  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Deseja excluir esta imagem do anúncio?')) return;
    try {
      await deleteAnuncioImage(anuncioId, imageId);
      addToast('sucesso', 'Imagem removida com sucesso!');
      const updated = await fetchAnuncioById(anuncioId);
      setAnuncio(updated);
    } catch (err: any) {
      addToast('erro', 'Erro ao remover imagem', err.message);
    }
  };

  // Dynamic Attribute Handlers
  const handleAddAttribute = () => {
    setFormData((prev: any) => ({
      ...prev,
      atributos: [
        ...prev.atributos,
        { id: Date.now(), attribute_id: 'CUSTOM', nome: 'Novo Atributo', valor: '' },
      ],
    }));
  };

  const handleUpdateAttribute = (index: number, field: 'nome' | 'valor', value: string) => {
    setFormData((prev: any) => {
      const copy = [...prev.atributos];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, atributos: copy };
    });
  };

  const handleRemoveAttribute = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      atributos: prev.atributos.filter((_: any, i: number) => i !== index),
    }));
  };

  if (loading || !anuncio) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Carregando dados completos do anúncio...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'geral' as TabType, label: 'Geral', icon: Package },
    { id: 'descricao' as TabType, label: 'Descrição', icon: FileText },
    { id: 'imagens' as TabType, label: `Imagens (${anuncio.imagens?.length || 0})`, icon: ImageIcon },
    { id: 'atributos' as TabType, label: `Atributos (${anuncio.atributos?.length || 0})`, icon: SlidersHorizontal },
    { id: 'variacoes' as TabType, label: `Variações (${anuncio.variacoes?.length || 0})`, icon: Layers },
    { id: 'tecnicos' as TabType, label: 'Dados Técnicos', icon: Info },
    { id: 'json' as TabType, label: 'JSON Original', icon: Code },
    { id: 'historico' as TabType, label: `Histórico (${anuncio.historico?.length || 0})`, icon: History },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/70 px-2.5 py-1 rounded-lg text-xs border border-amber-300/40">
                {anuncio.mlb_id}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg uppercase ${
                  anuncio.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {anuncio.status === 'active' ? 'Ativo no ML' : anuncio.status}
              </span>
              <span className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {anuncio.condicao === 'new' ? 'Novo' : anuncio.condicao === 'used' ? 'Usado' : anuncio.condicao}
              </span>
              {anuncio.permalink && (
                <a
                  href={anuncio.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold ml-1"
                >
                  <span>Ver no Mercado Livre</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">
              {formData.titulo}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncWithML}
              disabled={syncing}
              title="Consultar novamente o Mercado Livre e comparar mudanças"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-500' : ''}`} />
              <span>ATUALIZAR DADOS</span>
            </button>

            <button
              onClick={handleDuplicate}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>DUPLICAR ANÚNCIO</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-500" />
                <span>EXPORTAR ANÚNCIO</span>
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 text-xs"
                  onClick={() => setExportOpen(false)}
                >
                  <a
                    href={getExportUrl(anuncioId, 'zip')}
                    download
                    className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <Download className="w-4 h-4 text-amber-500" />
                    <span>Pacote ZIP Completo</span>
                  </a>
                  <a
                    href={getExportUrl(anuncioId, 'json')}
                    download
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span>JSON Estruturado</span>
                  </a>
                  <a
                    href={getExportUrl(anuncioId, 'csv')}
                    download
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span>Planilha CSV (Excel)</span>
                  </a>
                  <a
                    href={getExportUrl(anuncioId, 'txt')}
                    download
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span>Descrição em TXT</span>
                  </a>
                  <a
                    href={getExportUrl(anuncioId, 'variacoes-csv')}
                    download
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span>Variações em CSV</span>
                  </a>
                  <a
                    href={getExportUrl(anuncioId, 'atributos-csv')}
                    download
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span>Atributos em CSV</span>
                  </a>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</span>
            </button>
          </div>
        </div>

        {/* Quick Copy Toolbar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
            Copiar Rápido:
          </span>

          <button
            onClick={() => copyToClipboard(anuncio.titulo, 'titulo', 'Título')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copiedKey === 'titulo' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>COPIAR TÍTULO</span>
          </button>

          <button
            onClick={() => copyToClipboard(anuncio.descricao, 'descricao', 'Descrição')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copiedKey === 'descricao' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>COPIAR DESCRIÇÃO</span>
          </button>

          <button
            onClick={() => copyToClipboard(anuncio.sku || 'Nenhum SKU', 'sku', 'SKU')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copiedKey === 'sku' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>COPIAR SKU</span>
          </button>

          <button
            onClick={() => copyToClipboard(anuncio.permalink || '', 'link', 'Link')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copiedKey === 'link' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>COPIAR LINK</span>
          </button>

          <button
            onClick={() => copyToClipboard(JSON.stringify(anuncio, null, 2), 'json', 'JSON')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copiedKey === 'json' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>COPIAR JSON</span>
          </button>

          <button
            onClick={() => {
              const fullDetails = `PRODUTO: ${anuncio.titulo}\nMLB: ${anuncio.mlb_id}\nPREÇO: R$ ${anuncio.preco}\nESTOQUE: ${anuncio.quantidade}\nSKU: ${anuncio.sku || 'N/A'}\nLINK: ${anuncio.permalink}\n\nDESCRIÇÃO:\n${anuncio.descricao}`;
              copyToClipboard(fullDetails, 'completos', 'Dados Completos');
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 font-bold flex items-center gap-1 hover:bg-amber-400/30 transition-colors"
          >
            {copiedKey === 'completos' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>COPIAR DADOS COMPLETOS</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-px text-xs font-bold">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-t-2 border-x border-amber-500 dark:border-amber-400 text-amber-600 dark:text-amber-400 -mb-px'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-h-[400px]">
        {/* 1. GERAL */}
        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Título do Anúncio
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={formData.subtitulo}
                  onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                  placeholder="Não especificado"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.categoria_nome}
                  onChange={(e) => setFormData({ ...formData, categoria_nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Preço Promocional (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.preco_promocional}
                  onChange={(e) => setFormData({ ...formData, preco_promocional: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Sem promoção"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Estoque Disponível
                </label>
                <input
                  type="number"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="active">active (Ativo)</option>
                  <option value="paused">paused (Pausado)</option>
                  <option value="closed">closed (Fechado/Finalizado)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Condição
                </label>
                <select
                  value={formData.condicao}
                  onChange={(e) => setFormData({ ...formData, condicao: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="new">new (Novo)</option>
                  <option value="used">used (Usado)</option>
                  <option value="not_specified">not_specified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  SKU (Código do Vendedor)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  EAN / GTIN
                </label>
                <input
                  type="text"
                  value={formData.ean || formData.gtin}
                  onChange={(e) => setFormData({ ...formData, ean: e.target.value, gtin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Fabricante
                </label>
                <input
                  type="text"
                  value={formData.fabricante}
                  onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Linha
                </label>
                <input
                  type="text"
                  value={formData.linha}
                  onChange={(e) => setFormData({ ...formData, linha: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. DESCRIÇÃO */}
        {activeTab === 'descricao' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Descrição Completa do Anúncio
                </h3>
                <p className="text-xs text-slate-500">
                  Preserva quebras de linha, parágrafos, listas e estrutura original do Mercado Livre.
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(formData.descricao, 'desc_tab', 'Descrição')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {copiedKey === 'desc_tab' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>COPIAR DESCRIÇÃO</span>
              </button>
            </div>

            <textarea
              rows={16}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="Nenhuma descrição disponível para este anúncio."
            />
          </div>
        )}

        {/* 3. IMAGENS */}
        {activeTab === 'imagens' && (
          <div className="space-y-6">
            {/* Top Bar with actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-500" />
                    <span>Galeria de Imagens ({anuncio.imagens?.length || 0})</span>
                  </h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    (anuncio.imagens || []).filter(i => Boolean(i.local_path)).length === (anuncio.imagens?.length || 0) && (anuncio.imagens?.length || 0) > 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}>
                    {(anuncio.imagens || []).filter(i => Boolean(i.local_path)).length} de {anuncio.imagens?.length || 0} salvas no disco
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span>Pasta local:</span>
                  <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                    /dados/anuncios/{anuncio.mlb_id}/imagens/
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`/dados/anuncios/${anuncio.mlb_id}/imagens/`, 'dir_path', 'Caminho da pasta')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] underline ml-1 cursor-pointer"
                  >
                    Copiar caminho
                  </button>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAllToDisk(false)}
                  disabled={downloadingDisk}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Baixa fisicamente todas as imagens para a pasta /dados/anuncios/[MLB]/imagens/"
                >
                  {downloadingDisk ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  ) : (
                    <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>{downloadingDisk ? 'BAIXANDO PARA O DISCO...' : 'SALVAR TODAS NO DISCO'}</span>
                </button>

                <a
                  href={getImagensZipUrl(anuncioId)}
                  download={`imagens_${anuncio.mlb_id}.zip`}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95 shrink-0"
                  title="Gera e baixa um arquivo ZIP contendo estritamente todas as imagens em alta resolução"
                >
                  <Download className="w-4 h-4" />
                  <span>BAIXAR TODAS AS IMAGENS (ZIP)</span>
                </a>

                <button
                  type="button"
                  onClick={() => setAddImageModal(true)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADICIONAR FOTO</span>
                </button>
              </div>
            </div>

            {(!anuncio.imagens || anuncio.imagens.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-400 border border-dashed rounded-2xl space-y-3">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                <p className="font-semibold text-slate-500">Nenhuma imagem cadastrada para este anúncio.</p>
                <button
                  type="button"
                  onClick={() => setAddImageModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Adicionar primeira imagem
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {anuncio.imagens.map((img, i) => (
                  <div
                    key={img.id}
                    className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Image viewport */}
                    <div
                      onClick={() => setPreviewImage(img.url)}
                      className="aspect-square w-full bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden cursor-zoom-in relative"
                    >
                      <img
                        src={img.url}
                        alt={`Imagem ${i + 1}`}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Floating tag for position */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        {i === 0 ? '★ Capa' : `#${i + 1}`}
                      </span>

                      {/* Floating tag for disk status */}
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-xs flex items-center gap-1 ${
                          img.local_path
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-amber-600/90 text-white'
                        }`}
                        title={img.local_path ? `Salva em: ${img.local_path}` : 'Ainda não baixada no disco'}
                      >
                        {img.local_path ? (
                          <>
                            <CheckCheck className="w-2.5 h-2.5" />
                            <span>Disco</span>
                          </>
                        ) : (
                          <span>Pendente</span>
                        )}
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={img.ml_image_id}>
                          {img.ml_image_id || `Foto #${i + 1}`}
                        </p>
                        {img.local_path ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate" title={img.local_path}>
                            {img.local_path.split('/').pop()}
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-500 font-medium">Download local pendente</p>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(img.url, `img_${i}`, `URL Foto ${i + 1}`)}
                            className="flex-1 py-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-center transition-colors truncate text-slate-700 dark:text-slate-300 cursor-pointer"
                            title="Copiar URL Original"
                          >
                            Copiar URL
                          </button>

                          <a
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            download={`mlb_${anuncio.mlb_id}_${i + 1}.jpg`}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors"
                            title="Baixar imagem individual no navegador"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 transition-colors cursor-pointer"
                            title="Excluir imagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {img.local_path && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(img.local_path || '', `loc_${i}`, 'Caminho local')}
                            className="w-full py-0.5 text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-mono text-center truncate cursor-pointer"
                            title={`Copiar: ${img.local_path}`}
                          >
                            Copiar caminho local
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. ATRIBUTOS */}
        {activeTab === 'atributos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Atributos Dinâmicos & Ficha Técnica ({formData.atributos?.length || 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Estrutura dinâmica flexível armazenando todos os atributos originais e customizados.
                </p>
              </div>

              <button
                onClick={handleAddAttribute}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADICIONAR ATRIBUTO</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-40">ID do Atributo</th>
                    <th className="p-3 w-64">Nome do Atributo</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3 w-12 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formData.atributos.map((attr: AtributoItem, index: number) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400 text-[11px]">
                        {attr.attribute_id || 'CUSTOM'}
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={attr.nome}
                          onChange={(e) => handleUpdateAttribute(index, 'nome', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={attr.valor}
                          onChange={(e) => handleUpdateAttribute(index, 'valor', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveAttribute(index)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. VARIAÇÕES */}
        {activeTab === 'variacoes' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Grade de Variações ({anuncio.variacoes?.length || 0})
              </h3>
              <p className="text-xs text-slate-500">
                Tabela com detalhes de cores, tamanhos, estoque individual, preços e atributos combinados.
              </p>
            </div>

            {(!anuncio.variacoes || anuncio.variacoes.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                Este anúncio não possui variações cadastradas.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Variação ID</th>
                      <th className="p-3">Cor</th>
                      <th className="p-3">Tamanho</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Estoque</th>
                      <th className="p-3">Preço (R$)</th>
                      <th className="p-3">GTIN/EAN</th>
                      <th className="p-3">Atributos Combinados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {anuncio.variacoes.map((v: VariacaoItem, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {v.variation_id}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {v.cor || '-'}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {v.tamanho || '-'}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {v.sku || '-'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                              v.estoque > 0
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {v.estoque} un
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          R$ {Number(v.preco).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {v.gtin || '-'}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {(v.atributos || []).map((a) => `${a.nome}: ${a.valor}`).join(' | ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. DADOS TÉCNICOS */}
        {activeTab === 'tecnicos' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Metadados do Sistema & Auditoria
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">ID Local no SQLite</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">#{anuncio.id}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">ID Mercado Livre</span>
                <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{anuncio.mlb_id}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">ID da Categoria</span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{anuncio.categoria_id || 'N/A'}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Tipo do Anúncio</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{anuncio.tipo_anuncio || 'gold_pro'}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Data de Criação no ML</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(anuncio.data_criacao).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Última Atualização no ML</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(anuncio.data_atualizacao).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Data de Importação Local</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(anuncio.data_importacao).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Última Sincronização</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {anuncio.ultima_sincronizacao
                    ? new Date(anuncio.ultima_sincronizacao).toLocaleString('pt-BR')
                    : 'Apenas importação'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 7. JSON ORIGINAL */}
        {activeTab === 'json' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Payload JSON Bruto Original
                </h3>
                <p className="text-xs text-slate-500">
                  Dados originais completos preservados sem perdas no campo <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">raw_json</code>.
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(anuncio.raw_json, 'raw_json', 'JSON Bruto')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {copiedKey === 'raw_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>COPIAR JSON BRUTO</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px] border border-slate-800">
              {anuncio.raw_json}
            </pre>
          </div>
        )}

        {/* 8. HISTÓRICO */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Histórico de Atualizações & Alterações
              </h3>
              <p className="text-xs text-slate-500">
                Rastreamento contínuo de alterações de preço, estoque, status e outros campos através da tabela <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">anuncio_historico</code>.
              </p>
            </div>

            {(!anuncio.historico || anuncio.historico.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                Nenhuma alteração registrada ainda no histórico deste anúncio.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {anuncio.historico.map((h) => (
                  <div key={h.id} className="p-3.5 flex items-start justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Campo alterado: {h.campo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                        <span>
                          Anterior: <strong className="text-rose-600 dark:text-rose-400">{h.valor_anterior || 'Vazio'}</strong>
                        </span>
                        <span>→</span>
                        <span>
                          Novo: <strong className="text-emerald-600 dark:text-emerald-400">{h.valor_novo}</strong>
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(h.data).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMAGE PREVIEW LIGHTBOX MODAL */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Visualização em Alta Resolução"
        maxWidth="4xl"
      >
        <div className="flex flex-col items-center justify-center p-2">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[70vh] object-contain rounded-xl"
            />
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => copyToClipboard(previewImage || '', 'modal_img', 'Link da Foto')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              Copiar Link
            </button>
            <a
              href={previewImage || ''}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
            >
              Abrir Imagem em Nova Aba
            </a>
          </div>
        </div>
      </Modal>

      {/* SYNC DIFF MODAL */}
      <Modal
        isOpen={Boolean(diffModal?.isOpen)}
        onClose={() => setDiffModal(null)}
        title="Alterações Detectadas no Mercado Livre"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            A consulta ao Mercado Livre identificou as seguintes diferenças em relação ao cadastro local:
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden">
            {diffModal?.changes.map((change, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">{change.campo}</span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 dark:text-rose-400">
                    Anterior: <strong>{String(change.anterior)}</strong>
                  </span>
                  <span>→</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Atual: <strong>{String(change.novo)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-slate-400 text-[11px]">
            Essas mudanças foram aplicadas e registradas na aba <strong>Histórico</strong>.
          </p>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setDiffModal(null)}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>

      {/* ADD IMAGE MODAL */}
      <Modal
        isOpen={addImageModal}
        onClose={() => setAddImageModal(false)}
        title="Adicionar Nova Imagem ao Anúncio"
      >
        <form onSubmit={handleAddImage} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              URL da Imagem
            </label>
            <input
              type="url"
              required
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://... (URL de imagem em alta resolução)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A imagem será baixada fisicamente para o disco em <code className="font-mono text-amber-600 dark:text-amber-400">/dados/anuncios/{anuncio.mlb_id}/imagens/</code>.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddImageModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addingImage || !newImageUrl.trim()}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {addingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{addingImage ? 'Baixando...' : 'Adicionar e Baixar Imagem'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
