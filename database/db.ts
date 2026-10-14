import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const DB_DIR = path.resolve(process.cwd(), 'database');
const DATA_DIR = path.resolve(process.cwd(), 'dados');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_PATH = path.resolve(DB_DIR, 'mercadolivre.db');

export function ensureDirectories() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  ensureDirectories();

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  persistDb();
  return db;
}

export function persistDb() {
  if (!db) return;
  ensureDirectories();
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema(database: Database) {
  // Anúncios
  database.run(`
    CREATE TABLE IF NOT EXISTS anuncios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mlb_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      subtitulo TEXT,
      descricao TEXT,
      categoria_id TEXT,
      categoria_nome TEXT,
      preco REAL NOT NULL DEFAULT 0,
      preco_promocional REAL,
      moeda TEXT DEFAULT 'BRL',
      condicao TEXT DEFAULT 'not_specified',
      quantidade INTEGER NOT NULL DEFAULT 0,
      vendidos INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'active',
      tipo_anuncio TEXT,
      permalink TEXT,
      sku TEXT,
      codigo_interno TEXT,
      gtin TEXT,
      ean TEXT,
      isbn TEXT,
      marca TEXT,
      modelo TEXT,
      fabricante TEXT,
      linha TEXT,
      genero TEXT,
      material TEXT,
      cor TEXT,
      tamanho TEXT,
      raw_json TEXT,
      data_criacao TEXT,
      data_atualizacao TEXT,
      data_importacao TEXT NOT NULL,
      ultima_sincronizacao TEXT
    );
  `);

  // Imagens
  database.run(`
    CREATE TABLE IF NOT EXISTS imagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anuncio_id INTEGER NOT NULL,
      ml_image_id TEXT,
      url TEXT NOT NULL,
      url_original TEXT,
      ordem INTEGER DEFAULT 0,
      local_path TEXT,
      FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE
    );
  `);

  // Atributos
  database.run(`
    CREATE TABLE IF NOT EXISTS atributos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anuncio_id INTEGER NOT NULL,
      attribute_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      valor TEXT,
      FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE
    );
  `);

  // Variações
  database.run(`
    CREATE TABLE IF NOT EXISTS variacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anuncio_id INTEGER NOT NULL,
      variation_id TEXT NOT NULL,
      sku TEXT,
      preco REAL NOT NULL DEFAULT 0,
      estoque INTEGER NOT NULL DEFAULT 0,
      gtin TEXT,
      cor TEXT,
      tamanho TEXT,
      FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE
    );
  `);

  // Variação Atributos
  database.run(`
    CREATE TABLE IF NOT EXISTS variacao_atributos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variacao_id INTEGER NOT NULL,
      attribute_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      valor TEXT,
      FOREIGN KEY (variacao_id) REFERENCES variacoes(id) ON DELETE CASCADE
    );
  `);

  // Histórico de alterações
  database.run(`
    CREATE TABLE IF NOT EXISTS anuncio_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anuncio_id INTEGER NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT,
      data TEXT NOT NULL,
      FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE
    );
  `);

  // Configurações do sistema
  database.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT
    );
  `);

  // Logs do sistema
  database.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nivel TEXT NOT NULL,
      acao TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      detalhes TEXT,
      data TEXT NOT NULL
    );
  `);

  // Índices solicitados para performance
  database.run(`CREATE INDEX IF NOT EXISTS idx_anuncios_mlb_id ON anuncios(mlb_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_anuncios_sku ON anuncios(sku);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_anuncios_titulo ON anuncios(titulo);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_anuncios_categoria_id ON anuncios(categoria_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_anuncios_data_importacao ON anuncios(data_importacao);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_imagens_anuncio_id ON imagens(anuncio_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_atributos_anuncio_id ON atributos(anuncio_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_variacoes_anuncio_id ON variacoes(anuncio_id);`);
}

// Helpers for executing SQL with objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) return [];
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(sql, params);
  return all.length > 0 ? all[0] : null;
}

export function runExec(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const rowidRes = db.exec('SELECT last_insert_rowid() as id');
  const lastInsertRowid = rowidRes && rowidRes[0]?.values[0] ? Number(rowidRes[0].values[0][0]) : 0;
  persistDb();

  return {
    lastInsertRowid,
    changes: 1,
  };
}

export function logAction(nivel: 'info' | 'warn' | 'error', acao: string, mensagem: string, detalhes?: any) {
  try {
    if (!db) return;
    const data = new Date().toISOString();
    const detalhesStr = detalhes ? (typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes)) : null;
    db.run(
      `INSERT INTO logs (nivel, acao, mensagem, detalhes, data) VALUES (?, ?, ?, ?, ?)`,
      [nivel, acao, mensagem, detalhesStr, data]
    );
    persistDb();
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}

export function getConfig(chave: string): string | null {
  const row = queryOne<{ valor: string }>('SELECT valor FROM configuracoes WHERE chave = ?', [chave]);
  return row ? row.valor : null;
}

export function setConfig(chave: string, valor: string) {
  runExec(
    'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
    [chave, valor]
  );
}

export function createBackup(): string {
  if (!db) throw new Error('Database not initialized');
  ensureDirectories();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '_');
  const backupFilename = `mercadolivre_backup_${timestamp}.db`;
  const backupFilePath = path.resolve(BACKUPS_DIR, backupFilename);

  const data = db.export();
  fs.writeFileSync(backupFilePath, Buffer.from(data));

  logAction('info', 'BACKUP', `Backup do banco criado com sucesso: ${backupFilename}`);
  return backupFilename;
}

export function restoreBackup(filenameOrBuffer: string | Buffer): boolean {
  ensureDirectories();
  let buffer: Buffer;
  if (typeof filenameOrBuffer === 'string') {
    const filePath = path.resolve(BACKUPS_DIR, filenameOrBuffer);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo de backup não encontrado: ${filenameOrBuffer}`);
    }
    buffer = fs.readFileSync(filePath);
  } else {
    buffer = filenameOrBuffer;
  }

  if (!SQL) {
    throw new Error('SQL engine not initialized');
  }

  // Backup current before replacing just in case
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, path.resolve(BACKUPS_DIR, `pre_restore_${Date.now()}.db`));
    }
  } catch (e) {
    console.warn('Could not create pre-restore backup:', e);
  }

  db = new SQL.Database(buffer);
  initSchema(db);
  persistDb();
  logAction('info', 'RESTAURAR_BACKUP', 'Backup restaurado com sucesso');
  return true;
}

export function listBackups(): { filename: string; size: number; date: string }[] {
  ensureDirectories();
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.db'));
  return files.map(file => {
    const stats = fs.statSync(path.resolve(BACKUPS_DIR, file));
    return {
      filename: file,
      size: stats.size,
      date: stats.mtime.toISOString(),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
