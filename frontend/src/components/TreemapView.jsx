'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { getCategoryColor, formatBytes } from '../utils/colors';
import { Lock, ArrowLeft, Sliders, Sparkles, ZoomIn } from 'lucide-react';

export default function TreemapView({ 
  currentTree, 
  proposedTree, 
  onSelectFile, 
  filterQuery = '',
  cleanupProgress = 100,
  onCleanupProgressChange
}) {
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 490 });
  const [zoomNode, setZoomNode] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);

  // Determine active tree based on cleanup slider (100% = proposed, 0% = current)
  const activeTree = cleanupProgress >= 50 ? (proposedTree || currentTree) : (currentTree || proposedTree);

  useEffect(() => {
    if (activeTree) {
      setZoomNode(activeTree);
      setBreadcrumb([activeTree]);
    }
  }, [activeTree]);

  // Measure container dimensions with ResizeObserver for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: Math.floor(entry.contentRect.width),
            height: 490
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute treemap leaves: squarified ratio and sqrt(size) dampening
  const leaves = useMemo(() => {
    if (!zoomNode || !dimensions.width) return [];

    try {
      const root = d3.hierarchy(zoomNode)
        .sum(d => {
          if (!d.children || d.children.length === 0) {
            const raw = d.size || 1024;
            // Cap extreme single-file dominance using sqrt
            return Math.sqrt(Math.max(raw, 256));
          }
          return 0;
        })
        .sort((a, b) => b.value - a.value);

      // Enforce squarify with ratio 1 so tiles are squared
      d3.treemap()
        .tile(d3.treemapSquarify.ratio(1))
        .size([dimensions.width, dimensions.height])
        .paddingInner(2)
        .paddingOuter(2)
        .round(true)(root);

      return root.leaves();
    } catch (e) {
      console.error('Error generating treemap layout:', e);
      return [];
    }
  }, [zoomNode, dimensions]);

  function handleBreadcrumbClick(index) {
    const nextBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(nextBreadcrumb);
    setZoomNode(nextBreadcrumb[nextBreadcrumb.length - 1]);
  }

  function handleTileClick(d) {
    // If it's a directory with children, zoom into it!
    if (d.data.children && d.data.children.length > 0) {
      setZoomNode(d.data);
      setBreadcrumb(prev => [...prev, d.data]);
    } else if (onSelectFile) {
      // If it's a file, open the interactive File Preview modal
      onSelectFile(d.data);
    }
  }

  function matchesFilter(d) {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    if (q === 'sensitive' || q === 'is:sensitive') return d.data.is_sensitive;
    if (q.startsWith('>')) {
      const mb = parseFloat(q.replace('>', '').replace('mb', ''));
      if (!isNaN(mb)) return ((d.data.size || 0) / (1024 * 1024)) > mb;
    }
    if (q.startsWith('.')) {
      return (d.data.name || '').toLowerCase().endsWith(q);
    }
    return (d.data.name || '').toLowerCase().includes(q) ||
           (d.data.category || '').toLowerCase().includes(q);
  }

  if (!activeTree) {
    return (
      <div className="h-96 border border-steel-border bg-card-carbon flex items-center justify-center text-ash text-xs font-mono uppercase tracking-wider">
        AWAITING FOLDER SCAN TO GENERATE VISUALIZATION
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Controls: Breadcrumb Zoom & Simulate Cleanup Slider */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-2.5 bg-[#0e1117] border border-steel-border text-xs font-mono">
        {/* Breadcrumb Zoom Path */}
        <div className="flex items-center space-x-1.5 overflow-x-auto min-w-0">
          <span className="text-fog uppercase mr-1">PATH:</span>
          {breadcrumb.map((node, idx) => (
            <React.Fragment key={idx}>
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`hover:text-snow truncate max-w-[150px] transition-colors ${
                  idx === breadcrumb.length - 1 ? 'text-blue-cornflower font-bold' : 'text-ash underline'
                }`}
              >
                {node.name || 'Root'}
              </button>
              {idx < breadcrumb.length - 1 && <span className="text-fog">/</span>}
            </React.Fragment>
          ))}

          {breadcrumb.length > 1 && (
            <button
              onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
              className="ml-2 px-2 py-0.5 bg-[#161a24] text-blue-cornflower hover:text-snow border border-steel-border flex items-center space-x-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Live Simulate Cleanup Morph Slider */}
        {onCleanupProgressChange && (
          <div className="flex items-center space-x-3 shrink-0 bg-[#141822] px-3 py-1.5 border border-steel-border">
            <span className="text-ash flex items-center space-x-1">
              <Sliders className="w-3 h-3 text-blue-cornflower" />
              <span className="text-[11px] uppercase">Simulate Plan:</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={cleanupProgress}
              onChange={(e) => onCleanupProgressChange(parseInt(e.target.value))}
              className="w-28 accent-[#6798ff] cursor-pointer"
            />
            <span className={`text-[11px] font-bold ${cleanupProgress >= 50 ? 'text-blue-cornflower' : 'text-amber-400'}`}>
              {cleanupProgress >= 50 ? 'Target Proposed' : 'Current Source'} ({cleanupProgress}%)
            </span>
          </div>
        )}
      </div>

      {/* High-visibility Squared Treemap Container */}
      <div className="relative border border-steel-border bg-[#07090e] p-0.5 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-[490px] relative overflow-hidden bg-black"
        >
          {leaves.map((d, idx) => {
            const w = Math.max(0, d.x1 - d.x0);
            const h = Math.max(0, d.y1 - d.y0);
            const cat = d.data.category || 'Others';
            const catColor = getCategoryColor(cat).bg;
            const isSensitive = Boolean(d.data.is_sensitive);
            const isMatch = matchesFilter(d);

            // Labels visible on tiles with w > 52 and h > 24
            const showLabel = w > 52 && h > 24;
            const showSize = showLabel && h > 42;

            return (
              <div
                key={d.data.id || `${d.data.name}-${idx}`}
                className="tile absolute overflow-hidden p-2 flex flex-col justify-start cursor-pointer select-none group"
                style={{
                  left: `${d.x0}px`,
                  top: `${d.y0}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  '--c': catColor,
                  opacity: isMatch ? 1 : 0.15,
                  filter: isMatch ? 'none' : 'grayscale(70%)',
                  ...(isSensitive ? { borderColor: '#ff0055' } : {})
                }}
                onClick={() => handleTileClick(d)}
                onMouseEnter={() => setHoveredNode(d.data)}
                onMouseLeave={() => setHoveredNode(null)}
                title={`${d.data.name} (${formatBytes(d.data.size)}) — Click to preview`}
              >
                {/* Filename with high-contrast bold white text */}
                {showLabel && (
                  <div
                    className="font-semibold text-xs leading-snug text-white truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {d.data.name}
                  </div>
                )}

                {/* Size line with bright mono text for clear legibility */}
                {showSize && (
                  <div
                    className="text-[10.5px] font-mono font-medium text-slate-100/90 mt-0.5 tracking-tight truncate w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]"
                  >
                    {formatBytes(d.data.size)}
                  </div>
                )}

                {isSensitive && (
                  <div className="absolute top-1.5 right-1.5 text-[#ff0055] drop-shadow-[0_0_4px_#ff0055]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hover Inspection HUD Card */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 z-30 max-w-sm p-4 bg-[#0e121b] border-2 border-white/20 text-xs space-y-2 pointer-events-none shadow-2xl">
            <div className="font-bold text-snow text-sm truncate flex items-center space-x-2">
              {hoveredNode.is_sensitive && <Lock className="w-3.5 h-3.5 text-[#ff0055] shrink-0" />}
              <span className="truncate">{hoveredNode.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-ash font-mono">
              <span className="text-white font-semibold">{formatBytes(hoveredNode.size)}</span>
              <span>•</span>
              <span
                style={{ color: getCategoryColor(hoveredNode.category).bg }}
                className="font-bold uppercase tracking-wider text-[11px]"
              >
                {hoveredNode.category}
              </span>
            </div>
            {hoveredNode.reason && (
              <div className="text-ash italic pt-1.5 border-t border-steel-border">
                "{hoveredNode.reason}"
              </div>
            )}
            <div className="text-[10px] text-blue-cornflower font-mono pt-1">
              CLICK TILE TO OPEN FILE PREVIEW & INSPECTOR
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
