import React, { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  Save,
  Download,
  Upload,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Terminal,
} from 'lucide-react';
import {
  fetchSettings,
  saveSettings,
  fetchBackups,
  createDbBackup,
  restoreDbBackup,
  fetchLogs,
} from '../services/api.ts';
import { BackupItem, LogItem } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { Modal } from '../components/Modal.tsx';

export const Configuracoes: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'api' | 'backup' | 'logs'>('api');

  // Credentials
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  // Backups
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreModal, setRestoreModal] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const { addToast } = useToast();

  const loadSettingsData = async () => {
    try {
      const data = await fetchSettings();
      setClientId(data.CLIENT_ID || '');
      setHasToken(data.hasAccessToken);
    } catch (err: any) {
      addToast('erro', 'Erro ao carregar configurações', err.message);
    }
  };

  const loadBackupsList = async () => {
    setLoadingBackups(true);
    try {
      const data = await fetchBackups();
      setBackups(data.backups);
    } catch (err: any) {
      addToast('erro', 'Erro ao listar backups', err.message);
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadLogsList = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchLogs();
      setLogs(data.logs);
    } catch (err: any) {
      addToast('erro', 'Erro ao buscar logs', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
    loadBackupsList();
    loadLogsList();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    try {
      await saveSettings({
        CLIENT_ID: clientId,
        CLIENT_SECRET: clientSecret,
        ACCESS_TOKEN: accessToken,
        REFRESH_TOKEN: refreshToken,
      });
      addToast('sucesso', 'Configurações salvas com sucesso!');
      setClientSecret('');
      setAccessToken('');
      setRefreshToken('');
      loadSettingsData();
    } catch (err: any) {
      addToast('erro', 'Erro ao salvar credenciais', err.message);
    } finally {
      setSavingCreds(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await createDbBackup();
      addToast('sucesso', 'Backup criado com sucesso!', res.filename);
      loadBackupsList();
    } catch (err: any) {
      addToast('erro', 'Falha ao criar backup', err.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreModal) return;
    try {
      await restoreDbBackup(restoreModal);
      addToast('sucesso', 'Banco SQLite restaurado com sucesso!', `Restaurado de: ${restoreModal}`);
      setRestoreModal(null);
      loadBackupsList();
    } catch (err: any) {
      addToast('erro', 'Falha ao restaurar backup', err.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-500" />
          <span>Configurações & Banco SQLite</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Gerencie chaves da API do Mercado Livre, cópias de segurança do banco mercadolivre.db e histórico de logs.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('api')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all ${
            activeSubTab === 'api'
              ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API Mercado Livre</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all ${
            activeSubTab === 'backup'
              ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backup & Restauração</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all ${
            activeSubTab === 'logs'
              ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Logs do Sistema</span>
        </button>
      </div>

      {/* SUBTAB 1: API CREDENTIALS */}
      {activeSubTab === 'api' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-100">
                Integração Oficial Mercado Livre
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                A aplicação realiza consultas à API pública do Mercado Livre para busca de anúncios, descrições, categorias e fotos.
                Para taxas mais altas ou anúncios restritos à sua conta de vendedor, configure suas credenciais de desenvolvedor abaixo. As credenciais nunca são expostas ao frontend.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  CLIENT_ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ex: 123456789012345"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  CLIENT_SECRET
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Inserir novo Client Secret..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  ACCESS_TOKEN (Opcional)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={hasToken ? 'Token configurado (deixe vazio para manter)' : 'APP_USR-...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                {hasToken && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Access Token ativo no servidor</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  REFRESH_TOKEN (Opcional)
                </label>
                <input
                  type="password"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="TG-..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingCreds}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{savingCreds ? 'Salvando...' : 'Salvar Credenciais'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 2: BACKUP & RESTAURAÇÃO */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Backup do Banco de Dados SQLite
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gera uma cópia física instantânea da base de dados no formato <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">mercadolivre_backup_YYYY-MM-DD_HH-mm.db</code>.
                </p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
              >
                {creatingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>BACKUP DO BANCO</span>
              </button>
            </div>
          </div>

          {/* Backups List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Backups Disponíveis no Servidor ({backups.length})
              </h4>
              <button
                onClick={loadBackupsList}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
                <span>Atualizar lista</span>
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum arquivo de backup gerado ainda. Clique em "BACKUP DO BANCO" acima para criar a primeira cópia.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.map((bk, i) => (
                  <div
                    key={i}
                    className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {bk.filename}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(bk.date).toLocaleString('pt-BR')} • {(bk.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/backups/download/${bk.filename}`}
                        download
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .db</span>
                      </a>
                      <button
                        onClick={() => setRestoreModal(bk.filename)}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-300 border border-amber-400/30 font-semibold text-xs flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>RESTAURAR BACKUP</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: LOGS */}
      {activeSubTab === 'logs' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Logs de Operações & Erros
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de chamadas à API, limites de requisições e eventos do banco de dados.
              </p>
            </div>
            <button
              onClick={loadLogsList}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Recarregar</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              Nenhum log registrado até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          log.nivel === 'error'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : log.nivel === 'warn'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {log.nivel}
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.acao}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{log.mensagem}</p>
                    {log.detalhes && (
                      <p className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                        {log.detalhes}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(log.data).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(restoreModal)}
        onClose={() => setRestoreModal(null)}
        title="Confirmar Restauração de Backup"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Atenção!</p>
              <p className="mt-1">
                Restaurar o arquivo <strong>{restoreModal}</strong> substituirá a base de dados ativa pelo conteúdo desse snapshot. Um backup de segurança do estado atual será criado antes da substituição.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRestoreModal(null)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleRestoreBackup}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md"
            >
              Confirmar Restauração
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
