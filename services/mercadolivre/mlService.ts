import fs from 'fs';
import path from 'path';
import { getConfig, logAction } from '../../database/db.ts';

export interface MLItemData {
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
  imagens: {
    ml_image_id: string;
    url: string;
    url_original: string;
    ordem: number;
    local_path?: string;
  }[];
  atributos: {
    attribute_id: string;
    nome: string;
    valor: string;
  }[];
  variacoes: {
    variation_id: string;
    sku?: string | null;
    preco: number;
    estoque: number;
    gtin?: string | null;
    cor?: string | null;
    tamanho?: string | null;
    atributos: {
      attribute_id: string;
      nome: string;
      valor: string;
    }[];
  }[];
}

/**
 * Identifica e extrai o ID do Mercado Livre (MLB...) a partir de URLs ou textos soltos
 */
export function extractMlbId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: Direct MLB or ML country codes (MLB, MLA, MLM, MLC, MCO, MLU, etc.)
  // e.g. MLB1234567890 or MLB-1234567890
  const directMatch = trimmed.match(/^([A-Z]{3})[-_]?([0-9]{6,15})/i);
  if (directMatch) {
    return `${directMatch[1].toUpperCase()}${directMatch[2]}`;
  }

  // Pattern 2: Numbers only (default to MLB)
  if (/^[0-9]{8,15}$/.test(trimmed)) {
    return `MLB${trimmed}`;
  }

  // Pattern 3: From URL
  // e.g. https://produto.mercadolivre.com.br/MLB-1234567890-titulo...
  // or https://www.mercadolivre.com.br/p/MLB12345678
  // or https://articulo.mercadolibre.com.ar/MLA-1234567890-...
  const urlMlbMatch = trimmed.match(/([A-Z]{3})[-_]?([0-9]{6,15})/i);
  if (urlMlbMatch) {
    return `${urlMlbMatch[1].toUpperCase()}${urlMlbMatch[2]}`;
  }

  return null;
}

/**
 * Faz requisição HTTP para a API oficial do Mercado Livre com headers e timeout
 */
async function mlFetch(url: string, token?: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'ML-Manager-App/1.0',
  };

  const configuredToken = token || getConfig('ACCESS_TOKEN') || process.env.ACCESS_TOKEN;
  if (configuredToken && configuredToken.trim()) {
    headers['Authorization'] = `Bearer ${configuredToken.trim()}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.status === 404) {
      throw new Error(`Anúncio não encontrado (404). Verifique se o ID está correto ou se o anúncio ainda existe no Mercado Livre.`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Acesso negado pela API do Mercado Livre (${res.status}). Verifique o token de acesso nas Configurações.`);
    }
    if (res.status === 429) {
      throw new Error(`Limite de requisições excedido na API do Mercado Livre (429 - Rate limit). Aguarde 1 minuto e tente novamente.`);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Erro na API do Mercado Livre (${res.status}): ${errText || res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Tempo limite esgotado (timeout de 15s) ao conectar à API do Mercado Livre.`);
    }
    throw err;
  }
}

/**
 * Busca categoria oficial
 */
async function fetchCategoryName(categoryId: string): Promise<string> {
  if (!categoryId) return 'Não categorizado';
  try {
    const data = await mlFetch(`https://api.mercadolibre.com/categories/${categoryId}`);
    if (data?.name) {
      return data.path_from_root ? data.path_from_root.map((p: any) => p.name).join(' > ') : data.name;
    }
  } catch (e) {
    // Ignora erro de categoria secundária para não travar importação
  }
  return categoryId;
}

/**
 * Busca a descrição completa do anúncio oficial
 */
async function fetchDescription(itemId: string): Promise<string> {
  try {
    const data = await mlFetch(`https://api.mercadolibre.com/items/${itemId}/description`);
    return data.plain_text || data.text || '';
  } catch (err: any) {
    // Alguns anúncios não possuem descrição separada ou retornam 404 para description
    return '';
  }
}

/**
 * Baixa uma imagem e salva no disco local em /dados/anuncios/{MLB_ID}/imagens/
 */
