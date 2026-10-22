import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiTerminal, FiSettings, FiServer, FiRefreshCw, FiUploadCloud, FiFileText } from 'react-icons/fi';

export default function Navbar({
  servers = [],
  activeServer = {},
  setActiveServerId,
  backendHealth,
  isCheckingHealth,
  checkHealth
}) {
  const isOnline = backendHealth && backendHealth.status === 'ok';

  return (
    <header className="sticky top-0 z-50 bg-[#0c101c]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        
        {/* Brand & Server Switcher */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-cyan-400 p-2 rounded-xl text-white shadow-lg shadow-sky-500/20">
              <FiTerminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base tracking-tight">SSH Control Center</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {servers.length > 1 ? `${servers.length} Servers` : 'SSH Focus'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Server Dropdown / Selector */}
          {servers.length > 0 && (
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 gap-2">
              <FiServer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold leading-none">Target Aktif</span>
                <select
                  value={activeServer.name || activeServer.id || `${activeServer.username}@${activeServer.host}:${activeServer.port}`}
                  onChange={(e) => setActiveServerId(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-slate-200 outline-none cursor-pointer pr-4"
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
            </div>
          )}

          {/* Backend Status Pill */}
          <div className={`hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse-dot' : 'bg-rose-400'}`} />
            <span>{isOnline ? `Online (${backendHealth.uptimeSeconds || 0}s)` : 'Backend Offline'}</span>
            <button
              onClick={checkHealth}
              title="Perbarui status backend"
              className="hover:text-white transition-colors cursor-pointer ml-0.5"
            >
              <FiRefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <FiTerminal className="w-3.5 h-3.5" />
            <span>Terminal PTY</span>
          </NavLink>

          <NavLink
            to="/config"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <FiSettings className="w-3.5 h-3.5" />
            <span>Credential SSH</span>
            {servers.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.2 rounded-full">
                {servers.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <FiUploadCloud className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </NavLink>

          <NavLink
            to="/metadata"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <FiFileText className="w-3.5 h-3.5" />
            <span>Metadata Sounds</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
