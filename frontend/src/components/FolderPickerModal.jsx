'use client';

import React, { useState, useEffect } from 'react';
import { X, Folder, HardDrive, ArrowUp, ChevronRight, ShieldAlert, Check, Lock, FolderOpen } from 'lucide-react';
import { fetchBrowse, createWorkspace, openNativeFolderDialog } from '../api';

export default function FolderPickerModal({ isOpen, onClose, onSelectWorkspace }) {
  const [browseData, setBrowseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customPath, setCustomPath] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [isNativeBrowsing, setIsNativeBrowsing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDirectory('');
    }
  }, [isOpen]);

  async function loadDirectory(path) {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBrowse(path);
      setBrowseData(data);
      setCustomPath(data.current_path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleNativeBrowse() {
    try {
      setIsNativeBrowsing(true);
      setError(null);
      const res = await openNativeFolderDialog(customPath);
      if (res && res.status === 'selected' && res.path) {
        setCustomPath(res.path);
        await loadDirectory(res.path);
      }
    } catch (err) {
      setError(err.message || 'Could not open native Windows folder dialog');
    } finally {
      setIsNativeBrowsing(false);
    }
  }

  async function handleConfirm() {
    if (!customPath) return;
    try {
      setLoading(true);
      setError(null);
      const ws = await createWorkspace(customPath, readOnly);
      onSelectWorkspace(ws);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/85 backdrop-blur-none p-4">
      <div className="w-full max-w-2xl bg-card-carbon border border-steel-border rounded-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-steel-border flex items-center justify-between bg-deep-coal">
          <div className="flex items-center space-x-2.5">
            <Folder className="w-4 h-4 text-blue-cornflower" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ash block">ENVIRONMENT</span>
              <h2 className="text-sm font-semibold text-snow">Select Workspace Directory</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-ash hover:text-snow transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drives Row */}
        {browseData?.drives && (
          <div className="px-6 py-2.5 bg-page-ink border-b border-steel-border flex items-center space-x-2 overflow-x-auto font-mono text-xs">
            <span className="text-[10px] uppercase tracking-wider text-fog shrink-0 mr-1">DRIVES:</span>
            {browseData.drives.map(drive => (
              <button
                key={drive}
                onClick={() => loadDirectory(drive)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono border transition-colors ${
                  browseData.current_path.startsWith(drive)
                    ? 'bg-deep-coal text-blue-cornflower border-blue-cornflower/40'
                    : 'bg-card-carbon text-ash border-steel-border hover:border-graphite hover:text-snow'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{drive}</span>
              </button>
            ))}
          </div>
        )}

        {/* Path Bar */}
        <div className="px-6 py-3 border-b border-steel-border flex items-center space-x-2 bg-deep-coal/60">
          {browseData?.parent_path && (
            <button
              onClick={() => loadDirectory(browseData.parent_path)}
              className="p-1.5 rounded-md bg-card-carbon hover:bg-page-ink text-ash border border-steel-border"
              title="Go Up One Level"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadDirectory(customPath)}
            placeholder="Type or paste target directory path..."
            className="flex-1 bg-page-ink border border-graphite rounded-md px-3 py-1.5 text-xs text-snow focus:outline-none focus:border-blue-cornflower font-mono"
          />
          <button
            type="button"
            onClick={handleNativeBrowse}
            disabled={isNativeBrowsing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-snow hover:bg-slate-200 text-page-ink text-xs font-semibold rounded-md transition-colors disabled:opacity-50 shrink-0"
            title="Browse with native Windows File Explorer dialog (like in VS Code)"
          >
            <FolderOpen className={`w-3.5 h-3.5 ${isNativeBrowsing ? 'animate-pulse' : ''}`} />
            <span>{isNativeBrowsing ? 'Browsing...' : 'Browse...'}</span>
          </button>
          <button
            type="button"
            onClick={() => loadDirectory(customPath)}
            className="px-2.5 py-1.5 bg-card-carbon hover:bg-deep-coal text-ash hover:text-snow text-xs font-medium rounded-md border border-steel-border shrink-0"
            title="Load entered path (or press Enter)"
          >
            Load
          </button>
        </div>

        {/* Directory Listing */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[260px]">
          {loading && (
            <div className="flex items-center justify-center py-12 text-ash text-xs font-mono uppercase tracking-wider">
              READING DIRECTORY METADATA...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-deep-coal border border-red-500/40 text-red-400 text-xs font-mono flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && browseData?.items?.length === 0 && (
            <div className="text-center py-12 text-fog text-xs font-mono">
              No accessible subdirectories in this path.
            </div>
          )}

          {!loading && browseData?.items?.map(item => (
            <div
              key={item.path}
              onClick={() => !item.is_protected && loadDirectory(item.path)}
              className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                item.is_protected
                  ? 'opacity-40 cursor-not-allowed bg-deep-coal text-fog'
                  : 'hover:bg-deep-coal text-ash hover:text-snow'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Folder className={`w-4 h-4 shrink-0 ${item.is_protected ? 'text-red-400' : 'text-blue-cornflower'}`} />
                <span className="text-xs truncate font-mono">{item.name}</span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {item.is_protected ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-deep-coal text-red-400 border border-red-500/30">
                    PROTECTED
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-fog" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-steel-border bg-deep-coal flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-ash">
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(e) => setReadOnly(e.target.checked)}
              className="rounded-sm bg-page-ink border-graphite text-blue-cornflower focus:ring-0"
            />
            <span className="flex items-center font-mono text-[11px]"><Lock className="w-3 h-3 mr-1 text-blue-cornflower" /> READ-ONLY MODE (NO DISK WRITES)</span>
          </label>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-page-ink border border-graphite text-snow hover:bg-card-carbon text-xs font-medium"
            >
              Cancel
            </button>
            <button
              disabled={loading || !customPath || browseData?.is_protected}
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-snow text-page-ink hover:bg-slate-200 text-xs font-medium disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Select Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
