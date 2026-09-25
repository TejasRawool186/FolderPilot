'use client';

import React, { useState } from 'react';
import { Folder, File, Edit2 } from 'lucide-react';
import { getCategoryColor, formatBytes, CATEGORY_COLORS } from '../utils/colors';

export default function BeforeAfterTreeView({ currentTree, proposedTree, onOverrideCategory, onSelectFile }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [newCat, setNewCat] = useState('');

  const renderCurrentTree = (node, depth = 0) => {
    if (!node) return null;
    const isDir = Boolean(node.children && node.children.length > 0);

    return (
      <div key={node.name} style={{ paddingLeft: `${depth * 14}px` }} className="py-0.5">
        <div 
          className={`flex items-center space-x-2 text-xs text-ash hover:text-snow ${!isDir ? 'cursor-pointer hover:underline' : ''}`}
          onClick={() => !isDir && onSelectFile?.(node)}
          title={!isDir ? "Click to preview file" : ""}
        >
          {isDir ? (
            <Folder className="w-3.5 h-3.5 text-blue-cornflower shrink-0" />
          ) : (
            <File className="w-3.5 h-3.5 text-fog shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
          {!isDir && (
            <span className="text-[10px] text-fog font-mono">({formatBytes(node.size)})</span>
          )}
        </div>
        {node.children?.map(c => renderCurrentTree(c, depth + 1))}
      </div>
    );
  };

  const renderProposedTree = (node, depth = 0) => {
    if (!node) return null;
    const isDir = Boolean(node.children && node.children.length > 0);
    const catConf = getCategoryColor(node.category || node.name);

    return (
      <div key={node.name} style={{ paddingLeft: `${depth * 14}px` }} className="py-0.5">
        <div className="flex items-center justify-between group rounded-sm px-1.5 py-0.5 hover:bg-deep-coal">
          <div 
            className={`flex items-center space-x-2 text-xs truncate ${!isDir ? 'cursor-pointer' : ''}`}
            onClick={() => !isDir && onSelectFile?.(node)}
            title={!isDir ? "Click to preview file" : ""}
          >
            {isDir ? (
              <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: catConf.bg }} />
            ) : (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catConf.bg }} />
            )}
            <span className={`truncate ${isDir ? 'font-medium text-snow' : 'text-ash group-hover:underline group-hover:text-snow'}`}>{node.name}</span>
            {!isDir && (
              <span className="text-[10px] text-fog font-mono">({formatBytes(node.size)})</span>
            )}
          </div>

          {!isDir && node.id && (
            <button
              onClick={() => {
                setSelectedFile(node);
                setNewCat(node.category || 'Documents / Resume');
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-fog hover:text-snow transition-opacity"
              title="Change Destination Category"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
        {node.children?.map(c => renderProposedTree(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Current Structure */}
        <div className="border border-steel-border rounded-md bg-card-carbon p-5 overflow-hidden flex flex-col h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-steel-border mb-3 font-mono text-xs">
            <span className="uppercase tracking-wider text-ash">SOURCE STRUCTURE</span>
            <span className="text-[10px] px-2 py-0.5 rounded-sm bg-deep-coal text-fog border border-steel-border">
              READ-ONLY
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-0.5">
            {renderCurrentTree(currentTree)}
          </div>
        </div>

        {/* Right: Proposed Structure */}
        <div className="border border-steel-border rounded-md bg-card-carbon p-5 overflow-hidden flex flex-col h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-steel-border mb-3 font-mono text-xs">
            <span className="uppercase tracking-wider text-blue-cornflower">
              PROPOSED TARGET
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-sm bg-deep-coal text-blue-cornflower border border-blue-cornflower/30">
              PLAN
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-0.5">
            {renderProposedTree(proposedTree)}
          </div>
        </div>
      </div>

      {/* Category Reassignment Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/85 backdrop-blur-none p-4">
          <div className="w-full max-w-md bg-card-carbon border border-steel-border rounded-md p-6 space-y-4 text-snow">
            <h4 className="font-semibold text-sm">Reassign Destination Category</h4>
            <div className="font-mono text-xs text-ash truncate">
              {selectedFile.name}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-ash font-mono uppercase tracking-wider block">Target Category</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full bg-page-ink border border-graphite rounded-md p-2.5 text-xs text-snow focus:outline-none focus:border-blue-cornflower font-sans"
              >
                {Object.keys(CATEGORY_COLORS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-steel-border">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 rounded-md text-xs font-medium text-ash hover:text-snow border border-graphite"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onOverrideCategory && selectedFile.id) {
                    onOverrideCategory(selectedFile.id, newCat);
                  }
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-md bg-snow text-page-ink hover:bg-slate-200 text-xs font-medium"
              >
                Save Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
