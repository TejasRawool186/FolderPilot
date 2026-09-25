'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getCategoryColor, formatBytes } from '../utils/colors';
import { Lock, ArrowLeft } from 'lucide-react';

export default function DaisyDiskSunburstView({ data, onSelectFile }) {
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoomNode, setZoomNode] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);

  useEffect(() => {
    if (data) {
      setZoomNode(data);
      setBreadcrumb([data]);
    }
  }, [data]);

  useEffect(() => {
    if (!zoomNode || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .style('font', '10px monospace');

    // Hierarchy & partition
    const hierarchy = d3.hierarchy(zoomNode)
      .sum(d => (!d.children || d.children.length === 0 ? Math.sqrt(Math.max(d.size || 1024, 256)) : 0))
      .sort((a, b) => b.value - a.value);

    const root = d3.partition()
      .size([2 * Math.PI, radius])(hierarchy);

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => Math.max(0, d.y0))
      .outerRadius(d => Math.max(d.y0, d.y1 - 1));

    // Arcs
    const path = svg.append('g')
      .selectAll('path')
      .data(root.descendants().filter(d => d.depth)) // skip root node in outer rings
      .join('path')
      .attr('fill', d => {
        const cat = d.data.category || d.data.name;
        return getCategoryColor(cat).bg;
      })
      .attr('fill-opacity', d => {
        if (d.depth === 1) return 0.85;
        return 0.55;
      })
      .attr('stroke', d => (d.data.is_sensitive ? '#ff0055' : '#07090e'))
      .attr('stroke-width', '1.5px')
      .attr('d', arc)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.data);
        d3.select(event.currentTarget)
          .attr('fill-opacity', 1)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', '2px');
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget)
          .attr('fill-opacity', d.depth === 1 ? 0.85 : 0.55)
          .attr('stroke', d.data.is_sensitive ? '#ff0055' : '#07090e')
          .attr('stroke-width', '1.5px');
      })
      .on('click', (event, d) => {
        if (d.children && d.children.length > 0) {
          setZoomNode(d.data);
          setBreadcrumb(prev => [...prev, d.data]);
        } else if (onSelectFile) {
          onSelectFile(d.data);
        }
      });

    // Center circular radar display
    const centerGroup = svg.append('g').attr('class', 'center-info');
    centerGroup.append('circle')
      .attr('r', radius * 0.28)
      .attr('fill', '#0e1117')
      .attr('stroke', '#313131')
      .attr('stroke-width', '1.5px');

  }, [zoomNode]);

  function handleBreadcrumbClick(index) {
    const nextBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(nextBreadcrumb);
    setZoomNode(nextBreadcrumb[nextBreadcrumb.length - 1]);
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Breadcrumb Zoom Navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e1117] border border-steel-border text-xs font-mono">
        <div className="flex items-center space-x-1 overflow-x-auto">
          <span className="text-fog uppercase mr-1">PATH:</span>
          {breadcrumb.map((node, idx) => (
            <React.Fragment key={idx}>
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`hover:text-snow underline transition-colors ${
                  idx === breadcrumb.length - 1 ? 'text-blue-cornflower font-bold' : 'text-ash'
                }`}
              >
                {node.name || 'Root'}
              </button>
              {idx < breadcrumb.length - 1 && <span className="text-fog">/</span>}
            </React.Fragment>
          ))}
        </div>

        {breadcrumb.length > 1 && (
          <button
            onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
            className="flex items-center space-x-1 text-xs text-blue-cornflower hover:text-snow"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zoom Out</span>
          </button>
        )}
      </div>

      {/* Sunburst Canvas */}
      <div className="relative border border-steel-border bg-[#07090e] p-2 flex items-center justify-center overflow-hidden">
        <div ref={containerRef} className="w-full h-[500px] flex items-center justify-center" />

        {/* Center Hover HUD / Details */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-3 max-w-[200px] space-y-1">
            {hoveredNode ? (
              <>
                <div className="font-bold text-snow text-xs truncate">
                  {hoveredNode.name}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                  {formatBytes(hoveredNode.size)}
                </div>
                <div 
                  className="text-[10px] font-mono uppercase font-semibold truncate"
                  style={{ color: getCategoryColor(hoveredNode.category || hoveredNode.name).bg }}
                >
                  {hoveredNode.category || 'Folder'}
                </div>
              </>
            ) : (
              <div className="text-ash text-[10px] font-mono uppercase tracking-wider">
                HOVER ARC TO INSPECT
              </div>
            )}
          </div>
        </div>

        {/* Floating Tile HUD card */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 z-20 max-w-xs p-3 bg-[#0e121b] border-2 border-white/20 text-xs space-y-1.5 shadow-xl pointer-events-none">
            <div className="font-bold text-snow text-xs truncate flex items-center space-x-1.5">
              {hoveredNode.is_sensitive && <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className="truncate">{hoveredNode.name}</span>
            </div>
            <div className="text-ash font-mono text-[11px] flex justify-between">
              <span>SIZE: {formatBytes(hoveredNode.size)}</span>
              <span style={{ color: getCategoryColor(hoveredNode.category || hoveredNode.name).bg }} className="font-bold">
                {hoveredNode.category || 'Category'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
