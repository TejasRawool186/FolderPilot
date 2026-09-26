'use client';

import React, { useState } from 'react';
import { Copy, Check, FileText, ExternalLink, ShieldCheck, ArrowRight, Eye, GitCompare } from 'lucide-react';
import { formatBytes, getCategoryColor } from '../utils/colors';
import { getFilePreviewUrl, revealInExplorer } from '../api';

export default function DuplicateClustersView({ duplicates, onSelectFile }) {
  const [comparingGroup, setComparingGroup] = useState(null);
  const [selectedKeeps, setSelectedKeeps] = useState({}); // groupId -> keepFileId

  if (!duplicates || duplicates.length === 0) {
    return (
      <div className="border border-steel-border bg-card-carbon p-8 text-center text-ash text-xs">
        <Check className="w-6 h-6 text-blue-cornflower mx-auto mb-2" />
        <p className="font-semibold text-snow uppercase tracking-wider font-mono">Zero Duplicates Detected</p>
        <p className="text-fog mt-1">All indexed files across this workspace have unique SHA-256 signatures.</p>
      </div>
    );
  }

  function handleSelectKeep(groupId, fileId) {
    setSelectedKeeps(prev => ({
      ...prev,
      [groupId]: fileId
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-ash block">REDUNDANCY ANALYSIS</span>
          <h3 className="text-sm font-semibold text-snow flex items-center space-x-2 mt-0.5">
            <Copy className="w-4 h-4 text-blue-cornflower" />
            <span>Duplicate Groups ({duplicates.length})</span>
          </h3>
          <p className="text-xs text-fog mt-1">
            Compare identical copies side-by-side. Retain your primary file while staging redundant copies into <code className="text-snow bg-deep-coal px-1.5 py-0.5 border border-steel-border font-mono">_Duplicates/</code> without deletion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {duplicates.map((group, idx) => {
          const currentKeepId = selectedKeeps[group.group_id] || group.keep_file_id || group.members?.[0]?.id;

          return (
            <div key={group.group_id} className="border border-steel-border bg-card-carbon p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-steel-border">
                <span className="text-ash uppercase tracking-wider">CLUSTER #{idx + 1} ({group.kind})</span>
                <button
                  onClick={() => setComparingGroup(group)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#161a24] hover:bg-[#202636] border border-steel-border text-blue-cornflower text-[11px] font-semibold transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare & Preview</span>
                </button>
              </div>

              <div className="space-y-2">
                {group.members?.map(file => {
                  const isKeep = file.id === currentKeepId;
                  const catColor = getCategoryColor(file.category || 'Others').bg;

                  return (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-2.5 border text-xs transition-colors ${
                        isKeep
                          ? 'bg-[#121622] border-blue-cornflower text-snow'
                          : 'bg-[#0a0d13] border-steel-border text-ash hover:border-graphite'
                      }`}
                    >
                      <div 
                        className="flex items-center space-x-2 truncate cursor-pointer flex-1 mr-2"
                        onClick={() => onSelectFile?.(file)}
                        title="Click to preview file"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: catColor }} />
                        <span className="truncate font-mono font-medium hover:underline">{file.name}</span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 font-mono text-[10px]">
                        <span className="text-fog">{formatBytes(file.size)}</span>
                        {isKeep ? (
                          <span className="px-2 py-0.5 bg-blue-cornflower text-black font-bold uppercase tracking-wider">
                            KEEP
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectKeep(group.group_id, file.id)}
                            className="px-2 py-0.5 bg-[#161a24] text-ash hover:text-snow border border-steel-border"
                            title="Set as file to keep"
                          >
                            SET AS PRIMARY
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Duplicate Comparator Modal */}
      {comparingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl bg-[#0e1117] border border-steel-border flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#141822] border-b border-steel-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <GitCompare className="w-5 h-5 text-blue-cornflower" />
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ash block">DUPLICATE DIFF INSPECTOR</span>
                  <h3 className="font-semibold text-sm text-snow">
                    Comparing {comparingGroup.members?.length} Identical Copies ({comparingGroup.kind})
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setComparingGroup(null)}
                className="p-1 hover:bg-card-carbon text-ash hover:text-snow"
              >
                ✕
              </button>
            </div>

            {/* Quick Strategy Toolbar */}
            <div className="px-6 py-2.5 bg-[#0a0d13] border-b border-steel-border flex items-center justify-between text-xs font-mono">
              <span className="text-ash">QUICK ACTIONS:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const sorted = [...(comparingGroup.members || [])].sort((a, b) => (a.path.length) - (b.path.length));
                    if (sorted[0]) handleSelectKeep(comparingGroup.group_id, sorted[0].id);
                  }}
                  className="px-3 py-1 bg-[#161a24] hover:bg-[#202636] border border-steel-border text-snow"
                >
                  Keep Shortest Path
                </button>
                <button
                  onClick={() => {
                    if (comparingGroup.members?.[0]) {
                      handleSelectKeep(comparingGroup.group_id, comparingGroup.members[0].id);
                    }
                  }}
                  className="px-3 py-1 bg-[#161a24] hover:bg-[#202636] border border-steel-border text-snow"
                >
                  Keep First Found
                </button>
              </div>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#07090e]">
              {comparingGroup.members?.map(file => {
                const currentKeepId = selectedKeeps[comparingGroup.group_id] || comparingGroup.keep_file_id || comparingGroup.members?.[0]?.id;
                const isKeep = file.id === currentKeepId;
                const ext = file.name.split('.').pop()?.toLowerCase();
                const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                const previewUrl = file?.path ? getFilePreviewUrl(file.path) : null;

                return (
                  <div
                    key={file.id}
                    className={`border flex flex-col justify-between p-4 space-y-3 transition-colors ${
                      isKeep ? 'border-blue-cornflower bg-[#101522]' : 'border-steel-border bg-[#0e1117]'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Visual Preview Thumbnail if image */}
                      {isImg && previewUrl ? (
                        <div className="h-36 bg-black/60 border border-steel-border flex items-center justify-center overflow-hidden">
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="h-28 bg-[#141822] border border-steel-border flex flex-col items-center justify-center text-ash space-y-1">
                          <FileText className="w-8 h-8 text-blue-cornflower" />
                          <span className="text-[11px] font-mono uppercase">.{ext} FILE</span>
                        </div>
                      )}

                      <div className="font-semibold text-xs text-snow truncate" title={file.name}>
                        {file.name}
                      </div>

                      <div className="text-[11px] font-mono text-fog space-y-1 border-t border-steel-border pt-2">
                        <div className="truncate" title={file.path}>
                          <span className="text-ash">PATH: </span>{file.path}
                        </div>
                        <div>
                          <span className="text-ash">SIZE: </span>{formatBytes(file.size)}
                        </div>
                        <div>
                          <span className="text-ash">CATEGORY: </span>{file.category}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-steel-border flex items-center justify-between">
                      <button
                        onClick={() => onSelectFile?.(file)}
                        className="text-xs text-blue-cornflower hover:underline flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => handleSelectKeep(comparingGroup.group_id, file.id)}
                        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                          isKeep
                            ? 'bg-blue-cornflower text-black'
                            : 'bg-[#161a24] text-ash hover:text-snow border border-steel-border'
                        }`}
                      >
                        {isKeep ? 'Selected Primary' : 'Keep This'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#141822] border-t border-steel-border flex items-center justify-between text-xs font-mono">
              <span className="text-ash">
                Selected copy will stay in place. Others staged to <code className="text-snow">_Duplicates/</code>.
              </span>
              <button
                onClick={() => setComparingGroup(null)}
                className="px-4 py-2 bg-snow text-black font-semibold hover:bg-slate-200"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
