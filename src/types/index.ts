export interface AnuncioSummary {
  id: number;
  mlb_id: string;
  titulo: string;
  preco: number;
  preco_promocional?: number | null;
  moeda: string;
  quantidade: number;
  vendidos: number;
  status: string;
  categoria_nome: string;
  sku?: string | null;
  ean?: string | null;
  permalink?: string | null;
  imagem_capa?: string | null;
  total_variacoes: number;
  total_imagens: number;
  data_importacao: string;
}

export interface ImagemItem {
  id: number;
  anuncio_id: number;
  ml_image_id: string;
  url: string;
  url_original: string;
  ordem: number;
  local_path?: string | null;
}

export interface AtributoItem {
  id: number;
  anuncio_id: number;
  attribute_id: string;
  nome: string;
  valor: string;
}

export interface VariacaoAtributoItem {
  id: number;
  variacao_id: number;
  attribute_id: string;
  nome: string;
  valor: string;
}

export interface VariacaoItem {
  id: number;
  anuncio_id: number;
  variation_id: string;
  sku?: string | null;
  preco: number;
  estoque: number;
  gtin?: string | null;
  cor?: string | null;
  tamanho?: string | null;
  atributos: VariacaoAtributoItem[];
}

export interface HistoricoItem {
  id: number;
  anuncio_id: number;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  data: string;
}

export interface AnuncioCompleto {
  id: number;
  mlb_id: string;
  titulo: string;
  subtitulo?: string | null;
  descricao: string;
  categoria_id: string;
  categoria_nome: string;
  preco: number;
  preco_promocional?: number | null;
  moeda: string;
  condicao: string;
  quantidade: number;
  vendidos: number;
  status: string;
  tipo_anuncio: string;
  permalink: string;
  sku?: string | null;
  codigo_interno?: string | null;
  gtin?: string | null;
  ean?: string | null;
  isbn?: string | null;
  marca?: string | null;
  modelo?: string | null;
  fabricante?: string | null;
  linha?: string | null;
  genero?: string | null;
  material?: string | null;
  cor?: string | null;
  tamanho?: string | null;
  raw_json: string;
  data_criacao: string;
  data_atualizacao: string;
  data_importacao: string;
  ultima_sincronizacao?: string | null;
  imagens: ImagemItem[];
  atributos: AtributoItem[];
  variacoes: VariacaoItem[];
  historico: HistoricoItem[];
}

export interface DashboardStats {
  totalAnuncios: number;
  totalAtivos: number;
  totalPausados: number;
  totalEstoque: number;
  totalVendidos: number;
  precoMedio: number;
  totalVariacoes: number;
  totalSkus: number;
  ultimosAnuncios: AnuncioSummary[];
  categoriasDist: { categoria: string; count: number }[];
}

export interface BackupItem {
  filename: string;
  size: number;
  date: string;
}

export interface LogItem {
  id: number;
  nivel: 'info' | 'warn' | 'error';
  acao: string;
  mensagem: string;
  detalhes?: string | null;
  data: string;
}