export async function downloadImageToDisk(mlbId: string, url: string, index: number, imageId: string): Promise<string | null> {
  try {
    const dir = path.resolve(process.cwd(), 'dados', 'anuncios', mlbId, 'imagens');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const extMatch = url.match(/\.(jpg|jpeg|png|webp)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const safeImageId = (imageId || `img_${index}`).replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${String(index + 1).padStart(2, '0')}_${safeImageId}.${ext}`;
    const filePath = path.resolve(dir, filename);

    // Se já existe e tem tamanho > 0, pula download
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      return `/dados/anuncios/${mlbId}/imagens/${filename}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    return `/dados/anuncios/${mlbId}/imagens/${filename}`;
  } catch (err) {
    console.warn(`Erro ao baixar imagem ${url} para ${mlbId}:`, err);
    return null;
  }
}

/**
 * Importa todos os dados do anúncio a partir da API oficial do Mercado Livre
 */
export async function importFromMercadoLivre(input: string, downloadImages = true): Promise<MLItemData> {
  const mlbId = extractMlbId(input);
  if (!mlbId) {
    throw new Error(`ID ou URL do anúncio inválido. Por favor, insira um formato aceito como "MLB1234567890" ou link oficial.`);
  }

  logAction('info', 'IMPORTAR_INICIO', `Iniciando importação do anúncio ${mlbId}`);

  // 1. Busca item principal
  const item = await mlFetch(`https://api.mercadolibre.com/items/${mlbId}`);

  // 2. Busca descrição e categoria em paralelo
  const [descriptionText, categoryName] = await Promise.all([
    fetchDescription(mlbId),
    item.category_id ? fetchCategoryName(item.category_id) : Promise.resolve('Não categorizado'),
  ]);

  // 3. Processa atributos gerais e dinâmicos
  const rawAttributes = Array.isArray(item.attributes) ? item.attributes : [];
  const findAttr = (ids: string[]) => {
    for (const id of ids) {
      const found = rawAttributes.find((a: any) => a.id === id || a.name?.toUpperCase() === id.toUpperCase());
      if (found && (found.value_name || found.value_id)) {
        return found.value_name || found.value_id;
      }
    }
    return null;
  };

  const sku = findAttr(['SELLER_SKU', 'SKU']) || item.seller_custom_field || null;
  const gtin = findAttr(['GTIN', 'EAN']) || null;
  const ean = findAttr(['EAN']) || gtin || null;
  const isbn = findAttr(['ISBN']) || null;
  const marca = findAttr(['BRAND', 'MARCA']) || null;
  const modelo = findAttr(['MODEL', 'MODELO']) || null;
  const fabricante = findAttr(['MANUFACTURER', 'FABRICANTE']) || null;
  const linha = findAttr(['LINE', 'LINHA']) || null;
  const genero = findAttr(['GENDER', 'GÊNERO', 'GENERO']) || null;
  const material = findAttr(['MATERIAL', 'MATERIALS', 'MATERIAL_PRINCIPAL']) || null;
  const cor = findAttr(['COLOR', 'COR', 'COR_PRINCIPAL']) || null;
  const tamanho = findAttr(['SIZE', 'TAMANHO']) || null;

  // Monta lista de atributos completos
  const atributos = rawAttributes.map((attr: any) => ({
    attribute_id: attr.id || 'CUSTOM',
    nome: attr.name || attr.id || 'Atributo',
    valor: attr.value_name || attr.value_id || (Array.isArray(attr.values) ? attr.values.map((v: any) => v.name).join(', ') : '') || '',
  })).filter((a: any) => Boolean(a.valor));

  // 4. Processa imagens
  const rawPictures = Array.isArray(item.pictures) ? item.pictures : [];
  const imagens: MLItemData['imagens'] = [];

  for (let i = 0; i < rawPictures.length; i++) {
    const pic = rawPictures[i];
    const highResUrl = pic.secure_url || pic.url || '';
    const originalUrl = pic.url || pic.secure_url || '';
    let localPath: string | undefined = undefined;

    if (downloadImages && highResUrl) {
      const downloaded = await downloadImageToDisk(mlbId, highResUrl, i, pic.id || `img_${i}`);
      if (downloaded) localPath = downloaded;
    }

    imagens.push({
      ml_image_id: pic.id || `pic_${i}`,
      url: highResUrl,
      url_original: originalUrl,
      ordem: i,
      local_path: localPath,
    });
  }

  // 5. Processa variações
  const rawVariations = Array.isArray(item.variations) ? item.variations : [];
  const variacoes: MLItemData['variacoes'] = rawVariations.map((v: any) => {
    const combs = Array.isArray(v.attribute_combinations) ? v.attribute_combinations : [];
    const findComb = (ids: string[]) => {
      const match = combs.find((c: any) => ids.includes(c.id) || ids.includes(c.name?.toUpperCase()));
      return match ? match.value_name || match.value_id : null;
    };

    const varCor = findComb(['COLOR', 'COR', 'MAIN_COLOR']);
    const varTamanho = findComb(['SIZE', 'TAMANHO']);
    const varGtin = v.attributes?.find((a: any) => a.id === 'GTIN' || a.id === 'EAN')?.value_name || null;

    return {
      variation_id: String(v.id),
      sku: v.seller_custom_field || null,
      preco: Number(v.price) || Number(item.price) || 0,
      estoque: Number(v.available_quantity) || 0,
      gtin: varGtin,
      cor: varCor,
      tamanho: varTamanho,
      atributos: combs.map((c: any) => ({
        attribute_id: c.id,
        nome: c.name || c.id,
        valor: c.value_name || c.value_id || '',
      })),
    };
  });

  // 6. JSON bruto completo armazenado para segurança total
  const rawData = {
    item,
    description: descriptionText,
    categoryName,
    imported_at: new Date().toISOString(),
  };

  const finalData: MLItemData = {
    mlb_id: mlbId,
    titulo: item.title || 'Sem título',
    subtitulo: item.subtitle || null,
    descricao: descriptionText,
    categoria_id: item.category_id || '',
    categoria_nome: categoryName,
    preco: Number(item.price) || 0,
    preco_promocional: item.original_price ? Number(item.price) : null,
    moeda: item.currency_id || 'BRL',
    condicao: item.condition || 'not_specified',
    quantidade: Number(item.available_quantity) || 0,
    vendidos: Number(item.sold_quantity) || 0,
    status: item.status || 'active',
    tipo_anuncio: item.listing_type_id || '',
    permalink: item.permalink || '',
    sku,
    codigo_interno: item.seller_custom_field || null,
    gtin,
    ean,
    isbn,
    marca,
    modelo,
    fabricante,
    linha,
    genero,
    material,
    cor,
    tamanho,
    raw_json: JSON.stringify(rawData, null, 2),
    data_criacao: item.date_created || new Date().toISOString(),
    data_atualizacao: item.last_updated || new Date().toISOString(),
    data_importacao: new Date().toISOString(),
    imagens,
    atributos,
    variacoes,
  };

  logAction('info', 'IMPORTAR_SUCESSO', `Anúncio ${mlbId} importado com sucesso: "${finalData.titulo}"`);
  return finalData;
}
