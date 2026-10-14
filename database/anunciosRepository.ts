import { getDb, queryAll, queryOne, runExec, logAction, persistDb } from './db.ts';
import { MLItemData } from '../services/mercadolivre/mlService.ts';

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

export interface HistoricoItem {
  id: number;
  anuncio_id: number;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  data: string;
}

export async function findByMlbId(mlb_id: string) {
  await getDb();
  return queryOne('SELECT * FROM anuncios WHERE mlb_id = ?', [mlb_id]);
}

export async function findById(id: number) {
  await getDb();
  const anuncio = queryOne('SELECT * FROM anuncios WHERE id = ?', [id]);
  if (!anuncio) return null;

  const imagens = queryAll('SELECT * FROM imagens WHERE anuncio_id = ? ORDER BY ordem ASC', [id]);
  const atributos = queryAll('SELECT * FROM atributos WHERE anuncio_id = ? ORDER BY id ASC', [id]);
  const rawVariacoes = queryAll('SELECT * FROM variacoes WHERE anuncio_id = ? ORDER BY id ASC', [id]);

  const variacoes = rawVariacoes.map(v => {
    const varAtributos = queryAll('SELECT * FROM variacao_atributos WHERE variacao_id = ?', [v.id]);
    return {
      ...v,
      atributos: varAtributos,
    };
  });

  const historico = queryAll<HistoricoItem>('SELECT * FROM anuncio_historico WHERE anuncio_id = ? ORDER BY id DESC', [id]);

  return {
    ...anuncio,
    imagens,
    atributos,
    variacoes,
    historico,
  };
}

export async function saveNewAnuncio(data: MLItemData): Promise<number> {
  await getDb();

  const insertSql = `
    INSERT INTO anuncios (
      mlb_id, titulo, subtitulo, descricao, categoria_id, categoria_nome,
      preco, preco_promocional, moeda, condicao, quantidade, vendidos,
      status, tipo_anuncio, permalink, sku, codigo_interno, gtin, ean, isbn,
      marca, modelo, fabricante, linha, genero, material, cor, tamanho,
      raw_json, data_criacao, data_atualizacao, data_importacao, ultima_sincronizacao
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    );
  `;

  const now = new Date().toISOString();
  const res = runExec(insertSql, [
    data.mlb_id,
    data.titulo,
    data.subtitulo || null,
    data.descricao || '',
    data.categoria_id || '',
    data.categoria_nome || '',
    data.preco || 0,
    data.preco_promocional || null,
    data.moeda || 'BRL',
    data.condicao || 'not_specified',
    data.quantidade || 0,
    data.vendidos || 0,
    data.status || 'active',
    data.tipo_anuncio || '',
    data.permalink || '',
    data.sku || null,
    data.codigo_interno || null,
    data.gtin || null,
    data.ean || null,
    data.isbn || null,
    data.marca || null,
    data.modelo || null,
    data.fabricante || null,
    data.linha || null,
    data.genero || null,
    data.material || null,
    data.cor || null,
    data.tamanho || null,
    data.raw_json || '{}',
    data.data_criacao || now,
    data.data_atualizacao || now,
    data.data_importacao || now,
    now,
  ]);

  const anuncioId = res.lastInsertRowid;

  // Insert Imagens
  if (data.imagens && data.imagens.length > 0) {
    for (const img of data.imagens) {
      runExec(
        `INSERT INTO imagens (anuncio_id, ml_image_id, url, url_original, ordem, local_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [anuncioId, img.ml_image_id, img.url, img.url_original, img.ordem, img.local_path || null]
      );
    }
  }

  // Insert Atributos
  if (data.atributos && data.atributos.length > 0) {
    for (const attr of data.atributos) {
      runExec(
        `INSERT INTO atributos (anuncio_id, attribute_id, nome, valor)
         VALUES (?, ?, ?, ?)`,
        [anuncioId, attr.attribute_id, attr.nome, attr.valor]
      );
    }
  }

  // Insert Variações
  if (data.variacoes && data.variacoes.length > 0) {
    for (const v of data.variacoes) {
      const vRes = runExec(
        `INSERT INTO variacoes (anuncio_id, variation_id, sku, preco, estoque, gtin, cor, tamanho)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [anuncioId, v.variation_id, v.sku || null, v.preco || 0, v.estoque || 0, v.gtin || null, v.cor || null, v.tamanho || null]
      );
      const varId = vRes.lastInsertRowid;

      if (v.atributos && v.atributos.length > 0) {
        for (const va of v.atributos) {
          runExec(
            `INSERT INTO variacao_atributos (variacao_id, attribute_id, nome, valor)
             VALUES (?, ?, ?, ?)`,
            [varId, va.attribute_id, va.nome, va.valor]
          );
        }
      }
    }
  }

  persistDb();
  return anuncioId;
}

