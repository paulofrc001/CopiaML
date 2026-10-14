import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { findById } from '../../database/anunciosRepository.ts';

/**
 * Escapa valores para CSV com proteção contra quebras de linha e aspas
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Gera CSV de dados gerais do anúncio
 */
export function generateAnuncioCsv(anuncio: any): string {
  const headers = [
    'ID', 'MLB_ID', 'TITULO', 'SUBTITULO', 'CATEGORIA_ID', 'CATEGORIA_NOME',
    'PRECO', 'PRECO_PROMOCIONAL', 'MOEDA', 'CONDICAO', 'QUANTIDADE', 'VENDIDOS',
    'STATUS', 'TIPO_ANUNCIO', 'PERMALINK', 'SKU', 'CODIGO_INTERNO', 'GTIN',
    'EAN', 'ISBN', 'MARCA', 'MODELO', 'FABRICANTE', 'LINHA', 'GENERO',
    'MATERIAL', 'COR', 'TAMANHO', 'DATA_CRIACAO', 'DATA_ATUALIZACAO', 'DATA_IMPORTACAO'
  ];

  const values = [
    anuncio.id, anuncio.mlb_id, anuncio.titulo, anuncio.subtitulo || '',
    anuncio.categoria_id, anuncio.categoria_nome, anuncio.preco,
    anuncio.preco_promocional || '', anuncio.moeda, anuncio.condicao,
    anuncio.quantidade, anuncio.vendidos, anuncio.status, anuncio.tipo_anuncio,
    anuncio.permalink, anuncio.sku || '', anuncio.codigo_interno || '',
    anuncio.gtin || '', anuncio.ean || '', anuncio.isbn || '', anuncio.marca || '',
    anuncio.modelo || '', anuncio.fabricante || '', anuncio.linha || '',
    anuncio.genero || '', anuncio.material || '', anuncio.cor || '',
    anuncio.tamanho || '', anuncio.data_criacao, anuncio.data_atualizacao, anuncio.data_importacao
  ];

  return '\uFEFF' + headers.map(escapeCsv).join(';') + '\n' + values.map(escapeCsv).join(';') + '\n';
}

/**
 * Gera CSV das Variações
 */
export function generateVariacoesCsv(variacoes: any[]): string {
  const headers = ['VARIACAO_ID', 'SKU', 'COR', 'TAMANHO', 'PRECO', 'ESTOQUE', 'GTIN', 'ATRIBUTOS_COMBINADOS'];
  const rows = (variacoes || []).map(v => {
    const combs = (v.atributos || []).map((a: any) => `${a.nome}: ${a.valor}`).join(' | ');
    return [
      v.variation_id,
      v.sku || '',
      v.cor || '',
      v.tamanho || '',
      v.preco,
      v.estoque,
      v.gtin || '',
      combs
    ].map(escapeCsv).join(';');
  });

  return '\uFEFF' + headers.map(escapeCsv).join(';') + '\n' + rows.join('\n') + '\n';
}

/**
 * Gera CSV de Atributos
 */
export function generateAtributosCsv(atributos: any[]): string {
  const headers = ['ID_ATRIBUTO', 'NOME_ATRIBUTO', 'VALOR'];
  const rows = (atributos || []).map(a => {
    return [a.attribute_id, a.nome, a.valor].map(escapeCsv).join(';');
  });

  return '\uFEFF' + headers.map(escapeCsv).join(';') + '\n' + rows.join('\n') + '\n';
}

/**
 * Gera texto formatado da descrição e especificações
 */
export function generateDescricaoTxt(anuncio: any): string {
  const lines: string[] = [];
  lines.push(`========================================================================`);
  lines.push(`ANÚNCIO: ${anuncio.titulo}`);
  lines.push(`MLB ID: ${anuncio.mlb_id}`);
  lines.push(`PREÇO: R$ ${Number(anuncio.preco).toFixed(2)} | ESTOQUE: ${anuncio.quantidade} | VENDIDOS: ${anuncio.vendidos}`);
  lines.push(`CATEGORIA: ${anuncio.categoria_nome || 'N/A'}`);
  lines.push(`LINK: ${anuncio.permalink || 'N/A'}`);
  if (anuncio.sku) lines.push(`SKU: ${anuncio.sku}`);
  if (anuncio.ean || anuncio.gtin) lines.push(`EAN/GTIN: ${anuncio.ean || anuncio.gtin}`);
  lines.push(`========================================================================\n`);

  lines.push(`--- DESCRIÇÃO DO PRODUTO ---\n`);
  lines.push(anuncio.descricao || 'Nenhuma descrição informada.');
  lines.push(`\n`);

  if (anuncio.atributos && anuncio.atributos.length > 0) {
    lines.push(`\n--- ESPECIFICAÇÕES TÉCNICAS E ATRIBUTOS ---`);
    for (const attr of anuncio.atributos) {
      lines.push(`• ${attr.nome}: ${attr.valor}`);
    }
  }

  if (anuncio.variacoes && anuncio.variacoes.length > 0) {
    lines.push(`\n--- VARIAÇÕES DISPONÍVEIS (${anuncio.variacoes.length}) ---`);
    for (const v of anuncio.variacoes) {
      lines.push(`• Variação #${v.variation_id} - Cor: ${v.cor || 'N/A'}, Tamanho: ${v.tamanho || 'N/A'}, Preço: R$ ${v.preco}, Estoque: ${v.estoque}, SKU: ${v.sku || 'N/A'}`);
    }
  }

  return lines.join('\n');
}

