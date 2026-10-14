import { AnuncioCompleto, AnuncioSummary, DashboardStats, BackupItem, LogItem } from '../types/index.ts';

const API_BASE = '/api';

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Falha ao carregar métricas do dashboard');
  return res.json();
}

export async function checkMlbExists(input: string) {
  const res = await fetch(`${API_BASE}/anuncios/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, action: 'check' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao verificar anúncio');
  }
  return res.json();
}

export async function importListing(input: string, downloadImages = true, action: 'create' | 'update' = 'create') {
  const res = await fetch(`${API_BASE}/anuncios/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, downloadImages, action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao importar anúncio');
  }
  return data;
}

export async function importBatch(items: string[], downloadImages = false) {
  const res = await fetch(`${API_BASE}/anuncios/importar-lote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, downloadImages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha na importação em lote');
  return data.results;
}

export async function fetchAnuncios(params: {
  search?: string;
  categoria?: string;
  status?: string;
  precoMin?: number;
  precoMax?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  items: AnuncioSummary[];
  total: number;
  limit: number;
  offset: number;
  categories: string[];
}> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.categoria) query.set('categoria', params.categoria);
  if (params.status) query.set('status', params.status);
  if (params.precoMin !== undefined) query.set('precoMin', String(params.precoMin));
  if (params.precoMax !== undefined) query.set('precoMax', String(params.precoMax));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE}/anuncios?${query.toString()}`);
  if (!res.ok) throw new Error('Falha ao listar anúncios');
  return res.json();
}

export async function fetchAnuncioById(id: number): Promise<AnuncioCompleto> {
  const res = await fetch(`${API_BASE}/anuncios/${id}`);
  if (!res.ok) throw new Error('Anúncio não encontrado');
  return res.json();
}

export async function updateAnuncio(id: number, data: Partial<AnuncioCompleto>): Promise<AnuncioCompleto> {
  const res = await fetch(`${API_BASE}/anuncios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao atualizar anúncio');
  return res.json();
}

export async function syncAnuncioWithML(id: number): Promise<{ success: boolean; changes: any[]; anuncio: AnuncioCompleto }> {
  const res = await fetch(`${API_BASE}/anuncios/${id}/sincronizar`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao sincronizar com Mercado Livre');
  return data;
}

export async function duplicateAnuncio(id: number): Promise<{ success: boolean; newId: number }> {
  const res = await fetch(`${API_BASE}/anuncios/${id}/duplicar`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao duplicar anúncio');
  return data;
}

export async function deleteAnuncio(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/anuncios/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Falha ao excluir anúncio');
  return true;
}

export async function deleteBatch(ids: number[]): Promise<boolean> {
  const res = await fetch(`${API_BASE}/anuncios/lote-excluir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Falha ao excluir lote de anúncios');
  return true;
}

export async function duplicateBatch(ids: number[]): Promise<number[]> {
  const res = await fetch(`${API_BASE}/anuncios/lote-duplicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao duplicar lote');
  return data.createdIds;
}

export async function fetchBackups(): Promise<{ backups: BackupItem[] }> {
  const res = await fetch(`${API_BASE}/backups`);
  if (!res.ok) throw new Error('Falha ao listar backups');
  return res.json();
}

export async function createDbBackup(): Promise<{ filename: string; message: string }> {
  const res = await fetch(`${API_BASE}/backups/criar`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao criar backup');
  return data;
}

export async function restoreDbBackup(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/backups/restaurar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao restaurar backup');
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/configuracoes`);
  if (!res.ok) throw new Error('Falha ao obter configurações');
  return res.json();
}

export async function saveSettings(settings: any): Promise<void> {
  const res = await fetch(`${API_BASE}/configuracoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao salvar configurações');
}

export async function fetchLogs(): Promise<{ logs: LogItem[] }> {
  const res = await fetch(`${API_BASE}/logs`);
  if (!res.ok) throw new Error('Falha ao buscar logs');
  return res.json();
}

export function getExportUrl(id: number, format: 'json' | 'csv' | 'txt' | 'zip' | 'variacoes-csv' | 'atributos-csv'): string {
  return `${API_BASE}/anuncios/${id}/exportar/${format}`;
}