export async function updateAnuncioFromSync(id: number, newData: MLItemData): Promise<{ changes: { campo: string; anterior: any; novo: any }[] }> {
  await getDb();
  const existing = queryOne('SELECT * FROM anuncios WHERE id = ?', [id]);
  if (!existing) throw new Error(`Anúncio ${id} não encontrado para sincronização`);

  const recordedChanges: { campo: string; anterior: any; novo: any }[] = [];
  const now = new Date().toISOString();

  const checkAndRecord = (field: string, label: string, oldVal: any, newVal: any) => {
    const formattedOld = oldVal !== null && oldVal !== undefined ? String(oldVal) : '';
    const formattedNew = newVal !== null && newVal !== undefined ? String(newVal) : '';
    if (formattedOld !== formattedNew) {
      recordedChanges.push({ campo: label, anterior: oldVal, novo: newVal });
      runExec(
        `INSERT INTO anuncio_historico (anuncio_id, campo, valor_anterior, valor_novo, data)
         VALUES (?, ?, ?, ?, ?)`,
        [id, label, formattedOld, formattedNew, now]
      );
    }
  };

  checkAndRecord('preco', 'Preço', existing.preco, newData.preco);
  checkAndRecord('quantidade', 'Estoque', existing.quantidade, newData.quantidade);
  checkAndRecord('titulo', 'Título', existing.titulo, newData.titulo);
  checkAndRecord('status', 'Status', existing.status, newData.status);
  checkAndRecord('vendidos', 'Vendidos', existing.vendidos, newData.vendidos);

  // Update record
  runExec(
    `UPDATE anuncios SET
      titulo = ?, subtitulo = ?, descricao = ?, categoria_id = ?, categoria_nome = ?,
      preco = ?, preco_promocional = ?, condicao = ?, quantidade = ?, vendidos = ?,
      status = ?, permalink = ?, sku = ?, gtin = ?, ean = ?, marca = ?, modelo = ?,
      raw_json = ?, data_atualizacao = ?, ultima_sincronizacao = ?
     WHERE id = ?`,
    [
      newData.titulo,
      newData.subtitulo || null,
      newData.descricao,
      newData.categoria_id,
      newData.categoria_nome,
      newData.preco,
      newData.preco_promocional || null,
      newData.condicao,
      newData.quantidade,
      newData.vendidos,
      newData.status,
      newData.permalink,
      newData.sku || existing.sku,
      newData.gtin || existing.gtin,
      newData.ean || existing.ean,
      newData.marca || existing.marca,
      newData.modelo || existing.modelo,
      newData.raw_json,
      newData.data_atualizacao || now,
      now,
      id
    ]
  );

  // Se vieram novas imagens, atualiza
  if (newData.imagens && newData.imagens.length > 0) {
    runExec('DELETE FROM imagens WHERE anuncio_id = ?', [id]);
    for (const img of newData.imagens) {
      runExec(
        `INSERT INTO imagens (anuncio_id, ml_image_id, url, url_original, ordem, local_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, img.ml_image_id, img.url, img.url_original, img.ordem, img.local_path || null]
      );
    }
  }

  // Atualiza atributos
  if (newData.atributos && newData.atributos.length > 0) {
    runExec('DELETE FROM atributos WHERE anuncio_id = ?', [id]);
    for (const attr of newData.atributos) {
      runExec(
        `INSERT INTO atributos (anuncio_id, attribute_id, nome, valor)
         VALUES (?, ?, ?, ?)`,
        [id, attr.attribute_id, attr.nome, attr.valor]
      );
    }
  }

  // Atualiza variações
  if (newData.variacoes && newData.variacoes.length > 0) {
    const oldVariacoes = queryAll<{ id: number }>('SELECT id FROM variacoes WHERE anuncio_id = ?', [id]);
    for (const ov of oldVariacoes) {
      runExec('DELETE FROM variacao_atributos WHERE variacao_id = ?', [ov.id]);
    }
    runExec('DELETE FROM variacoes WHERE anuncio_id = ?', [id]);

    for (const v of newData.variacoes) {
      const vRes = runExec(
        `INSERT INTO variacoes (anuncio_id, variation_id, sku, preco, estoque, gtin, cor, tamanho)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, v.variation_id, v.sku || null, v.preco || 0, v.estoque || 0, v.gtin || null, v.cor || null, v.tamanho || null]
      );
      const varId = vRes.lastInsertRowid;

      if (v.atributos && v.atributos.length > 0) {
        for (const va of v.atributos) {
          runExec(
            `INSERT INTO variacao_atributos (variacao_id, attribute_id, nome, valor)
             VALUES (?, ?, ?, ?)`,
            [varId, va.attribute_id, va.nome, va.valor]
          );
        }
      }
    }
  }

  persistDb();
  return { changes: recordedChanges };
}

