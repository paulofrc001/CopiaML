import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getDb, createBackup, restoreBackup, listBackups, getConfig, setConfig, logAction, queryAll, runExec, persistDb } from './database/db.ts';
import { extractMlbId, importFromMercadoLivre, downloadImageToDisk } from './services/mercadolivre/mlService.ts';
import { seedInitialDataIfEmpty } from './database/seed.ts';
import {
  saveNewAnuncio,
  updateAnuncioFromSync,
  updateLocalAnuncio,
  findById,
  findByMlbId,
  listAnuncios,
  deleteAnuncio,
  duplicateAnuncio,
  getDashboardStats,
} from './database/anunciosRepository.ts';
import {
  generateAnuncioCsv,
  generateDescricaoTxt,
  createAnuncioZip,
  createAnuncioImagensZip,
  createBatchZip,
  generateVariacoesCsv,
  generateAtributosCsv,
} from './services/export/exportService.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos de mídia local
const dadosPath = path.resolve(process.cwd(), 'dados');
if (!fs.existsSync(dadosPath)) {
  fs.mkdirSync(dadosPath, { recursive: true });
}
app.use('/dados', express.static(dadosPath));

// ==========================================
// ROTAS DE ANÚNCIOS
// ==========================================

// 1. Importar anúncio individual
app.post('/api/anuncios/importar', async (req: Request, res: Response) => {
  try {
    const { input, downloadImages = true, action = 'create' } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'URL ou ID do anúncio é obrigatório.' });
      return;
    }

    const mlbId = extractMlbId(input);
    if (!mlbId) {
      res.status(400).json({ error: 'Formato inválido. Insira um ID como MLB123456789 ou URL do Mercado Livre.' });
      return;
    }

    // Verificar se já existe no banco
    const existing = await findByMlbId(mlbId);
    if (existing && action === 'check') {
      res.status(200).json({
        exists: true,
        existingId: existing.id,
        mlbId: existing.mlb_id,
        titulo: existing.titulo,
        preco: existing.preco,
        quantidade: existing.quantidade,
      });
      return;
    }

    // Importar da API oficial do ML
    const mlData = await importFromMercadoLivre(input, downloadImages);

    let id: number;
    if (existing && action === 'update') {
      const syncResult = await updateAnuncioFromSync(existing.id, mlData);
      id = existing.id;
      res.status(200).json({
        success: true,
        id,
        action: 'updated',
        changes: syncResult.changes,
        message: `Anúncio ${mlbId} atualizado com sucesso!`,
      });
      return;
    } else {
      id = await saveNewAnuncio(mlData);
      res.status(201).json({
        success: true,
        id,
        action: 'created',
        message: `Anúncio ${mlbId} importado e salvo com sucesso!`,
      });
      return;
    }
  } catch (error: any) {
    console.error('Erro na importação:', error);
    logAction('error', 'IMPORTAR_ERRO', error.message || 'Erro desconhecido ao importar');
    res.status(500).json({ error: error.message || 'Falha ao importar anúncio do Mercado Livre.' });
  }
});

// 2. Importação em lote sequencial
app.post('/api/anuncios/importar-lote', async (req: Request, res: Response) => {
  try {
    const { items, downloadImages = false } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Nenhum item informado para importação em lote.' });
      return;
    }

    const results: any[] = [];
    for (const itemInput of items) {
      const trimmed = String(itemInput).trim();
      if (!trimmed) continue;
      const mlbId = extractMlbId(trimmed);

      try {
        if (!mlbId) {
          throw new Error('ID ou formato inválido.');
        }

        const existing = await findByMlbId(mlbId);
        const mlData = await importFromMercadoLivre(trimmed, downloadImages);

        let id: number;
        if (existing) {
          await updateAnuncioFromSync(existing.id, mlData);
          id = existing.id;
        } else {
          id = await saveNewAnuncio(mlData);
        }

        results.push({
          input: trimmed,
          mlbId,
          success: true,
          id,
          titulo: mlData.titulo,
        });
      } catch (err: any) {
        results.push({
          input: trimmed,
          mlbId: mlbId || 'DESCONHECIDO',
          success: false,
          error: err.message || 'Erro desconhecido',
        });
      }
    }

    res.status(200).json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha no processamento em lote.' });
  }
});

