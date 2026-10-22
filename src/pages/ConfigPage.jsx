import React, { useState } from 'react';
import {
  FiSave,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiKey,
  FiLock,
  FiServer,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock
} from 'react-icons/fi';
import { saveSshConfig, deleteSshConfig, testConnection } from '../services/api';

export default function ConfigPage({
  servers = [],
  activeServer = {},
  setActiveServerId,
  refreshServers
}) {
  const [editingServer, setEditingServer] = useState(null); // null or server object
  const [isNewServer, setIsNewServer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({}); // { [serverId]: result }
  const [alertMessage, setAlertMessage] = useState(null);

  const defaultNewServer = {
    id: `server-${Date.now()}`,
    name: 'Server Baru',
    host: '192.168.1.1',
    port: 22,
    username: 'pod',
    authType: 'password',
    password: '',
    keyPath: '',
    passphrase: '',
    readyTimeout: 15000,
    commandTimeout: 30000
  };

  const handleOpenNew = () => {
    setEditingServer({ ...defaultNewServer });
    setIsNewServer(true);
  };

  const handleOpenEdit = (server) => {
    setEditingServer({ ...server });
    setIsNewServer(false);
  };

  const handleCloseModal = () => {
    setEditingServer(null);
    setIsNewServer(false);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!editingServer) return;

    setIsSaving(true);
    setAlertMessage(null);

    try {
      let updatedList;
      if (isNewServer) {
        updatedList = [...servers, editingServer];
      } else {
        updatedList = servers.map((s) => ((s.name && s.name === editingServer.name) || s.id === editingServer.id || s.host === editingServer.host ? editingServer : s));
      }

      const res = await saveSshConfig(updatedList);
      if (res.success) {
        setAlertMessage({ type: 'success', text: `Server "${editingServer.name || editingServer.host}" berhasil disimpan ke credential-ssh.json!` });
        handleCloseModal();
        if (refreshServers) await refreshServers();
      } else {
        setAlertMessage({ type: 'error', text: res.error || 'Gagal menyimpan konfigurasi' });
      }
    } catch (err) {
      setAlertMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (server) => {
    const targetName = server.name || `${server.username}@${server.host}:${server.port}`;
    if (!window.confirm(`Hapus server "${targetName}" dari credential-ssh.json?`)) return;

    try {
      const res = await deleteSshConfig(server.name || server.id || server.host);
      if (res.success) {
        setAlertMessage({ type: 'success', text: `Server ${targetName} berhasil dihapus dari credential-ssh.json` });
        if (refreshServers) await refreshServers();
      }
    } catch (err) {
      setAlertMessage({ type: 'error', text: `Gagal menghapus server: ${err.message}` });
    }
  };

  const handleTest = async (server) => {
    const id = server.name || server.id || `${server.username}@${server.host}:${server.port}`;
    setTestingId(id);
    setTestResults((prev) => ({ ...prev, [id]: null }));

    try {
      const res = await testConnection(server);
      setTestResults((prev) => ({ ...prev, [id]: res }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [id]: { success: false, error: err.message } }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FiServer className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-bold text-slate-100">Daftar Kredensial SSH Server</h1>
          </div>
          <p className="text-xs text-slate-400">
            Tersimpan di berkas <code className="text-sky-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">backend/credential-ssh.json</code>. Anda dapat mengelola banyak remote server sekaligus dan memilih server aktif kapan saja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshServers && refreshServers()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700 cursor-pointer"
            title="Muat ulang dari berkas"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Reload File</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-md shadow-sky-600/25 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Tambah Server SSH</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {alertMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
          alertMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            {alertMessage.type === 'success' ? <FiCheckCircle className="w-4 h-4 shrink-0" /> : <FiAlertCircle className="w-4 h-4 shrink-0" />}
            <span>{alertMessage.text}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Server Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {servers.map((s, idx) => {
          const id = s.name || s.id || `${s.username}@${s.host}:${s.port}`;
          const isActive = (activeServer.name && activeServer.name === s.name) || (activeServer.id && activeServer.id === id) || (activeServer.host === s.host && activeServer.port === s.port);
          const isTestingThis = testingId === id;
          const result = testResults[id];

          return (
            <div
              key={id}
              className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between gap-4 ${
                isActive
                  ? 'bg-slate-900/90 border-sky-500/70 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/40'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Card */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl text-white ${
                      isActive ? 'bg-sky-600' : 'bg-slate-800'
                    }`}>
                      <FiServer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 font-mono">
                        {s.name ? s.name : `${s.username}@${s.host}:${s.port}`}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        {s.username}@{s.host}:{s.port}
                      </span>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      <FiCheck className="w-3 h-3" />
                      <span>Target Aktif</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveServerId(s.name || id)}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                    >
                      Jadikan Aktif
                    </button>
                  )}
                </div>

                {/* Details Pill */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono text-slate-400">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Auth Mode</span>
                    <span className="text-slate-200 capitalize font-semibold">{s.authType}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Password / Key</span>
                    <span className="text-slate-200">
                      {s.authType === 'password' ? (s.password ? '••••••••' : '(Tanpa Password)') : (s.keyPath || 'Default Key')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Test Result Output */}
              {result && (
                <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  result.success
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {result.success ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiAlertCircle className="w-3.5 h-3.5" />}
                    <span>{result.success ? `Connected (${result.latencyMs}ms)` : 'Handshake Gagal'}</span>
                  </div>
                  {result.systemInfo && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {result.systemInfo}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-[11px] text-rose-400">
                      {result.error}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleTest(s)}
                  disabled={isTestingThis}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <FiShield className={`w-3.5 h-3.5 text-sky-400 ${isTestingThis ? 'animate-spin' : ''}`} />
                  <span>{isTestingThis ? 'Testing...' : 'Uji Koneksi'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer"
                  >
                    <FiEdit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {servers.length > 1 && (
                    <button
                      onClick={() => handleDelete(s)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                      title="Hapus server ini"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Server Modal */}
      {editingServer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FiServer className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-slate-100">
                  {isNewServer ? 'Tambah Server SSH Baru' : `Edit Server: ${editingServer.name || editingServer.host}`}
                </h2>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white cursor-pointer">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              
              {/* Alias / Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nama Alias Server (Opsional)</label>
                <input
                  type="text"
                  value={editingServer.name || ''}
                  onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                  placeholder="e.g. POD Node Utama / VPS Production"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              {/* Host and Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Host / Alamat IP</label>
                  <input
                    type="text"
                    value={editingServer.host || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, host: e.target.value })}
                    placeholder="e.g. 192.168.199.30"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Port</label>
                  <input
                    type="number"
                    value={editingServer.port || 22}
                    onChange={(e) => setEditingServer({ ...editingServer, port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Username and Auth Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Username</label>
                  <input
                    type="text"
                    value={editingServer.username || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, username: e.target.value })}
                    placeholder="e.g. pod"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Mode Otentikasi</label>
                  <select
                    value={editingServer.authType || 'password'}
                    onChange={(e) => setEditingServer({ ...editingServer, authType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs text-slate-100 outline-none"
                  >
                    <option value="password">Password</option>
                    <option value="key">Private Key (.pem / id_rsa)</option>
                  </select>
                </div>
              </div>

              {/* Password or Key Path */}
              {editingServer.authType === 'password' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FiLock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Password SSH</span>
                  </label>
                  <input
                    type="password"
                    value={editingServer.password || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, password: e.target.value })}
                    placeholder="Masukkan password remote SSH"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FiKey className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Path Private Key</span>
                    </label>
                    <input
                      type="text"
                      value={editingServer.keyPath || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, keyPath: e.target.value })}
                      placeholder="~/.ssh/id_rsa atau /path/to/key.pem"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Passphrase (Opsional)</label>
                    <input
                      type="password"
                      value={editingServer.passphrase || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, passphrase: e.target.value })}
                      placeholder="Passphrase jika private key terenkripsi"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-md shadow-sky-600/25 transition cursor-pointer"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan ke credential-ssh.json'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