export async function updateLocalAnuncio(id: number, updateData: any) {
  await getDb();
  const existing = queryOne('SELECT * FROM anuncios WHERE id = ?', [id]);
  if (!existing) throw new Error('Anúncio não encontrado');

  const now = new Date().toISOString();

  // Update main table
  runExec(
    `UPDATE anuncios SET
      titulo = ?, subtitulo = ?, descricao = ?, preco = ?, preco_promocional = ?,
      quantidade = ?, status = ?, condicao = ?, categoria_nome = ?,
      sku = ?, gtin = ?, ean = ?, marca = ?, modelo = ?,
      fabricante = ?, linha = ?, genero = ?, material = ?, cor = ?, tamanho = ?,
      data_atualizacao = ?
     WHERE id = ?`,
    [
      updateData.titulo ?? existing.titulo,
      updateData.subtitulo ?? existing.subtitulo,
      updateData.descricao ?? existing.descricao,
      updateData.preco ?? existing.preco,
      updateData.preco_promocional ?? existing.preco_promocional,
      updateData.quantidade ?? existing.quantidade,
      updateData.status ?? existing.status,
      updateData.condicao ?? existing.condicao,
      updateData.categoria_nome ?? existing.categoria_nome,
      updateData.sku ?? existing.sku,
      updateData.gtin ?? existing.gtin,
      updateData.ean ?? existing.ean,
      updateData.marca ?? existing.marca,
      updateData.modelo ?? existing.modelo,
      updateData.fabricante ?? existing.fabricante,
      updateData.linha ?? existing.linha,
      updateData.genero ?? existing.genero,
      updateData.material ?? existing.material,
      updateData.cor ?? existing.cor,
      updateData.tamanho ?? existing.tamanho,
      now,
      id
    ]
  );

  // If attributes passed, update
  if (Array.isArray(updateData.atributos)) {
    runExec('DELETE FROM atributos WHERE anuncio_id = ?', [id]);
    for (const attr of updateData.atributos) {
      if (attr.nome && attr.valor) {
        runExec(
          `INSERT INTO atributos (anuncio_id, attribute_id, nome, valor) VALUES (?, ?, ?, ?)`,
          [id, attr.attribute_id || 'CUSTOM', attr.nome, attr.valor]
        );
      }
    }
  }

  // If variations passed, update
  if (Array.isArray(updateData.variacoes)) {
    const oldVariacoes = queryAll<{ id: number }>('SELECT id FROM variacoes WHERE anuncio_id = ?', [id]);
    for (const ov of oldVariacoes) {
      runExec('DELETE FROM variacao_atributos WHERE variacao_id = ?', [ov.id]);
    }
    runExec('DELETE FROM variacoes WHERE anuncio_id = ?', [id]);

    for (const v of updateData.variacoes) {
      const vRes = runExec(
        `INSERT INTO variacoes (anuncio_id, variation_id, sku, preco, estoque, gtin, cor, tamanho)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, v.variation_id || String(Date.now()), v.sku || null, Number(v.preco) || 0, Number(v.estoque) || 0, v.gtin || null, v.cor || null, v.tamanho || null]
      );
      if (Array.isArray(v.atributos)) {
        for (const va of v.atributos) {
          runExec(
            `INSERT INTO variacao_atributos (variacao_id, attribute_id, nome, valor) VALUES (?, ?, ?, ?)`,
            [vRes.lastInsertRowid, va.attribute_id || 'CUSTOM', va.nome, va.valor]
          );
        }
      }
    }
  }

  persistDb();
  return findById(id);
}

export async function duplicateAnuncio(id: number): Promise<number> {
  const original = await findById(id);
  if (!original) throw new Error('Anúncio original não encontrado para duplicação');

  const now = new Date().toISOString();
  const newMlbId = `${original.mlb_id}_COPIA_${Math.floor(1000 + Math.random() * 9000)}`;
  const newTitulo = `${original.titulo} (Cópia)`;

  const duplicateData: MLItemData = {
    ...original,
    mlb_id: newMlbId,
    titulo: newTitulo,
    sku: original.sku ? `${original.sku}-COPY` : null,
    data_criacao: now,
    data_atualizacao: now,
    data_importacao: now,
    vendidos: 0,
    raw_json: JSON.stringify({
      duplicate_of: original.mlb_id,
      original_id: original.id,
      duplicated_at: now,
    }, null, 2),
    imagens: original.imagens.map((img: any) => ({
      ml_image_id: `${img.ml_image_id}_copy`,
      url: img.url,
      url_original: img.url_original,
      ordem: img.ordem,
      local_path: img.local_path,
    })),
    atributos: original.atributos.map((a: any) => ({
      attribute_id: a.attribute_id,
      nome: a.nome,
      valor: a.valor,
    })),
    variacoes: original.variacoes.map((v: any) => ({
      variation_id: `${v.variation_id}_copy`,
      sku: v.sku ? `${v.sku}-COPY` : null,
      preco: v.preco,
      estoque: v.estoque,
      gtin: v.gtin,
      cor: v.cor,
      tamanho: v.tamanho,
      atributos: v.atributos ? v.atributos.map((va: any) => ({
        attribute_id: va.attribute_id,
        nome: va.nome,
        valor: va.valor,
      })) : [],
    })),
  };

  const newId = await saveNewAnuncio(duplicateData);
  logAction('info', 'DUPLICAR_ANUNCIO', `Anúncio #${id} duplicado para novo anúncio #${newId}`);
  return newId;
}

export async function deleteAnuncio(id: number): Promise<boolean> {
  await getDb();
  // Cascades
  const variacoes = queryAll<{ id: number }>('SELECT id FROM variacoes WHERE anuncio_id = ?', [id]);
  for (const v of variacoes) {
    runExec('DELETE FROM variacao_atributos WHERE variacao_id = ?', [v.id]);
  }
  runExec('DELETE FROM variacoes WHERE anuncio_id = ?', [id]);
  runExec('DELETE FROM atributos WHERE anuncio_id = ?', [id]);
  runExec('DELETE FROM imagens WHERE anuncio_id = ?', [id]);
  runExec('DELETE FROM anuncio_historico WHERE anuncio_id = ?', [id]);
  runExec('DELETE FROM anuncios WHERE id = ?', [id]);

  persistDb();
  logAction('info', 'EXCLUIR_ANUNCIO', `Anúncio #${id} excluído com sucesso`);
  return true;
}

export async function listAnuncios(params: {
  search?: string;
  categoria?: string;
  status?: string;
  precoMin?: number;
  precoMax?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  await getDb();

  const conditions: string[] = ['1=1'];
  const sqlParams: any[] = [];

  if (params.search && params.search.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(`(
      a.mlb_id LIKE ? OR
      a.titulo LIKE ? OR
      a.sku LIKE ? OR
      a.gtin LIKE ? OR
      a.ean LIKE ? OR
      a.marca LIKE ? OR
      a.modelo LIKE ?
    )`);
    sqlParams.push(q, q, q, q, q, q, q);
  }

  if (params.categoria && params.categoria.trim()) {
    conditions.push(`a.categoria_nome LIKE ?`);
    sqlParams.push(`%${params.categoria.trim()}%`);
  }

  if (params.status && params.status !== 'todos') {
    conditions.push(`a.status = ?`);
    sqlParams.push(params.status);
  }

  if (params.precoMin !== undefined && !isNaN(params.precoMin)) {
    conditions.push(`a.preco >= ?`);
    sqlParams.push(params.precoMin);
  }

  if (params.precoMax !== undefined && !isNaN(params.precoMax)) {
    conditions.push(`a.preco <= ?`);
    sqlParams.push(params.precoMax);
  }

  const whereClause = conditions.join(' AND ');

  // Count total
  const countRow = queryOne<{ total: number }>(
    `SELECT COUNT(*) as total FROM anuncios a WHERE ${whereClause}`,
    sqlParams
  );
  const total = countRow?.total || 0;

  // Sorting
  let orderBy = 'a.data_importacao DESC';
  const order = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
  if (params.sortBy === 'preco') orderBy = `a.preco ${order}`;
  else if (params.sortBy === 'titulo') orderBy = `a.titulo ${order}`;
  else if (params.sortBy === 'quantidade') orderBy = `a.quantidade ${order}`;
  else if (params.sortBy === 'vendidos') orderBy = `a.vendidos ${order}`;
  else if (params.sortBy === 'data_importacao') orderBy = `a.data_importacao ${order}`;

  const limit = params.limit || 20;
  const offset = params.offset || 0;

  const selectSql = `
    SELECT
      a.id, a.mlb_id, a.titulo, a.preco, a.preco_promocional, a.moeda,
      a.quantidade, a.vendidos, a.status, a.categoria_nome, a.sku, a.ean,
      a.permalink, a.data_importacao,
      (SELECT url FROM imagens WHERE anuncio_id = a.id ORDER BY ordem ASC LIMIT 1) as imagem_capa,
      (SELECT COUNT(*) FROM variacoes WHERE anuncio_id = a.id) as total_variacoes,
      (SELECT COUNT(*) FROM imagens WHERE anuncio_id = a.id) as total_imagens
    FROM anuncios a
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const items = queryAll<AnuncioSummary>(selectSql, [...sqlParams, limit, offset]);

  // Distinct categories for filter
  const categories = queryAll<{ categoria_nome: string }>(
    `SELECT DISTINCT categoria_nome FROM anuncios WHERE categoria_nome IS NOT NULL AND categoria_nome != '' ORDER BY categoria_nome ASC`
  ).map(c => c.categoria_nome);

  return {
    items,
    total,
    limit,
    offset,
    categories,
  };
}

export async function getDashboardStats() {
  await getDb();

  const totalAnuncios = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM anuncios')?.count || 0;
  const totalAtivos = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM anuncios WHERE status = 'active'")?.count || 0;
  const totalPausados = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM anuncios WHERE status != 'active'")?.count || 0;
  const totalEstoque = queryOne<{ total: number }>('SELECT SUM(quantidade) as total FROM anuncios')?.total || 0;
  const totalVendidos = queryOne<{ total: number }>('SELECT SUM(vendidos) as total FROM anuncios')?.total || 0;
  const precoMedio = queryOne<{ avg: number }>('SELECT AVG(preco) as avg FROM anuncios WHERE preco > 0')?.avg || 0;
  const totalVariacoes = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM variacoes')?.count || 0;
  const totalSkus = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT sku) as count FROM (
      SELECT sku FROM anuncios WHERE sku IS NOT NULL AND sku != ''
      UNION
      SELECT sku FROM variacoes WHERE sku IS NOT NULL AND sku != ''
    )
  `)?.count || 0;

  const ultimosAnuncios = queryAll<AnuncioSummary>(`
    SELECT
      a.id, a.mlb_id, a.titulo, a.preco, a.quantidade, a.vendidos, a.status, a.categoria_nome, a.data_importacao,
      (SELECT url FROM imagens WHERE anuncio_id = a.id ORDER BY ordem ASC LIMIT 1) as imagem_capa,
      (SELECT COUNT(*) FROM variacoes WHERE anuncio_id = a.id) as total_variacoes
    FROM anuncios a
    ORDER BY a.data_importacao DESC
    LIMIT 6
  `);

  const categoriasDist = queryAll<{ categoria: string; count: number }>(`
    SELECT categoria_nome as categoria, COUNT(*) as count
    FROM anuncios
    WHERE categoria_nome IS NOT NULL AND categoria_nome != ''
    GROUP BY categoria_nome
    ORDER BY count DESC
    LIMIT 6
  `);

  return {
    totalAnuncios,
    totalAtivos,
    totalPausados,
    totalEstoque,
    totalVendidos,
    precoMedio,
    totalVariacoes,
    totalSkus,
    ultimosAnuncios,
    categoriasDist,
  };
}
