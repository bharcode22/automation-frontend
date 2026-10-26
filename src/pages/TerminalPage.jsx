import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  FiRotateCcw,
  FiTrash2,
  FiTerminal,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiServer,
  FiZap,
  FiPlay,
  FiCopy,
  FiCheck,
  FiX,
  FiLayers,
  FiMaximize2
} from 'react-icons/fi';
import { getSocket } from '../services/socket';
import { runPodScript } from '../services/api';

export default function TerminalPage({
  servers = [],
  activeServer = {},
  setActiveServerId
}) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);

  const [status, setStatus] = useState('connecting'); // connecting | connected | disconnected | error
  const [errorMessage, setErrorMessage] = useState('');

  // Quick Script execution states
  const [executingScript, setExecutingScript] = useState(null); // 'kill-process.sh' | 'auto-script.sh' | null
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [scriptModalData, setScriptModalData] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  const initTerminalSession = () => {
    const socket = getSocket();
    if (!socket) return;

    setStatus('connecting');
    setErrorMessage('');

    if (xtermInstance.current) {
      const serverLabel = activeServer.name
        ? `${activeServer.name} (${activeServer.host})`
        : `${activeServer.username || 'pod'}@${activeServer.host || '127.0.0.1'}:${activeServer.port || 22}`;
      xtermInstance.current.writeln(
        `\r\n\x1b[36m[SYSTEM] Membuka sesi shell PTY ke ${serverLabel}...\x1b[0m`
      );
    }

    const cols = xtermInstance.current ? xtermInstance.current.cols : 80;
    const rows = xtermInstance.current ? xtermInstance.current.rows : 24;

    // Emits start session with the currently selected server config
    socket.emit('terminal:start', {
      cols,
      rows,
      config: activeServer
    });
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: '#07090e',
        foreground: '#f8fafc',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (_) {}
    }, 100);

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    const socket = getSocket();

    const onDataDispose = term.onData((data) => {
      socket.emit('terminal:input', data);
    });

    const handleReady = (info) => {
      setStatus('connected');
      const targetLabel = info.name ? `${info.name} (${info.host})` : `${info.username}@${info.host}:${info.port}`;
      term.writeln(`\r\n\x1b[32m✔ Berhasil terhubung ke ${targetLabel}\x1b[0m\r\n`);
    };

    const handleData = (chunk) => {
      term.write(chunk);
    };

    const handleError = ({ error }) => {
      setStatus('error');
      setErrorMessage(error || 'Terjadi kesalahan terminal SSH');
      term.writeln(`\r\n\x1b[31m✖ Error: ${error}\x1b[0m\r\n`);
    };

    const handleClosed = () => {
      setStatus('disconnected');
      term.writeln('\r\n\x1b[33m[SYSTEM] Sesi terminal remote telah ditutup.\x1b[0m\r\n');
    };

    socket.on('terminal:ready', handleReady);
    socket.on('terminal:data', handleData);
    socket.on('terminal:error', handleError);
    socket.on('terminal:closed', handleClosed);

    // Initial connect
    initTerminalSession();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (term.cols && term.rows) {
          socket.emit('terminal:resize', { cols: term.cols, rows: term.rows });
        }
      } catch (_) {}
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      onDataDispose.dispose();
      socket.off('terminal:ready', handleReady);
      socket.off('terminal:data', handleData);
      socket.off('terminal:error', handleError);
      socket.off('terminal:closed', handleClosed);
      socket.emit('terminal:close');
      term.dispose();
    };
  }, [activeServer?.name, activeServer?.id, activeServer?.host]); // Re-connect whenever active server changes!

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  /**
   * Run quick script in /home/pod/scripts/exec
   */
  const handleExecuteQuickScript = async (scriptName) => {
    const targetLabel = isBroadcast ? `SEMUA POD (${servers.length} server)` : (activeServer.name || activeServer.host);
    setExecutingScript(scriptName);

    if (xtermInstance.current) {
      xtermInstance.current.writeln(
        `\r\n\x1b[35m[QUICK SCRIPT] 🚀 Menjalankan ./${scriptName} pada ${targetLabel}...\x1b[0m`
      );
    }

    try {
      const response = await runPodScript({
        targetServerId: activeServer.name || activeServer.id || activeServer.host,
        scriptName,
        broadcast: isBroadcast
      });

      setScriptModalData({
        scriptName,
        isBroadcast,
        response,
        timestamp: new Date().toLocaleTimeString()
      });

      if (xtermInstance.current) {
        if (response.success) {
          xtermInstance.current.writeln(
            `\x1b[32m✔ ./${scriptName} selesai dieksekusi dengan sukses!\x1b[0m\r\n`
          );
        } else {
          xtermInstance.current.writeln(
            `\x1b[31m✖ Eksekusi ./${scriptName} mengalami kendala atau exit non-zero.\x1b[0m\r\n`
          );
        }
      }
    } catch (err) {
      setScriptModalData({
        scriptName,
        isBroadcast,
        response: {
          success: false,
          errors: [{ serverName: targetLabel, error: err.message }]
        },
        timestamp: new Date().toLocaleTimeString()
      });

      if (xtermInstance.current) {
        xtermInstance.current.writeln(
          `\x1b[31m✖ Gagal menjalankan ./${scriptName}: ${err.message}\x1b[0m\r\n`
        );
      }
    } finally {
      setExecutingScript(null);
    }
  };

  const copyModalOutput = () => {
    if (!scriptModalData) return;
    const textToCopy = JSON.stringify(scriptModalData.response, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto py-4">
      <div className="flex-1 flex flex-col bg-[#07090e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Terminal Header Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            {/* Server Selector inside Terminal Toolbar */}
            {servers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1">
                <FiServer className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={activeServer.name || activeServer.id || `${activeServer.username}@${activeServer.host}:${activeServer.port}`}
                  onChange={(e) => setActiveServerId && setActiveServerId(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-slate-200 outline-none cursor-pointer"
                >
                  {servers.map((s) => {
                    const id = s.name || s.id || `${s.username}@${s.host}:${s.port}`;
                    return (
                      <option key={id} value={id} className="bg-slate-950 text-slate-100 font-mono">
                        {s.name ? `${s.name} (${s.host})` : `${s.username}@${s.host}:${s.port}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            {/* Live Connection Status Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              status === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : status === 'connecting'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
            }`}>
              {status === 'connected' ? (
                <FiCheckCircle className="w-3 h-3" />
              ) : status === 'connecting' ? (
                <FiClock className="w-3 h-3 animate-spin" />
              ) : (
                <FiAlertCircle className="w-3 h-3" />
              )}
              <span className="capitalize">{status}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 cursor-pointer"
              title="Bersihkan layar terminal"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>

            <button
              onClick={initTerminalSession}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-md shadow-sky-600/20 transition cursor-pointer"
              title="Sambungkan ulang sesi PTY"
            >
              <FiRotateCcw className="w-3.5 h-3.5" />
              <span>Sambungkan Ulang</span>
            </button>
          </div>
        </div>

        {/* Quick Scripts Bar (/home/pod/scripts/exec) */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-950/95 border-b border-slate-800/80 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Quick Scripts:
            </span>

            {/* Kill Process Script Button */}
            <button
              onClick={() => handleExecuteQuickScript('kill-process.sh')}
              disabled={executingScript !== null}
              title="Eksekusi /home/pod/scripts/exec/kill-process.sh untuk mematikan proses zombie/stuck pada POD"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-semibold text-xs transition border cursor-pointer ${
                executingScript === 'kill-process.sh'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-500/50'
              }`}
            >
              <FiZap className={`w-3.5 h-3.5 text-rose-400 ${executingScript === 'kill-process.sh' ? 'animate-bounce' : ''}`} />
              <span>{executingScript === 'kill-process.sh' ? 'Menjalankan...' : './kill-process.sh'}</span>
            </button>

            {/* Auto Script Button */}
            <button
              onClick={() => handleExecuteQuickScript('auto-script.sh')}
              disabled={executingScript !== null}
              title="Eksekusi /home/pod/scripts/exec/auto-script.sh untuk auto maintenance/restart script"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-semibold text-xs transition border cursor-pointer ${
                executingScript === 'auto-script.sh'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                  : 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border-sky-500/30 hover:border-sky-500/50'
              }`}
            >
              <FiPlay className={`w-3.5 h-3.5 text-sky-400 ${executingScript === 'auto-script.sh' ? 'animate-spin' : ''}`} />
              <span>{executingScript === 'auto-script.sh' ? 'Menjalankan...' : './auto-script.sh'}</span>
            </button>
          </div>

          {/* Broadcast Option */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={isBroadcast}
                onChange={(e) => setIsBroadcast(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
              />
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <FiLayers className="w-3 h-3 text-amber-400" />
                Broadcast Semua Server ({servers.length})
              </span>
            </label>
          </div>
        </div>

        {/* XTerm Viewport Container */}
        <div
          ref={terminalRef}
          className="flex-1 p-3 bg-[#07090e] overflow-hidden"
        />

        {/* Script Execution Result Modal */}
        {scriptModalData && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${
                    scriptModalData.response?.success ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' : 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                  }`}>
                    <FiTerminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-bold text-sm text-slate-100">
                        Output: ./{scriptModalData.scriptName}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        scriptModalData.response?.success
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {scriptModalData.response?.success ? 'Sukses' : 'Gagal / Non-Zero'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target: {scriptModalData.isBroadcast ? `Broadcast (${servers.length} POD)` : (activeServer.name || activeServer.host)} • {scriptModalData.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyModalOutput}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 cursor-pointer"
                  >
                    {hasCopied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                    <span>{hasCopied ? 'Tersalin' : 'Salin JSON'}</span>
                  </button>

                  <button
                    onClick={() => setScriptModalData(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Output Log Box */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Aggregate Message Banner */}
                {scriptModalData.response?.message && (
                  <div className={`px-4 py-2.5 rounded-xl border text-xs font-mono ${
                    scriptModalData.response?.success
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  }`}>
                    {scriptModalData.response.message}
                  </div>
                )}

                {/* Server Outputs */}
                {(scriptModalData.response?.results || []).map((resItem, idx) => (
                  <div key={idx} className="bg-slate-950/90 border border-slate-800/90 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/60 border-b border-slate-800/60 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <FiServer className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-bold text-slate-200">{resItem.serverName || resItem.host}</span>
                        <span className="text-[10px] text-slate-400">({resItem.host})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-400">{resItem.durationMs}ms</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${resItem.code === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          Exit: {resItem.code ?? 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3">
                      <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap break-all max-h-56 overflow-y-auto bg-black/40 p-3 rounded-lg border border-slate-900">
                        {resItem.stdout || resItem.stderr || '(Tidak ada output stdout/stderr)'}
                      </pre>
                    </div>
                  </div>
                ))}

                {/* Errors if any */}
                {(scriptModalData.response?.errors || []).map((errItem, idx) => (
                  <div key={idx} className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-3.5 text-xs font-mono text-rose-300">
                    <div className="font-bold text-rose-200 mb-1">
                      Server: {errItem.serverName || errItem.host}
                    </div>
                    <div>Error: {errItem.error}</div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                <button
                  onClick={() => setScriptModalData(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
