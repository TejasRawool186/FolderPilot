'use client';

import React from 'react';

export default function ChaosScoreCard({ chaosData }) {
  if (!chaosData) return null;

  const score = chaosData.score ?? 0;
  const projected = chaosData.projected_score ?? 0;
  const factors = chaosData.factors || {};

  return (
    <div className="bg-card-carbon border border-steel-border rounded-md p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-ash block">
            DIAGNOSTICS
          </span>
          <h3 className="text-base font-semibold tracking-tight text-snow mt-1">
            Chaos Index
          </h3>
        </div>

        {/* Score Badges */}
        <div className="flex items-center space-x-2 font-mono">
          <div className="px-3 py-1.5 rounded-md bg-deep-coal border border-steel-border text-center">
            <div className="text-xl font-semibold text-snow">{score}</div>
            <div className="text-[10px] text-fog uppercase tracking-wider">CURRENT</div>
          </div>
          <span className="text-fog">→</span>
          <div className="px-3 py-1.5 rounded-md bg-deep-coal border border-blue-cornflower/40 text-center">
            <div className="text-xl font-semibold text-blue-cornflower">{projected}</div>
            <div className="text-[10px] text-blue-cornflower uppercase tracking-wider">TARGET</div>
          </div>
        </div>
      </div>

      {/* Factors Breakdown */}
      <div className="space-y-3 pt-3 border-t border-steel-border text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-ash">
            <span>Root Level Loose Files:</span>
            <span className="font-mono text-snow">{chaosData.loose_files_count} files</span>
          </div>
          <div className="w-full bg-deep-coal h-1 rounded-sm overflow-hidden">
            <div className="bg-blue-cornflower h-1" style={{ width: `${(factors.loose_files_ratio || 0) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-ash">
            <span>Duplicate File Clutter:</span>
            <span className="font-mono text-snow">{chaosData.duplicate_count} files</span>
          </div>
          <div className="w-full bg-deep-coal h-1 rounded-sm overflow-hidden">
            <div className="bg-ash h-1" style={{ width: `${(factors.duplicate_ratio || 0) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-ash">
            <span>Version Suffixes (_final, _v2):</span>
            <span className="font-mono text-snow">{chaosData.version_clutter_count} files</span>
          </div>
          <div className="w-full bg-deep-coal h-1 rounded-sm overflow-hidden">
            <div className="bg-graphite h-1" style={{ width: `${(factors.version_clutter_ratio || 0) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
