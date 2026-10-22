import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { FiRotateCcw, FiTrash2, FiTerminal, FiCheckCircle, FiAlertCircle, FiClock, FiServer } from 'react-icons/fi';
import { getSocket } from '../services/socket';

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

  const initTerminalSession = () => {
    const socket = getSocket();
    if (!socket) return;

    setStatus('connecting');
    setErrorMessage('');

    if (xtermInstance.current) {
      const serverLabel = activeServer.name ? `${activeServer.name} (${activeServer.host})` : `${activeServer.username || 'pod'}@${activeServer.host || '127.0.0.1'}:${activeServer.port || 22}`;
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
      try { fitAddon.fit(); } catch (_) {}
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto py-4">
      <div className="flex-1 flex flex-col bg-[#07090e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 cursor-pointer"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>

            <button
              onClick={initTerminalSession}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-md shadow-sky-600/20 transition cursor-pointer"
            >
              <FiRotateCcw className="w-3.5 h-3.5" />
              <span>Sambungkan Ulang</span>
            </button>
          </div>
        </div>

        {/* XTerm Viewport Container */}
        <div
          ref={terminalRef}
          className="flex-1 p-3 bg-[#07090e] overflow-hidden"
        />
      </div>
    </div>
  );
}
