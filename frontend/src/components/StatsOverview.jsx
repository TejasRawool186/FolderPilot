'use client';

import React from 'react';
import { Files, HardDrive, Copy, Shield } from 'lucide-react';
import { formatBytes, getCategoryColor } from '../utils/colors';

export default function StatsOverview({ stats, onSelectCategory, selectedCategory }) {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Dovetail Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Files Stat Card */}
        <div className="bg-card-carbon border border-steel-border rounded-md p-6 space-y-2">
          <Files className="w-4 h-4 text-blue-cornflower" />
          <div className="text-4xl font-semibold tracking-tight text-snow">
            {stats.total_files}
          </div>
          <div className="text-sm text-ash">
            Indexed Files
          </div>
        </div>

        {/* Total Size Stat Card */}
        <div className="bg-card-carbon border border-steel-border rounded-md p-6 space-y-2">
          <HardDrive className="w-4 h-4 text-blue-cornflower" />
          <div className="text-4xl font-semibold tracking-tight text-snow">
            {formatBytes(stats.total_bytes)}
          </div>
          <div className="text-sm text-ash">
            Storage Footprint
          </div>
        </div>

        {/* Duplicate Files Stat Card */}
        <div className="bg-card-carbon border border-steel-border rounded-md p-6 space-y-2">
          <Copy className="w-4 h-4 text-blue-cornflower" />
          <div className="text-4xl font-semibold tracking-tight text-snow">
            {stats.duplicate_files_count}
          </div>
          <div className="text-sm text-ash">
            Duplicate Copies
          </div>
        </div>

        {/* Sensitive Documents Stat Card */}
        <div className="bg-card-carbon border border-steel-border rounded-md p-6 space-y-2">
          <Shield className="w-4 h-4 text-blue-cornflower" />
          <div className="text-4xl font-semibold tracking-tight text-snow">
            {stats.sensitive_files_count}
          </div>
          <div className="text-sm text-ash">
            Sensitive Documents
          </div>
        </div>
      </div>

      {/* Categories Filter Strip */}
      {stats.category_distribution?.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto py-2">
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${
              selectedCategory === null
                ? 'bg-snow text-page-ink border-snow'
                : 'bg-card-carbon text-ash border-steel-border hover:border-graphite hover:text-snow'
            }`}
          >
            All Categories ({stats.total_files})
          </button>

          {stats.category_distribution.map(cat => {
            const conf = getCategoryColor(cat.category);
            const isSelected = selectedCategory === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => onSelectCategory(isSelected ? null : cat.category)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-card-carbon text-snow border-blue-cornflower'
                    : 'bg-card-carbon text-ash border-steel-border hover:border-graphite hover:text-snow'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.bg }} />
                <span>{cat.category}</span>
                <span className="font-mono text-[10px] text-fog">[{cat.count}]</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
