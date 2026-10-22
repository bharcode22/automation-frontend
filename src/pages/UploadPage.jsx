import React, { useState, useEffect, useRef } from 'react';
import {
  FiUploadCloud,
  FiMusic,
  FiVideo,
  FiImage,
  FiFile,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiServer,
  FiRefreshCw,
  FiCheck,
  FiFolder,
  FiClock,
  FiHardDrive,
  FiX
} from 'react-icons/fi';
import { uploadMediaFiles, fetchMediaList } from '../services/api';

const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus', '.wma'];
const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];

function getFileCategory(filename) {
  const ext = (filename.slice(filename.lastIndexOf('.')) || '').toLowerCase();
  if (AUDIO_EXTS.includes(ext)) {
    return {
      type: 'audio',
      category: 'sounds',
      label: 'Audio / Sound',
      folder: '/home/pod/sounds',
      color: 'amber',
      icon: FiMusic
    };
  }
  if (VIDEO_EXTS.includes(ext)) {
    return {
      type: 'video',
      category: 'videos',
      label: 'Video',
      folder: '/home/pod/videos',
      color: 'purple',
      icon: FiVideo
    };
  }
  if (IMAGE_EXTS.includes(ext)) {
    return {
      type: 'image',
      category: 'images',
      label: 'Image / Gambar',
      folder: '/home/pod/images',
      color: 'emerald',
      icon: FiImage
    };
  }
  return {
    type: 'other',
    category: 'others',
    label: 'Lainnya',
    folder: '/home/pod',
    color: 'slate',
    icon: FiFile
  };
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function UploadPage({
  servers = [],
  activeServer = {},
  setActiveServerId
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [broadcast, setBroadcast] = useState(false);

  // Remote Media Explorer state
  const [remoteMedia, setRemoteMedia] = useState(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState('all'); // all | sounds | videos | images

  const fileInputRef = useRef(null);

  // Load existing media files on the selected POD
  const loadRemoteMedia = async () => {
    setIsLoadingMedia(true);
    try {
      const res = await fetchMediaList(activeServer.name || activeServer.id || activeServer.host);
      if (res.success) {
        setRemoteMedia(res.media);
      }
    } catch (_) {
      // ignore
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadRemoteMedia();
  }, [activeServer?.name, activeServer?.id, activeServer?.host]);

  const handleFilesAdded = (filesList) => {
    const newFiles = Array.from(filesList).map((f) => ({
      raw: f,
      name: f.name,
      size: f.size,
      info: getFileCategory(f.name)
    }));

    // Avoid duplicates in current selection
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((item) => item.name));
      const filtered = newFiles.filter((item) => !existingNames.has(item.name));
      return [...prev, ...filtered];
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    selectedFiles.forEach((fileItem) => {
      formData.append('files', fileItem.raw);
    });

    formData.append('targetServerId', activeServer.name || activeServer.id || activeServer.host || '');
    formData.append('broadcast', broadcast);

    try {
      const res = await uploadMediaFiles(formData, (percent) => {
        setUploadProgress(percent);
      });

      setUploadResult({
        success: true,
        message: res.message,
        results: res.results || [],
        errors: res.errors
      });

      // Clear uploaded files on success
      setSelectedFiles([]);
      loadRemoteMedia();
    } catch (err) {
      setUploadResult({
        success: false,
        error: err.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Filter media files based on active tab
  const getDisplayFiles = () => {
    if (!remoteMedia) return [];
    if (activeMediaTab === 'all') {
      const sounds = (remoteMedia.sounds || []).map((f) => ({ ...f, category: 'sounds', folder: '/home/pod/sounds' }));
      const videos = (remoteMedia.videos || []).map((f) => ({ ...f, category: 'videos', folder: '/home/pod/videos' }));
      const images = (remoteMedia.images || []).map((f) => ({ ...f, category: 'images', folder: '/home/pod/images' }));
      return [...sounds, ...videos, ...images];
    }
    return (remoteMedia[activeMediaTab] || []).map((f) => ({
      ...f,
      category: activeMediaTab,
      folder: `/home/pod/${activeMediaTab}`
    }));
  };

  const displayMediaFiles = getDisplayFiles();

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-8">
      
      {/* Header Info & Folder Guide */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FiUploadCloud className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-bold text-slate-100">Smart Media File Uploader via SFTP</h1>
          </div>
          <p className="text-xs text-slate-400">
            Berkas yang Anda unggah akan secara otomatis diarahkan ke folder tujuan yang sesuai di remote POD.
          </p>
        </div>

        {/* Server Target Selector & Broadcast Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <FiServer className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-500 font-sans">Target:</span>
            <select
              value={activeServer.name || activeServer.id || `${activeServer.username}@${activeServer.host}:${activeServer.port}`}
              onChange={(e) => setActiveServerId && setActiveServerId(e.target.value)}
              disabled={broadcast}
              className="bg-transparent text-slate-100 font-bold outline-none cursor-pointer"
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

          {servers.length > 1 && (
            <label className="flex items-center gap-2 text-xs font-semibold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={broadcast}
                onChange={(e) => setBroadcast(e.target.checked)}
                className="rounded accent-sky-500 cursor-pointer"
              />
              <span className={broadcast ? 'text-sky-300 font-bold' : 'text-slate-300'}>
                Unggah ke Semua POD ({servers.length})
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Directory Routing Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <FiMusic className="w-4 h-4" />
            <span>Folder Audio / Suara</span>
          </div>
          <div className="font-mono text-sm font-semibold text-slate-100">
            /home/pod/sounds/
          </div>
          <div className="text-[11px] text-slate-400">
            .mp3, .wav, .flac, .ogg, .m4a, .aac, .opus
          </div>
        </div>

        <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <FiVideo className="w-4 h-4" />
            <span>Folder Video</span>
          </div>
          <div className="font-mono text-sm font-semibold text-slate-100">
            /home/pod/videos/
          </div>
          <div className="text-[11px] text-slate-400">
            .mp4, .mkv, .avi, .mov, .webm, .flv, .wmv
          </div>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <FiImage className="w-4 h-4" />
            <span>Folder Gambar</span>
          </div>
          <div className="font-mono text-sm font-semibold text-slate-100">
            /home/pod/images/
          </div>
          <div className="text-[11px] text-slate-400">
            .jpg, .jpeg, .png, .webp, .svg, .gif, .bmp
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-sky-400 bg-sky-950/20 shadow-xl shadow-sky-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
          className="hidden"
        />

        <div className="p-4 rounded-full bg-slate-800 text-sky-400 shadow-md">
          <FiUploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-200">
            Tarik & Jatuhkan berkas audio, video, atau gambar di sini
          </p>
          <p className="text-xs text-slate-400">
            atau <span className="text-sky-400 underline font-semibold">klik untuk memilih berkas</span> dari komputer Anda (bisa banyak berkas sekaligus)
          </p>
        </div>
      </div>

      {/* Queue / Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiFolder className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Berkas Siap Diunggah ({selectedFiles.length})
              </span>
            </div>

            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
            {selectedFiles.map((f, idx) => {
              const Icon = f.info.icon;
              return (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      f.info.category === 'sounds'
                        ? 'bg-amber-500/15 text-amber-400'
                        : f.info.category === 'videos'
                        ? 'bg-purple-500/15 text-purple-400'
                        : f.info.category === 'images'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-mono font-semibold text-slate-200 truncate">
                        {f.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{formatBytes(f.size)}</span>
                        <span>•</span>
                        <span className="font-mono text-sky-400">
                          ➔ {f.info.folder}/{f.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      f.info.category === 'sounds'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : f.info.category === 'videos'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : f.info.category === 'images'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {f.info.category}
                    </span>

                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar (during upload) */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Mengunggah ke SFTP...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              onClick={handleStartUpload}
              disabled={isUploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-lg shadow-sky-600/25 transition cursor-pointer disabled:opacity-50"
            >
              <FiUploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
              <span>
                {isUploading
                  ? 'Sedang Mengunggah...'
                  : `Unggah ${selectedFiles.length} Berkas ${broadcast ? 'ke Semua POD' : 'ke POD Aktif'}`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Result Feedback Alert */}
      {uploadResult && (
        <div className={`p-5 rounded-2xl border space-y-3 ${
          uploadResult.success
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-rose-950/20 border-rose-500/30'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {uploadResult.success ? (
              <FiCheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <FiAlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <span className={uploadResult.success ? 'text-emerald-300' : 'text-rose-300'}>
              {uploadResult.message || uploadResult.error}
            </span>
          </div>

          {uploadResult.results && uploadResult.results.length > 0 && (
            <div className="space-y-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px] uppercase font-sans font-bold">Rincian Lokasi Berkas:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {uploadResult.results.map((r, i) => (
                  <div key={i} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
                    <div className="text-slate-100 font-bold truncate">{r.filename}</div>
                    <div className="text-emerald-400 text-[11px]">➔ {r.remoteFilePath}</div>
                    <div className="text-slate-500 text-[10px]">{r.targetHost} • {formatBytes(r.sizeBytes)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="space-y-1 text-xs text-rose-400 font-mono">
              {uploadResult.errors.map((err, i) => (
                <div key={i}>✖ {err.filename} ({err.targetHost}): {err.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remote Media Inspector Panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FiHardDrive className="w-4 h-4 text-sky-400" />
              <span>Berkas Media di POD ({activeServer.name ? `${activeServer.name} (${activeServer.host})` : `${activeServer.username}@${activeServer.host}`})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Melihat berkas yang tersimpan saat ini di direktori /home/pod/
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'sounds', label: 'Sounds 🎵' },
                { id: 'videos', label: 'Videos 🎬' },
                { id: 'images', label: 'Images 🖼️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMediaTab(tab.id)}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    activeMediaTab === tab.id
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadRemoteMedia}
              disabled={isLoadingMedia}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 cursor-pointer"
              title="Perbarui daftar berkas"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isLoadingMedia ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Media Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                <th className="py-2.5 px-3">Nama Berkas</th>
                <th className="py-2.5 px-3">Folder Tujuan</th>
                <th className="py-2.5 px-3">Ukuran</th>
                <th className="py-2.5 px-3">Waktu Diubah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayMediaFiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans italic">
                    {isLoadingMedia
                      ? 'Sedang memuat daftar berkas dari remote POD...'
                      : 'Belum ada berkas pada folder ini di remote POD.'}
                  </td>
                </tr>
              ) : (
                displayMediaFiles.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                      {f.category === 'sounds' ? (
                        <FiMusic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : f.category === 'videos' ? (
                        <FiVideo className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : (
                        <FiImage className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>{f.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-mono text-[11px]">{f.folder}</td>
                    <td className="py-2.5 px-3 text-slate-400">{formatBytes(f.size)}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">
                      {f.modifyTime ? new Date(f.modifyTime).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
