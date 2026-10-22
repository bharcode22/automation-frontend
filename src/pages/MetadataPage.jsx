import React, { useState, useEffect, useMemo } from 'react';
import {
  FiFileText,
  FiCode,
  FiGrid,
  FiSave,
  FiRotateCcw,
  FiPlus,
  FiTrash2,
  FiCopy,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiAlertCircle,
  FiDownload,
  FiMusic,
  FiVideo,
  FiImage,
  FiClock,
  FiLayers,
  FiServer,
  FiRefreshCw,
  FiEdit3,
  FiX,
  FiCheck,
  FiFolder,
  FiZap,
  FiDatabase
} from 'react-icons/fi';
import {
  fetchRemoteMetadata,
  saveRemoteMetadata,
  restoreRemoteMetadata,
  fetchMediaList,
  triggerDatabaseSync
} from '../services/api';

/**
 * Cleanly extract a readable title from a filename
 * e.g. "TREE_OF_LIFE_Backsound_Cinematic_-_No_Copyright.mp3" -> "TREE OF LIFE Backsound Cinematic No Copyright"
 * e.g. "Relax%20Max%204.1%20VIDEO.mp4" -> "Relax Max 4.1 VIDEO"
 */
function extractTitleFromFilename(filename) {
  if (!filename) return '';
  let clean = decodeURIComponent(filename);
  clean = clean.split('/').pop();
  clean = clean.replace(/\.[a-zA-Z0-9]+$/, ''); // remove extension
  clean = clean.replace(/[_-]+/g, ' ').trim(); // replace _ and - with space
  clean = clean.replace(/\s+/g, ' '); // collapse spaces
  return clean;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function MetadataPage({
  servers = [],
  activeServer = {},
  setActiveServerId
}) {
  const currentTargetId = activeServer.name || activeServer.id || (activeServer.host ? `${activeServer.username}@${activeServer.host}:${activeServer.port}` : (servers[0]?.name || servers[0]?.id || ''));

  // State
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'raw'
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text }

  // Metadata Data
  const [metadataList, setMetadataList] = useState([]);
  const [rawJsonText, setRawJsonText] = useState('[]');
  const [jsonError, setJsonError] = useState(null);
  const [fileStats, setFileStats] = useState({
    exists: true,
    sizeBytes: 0,
    modifyTime: null,
    hasBackup: false,
    targetHost: ''
  });

  // Save options
  const [autoBackup, setAutoBackup] = useState(true);
  const [broadcast, setBroadcast] = useState(false);

  // Filters & Search for Visual Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null = Add, number = Edit
  const [formData, setFormData] = useState({
    type: 'SelfDevelopment',
    id: '',
    session: '',
    display: '',
    duration: 60000,
    filepath: '',
    video: '',
    strobepath: '',
    description: '',
    title: '',
    scent: '',
    burstTime: ''
  });

  // Remote Media Cache from /home/pod/sounds, /home/pod/videos, /home/pod/images
  const [remoteMedia, setRemoteMedia] = useState({
    sounds: [],
    videos: [],
    images: []
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Searchable Media Picker Modal State
  const [pickerModal, setPickerModal] = useState({
    isOpen: false,
    activeTab: 'sounds', // 'sounds' | 'videos' | 'images'
    targetField: 'filepath', // 'filepath' | 'video' | 'strobepath' | 'quick_audio' | 'quick_video'
    itemIndex: null, // for quick card edits
    search: '',
    autoExtractTitle: true
  });

  // Load metadata on mount or when target changes
  useEffect(() => {
    if (currentTargetId) {
      loadMetadata();
      loadRemoteMediaFiles();
    }
  }, [currentTargetId]);

  // Validate Raw JSON text whenever it changes in raw mode
  useEffect(() => {
    if (editorMode === 'raw') {
      try {
        const parsed = JSON.parse(rawJsonText);
        setJsonError(null);
        if (Array.isArray(parsed)) {
          setMetadataList(parsed);
        }
      } catch (err) {
        setJsonError(err.message);
      }
    }
  }, [rawJsonText, editorMode]);

  async function loadMetadata() {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await fetchRemoteMetadata(currentTargetId);
      const items = Array.isArray(data.metadata) ? data.metadata : [];
      setMetadataList(items);
      const prettyStr = JSON.stringify(items, null, 2);
      setRawJsonText(data.rawString || prettyStr);
      setFileStats({
        exists: data.exists,
        sizeBytes: data.sizeBytes || 0,
        modifyTime: data.modifyTime,
        hasBackup: data.hasBackup,
        targetHost: data.targetHost || data.serverName
      });
      setJsonError(null);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memuat metadata: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRemoteMediaFiles() {
    setIsLoadingMedia(true);
    try {
      const res = await fetchMediaList(currentTargetId, 'all');
      if (res && res.media) {
        setRemoteMedia({
          sounds: res.media.sounds || [],
          videos: res.media.videos || [],
          images: res.media.images || []
        });
      }
    } catch (err) {
      console.warn('Gagal memuat daftar media POD:', err.message);
    } finally {
      setIsLoadingMedia(false);
    }
  }

  // Open Media Picker Modal
  function openMediaPicker(targetField, defaultTab = 'sounds', itemIndex = null) {
    setPickerModal({
      isOpen: true,
      activeTab: defaultTab,
      targetField,
      itemIndex,
      search: '',
      autoExtractTitle: true
    });
  }

  // Handle Selection from Media Picker Modal
  function handleSelectMediaFile(fileName) {
    const cleanTitle = extractTitleFromFilename(fileName);
    const { targetField, itemIndex, autoExtractTitle } = pickerModal;

    // Skenario A: Quick file update from Card Grid
    if (itemIndex !== null && itemIndex !== undefined) {
      const updated = [...metadataList];
      const targetItem = { ...updated[itemIndex] };

      if (targetField === 'quick_audio') {
        targetItem.filepath = fileName;
        if (!targetItem.details) targetItem.details = {};
        targetItem.details.soundPath = fileName;
        if (autoExtractTitle) {
          targetItem.display = cleanTitle;
          targetItem.details.title = cleanTitle;
          if (!targetItem.description) targetItem.description = cleanTitle;
        }
      } else if (targetField === 'quick_video') {
        targetItem.video = fileName;
        if (autoExtractTitle && !targetItem.display) {
          targetItem.display = cleanTitle;
          if (!targetItem.details) targetItem.details = {};
          targetItem.details.title = cleanTitle;
        }
      }

      updated[itemIndex] = targetItem;
      setMetadataList(updated);
      setRawJsonText(JSON.stringify(updated, null, 2));

      setStatusMessage({
        type: 'success',
        text: `File pada sesi #${itemIndex + 1} diubah ke "${fileName}"${autoExtractTitle ? ` (Judul: "${cleanTitle}")` : ''}.`
      });
    }
    // Skenario B: Selection inside Add/Edit Modal Form
    else {
      setFormData((prev) => {
        const next = { ...prev };
        next[targetField] = fileName;

        // "ambil judulnya": Automatically update title & display if checked or empty
        if (autoExtractTitle || !prev.display) {
          next.display = cleanTitle;
          next.title = cleanTitle;
          if (!prev.description) {
            next.description = cleanTitle;
          }
        }
        return next;
      });
    }

    setPickerModal((prev) => ({ ...prev, isOpen: false }));
  }

  // Manually apply clean title from current filepath / video
  function applyTitleFromCurrentField(fieldKey) {
    const filename = formData[fieldKey];
    if (!filename) return;
    const clean = extractTitleFromFilename(filename);
    setFormData((prev) => ({
      ...prev,
      display: clean,
      title: clean,
      description: prev.description || clean
    }));
    setStatusMessage({
      type: 'success',
      text: `Judul & Display disesuaikan dari "${filename}" -> "${clean}"`
    });
  }

  // Switch to Raw Mode
  function handleSwitchToRaw() {
    const formatted = JSON.stringify(metadataList, null, 2);
    setRawJsonText(formatted);
    setJsonError(null);
    setEditorMode('raw');
  }

  // Switch to Visual Mode
  function handleSwitchToVisual() {
    try {
      const parsed = JSON.parse(rawJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Root metadata harus berupa Array JSON []');
      }
      setMetadataList(parsed);
      setJsonError(null);
      setEditorMode('visual');
    } catch (err) {
      setJsonError(`Perbaiki sintaks JSON sebelum beralih ke Mode Visual: ${err.message}`);
    }
  }

  // Prettify Raw JSON
  function handlePrettify() {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setJsonError(`Gagal memformat: ${err.message}`);
    }
  }

  // Minify Raw JSON
  function handleMinify() {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed));
      setJsonError(null);
    } catch (err) {
      setJsonError(`Gagal memadatkan: ${err.message}`);
    }
  }

  // Save changes to remote POD
  async function handleSave() {
    let contentToSave;
    if (editorMode === 'raw') {
      try {
        const parsed = JSON.parse(rawJsonText);
        contentToSave = parsed;
      } catch (err) {
        setStatusMessage({ type: 'error', text: `Sintaks JSON tidak valid: ${err.message}` });
        return;
      }
    } else {
      contentToSave = metadataList;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const result = await saveRemoteMetadata({
        targetServerId: currentTargetId,
        content: contentToSave,
        broadcast,
        createBackup: autoBackup
      });

      setStatusMessage({
        type: 'success',
        text: result.message || 'Berkas metadata.json berhasil disimpan ke remote POD!'
      });

      // Refresh file status
      await loadMetadata();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  }

  // Restore backup
  async function handleRestore() {
    if (!window.confirm('Apakah Anda yakin ingin memulihkan metadata.json dari metadata.json.bak? Perubahan saat ini akan ditimpa!')) {
      return;
    }

    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const res = await restoreRemoteMetadata(currentTargetId);
      setStatusMessage({ type: 'success', text: res.message || 'Metadata berhasil dipulihkan dari cadangan (.bak).' });
      await loadMetadata();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memulihkan cadangan: ${err.message}` });
    } finally {
      setIsRestoring(false);
    }
  }

  // Trigger PostgreSQL Database synchronization on remote POD
  async function handleSyncFromDatabase() {
    setIsSyncingDb(true);
    setStatusMessage(null);
    try {
      const res = await triggerDatabaseSync(currentTargetId);
      const total = res.totalGeneratedItems || (res.metadata ? res.metadata.length : null);
      const stats = res.stats || {};
      const statsDetail = stats.sessionsCount !== undefined 
        ? `(${stats.sessionsCount} Sessions, ${stats.guidesCount} Guides, ${stats.selfDevelopmentCount} SelfDevelopment)` 
        : '';

      setStatusMessage({
        type: 'success',
        text: `Berhasil men-generate metadata dari database! ${total ? `${total} item ${statsDetail}` : ''}`
      });
      await loadMetadata();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal men-generate dari DB: ${err.message}` });
    } finally {
      setIsSyncingDb(false);
    }
  }

  // Download local copy
  function handleDownloadLocal() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      editorMode === 'raw' ? rawJsonText : JSON.stringify(metadataList, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `metadata-${activeServer.name ? activeServer.name.replace(/\s+/g, '_') : (activeServer.host || 'pod')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Visual Mode Actions: Delete item
  function handleDeleteItem(index) {
    if (!window.confirm(`Hapus item #${index + 1} (${metadataList[index]?.display || metadataList[index]?.id || 'Tanpa Judul'})?`)) {
      return;
    }
    const updated = metadataList.filter((_, idx) => idx !== index);
    setMetadataList(updated);
    setRawJsonText(JSON.stringify(updated, null, 2));
  }

  // Visual Mode Actions: Duplicate item
  function handleDuplicateItem(index) {
    const item = metadataList[index];
    const clone = JSON.parse(JSON.stringify(item));
    if (typeof clone.id === 'number') {
      clone.id = Math.floor(100000 + Math.random() * 900000);
    } else {
      clone.id = `${clone.id}_copy`;
    }
    if (clone.display) clone.display = `${clone.display} (Salinan)`;
    const updated = [...metadataList, clone];
    setMetadataList(updated);
    setRawJsonText(JSON.stringify(updated, null, 2));
    setStatusMessage({ type: 'success', text: `Item #${index + 1} berhasil diduplikasi ke posisi paling akhir.` });
  }

  // Visual Mode Actions: Open Modal for Add
  function handleOpenAddModal() {
    setEditingIndex(null);
    const firstSound = remoteMedia.sounds[0]?.name || '';
    const cleanFirstTitle = extractTitleFromFilename(firstSound);

    setFormData({
      type: 'SelfDevelopment',
      id: Math.floor(100000 + Math.random() * 900000),
      session: existingSessions[0] || 'NATURE SCAPE',
      display: cleanFirstTitle,
      duration: 10000,
      filepath: firstSound,
      video: remoteMedia.videos[0]?.name || '',
      strobepath: '',
      description: cleanFirstTitle,
      title: cleanFirstTitle,
      scent: '',
      burstTime: ''
    });
    setIsModalOpen(true);
  }

  // Visual Mode Actions: Open Modal for Edit
  function handleOpenEditModal(index) {
    setEditingIndex(index);
    const item = metadataList[index] || {};
    setFormData({
      type: item.type || 'SelfDevelopment',
      id: item.id !== undefined ? item.id : '',
      session: item.session || '',
      display: item.display || '',
      duration: item.duration !== undefined ? item.duration : 60000,
      filepath: item.filepath || '',
      video: item.video || '',
      strobepath: item.strobepath || '',
      description: item.description || (item.details?.description) || '',
      title: item.details?.title || item.display || '',
      scent: item.scent || '',
      burstTime: item.burstTime ? JSON.stringify(item.burstTime) : ''
    });
    setIsModalOpen(true);
  }

  // Save Modal Form
  function handleSaveModalForm(e) {
    e.preventDefault();
    let burstObj = undefined;
    if (formData.burstTime && formData.burstTime.trim()) {
      try {
        burstObj = JSON.parse(formData.burstTime);
      } catch (_) {
        alert('Format Burst Time harus berupa JSON valid seperti {"2.45": 5000}');
        return;
      }
    }

    const newItem = {
      type: formData.type || 'SelfDevelopment',
      id: !isNaN(Number(formData.id)) ? Number(formData.id) : formData.id,
      description: formData.description || '',
      session: formData.session || '',
      duration: Number(formData.duration) || 0,
      display: formData.display || formData.title || '',
      filepath: formData.filepath || '',
      details: {
        title: formData.title || formData.display || '',
        description: formData.description || '',
        soundPath: formData.filepath || ''
      },
      video: formData.video || '',
      strobepath: formData.strobepath || ''
    };

    if (formData.scent) newItem.scent = formData.scent;
    if (burstObj) newItem.burstTime = burstObj;

    let updated;
    if (editingIndex === null) {
      updated = [...metadataList, newItem];
    } else {
      updated = metadataList.map((item, idx) => (idx === editingIndex ? newItem : item));
    }

    setMetadataList(updated);
    setRawJsonText(JSON.stringify(updated, null, 2));
    setIsModalOpen(false);
  }

  // Distinct Sessions & Types for Filter
  const existingSessions = useMemo(() => {
    const set = new Set();
    metadataList.forEach((item) => {
      if (item && item.session) set.add(item.session);
    });
    return Array.from(set).sort();
  }, [metadataList]);

  const existingTypes = useMemo(() => {
    const set = new Set();
    metadataList.forEach((item) => {
      if (item && item.type) set.add(item.type);
    });
    return Array.from(set).sort();
  }, [metadataList]);

  // Filtered Items for Visual Grid
  const filteredItems = useMemo(() => {
    return metadataList.map((item, originalIndex) => ({ ...item, _originalIndex: originalIndex })).filter((item) => {
      if (selectedSessionFilter !== 'ALL' && item.session !== selectedSessionFilter) return false;
      if (selectedTypeFilter !== 'ALL' && item.type !== selectedTypeFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = (item.display || '').toLowerCase().includes(q) || (item.details?.title || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchFile = (item.filepath || '').toLowerCase().includes(q) || (item.video || '').toLowerCase().includes(q);
      const matchSession = (item.session || '').toLowerCase().includes(q);
      const matchId = String(item.id || '').toLowerCase().includes(q);

      return matchTitle || matchDesc || matchFile || matchSession || matchId;
    });
  }, [metadataList, selectedSessionFilter, selectedTypeFilter, searchQuery]);

  // Filtered files inside Media Picker Modal
  const pickerFileList = useMemo(() => {
    const rawList = remoteMedia[pickerModal.activeTab] || [];
    if (!pickerModal.search.trim()) return rawList;
    const q = pickerModal.search.toLowerCase();
    return rawList.filter((f) => {
      const name = f.name.toLowerCase();
      const cleanTitle = extractTitleFromFilename(f.name).toLowerCase();
      return name.includes(q) || cleanTitle.includes(q);
    });
  }, [remoteMedia, pickerModal.activeTab, pickerModal.search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-100">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 shadow-lg shadow-orange-500/20">
              <FiFileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Metadata Sounds Manager
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  /home/pod/sounds/metadata.json
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola sesi playlist, durasi, dan relasi file audio/video pada POD secara visual maupun kode mentah.
              </p>
            </div>
          </div>
        </div>

        {/* Server & Stats Quick Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <FiServer className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Target:</span>
            <select
              value={currentTargetId}
              onChange={(e) => setActiveServerId && setActiveServerId(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-200 outline-none cursor-pointer"
            >
              {servers.map((s) => {
                const id = s.name || s.id || `${s.username}@${s.host}:${s.port}`;
                return (
                  <option key={id} value={id} className="bg-slate-900 text-slate-200">
                    {s.name ? `${s.name} (${s.host})` : `${s.username}@${s.host}:${s.port}`}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={() => {
              loadMetadata();
              loadRemoteMediaFiles();
            }}
            disabled={isLoading || isLoadingMedia}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
            title="Muat ulang dari POD"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading || isLoadingMedia ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${statusMessage.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <FiCheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Mode Toggle + Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/80">

        {/* Dual Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={handleSwitchToVisual}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${editorMode === 'visual'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <FiGrid className="w-3.5 h-3.5" />
            <span>Visual Manager</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {metadataList.length}
            </span>
          </button>

          <button
            onClick={handleSwitchToRaw}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${editorMode === 'raw'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <FiCode className="w-3.5 h-3.5" />
            <span>Raw Code JSON</span>
          </button>
        </div>

        {/* Options & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto Backup Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Auto-Backup (.bak)</span>
          </label>

          {/* Broadcast Toggle */}
          {servers.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={broadcast}
                onChange={(e) => setBroadcast(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-amber-400 font-medium">Broadcast ke Semua POD</span>
            </label>
          )}

          {/* Restore Button */}
          {fileStats.hasBackup && (
            <button
              onClick={handleRestore}
              disabled={isRestoring || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
              title="Kembalikan file dari metadata.json.bak"
            >
              <FiRotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
              <span>Restore Backup</span>
            </button>
          )}

          {/* Sync / Generate from Database Button */}
          <button
            onClick={handleSyncFromDatabase}
            disabled={isSyncingDb || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Generate ulang berkas metadata.json langsung dari database PostgreSQL POD"
          >
            <FiDatabase className={`w-3.5 h-3.5 ${isSyncingDb ? 'animate-spin' : ''}`} />
            <span>{isSyncingDb ? 'Mengenerate...' : 'Generate dari DB'}</span>
          </button>

          {/* Download Local Copy */}
          <button
            onClick={handleDownloadLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            title="Download salinan JSON ke laptop/PC"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Unduh</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || (editorMode === 'raw' && !!jsonError)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FiSave className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {/* MODE 1: VISUAL MANAGER */}
      {editorMode === 'visual' && (
        <div className="space-y-4">

          {/* Filter, Search & Add Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Cari sesi, judul, audio, video..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Filter by Session */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <FiFilter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={selectedSessionFilter}
                  onChange={(e) => setSelectedSessionFilter(e.target.value)}
                  className="bg-transparent text-slate-300 font-semibold outline-none cursor-pointer text-xs"
                >
                  <option value="ALL" className="bg-slate-900">Semua Sesi ({existingSessions.length})</option>
                  {existingSessions.map((sess) => (
                    <option key={sess} value={sess} className="bg-slate-900">{sess}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Type */}
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <FiLayers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="bg-transparent text-slate-300 font-semibold outline-none cursor-pointer text-xs"
                >
                  <option value="ALL" className="bg-slate-900">Semua Tipe ({existingTypes.length})</option>
                  {existingTypes.map((t) => (
                    <option key={t} value={t} className="bg-slate-900">{t}</option>
                  ))}
                </select>
              </div>

              {/* Media Cache Pills Info */}
              <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400 font-mono ml-auto">
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  <FiMusic className="text-emerald-400 w-3 h-3" /> {remoteMedia.sounds.length} sounds
                </span>
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  <FiVideo className="text-sky-400 w-3 h-3" /> {remoteMedia.videos.length} videos
                </span>
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  <FiImage className="text-amber-400 w-3 h-3" /> {remoteMedia.images.length} images
                </span>
              </div>
            </div>

            {/* Add Track Button */}
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              <span>Tambah Sesi Baru</span>
            </button>
          </div>

          {/* Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
              <FiFileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">Tidak ada sesi ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedSessionFilter !== 'ALL'
                  ? 'Coba ganti kata kunci pencarian atau bersihkan filter sesi.'
                  : 'Belum ada data sesi pada metadata.json. Klik tombol Tambah Sesi Baru untuk membuat item pertama.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const realIndex = item._originalIndex;
                const title = item.details?.title || item.display || item.description || `Session #${item.id}`;
                const durationFormatted = item.duration
                  ? `${Math.round(item.duration / 1000)}s (${(item.duration / 60000).toFixed(1)} mnt)`
                  : 'N/A';

                return (
                  <div
                    key={`${item.id}-${realIndex}`}
                    className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between transition-all group hover:shadow-lg hover:shadow-slate-950/40"
                  >
                    <div>
                      {/* Card Header: Type Badge & Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.session || 'Tanpa Kategori'}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400">
                            {item.type || 'Custom'}
                          </span>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(realIndex)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Sesi Lengkap"
                          >
                            <FiEdit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateItem(realIndex)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Duplikat Sesi"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(realIndex)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Hapus Sesi"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold text-slate-100 tracking-tight line-clamp-1 mb-1" title={title}>
                        {title}
                      </h4>
                      {item.description && item.description !== title && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      )}

                      {/* Details / File Relations */}
                      <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                        {/* Audio File with Quick Change Button */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <FiMusic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate text-slate-300" title={item.filepath}>
                              {item.filepath || <span className="text-slate-500 italic">Tidak ada audio</span>}
                            </span>
                          </div>
                          <button
                            onClick={() => openMediaPicker('quick_audio', 'sounds', realIndex)}
                            className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/25 transition-colors"
                            title="Pilih file audio baru dari /home/pod/sounds"
                          >
                            Ganti
                          </button>
                        </div>

                        {/* Video File with Quick Change Button */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <FiVideo className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate text-slate-300" title={item.video || 'Kosong'}>
                              {item.video || <span className="text-slate-500 italic">Tidak ada video</span>}
                            </span>
                          </div>
                          <button
                            onClick={() => openMediaPicker('quick_video', 'videos', realIndex)}
                            className="shrink-0 px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[10px] font-semibold border border-sky-500/25 transition-colors"
                            title="Pilih file video baru dari /home/pod/videos"
                          >
                            Ganti
                          </button>
                        </div>

                        {/* Duration & ID */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3 text-amber-400" />
                            {durationFormatted}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            ID: {item.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scent & Aroma Pill (If exists) */}
                    {item.scent && (
                      <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px]">
                        <span className="text-purple-400 font-medium">🌸 {item.scent}</span>
                        {item.burstTime && (
                          <span className="text-slate-500 text-[10px] font-mono">
                            Burst: {Object.keys(item.burstTime).length} points
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: RAW CODE JSON EDITOR */}
      {editorMode === 'raw' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">

          {/* Editor Header Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-300 flex items-center gap-2">
                <FiCode className="text-amber-400" /> metadata.json
              </span>

              {/* Syntax Validator Pill */}
              {jsonError ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25 font-mono text-[11px]">
                  <FiAlertCircle className="w-3 h-3" />
                  Sintaks Tidak Valid
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[11px]">
                  <FiCheck className="w-3 h-3" />
                  JSON Valid
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrettify}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                title="Format JSON dengan spasi rapi"
              >
                Prettify JSON
              </button>
              <button
                onClick={handleMinify}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                title="Padatkan JSON tanpa spasi"
              >
                Minify
              </button>
            </div>
          </div>

          {/* Syntax Error Warning Alert */}
          {jsonError && (
            <div className="bg-rose-950/40 border-b border-rose-900/60 px-4 py-2 text-rose-300 text-xs font-mono">
              ⚠️ Kesalahan Sintaks: {jsonError}
            </div>
          )}

          {/* Code Textarea */}
          <div className="p-4 bg-[#090d16]">
            <textarea
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              rows={24}
              spellCheck="false"
              className="w-full bg-transparent font-mono text-xs text-slate-200 leading-relaxed outline-none resize-y border-0 focus:ring-0 selection:bg-amber-500/30"
              placeholder="[ { ... } ]"
            />
          </div>

          {/* Footer Status */}
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>Panjang Karakter: {rawJsonText.length.toLocaleString()}</span>
            <span>Ukuran: {(rawJsonText.length / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SESSION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FiEdit3 className="text-amber-400" />
                {editingIndex === null ? 'Tambah Sesi Baru' : `Edit Sesi #${editingIndex + 1}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModalForm} className="space-y-4 text-xs">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Session Category */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Kategori Sesi (*session)
                  </label>
                  <input
                    type="text"
                    list="sessionSuggestions"
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                    required
                    placeholder="Contoh: NATURE SCAPE, SLEEP 2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                  />
                  <datalist id="sessionSuggestions">
                    {existingSessions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Tipe (*type)
                  </label>
                  <input
                    type="text"
                    list="typeSuggestions"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    placeholder="SelfDevelopment, Sessions, Guides"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                  />
                  <datalist id="typeSuggestions">
                    {existingTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    ID Sesi (*id)
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    placeholder="107398 atau Voice1mini"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Durasi dalam milidetik (*duration)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                      step="1000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-400 font-mono text-[11px] shrink-0">
                      = {Math.round((Number(formData.duration) || 0) / 1000)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Title / Display with Magic Wand auto-title buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">
                    Nama Tampilan (*display / title)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {formData.filepath && (
                      <button
                        type="button"
                        onClick={() => applyTitleFromCurrentField('filepath')}
                        className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                        title="Ekstrak judul bersih dari nama file audio"
                      >
                        <FiZap className="w-3 h-3" /> Ambil Judul dari Audio
                      </button>
                    )}
                    {formData.video && (
                      <button
                        type="button"
                        onClick={() => applyTitleFromCurrentField('video')}
                        className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20"
                        title="Ekstrak judul bersih dari nama file video"
                      >
                        <FiZap className="w-3 h-3" /> Ambil dari Video
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.display}
                  onChange={(e) => setFormData({ ...formData, display: e.target.value, title: e.target.value })}
                  required
                  placeholder="Judul track yang ditampilkan di layar POD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Deskripsi (*description)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Keterangan singkat sesi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              {/* Audio Filepath with Remote File Picker */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <FiMusic className="text-emerald-400" />
                    <span>Berkas Audio (*filepath)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    /home/pod/sounds/ ({remoteMedia.sounds.length} file)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.filepath}
                    onChange={(e) => setFormData({ ...formData, filepath: e.target.value })}
                    required
                    placeholder="Contoh: Master_Relax_session.wav"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 outline-none focus:border-amber-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => openMediaPicker('filepath', 'sounds')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                    title="Buka browser file audio remote di POD"
                  >
                    <FiFolder className="w-3.5 h-3.5" />
                    <span>Pilih dari Sounds</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Video File with Remote File Picker */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <FiVideo className="text-sky-400" />
                      <span>Berkas Video (video)</span>
                    </label>
                    <span className="text-[10px] text-sky-400 font-mono">/home/pod/videos/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.video}
                      onChange={(e) => setFormData({ ...formData, video: e.target.value })}
                      placeholder="Relax Visuals V5.5.mp4"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 outline-none focus:border-amber-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => openMediaPicker('video', 'videos')}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                      title="Buka browser video remote di POD"
                    >
                      <FiFolder className="w-3.5 h-3.5" />
                      <span>Pilih Video</span>
                    </button>
                  </div>
                </div>

                {/* Strobepath */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <FiZap className="text-amber-400" />
                      <span>Audio Strobe (strobepath)</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">/home/pod/sounds/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.strobepath}
                      onChange={(e) => setFormData({ ...formData, strobepath: e.target.value })}
                      placeholder="Master_STROBE_Relax.wav"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 outline-none focus:border-amber-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => openMediaPicker('strobepath', 'sounds')}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors shrink-0"
                      title="Pilih strobe dari sounds"
                    >
                      <FiFolder className="w-3.5 h-3.5" />
                      <span>Pilih</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Scent */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Aroma Wewangian (scent)
                  </label>
                  <input
                    type="text"
                    value={formData.scent}
                    onChange={(e) => setFormData({ ...formData, scent: e.target.value })}
                    placeholder="lavender, chamomile, eucalyptus"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Burst Time (JSON) */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Burst Time JSON (opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.burstTime}
                    onChange={(e) => setFormData({ ...formData, burstTime: e.target.value })}
                    placeholder='{"2.45": 5000, "2.41": 5000}'
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {editingIndex === null ? 'Tambahkan ke Daftar' : 'Perbarui Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SEARCHABLE REMOTE MEDIA PICKER (/home/pod/sounds, /videos, /images) */}
      {pickerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FiFolder className="text-amber-400" />
                  Pilih Media dari Remote POD
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih berkas dari remote server dan ambil judulnya secara otomatis.
                </p>
              </div>
              <button
                onClick={() => setPickerModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Path Tabs & Search Toolbar */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPickerModal((prev) => ({ ...prev, activeTab: 'sounds' }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pickerModal.activeTab === 'sounds'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <FiMusic className="w-3.5 h-3.5" />
                    <span>Sounds ({remoteMedia.sounds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerModal((prev) => ({ ...prev, activeTab: 'videos' }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pickerModal.activeTab === 'videos'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <FiVideo className="w-3.5 h-3.5" />
                    <span>Videos ({remoteMedia.videos.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerModal((prev) => ({ ...prev, activeTab: 'images' }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pickerModal.activeTab === 'images'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <FiImage className="w-3.5 h-3.5" />
                    <span>Images ({remoteMedia.images.length})</span>
                  </button>
                </div>

                {/* Auto Extract Title Checkbox */}
                <label className="flex items-center gap-2 text-xs text-amber-300 font-medium cursor-pointer bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={pickerModal.autoExtractTitle}
                    onChange={(e) => setPickerModal((prev) => ({ ...prev, autoExtractTitle: e.target.checked }))}
                    className="rounded bg-slate-900 border-amber-500/40 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Ambil judul otomatis dari nama file</span>
                </label>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder={`Cari dari ${remoteMedia[pickerModal.activeTab]?.length || 0} berkas di /home/pod/${pickerModal.activeTab}...`}
                  value={pickerModal.search}
                  onChange={(e) => setPickerModal((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-[#090d16]">
              {pickerFileList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada berkas yang cocok dengan pencarian "{pickerModal.search}".
                </div>
              ) : (
                pickerFileList.map((file, idx) => {
                  const cleanTitle = extractTitleFromFilename(file.name);
                  return (
                    <div
                      key={file.name + idx}
                      onClick={() => handleSelectMediaFile(file.name)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className={`p-2 rounded-lg ${pickerModal.activeTab === 'sounds'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : pickerModal.activeTab === 'videos'
                            ? 'bg-sky-500/10 text-sky-400'
                            : 'bg-amber-500/10 text-amber-400'
                          }`}>
                          {pickerModal.activeTab === 'sounds' ? (
                            <FiMusic className="w-4 h-4" />
                          ) : pickerModal.activeTab === 'videos' ? (
                            <FiVideo className="w-4 h-4" />
                          ) : (
                            <FiImage className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          {/* Clean Extracted Title */}
                          <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
                            {cleanTitle}
                          </div>
                          {/* Actual Filename */}
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {file.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {file.size > 0 && (
                          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                            {formatBytes(file.size)}
                          </span>
                        )}
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                        >
                          Pilih
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">
                Menampilkan {pickerFileList.length} dari {remoteMedia[pickerModal.activeTab]?.length || 0} berkas
              </span>
              <button
                type="button"
                onClick={() => setPickerModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
