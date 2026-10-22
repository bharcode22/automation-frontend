import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TerminalPage from './pages/TerminalPage';
import ConfigPage from './pages/ConfigPage';
import UploadPage from './pages/UploadPage';
import MetadataPage from './pages/MetadataPage';
import { fetchHealth, fetchSshConfig } from './services/api';

export default function App() {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking' });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // List of all servers loaded from backend/credential-ssh.json
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerIdState] = useState(() => {
    return localStorage.getItem('ssh_active_server_id') || '';
  });

  const setActiveServerId = (id) => {
    setActiveServerIdState(id);
    if (id) {
      localStorage.setItem('ssh_active_server_id', id);
    }
  };

  // Derive the active server object
  const activeServer =
    servers.find((s) => (s.name && s.name === activeServerId) || s.id === activeServerId || s.host === activeServerId) ||
    servers[0] ||
    {
      name: 'pod 30',
      host: '127.0.0.1',
      port: 22,
      username: 'pod',
      authType: 'password',
      password: ''
    };

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await fetchHealth();
      setBackendHealth(health);
    } catch (err) {
      setBackendHealth({ status: 'error', error: err.message });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const loadBackendConfig = async () => {
    try {
      const res = await fetchSshConfig();
      if (res.success && Array.isArray(res.servers)) {
        setServers(res.servers);
        if (!activeServerId && res.servers.length > 0) {
          const firstId = res.servers[0].name || res.servers[0].id || `${res.servers[0].username}@${res.servers[0].host}:${res.servers[0].port}`;
          setActiveServerId(firstId);
        }
      }
    } catch (e) {
      console.error('Gagal memuat konfigurasi server:', e);
    }
  };

  useEffect(() => {
    checkHealth();
    loadBackendConfig();

    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      <Navbar
        servers={servers}
        activeServer={activeServer}
        setActiveServerId={setActiveServerId}
        backendHealth={backendHealth}
        isCheckingHealth={isCheckingHealth}
        checkHealth={checkHealth}
      />

      <main className="flex-1 px-4 sm:px-6">
        <Routes>
          <Route
            path="/"
            element={
              <TerminalPage
                servers={servers}
                activeServer={activeServer}
                setActiveServerId={setActiveServerId}
              />
            }
          />
          <Route
            path="/config"
            element={
              <ConfigPage
                servers={servers}
                activeServer={activeServer}
                setActiveServerId={setActiveServerId}
                refreshServers={loadBackendConfig}
              />
            }
          />
          <Route
            path="/upload"
            element={
              <UploadPage
                servers={servers}
                activeServer={activeServer}
                setActiveServerId={setActiveServerId}
              />
            }
          />
          <Route
            path="/metadata"
            element={
              <MetadataPage
                servers={servers}
                activeServer={activeServer}
                setActiveServerId={setActiveServerId}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
