'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Lock, HardDrive, Sparkles, Filter, X, ArrowRight } from 'lucide-react';
import { formatBytes, getCategoryColor } from '../utils/colors';

export default function CommandPaletteModal({ 
  isOpen, 
  onClose, 
  files = [], 
  onSelectFile,
  onApplyFilter,
  activeFilter
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global Ctrl+K / Esc listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onApplyFilter?.(''); // trigger open
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter files based on query
  const filteredFiles = files.filter(f => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    if (q === 'sensitive' || q === 'is:sensitive') return f.is_sensitive;
    if (q.startsWith('>')) {
      const mb = parseFloat(q.replace('>', '').replace('mb', ''));
      if (!isNaN(mb)) return (f.size / (1024 * 1024)) > mb;
    }
    if (q.startsWith('.')) {
      return f.name.toLowerCase().endsWith(q);
    }
    return f.name.toLowerCase().includes(q) || 
           (f.category && f.category.toLowerCase().includes(q)) ||
           (f.path && f.path.toLowerCase().includes(q));
  }).slice(0, 40); // Top 40 results for fast response

  const QUICK_CHIPS = [
    { label: 'All Files', q: '' },
    { label: '> 50 MB', q: '>50MB' },
    { label: 'Sensitive Only', q: 'sensitive' },
    { label: 'Videos (.mp4)', q: '.mp4' },
    { label: 'Documents (.pdf)', q: '.pdf' },
    { label: 'Code (.py, .js)', q: '.py' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0e1117] border-2 border-blue-cornflower/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Search Bar Input */}
        <div className="p-4 bg-[#141822] border-b border-steel-border flex items-center space-x-3">
          <Search className="w-5 h-5 text-blue-cornflower shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (onApplyFilter) onApplyFilter(e.target.value);
            }}
            placeholder="Search files, type filter (e.g. >50MB, .pdf, sensitive)..."
            className="flex-1 bg-transparent text-sm text-snow placeholder-ash focus:outline-none font-mono"
          />
          {query && (
            <button 
              onClick={() => {
                setQuery('');
                if (onApplyFilter) onApplyFilter('');
              }}
              className="text-ash hover:text-snow"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="px-2 py-0.5 bg-black text-ash border border-steel-border text-[10px] font-mono">
            ESC TO CLOSE
          </span>
        </div>

        {/* Quick Filter Chips */}
        <div className="px-4 py-2 bg-[#0a0d13] border-b border-steel-border flex items-center space-x-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-fog uppercase mr-1">QUICK:</span>
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip.label}
              onClick={() => {
                setQuery(chip.q);
                if (onApplyFilter) onApplyFilter(chip.q);
              }}
              className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
                query === chip.q
                  ? 'bg-blue-cornflower text-black border-blue-cornflower font-semibold'
                  : 'bg-[#161a24] text-ash border-steel-border hover:border-graphite hover:text-snow'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-steel-border bg-[#07090e]">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-ash text-xs font-mono">
              NO FILES MATCHING CRITERIA
            </div>
          ) : (
            filteredFiles.map(file => {
              const catColor = getCategoryColor(file.category || 'Others').bg;
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (onSelectFile) onSelectFile(file);
                    onClose();
                  }}
                  className="p-3 hover:bg-[#141822] cursor-pointer flex items-center justify-between text-xs transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 shrink-0" 
                      style={{ backgroundColor: catColor }} 
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-snow truncate flex items-center space-x-2">
                        <span>{file.name}</span>
                        {file.is_sensitive && (
                          <Lock className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-fog font-mono truncate max-w-lg">
                        {file.path}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 font-mono text-[11px]">
                    <span className="text-fog">{formatBytes(file.size)}</span>
                    <span 
                      className="px-2 py-0.5 border text-[10px]"
                      style={{ borderColor: catColor, color: catColor }}
                    >
                      {file.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-fog group-hover:text-snow transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-[#141822] border-t border-steel-border text-[11px] font-mono text-ash flex items-center justify-between">
          <span>SHOWING {filteredFiles.length} MATCHES</span>
          <span>CLICK FILE TO INSPECT & PREVIEW</span>
        </div>
      </div>
    </div>
  );
}
