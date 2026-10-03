'use client';

import React, { useState, useEffect } from 'react';
import { Folder, Play, CheckSquare, MessageSquare, History, Lock, Terminal, Sparkles } from 'lucide-react';
import { fetchAiStatus, setAiModel } from '../api';

function getFolderName(pathStr) {
  if (!pathStr) return "Select target workspace...";
  const parts = pathStr.replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] || pathStr;
}

export default function Navbar({
  workspace,
  stats,
  displayedChaosScore,
  onOpenFolderPicker,
  onStartScan,
  onOpenPlan,
  onToggleChat,
  onOpenHistory,
  onOpenSearch,
  isScanning,
  activeModel,
  onModelChange
}) {
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    checkAi();
    const interval = setInterval(checkAi, 10000);
    return () => clearInterval(interval);
  }, []);

  async function checkAi() {
    try {
      const status = await fetchAiStatus();
      setAiStatus(status);
      if (status?.model && onModelChange) {
        onModelChange(status.model);
      }
    } catch (_) {
      setAiStatus({ available: false, model: activeModel || 'gemma3:1b' });
    }
  }

  async function handleSwitchModel(e) {
    const newModel = e.target.value;
    try {
      const updated = await setAiModel(newModel);
      setAiStatus(updated);
      if (onModelChange && updated?.model) {
        onModelChange(updated.model);
      }
    } catch (err) {
      console.error("Failed to switch model:", err);
    }
  }

  const chaosScore = displayedChaosScore !== undefined ? displayedChaosScore : (stats?.chaos_score?.score ?? 0);
  const projectedScore = stats?.chaos_score?.projected_score ?? 0;

  return (
    <header className="h-16 min-h-[64px] shrink-0 border-b border-steel-border bg-page-ink sticky top-0 z-30 flex items-center justify-between px-6 gap-4">
      {/* Brand & Workspace */}
      <div className="flex items-center space-x-4 sm:space-x-6 min-w-0">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-cornflower shadow-sm">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white flex items-center">
              Folder<span className="text-blue-cornflower">Pilot</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-card-carbon border border-steel-border text-ash font-medium">
              CONTROL ROOM
            </span>
          </div>
        </div>

        {/* Selected Workspace Breadcrumb */}
        <button
          onClick={onOpenFolderPicker}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-card-carbon border border-steel-border hover:border-graphite text-xs text-ash hover:text-snow transition-colors max-w-sm truncate"
          title={`Active Workspace: ${workspace?.root_path || 'None'}\nClick to change folder`}
        >
          <Folder className="w-3.5 h-3.5 text-blue-cornflower shrink-0" />
          <span className="truncate font-mono font-medium text-snow">
            {workspace?.root_path ? getFolderName(workspace.root_path) : "Select target workspace..."}
          </span>
          {workspace?.root_path && (
            <span className="text-[10px] text-fog font-mono truncate hidden lg:inline max-w-[140px]">
              {workspace.root_path}
            </span>
          )}
        </button>

        {Boolean(workspace?.read_only) && (
          <span className="inline-flex items-center font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-deep-coal text-ash border border-steel-border">
            <Lock className="w-3 h-3 mr-1 text-blue-cornflower" /> READ-ONLY
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Quick Search / Command Palette (Ctrl+K) */}
        {workspace && (
          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-card-carbon hover:bg-deep-coal border border-steel-border text-xs text-ash hover:text-snow font-mono transition-colors"
            title="Open Command Palette (Ctrl+K)"
          >
            <span className="text-blue-cornflower font-semibold">⌘</span>
            <span className="hidden sm:inline">Search</span>
            <kbd className="px-1 py-0.2 bg-black border border-steel-border text-[9px] text-fog">Ctrl+K</kbd>
          </button>
        )}

        {/* Chaos Metric Pill */}
        {stats && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-card-carbon border border-steel-border text-xs font-mono">
            <span className="text-ash tracking-wider text-[10px] uppercase">CHAOS:</span>
            <span className={`font-semibold ${chaosScore > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
              {chaosScore}
            </span>
            <span className="text-fog">→</span>
            <span className="text-blue-cornflower font-semibold">
              {projectedScore}
            </span>
          </div>
        )}

        {/* Ollama AI Status Pill */}
        <div 
          className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-md bg-card-carbon border border-steel-border text-xs font-mono"
          title={aiStatus?.available ? `Connected to Ollama (${aiStatus.base_url || '127.0.0.1:11434'})` : "Ollama is offline. Start Ollama to enable AI features."}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${aiStatus?.available ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`} />
          <span className="text-ash tracking-wider text-[10px] uppercase">AI:</span>
          {aiStatus?.available && aiStatus?.installed_models?.length > 1 ? (
            <select
              value={aiStatus.model}
              onChange={handleSwitchModel}
              className="bg-transparent text-blue-cornflower font-semibold text-xs focus:outline-none cursor-pointer pr-1"
            >
              {aiStatus.installed_models.map((m) => (
                <option key={m} value={m} className="bg-deep-coal text-snow">
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <span className={`font-semibold ${aiStatus?.available ? 'text-blue-cornflower' : 'text-fog'}`}>
              {aiStatus?.available ? (aiStatus.model || activeModel || 'gemma3:1b') : 'OFFLINE'}
            </span>
          )}
        </div>

        {/* Primary Action Button: White Filled Button (Dovetail spec) */}
        <button
          disabled={!workspace || isScanning}
          onClick={onStartScan}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            isScanning
              ? 'bg-card-carbon text-fog border border-steel-border cursor-not-allowed'
              : 'bg-snow text-page-ink hover:bg-slate-200'
          }`}
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'SCANNING...' : 'SCAN FOLDER'}</span>
        </button>

        {/* Dark Outlined Button */}
        <button
          disabled={!workspace}
          onClick={onOpenPlan}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-page-ink hover:bg-card-carbon text-snow text-xs font-medium border border-graphite transition-colors disabled:opacity-40"
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-cornflower" />
          <span>REVIEW PLAN</span>
        </button>

        {/* Audit Journal Button */}
        <button
          onClick={onOpenHistory}
          className="p-2 rounded-md bg-card-carbon hover:bg-deep-coal border border-steel-border text-ash hover:text-snow transition-colors"
          title="Audit Journal & Undo"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Chat Button */}
        <button
          onClick={onToggleChat}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-card-carbon hover:bg-deep-coal border border-steel-border hover:border-graphite text-snow text-xs font-medium transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-cornflower" />
          <span>FOLDER CHAT</span>
        </button>
      </div>
    </header>
  );
}