// 3. Listagem com filtros e paginação
app.get('/api/anuncios', async (req: Request, res: Response) => {
  try {
    const {
      search,
      categoria,
      status,
      precoMin,
      precoMax,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = req.query;

    const data = await listAnuncios({
      search: search ? String(search) : undefined,
      categoria: categoria ? String(categoria) : undefined,
      status: status ? String(status) : undefined,
      precoMin: precoMin ? Number(precoMin) : undefined,
      precoMax: precoMax ? Number(precoMax) : undefined,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
      sortBy: sortBy ? String(sortBy) : 'data_importacao',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Detalhes completos do anúncio
app.get('/api/anuncios/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const item = await findById(id);
    if (!item) {
      res.status(404).json({ error: 'Anúncio não encontrado no banco de dados local.' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Atualização manual / edição local
app.put('/api/anuncios/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateLocalAnuncio(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Sincronizar / Atualizar dados com o Mercado Livre (com histórico e diff)
app.post('/api/anuncios/:id/sincronizar', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Anúncio não encontrado' });
      return;
    }

    const freshData = await importFromMercadoLivre(existing.mlb_id, true);
    const syncRes = await updateAnuncioFromSync(id, freshData);
    const updated = await findById(id);

    res.json({
      success: true,
      changes: syncRes.changes,
      anuncio: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao sincronizar dados com Mercado Livre' });
  }
});

// 7. Duplicar anúncio
app.post('/api/anuncios/:id/duplicar', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const newId = await duplicateAnuncio(id);
    res.status(201).json({ success: true, newId, message: 'Anúncio duplicado com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Excluir anúncio
app.delete('/api/anuncios/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await deleteAnuncio(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Operações em lote (Excluir e Duplicar)
app.post('/api/anuncios/lote-excluir', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'IDs inválidos' });
      return;
    }
    for (const id of ids) {
      await deleteAnuncio(Number(id));
    }
    res.json({ success: true, count: ids.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/anuncios/lote-duplicar', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'IDs inválidos' });
      return;
    }
    const createdIds: number[] = [];
    for (const id of ids) {
      const newId = await duplicateAnuncio(Number(id));
      createdIds.push(newId);
    }
    res.json({ success: true, createdIds });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Exportações individuais
app.get('/api/anuncios/:id/exportar/:formato', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const formato = req.params.formato.toLowerCase();
    const anuncio = await findById(id);
    if (!anuncio) {
      res.status(404).send('Anúncio não encontrado');
      return;
    }

    const safeTitle = (anuncio.mlb_id || `anuncio_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (formato === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.json"`);
      res.send(JSON.stringify(anuncio, null, 2));
      return;
    }

    if (formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.csv"`);
      res.send(generateAnuncioCsv(anuncio));
      return;
    }

    if (formato === 'txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_descricao.txt"`);
      res.send(generateDescricaoTxt(anuncio));
      return;
    }

    if (formato === 'variacoes-csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_variacoes.csv"`);
      res.send(generateVariacoesCsv(anuncio.variacoes));
      return;
    }

    if (formato === 'atributos-csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_atributos.csv"`);
      res.send(generateAtributosCsv(anuncio.atributos));
      return;
    }

    if (formato === 'zip') {
      const zipBuffer = await createAnuncioZip(id);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_completo.zip"`);
      res.send(zipBuffer);
      return;
    }

    if (formato === 'imagens-zip' || formato === 'imagens') {
      const zipBuffer = await createAnuncioImagensZip(id);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="imagens_${safeTitle}.zip"`);
      res.send(zipBuffer);
      return;
    }

    res.status(400).send('Formato de exportação não suportado.');
  } catch (error: any) {
    res.status(500).send(`Erro ao gerar exportação: ${error.message}`);
  }
});

// 10.1 Exportação direta de pacote ZIP contendo apenas as imagens
app.get('/api/anuncios/:id/exportar-imagens-zip', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const anuncio = await findById(id);
    if (!anuncio) {
      res.status(404).send('Anúncio não encontrado');
      return;
    }

    const zipBuffer = await createAnuncioImagensZip(id);
    const safeTitle = (anuncio.mlb_id || `anuncio_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="imagens_${safeTitle}.zip"`);
    res.send(zipBuffer);
  } catch (error: any) {
    res.status(500).send(`Erro ao exportar imagens em zip: ${error.message}`);
  }
});

// 10.2 Baixar todas as imagens do anúncio para a pasta local no servidor (/dados/anuncios/{mlbId}/imagens/)
app.post('/api/anuncios/:id/baixar-imagens', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const anuncio = await findById(id);
    if (!anuncio) {
      res.status(404).json({ error: 'Anúncio não encontrado' });
      return;
    }

    const { force = false } = req.body || {};
    const imagens = anuncio.imagens || [];
    const results = [];

    for (let i = 0; i < imagens.length; i++) {
      const img = imagens[i];
      // Verifica se já está baixada fisicamente no disco
      if (!force && img.local_path) {
        const fullLocalPath = path.resolve(process.cwd(), img.local_path.replace(/^\//, ''));
        if (fs.existsSync(fullLocalPath) && fs.statSync(fullLocalPath).size > 100) {
          results.push({ id: img.id, local_path: img.local_path, status: 'already_downloaded' });
          continue;
        }
      }

      const downloaded = await downloadImageToDisk(
        anuncio.mlb_id,
        img.url || img.url_original,
        i,
        img.ml_image_id || `img_${i + 1}`
      );

      if (downloaded) {
        runExec('UPDATE imagens SET local_path = ? WHERE id = ?', [downloaded, img.id]);
        results.push({ id: img.id, local_path: downloaded, status: 'downloaded' });
      } else {
        results.push({ id: img.id, local_path: null, status: 'failed' });
      }
    }

    persistDb();
    logAction('info', 'DOWNLOAD_IMAGENS', `Download em lote finalizado para anúncio #${id} (${anuncio.mlb_id}): ${results.filter(r => r.local_path).length}/${imagens.length} fotos salvas`);

    const updated = await findById(id);
    res.json({
      success: true,
      message: `${results.filter(r => r.local_path).length} de ${imagens.length} imagens salvas com sucesso em /dados/anuncios/${anuncio.mlb_id}/imagens/`,
      folder: `/dados/anuncios/${anuncio.mlb_id}/imagens/`,
      total: imagens.length,
      downloaded: results.filter(r => r.local_path).length,
      imagens: updated?.imagens || [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10.3 Adicionar nova imagem e baixar automaticamente
app.post('/api/anuncios/:id/imagens', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const anuncio = await findById(id);
    if (!anuncio) {
      res.status(404).json({ error: 'Anúncio não encontrado' });
      return;
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL da imagem é obrigatória' });
      return;
    }

    const imagens = anuncio.imagens || [];
    const ordem = imagens.length;
    const imgId = `${anuncio.mlb_id}_extra_${Date.now()}`;
    const localPath = await downloadImageToDisk(anuncio.mlb_id, url.trim(), ordem, imgId);

    runExec(
      `INSERT INTO imagens (anuncio_id, ml_image_id, url, url_original, ordem, local_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, imgId, url.trim(), url.trim(), ordem, localPath || null]
    );

    persistDb();
    const updated = await findById(id);
    res.json({ success: true, imagens: updated?.imagens || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10.4 Excluir imagem
app.delete('/api/anuncios/:id/imagens/:imageId', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);

    const img = queryAll<{ local_path: string | null }>('SELECT local_path FROM imagens WHERE id = ? AND anuncio_id = ?', [imageId, id])[0];
    if (img && img.local_path) {
      const fullPath = path.resolve(process.cwd(), img.local_path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }

    runExec('DELETE FROM imagens WHERE id = ? AND anuncio_id = ?', [imageId, id]);
    persistDb();
    const updated = await findById(id);
    res.json({ success: true, imagens: updated?.imagens || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Exportação em lote (ZIP com catálogo ou CSV consolidado)
app.post('/api/anuncios/exportar-lote', async (req: Request, res: Response) => {
  try {
    const { ids, formato = 'zip' } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).send('Nenhum anúncio selecionado');
      return;
    }

    if (formato === 'zip') {
      const zipBuffer = await createBatchZip(ids.map(Number));
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="exportacao_lote_${Date.now()}.zip"`);
      res.send(zipBuffer);
      return;
    }

    if (formato === 'csv') {
      const allAnuncios: any[] = [];
      for (const id of ids) {
        const a = await findById(Number(id));
        if (a) allAnuncios.push(a);
      }

      const headers = [
        'ID', 'MLB_ID', 'TITULO', 'PRECO', 'PRECO_PROMOCIONAL', 'ESTOQUE', 'VENDIDOS',
        'STATUS', 'CATEGORIA', 'SKU', 'EAN', 'MARCA', 'MODELO', 'PERMALINK'
      ];
      const rows = allAnuncios.map(a => [
        a.id, a.mlb_id, a.titulo, a.preco, a.preco_promocional || '', a.quantidade, a.vendidos,
        a.status, a.categoria_nome, a.sku || '', a.ean || '', a.marca || '', a.modelo || '', a.permalink
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));

      const csvContent = '\uFEFF' + headers.map(h => `"${h}"`).join(';') + '\n' + rows.join('\n') + '\n';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="anuncios_selecionados_${Date.now()}.csv"`);
      res.send(csvContent);
      return;
    }

    res.status(400).send('Formato de exportação em lote inválido');
  } catch (error: any) {
    res.status(500).send(`Erro na exportação: ${error.message}`);
  }
});

// ==========================================
// DASHBOARD & ESTATÍSTICAS
// ==========================================
app.get('/api/dashboard/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// BACKUP & RESTAURAÇÃO DO BANCO SQLITE
// ==========================================
app.get('/api/backups', async (_req: Request, res: Response) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/criar', async (_req: Request, res: Response) => {
  try {
    const filename = createBackup();
    res.json({ success: true, filename, message: `Backup criado: ${filename}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/restaurar', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      res.status(400).json({ error: 'Nome do arquivo de backup não informado' });
      return;
    }
    restoreBackup(filename);
    res.json({ success: true, message: 'Banco de dados restaurado com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/download/:filename', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.resolve(process.cwd(), 'dados', 'backups', filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Arquivo de backup não encontrado.');
      return;
    }
    res.download(filePath, filename);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// ==========================================
// CONFIGURAÇÕES & CREDENCIAIS
// ==========================================
app.get('/api/configuracoes', async (_req: Request, res: Response) => {
  try {
    await getDb();
    const clientId = getConfig('CLIENT_ID') || process.env.CLIENT_ID || '';
    const clientSecret = getConfig('CLIENT_SECRET') || process.env.CLIENT_SECRET || '';
    const accessToken = getConfig('ACCESS_TOKEN') || process.env.ACCESS_TOKEN || '';
    const refreshToken = getConfig('REFRESH_TOKEN') || process.env.REFRESH_TOKEN || '';

    res.json({
      CLIENT_ID: clientId,
      CLIENT_SECRET: clientSecret ? '••••••••••••••••' : '',
      ACCESS_TOKEN: accessToken ? `${accessToken.slice(0, 8)}...${accessToken.slice(-6)}` : '',
      REFRESH_TOKEN: refreshToken ? `${refreshToken.slice(0, 8)}...${refreshToken.slice(-6)}` : '',
      hasAccessToken: Boolean(accessToken),
      hasCredentials: Boolean(clientId && clientSecret),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/configuracoes', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN, REFRESH_TOKEN } = req.body;

    if (CLIENT_ID !== undefined) setConfig('CLIENT_ID', CLIENT_ID);
    if (CLIENT_SECRET && !CLIENT_SECRET.includes('••••')) setConfig('CLIENT_SECRET', CLIENT_SECRET);
    if (ACCESS_TOKEN && !ACCESS_TOKEN.includes('...')) setConfig('ACCESS_TOKEN', ACCESS_TOKEN);
    if (REFRESH_TOKEN && !REFRESH_TOKEN.includes('...')) setConfig('REFRESH_TOKEN', REFRESH_TOKEN);

    logAction('info', 'CONFIGURACOES', 'Configurações de API atualizadas');
    res.json({ success: true, message: 'Configurações salvas com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LOGS DO SISTEMA
// ==========================================
app.get('/api/logs', async (_req: Request, res: Response) => {
  try {
    await getDb();
    const logs = queryAll('SELECT * FROM logs ORDER BY id DESC LIMIT 100');
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR COM VITE
// ==========================================
async function startServer() {
  await getDb();
  console.log('Banco de dados SQLite inicializado com sucesso.');
  await seedInitialDataIfEmpty();

  // Baixa fotos pendentes em background para garantir que todos os anúncios tenham arquivos em disco
  (async () => {
    try {
      const pendingImages = queryAll<{ id: number; anuncio_id: number; url: string; mlb_id: string; ordem: number; ml_image_id: string }>(`
        SELECT i.id, i.anuncio_id, i.url, i.ordem, i.ml_image_id, a.mlb_id
        FROM imagens i
        JOIN anuncios a ON a.id = i.anuncio_id
        WHERE i.local_path IS NULL OR i.local_path = ''
        LIMIT 30
      `);
      if (pendingImages && pendingImages.length > 0) {
        console.log(`Baixando ${pendingImages.length} imagens pendentes para disco local...`);
        for (const p of pendingImages) {
          const lp = await downloadImageToDisk(p.mlb_id, p.url, p.ordem, p.ml_image_id);
          if (lp) {
            runExec('UPDATE imagens SET local_path = ? WHERE id = ?', [lp, p.id]);
          }
        }
        persistDb();
        console.log('Imagens pendentes baixadas com sucesso.');
      }
    } catch (e) {}
  })();

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ML Manager rodando na porta ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha crítica ao iniciar servidor:', err);
  process.exit(1);
});