/**
 * Cria pacote ZIP completo para um anúncio
 */
export async function createAnuncioZip(anuncioId: number): Promise<Buffer> {
  const anuncio = await findById(anuncioId);
  if (!anuncio) throw new Error(`Anúncio ${anuncioId} não encontrado para exportação.`);

  const zip = new JSZip();

  // 1. anuncio.json
  zip.file('anuncio.json', JSON.stringify(anuncio, null, 2));

  // 2. anuncio.csv
  zip.file('anuncio.csv', generateAnuncioCsv(anuncio));

  // 3. descricao.txt
  zip.file('descricao.txt', generateDescricaoTxt(anuncio));

  // 4. variacoes.csv
  zip.file('variacoes.csv', generateVariacoesCsv(anuncio.variacoes));

  // 5. atributos.csv
  zip.file('atributos.csv', generateAtributosCsv(anuncio.atributos));

  // 6. pasta /imagens/
  const imgFolder = zip.folder('imagens');
  if (imgFolder && anuncio.imagens && anuncio.imagens.length > 0) {
    for (let i = 0; i < anuncio.imagens.length; i++) {
      const img = anuncio.imagens[i];
      let imgBuffer: Buffer | null = null;

      // Primeiro tenta ler do disco local
      if (img.local_path) {
        const fullLocalPath = path.resolve(process.cwd(), img.local_path.replace(/^\//, ''));
        if (fs.existsSync(fullLocalPath)) {
          imgBuffer = fs.readFileSync(fullLocalPath);
        }
      }

      // Se não encontrou no disco, tenta fazer download da url
      if (!imgBuffer && img.url) {
        try {
          const res = await fetch(img.url);
          if (res.ok) {
            const arrBuf = await res.arrayBuffer();
            imgBuffer = Buffer.from(arrBuf);
          }
        } catch (e) {
          console.warn(`Falha ao obter imagem para zip: ${img.url}`);
        }
      }

      if (imgBuffer) {
        const fileName = `${String(i + 1).padStart(2, '0')}_${img.ml_image_id || i}.jpg`;
        imgFolder.file(fileName, imgBuffer);
      }
    }
  }

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Cria pacote ZIP em lote para múltiplos anúncios
 */
export async function createBatchZip(anuncioIds: number[]): Promise<Buffer> {
  const zip = new JSZip();

  // CSV combinado com todos os anúncios
  const allAnuncios: any[] = [];
  for (const id of anuncioIds) {
    const a = await findById(id);
    if (a) allAnuncios.push(a);
  }

  // Pasta para cada anúncio
  for (const anuncio of allAnuncios) {
    const folderName = `${anuncio.mlb_id}_${anuncio.id}`;
    const subFolder = zip.folder(folderName);
    if (subFolder) {
      subFolder.file('anuncio.json', JSON.stringify(anuncio, null, 2));
      subFolder.file('anuncio.csv', generateAnuncioCsv(anuncio));
      subFolder.file('descricao.txt', generateDescricaoTxt(anuncio));
      subFolder.file('variacoes.csv', generateVariacoesCsv(anuncio.variacoes));
      subFolder.file('atributos.csv', generateAtributosCsv(anuncio.atributos));

      const imgSubFolder = subFolder.folder('imagens');
      if (imgSubFolder && anuncio.imagens) {
        for (let i = 0; i < anuncio.imagens.length; i++) {
          const img = anuncio.imagens[i];
          if (img.local_path) {
            const p = path.resolve(process.cwd(), img.local_path.replace(/^\//, ''));
            if (fs.existsSync(p)) {
              imgSubFolder.file(`${String(i + 1).padStart(2, '0')}_${img.ml_image_id}.jpg`, fs.readFileSync(p));
            }
          }
        }
      }
    }
  }

  // Tabela mestre CSV combinada na raiz do zip
  if (allAnuncios.length > 0) {
    const headers = [
      'ID', 'MLB_ID', 'TITULO', 'PRECO', 'ESTOQUE', 'VENDIDOS', 'STATUS', 'CATEGORIA', 'SKU', 'PERMALINK'
    ];
    const rows = allAnuncios.map(a => [
      a.id, a.mlb_id, a.titulo, a.preco, a.quantidade, a.vendidos, a.status, a.categoria_nome, a.sku || '', a.permalink
    ].map(escapeCsv).join(';'));
    zip.file('catalogo_completo.csv', '\uFEFF' + headers.map(escapeCsv).join(';') + '\n' + rows.join('\n') + '\n');
  }

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
