'use client';

import React from 'react';
import { Loader2, XCircle, FileText } from 'lucide-react';
import { formatBytes } from '../utils/colors';

export default function ScanningProgress({ job, onCancel }) {
  if (!job || job.status === 'completed') return null;

  const total = job.total_files || 1;
  const current = job.files_seen || 0;
  const pct = Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 bg-card-carbon border border-steel-border rounded-md p-5 text-snow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 text-blue-cornflower animate-spin" />
          <span className="font-semibold text-xs tracking-wider uppercase font-mono">SCANNING & INDEXING</span>
        </div>
        <button
          onClick={onCancel}
          className="text-ash hover:text-snow transition-colors"
          title="Cancel Scan"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-deep-coal rounded-sm h-1.5 mb-3 overflow-hidden">
        <div
          className="bg-blue-cornflower h-1.5 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-ash mb-2 font-mono">
        <span>{current} / {total} files</span>
        <span>{formatBytes(job.bytes_seen || 0)}</span>
        <span className="font-medium text-snow">{pct}%</span>
      </div>

      {/* Current File */}
      <div className="flex items-center space-x-2 text-xs text-ash bg-deep-coal px-2.5 py-1.5 rounded-sm border border-steel-border truncate font-mono">
        <FileText className="w-3.5 h-3.5 text-fog shrink-0" />
        <span className="truncate">{job.current_file || "Processing..."}</span>
      </div>
    </div>
  );
}
