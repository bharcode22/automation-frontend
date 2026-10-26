/**
 * REST API client for SSH Headless Backend Service (Multi-Server & Media Uploader)
 */

export function getBackendBaseUrl() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ssh_backend_url');
    // Bersihkan otomatis jika di localStorage browser tersimpan URL lama localhost
    if (saved && (saved.includes('localhost:') || saved.includes('127.0.0.1:'))) {
      try {
        localStorage.removeItem('ssh_backend_url');
      } catch (_) {}
    }
  }

  const currentSaved = typeof window !== 'undefined' ? localStorage.getItem('ssh_backend_url') : null;
  const envUrl = import.meta.env?.VITE_BACKEND_URL;
  const url = currentSaved || envUrl || 'http://192.168.199.40:5051';
  return url.replace(/\/+$/, '');
}

export function setBackendBaseUrl(url) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('ssh_backend_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('ssh_backend_url');
    }
  }
}

export async function fetchHealth() {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

/**
 * Fetch all SSH credentials stored in credential-ssh.json
 */
export async function fetchSshConfig(target) {
  const base = getBackendBaseUrl();
  const url = target ? `${base}/api/ssh/config?target=${encodeURIComponent(target)}` : `${base}/api/ssh/config`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat konfigurasi SSH (${res.status})`);
  return res.json();
}

/**
 * Save / update SSH credentials to credential-ssh.json
 */
export async function saveSshConfig(configDataOrList) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configDataOrList || {})
  });
  if (!res.ok) throw new Error(`Gagal menyimpan konfigurasi SSH (${res.status})`);
  return res.json();
}

/**
 * Delete a server credential from credential-ssh.json
 */
export async function deleteSshConfig(idOrHost) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/config/${encodeURIComponent(idOrHost)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Gagal menghapus konfigurasi SSH (${res.status})`);
  return res.json();
}

/**
 * Test SSH connection handshake
 */
export async function testConnection(customConfig) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customConfig || {})
  });
  return res.json();
}

/**
 * Upload files via SFTP with automatic category routing
 * (sounds -> /home/pod/sounds, videos -> /home/pod/videos, images -> /home/pod/images)
 *
 * @param {FormData} formData - Contains files, targetServerId, broadcast flag
 * @param {Function} [onProgress] - Optional upload progress callback (percent)
 */
export function uploadMediaFiles(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const base = getBackendBaseUrl();
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${base}/api/ssh/media/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
        } else {
          reject(new Error(json.error || `Upload gagal dengan kode status ${xhr.status}`));
        }
      } catch (e) {
        reject(new Error(`Gagal memproses respons server: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Koneksi ke backend gagal saat mengunggah berkas.'));
    };

    xhr.send(formData);
  });
}

/**
 * Fetch media list from remote POD folders
 */
export async function fetchMediaList(targetServerId, category = 'all') {
  const base = getBackendBaseUrl();
  const params = new URLSearchParams();
  if (targetServerId) params.set('target', targetServerId);
  if (category) params.set('category', category);

  const res = await fetch(`${base}/api/ssh/media/list?${params.toString()}`);
  if (!res.ok) throw new Error(`Gagal mengambil daftar media (${res.status})`);
  return res.json();
}

/**
 * Fetch remote /home/pod/sounds/metadata.json
 */
export async function fetchRemoteMetadata(targetServerId) {
  const base = getBackendBaseUrl();
  const params = new URLSearchParams();
  if (targetServerId) params.set('target', targetServerId);

  const res = await fetch(`${base}/api/ssh/metadata?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal memuat metadata (${res.status})`);
  }
  return json;
}

/**
 * Save /home/pod/sounds/metadata.json
 *
 * @param {Object} options
 * @param {string} options.targetServerId
 * @param {string|Array|Object} options.content
 * @param {boolean} [options.broadcast=false]
 * @param {boolean} [options.createBackup=true]
 */
export async function saveRemoteMetadata({ targetServerId, content, broadcast = false, createBackup = true }) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetServerId,
      content,
      broadcast,
      createBackup
    })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menyimpan metadata (${res.status})`);
  }
  return json;
}

/**
 * Restore remote /home/pod/sounds/metadata.json from metadata.json.bak
 */
export async function restoreRemoteMetadata(targetServerId) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/metadata/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetServerId })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal memulihkan metadata dari cadangan (${res.status})`);
  }
  return json;
}

/**
 * Trigger PostgreSQL NOTIFY metadata_changed on remote POD
 */
export async function triggerDatabaseSync(targetServerId) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/metadata/sync-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetServerId })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal memicu sinkronisasi database (${res.status})`);
  }
  return json;
}

/**
 * Generate metadata directly from remote POD database using generte_mettda.ts logic
 */
export async function generateMetadataFromDb(targetServerId, broadcast = false) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/metadata/generate-from-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetServerId, broadcast })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal men-generate metadata dari database (${res.status})`);
  }
  return json;
}

/**
 * Execute whitelisted script in /home/pod/scripts/exec (./kill-process.sh or ./auto-script.sh)
 *
 * @param {Object} options
 * @param {string} options.targetServerId - Server name, id, or host
 * @param {string} options.scriptName - 'kill-process.sh' or 'auto-script.sh'
 * @param {boolean} [options.broadcast=false] - If true, executes on all PODs
 * @param {number} [options.timeoutMs=90000]
 */
export async function runPodScript({ targetServerId, scriptName, broadcast = false, timeoutMs = 90000 }) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/ssh/scripts/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetServerId,
      scriptName,
      broadcast,
      timeoutMs
    })
  });
  const json = await res.json();
  if (!res.ok && !json.results) {
    throw new Error(json.error || `Gagal mengeksekusi script (${res.status})`);
  }
  return json;
}

/**
 * List available shell scripts in /home/pod/scripts/exec
 *
 * @param {string} targetServerId
 */
export async function fetchPodScripts(targetServerId) {
  const base = getBackendBaseUrl();
  const params = new URLSearchParams();
  if (targetServerId) params.set('target', targetServerId);

  const res = await fetch(`${base}/api/ssh/scripts/list?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal mengambil daftar script (${res.status})`);
  }
  return json;
}
