'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import FolderPickerModal from '../components/FolderPickerModal';
import StatsOverview from '../components/StatsOverview';
import ChaosScoreCard from '../components/ChaosScoreCard';
import TreemapView from '../components/TreemapView';
import DaisyDiskSunburstView from '../components/DaisyDiskSunburstView';
import BeforeAfterTreeView from '../components/BeforeAfterTreeView';
import DuplicateClustersView from '../components/DuplicateClustersView';
import PlanReviewModal from '../components/PlanReviewModal';
import ChatDrawer from '../components/ChatDrawer';
import JournalHistoryView from '../components/JournalHistoryView';
import FilePreviewModal from '../components/FilePreviewModal';
import CommandPaletteModal from '../components/CommandPaletteModal';
import WanderingEyes from '../components/WanderingEyes';

import {
  listWorkspaces,
  fetchStats,
  fetchTree,
  fetchDuplicates,
  fetchFiles,
  startScan,
  fetchJobStatus,
  cancelScanJob,
  generatePlan,
  overrideCategory
} from '../api';
import { LayoutGrid, GitFork, Copy, FileText, Sparkles, Folder, Disc, Search, XCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '../utils/colors';

export default function Home() {
  const [workspace, setWorkspace] = useState(null);
  const [stats, setStats] = useState(null);
  const [currentTree, setCurrentTree] = useState(null);
  const [proposedTree, setProposedTree] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('treemap');

  // Interactive Features
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [vizMode, setVizMode] = useState('treemap'); // 'treemap' | 'sunburst'
  const [cleanupProgress, setCleanupProgress] = useState(100);

  // Dynamic Chaos Score computed from cleanup slider
  const currentChaos = stats?.chaos_score?.score ?? 0;
  const targetChaos = stats?.chaos_score?.projected_score ?? 0;
  const displayedChaosScore = Math.round(currentChaos - (currentChaos - targetChaos) * (cleanupProgress / 100));

  // Modals & Drawers
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Active Plan ID
  const [activePlanId, setActivePlanId] = useState(null);

  // Scan state
  const [activeJobId, setActiveJobId] = useState(null);
  const [scanJob, setScanJob] = useState(null);
  const [activeModel, setActiveModel] = useState('gemma3:1b');

  useEffect(() => {
    loadRecentWorkspace();
  }, []);

  async function loadRecentWorkspace() {
    try {
      const list = await listWorkspaces();
      if (list && list.length > 0) {
        selectWorkspace(list[0]);
      } else {
        setIsFolderPickerOpen(true);
      }
    } catch (err) {
      console.error(err);
      setIsFolderPickerOpen(true);
    }
  }

  async function selectWorkspace(ws) {
    setWorkspace(ws);
    await reloadWorkspaceData(ws.id);
  }

  async function reloadWorkspaceData(wsId) {
    if (!wsId) return;
    try {
      const [statsData, curTree, propTree, dups, fileList] = await Promise.all([
        fetchStats(wsId),
        fetchTree(wsId, 'current'),
        fetchTree(wsId, 'proposed'),
        fetchDuplicates(wsId),
        fetchFiles(wsId, selectedCategory)
      ]);
      setStats(statsData);
      setCurrentTree(curTree);
      setProposedTree(propTree);
      setDuplicates(dups);
      setFiles(fileList);
    } catch (err) {
      console.error(err);
    }
  }

  // Polling scan progress
  useEffect(() => {
    let timer;
    if (activeJobId) {
      timer = setInterval(async () => {
        try {
          const status = await fetchJobStatus(activeJobId);
          setScanJob(status);
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            setActiveJobId(null);
            if (workspace) reloadWorkspaceData(workspace.id);
          }
        } catch (e) {
          setActiveJobId(null);
        }
      }, 700);
    }
    return () => clearInterval(timer);
  }, [activeJobId, workspace]);

  async function handleStartScan() {
    if (!workspace) return;
    try {
      const res = await startScan(workspace.id);
      setActiveJobId(res.job_id);
      setScanJob({ status: 'started', files_seen: 0, total_files: 0 });
    } catch (err) {
      alert(`Could not start scan: ${err.message}`);
    }
  }

  async function handleCancelScan() {
    if (activeJobId) {
      try {
        await cancelScanJob(activeJobId);
      } catch (err) {
        console.error('Failed to cancel scan:', err);
      }
      setActiveJobId(null);
      setScanJob(null);
      if (workspace) reloadWorkspaceData(workspace.id);
    }
  }

  async function handleOpenPlan() {
    if (!workspace) return;
    try {
      const planRes = await generatePlan(workspace.id);
      setActivePlanId(planRes.plan_id);
      setIsPlanOpen(true);
    } catch (err) {
      alert(`Could not generate plan: ${err.message}`);
    }
  }

  async function handleOverrideCategory(fileId, newCategory) {
    try {
      await overrideCategory(fileId, newCategory);
      if (workspace) reloadWorkspaceData(workspace.id);
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    }
  }

  function handleSelectFileForPreview(selectedNode) {
    if (!selectedNode) return;
    const fullFile = files.find(item => item.id === selectedNode.id || (item.path && item.path === selectedNode.path) || (item.name && item.name === selectedNode.name)) || selectedNode;
    setSelectedFileForPreview(fullFile);
  }

  return (
    <div className="min-h-screen bg-page-ink text-snow flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        workspace={workspace}
        stats={stats}
        displayedChaosScore={displayedChaosScore}
        onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
        onStartScan={handleStartScan}
        onOpenPlan={handleOpenPlan}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        isScanning={Boolean(activeJobId)}
        activeModel={activeModel}
        onModelChange={setActiveModel}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-6 space-y-6">
        {/* Active Scan State with WanderingEyes Hero */}
        {Boolean(activeJobId) ? (
          <div className="relative overflow-hidden border border-blue-500/30 rounded-xl bg-gradient-to-b from-[#0c121e] via-[#090d16] to-card-carbon p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 space-y-7 shadow-2xl shadow-blue-950/40">
            {/* Background ambient radial glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* WanderingEyes Animation */}
            <div className="relative py-2 flex flex-col items-center justify-center">
              <WanderingEyes size="xl" />
            </div>

            {/* Status Header */}
            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-400">
                  SCANNING &amp; INDEXING WORKSPACE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-snow">
                {scanJob?.current_file ? 'Analyzing Files & Directory Structure...' : 'Discovering Files...'}
              </h2>
              {workspace?.root_path && (
                <p className="text-xs text-ash font-mono truncate max-w-lg mx-auto bg-deep-coal/80 px-3 py-1.5 rounded border border-steel-border/50">
                  {workspace.root_path}
                </p>
              )}
            </div>

            {/* Large Progress Bar with Shimmer */}
            <div className="space-y-2 relative z-10">
              <div className="w-full bg-deep-coal rounded-full h-3 overflow-hidden border border-steel-border shadow-inner p-[1px]">
                <div
                  className="bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 h-full rounded-full transition-all duration-300 relative shadow-[0_0_12px_rgba(96,165,250,0.6)]"
                  style={{
                    width: `${scanJob?.total_files > 0 ? Math.min(100, Math.round(((scanJob.files_seen || 0) / scanJob.total_files) * 100)) : 8}%`
                  }}
                />
              </div>

              {/* Live Metric Badges */}
              <div className="flex items-center justify-between text-xs text-ash font-mono pt-1">
                <span className="text-fog">
                  <strong className="text-snow">{scanJob?.files_seen || 0}</strong> / {scanJob?.total_files || '...'} files
                </span>
                <span className="text-fog">
                  Indexed: <strong className="text-snow">{formatBytes(scanJob?.bytes_seen || 0)}</strong>
                </span>
                <span className="font-bold text-blue-400 text-sm">
                  {scanJob?.total_files > 0 ? Math.min(100, Math.round(((scanJob.files_seen || 0) / scanJob.total_files) * 100)) : 0}%
                </span>
              </div>
            </div>

            {/* Currently Processing File Ticker */}
            <div className="flex items-center space-x-2.5 text-xs text-ash bg-deep-coal/90 px-3.5 py-2.5 rounded-md border border-steel-border text-left font-mono relative z-10">
              <FileText className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
              <div className="truncate flex-1">
                <span className="text-fog text-[10px] block uppercase tracking-wider">CURRENT TARGET</span>
                <span className="text-snow truncate block font-medium">
                  {scanJob?.current_file || 'Reading filesystem metadata...'}
                </span>
              </div>
            </div>

            {/* Cancel Scan Action */}
            <div className="pt-2 relative z-10 flex items-center justify-center">
              <button
                onClick={handleCancelScan}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 rounded-md font-mono text-xs font-medium transition-all shadow-sm group cursor-pointer"
              >
                <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Cancel Scan</span>
              </button>
            </div>
          </div>
        ) : !stats || stats.total_files === 0 ? (
          <div className="border border-steel-border rounded-md bg-card-carbon p-12 text-center max-w-xl mx-auto my-12 space-y-5">
            <div className="w-12 h-12 rounded-md bg-deep-coal border border-steel-border text-blue-cornflower mx-auto flex items-center justify-center">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-ash block">SYSTEM IDLE</span>
              <h2 className="text-xl font-semibold tracking-tight text-snow mt-1">Ready to Index Workspace</h2>
              <p className="text-sm text-ash mt-2 leading-relaxed">
                Connect a target directory to visualize its structure, diagnose disorganization, and generate zero-risk reversible plans.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-3">
              <button
                onClick={() => setIsFolderPickerOpen(true)}
                className="px-4 py-2 bg-page-ink hover:bg-deep-coal text-snow font-medium rounded-md border border-graphite text-xs"
              >
                Browse Directory
              </button>
              {workspace && (
                <button
                  onClick={handleStartScan}
                  className="px-5 py-2 bg-snow hover:bg-slate-200 text-page-ink font-medium rounded-md text-xs"
                >
                  Start Scan
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Top Dashboard: Stats & Diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <StatsOverview
                  stats={stats}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    if (workspace) fetchFiles(workspace.id, cat).then(setFiles);
                  }}
                  selectedCategory={selectedCategory}
                />
              </div>
              <div className="lg:col-span-1">
                <ChaosScoreCard chaosData={stats.chaos_score} />
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="border-b border-steel-border flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('treemap')}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === 'treemap'
                      ? 'border-blue-cornflower text-snow font-semibold'
                      : 'border-transparent text-ash hover:text-snow'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Category Treemap</span>
                </button>

                <button
                  onClick={() => setActiveTab('tree')}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === 'tree'
                      ? 'border-blue-cornflower text-snow font-semibold'
                      : 'border-transparent text-ash hover:text-snow'
                  }`}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Before & After</span>
                </button>

                <button
                  onClick={() => setActiveTab('duplicates')}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === 'duplicates'
                      ? 'border-blue-cornflower text-snow font-semibold'
                      : 'border-transparent text-ash hover:text-snow'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicates ({stats.duplicate_files_count})</span>
                </button>

                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === 'files'
                      ? 'border-blue-cornflower text-snow font-semibold'
                      : 'border-transparent text-ash hover:text-snow'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Files List</span>
                </button>
              </div>

              <button
                onClick={handleOpenPlan}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-page-ink hover:bg-card-carbon text-snow border border-graphite text-xs font-mono uppercase tracking-wider transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-cornflower" />
                <span>Generate Plan</span>
              </button>
            </div>

            {/* Active Tab View */}
            <div className="pt-2 space-y-3">
              {activeTab === 'treemap' && (
                <div className="space-y-3">
                  {/* View Type Switcher (Treemap vs Sunburst) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setVizMode('treemap')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-colors ${
                          vizMode === 'treemap'
                            ? 'bg-blue-cornflower text-black border-blue-cornflower font-bold'
                            : 'bg-[#141822] text-ash border-steel-border hover:text-snow'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Squared Treemap</span>
                      </button>

                      <button
                        onClick={() => setVizMode('sunburst')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-colors ${
                          vizMode === 'sunburst'
                            ? 'bg-blue-cornflower text-black border-blue-cornflower font-bold'
                            : 'bg-[#141822] text-ash border-steel-border hover:text-snow'
                        }`}
                      >
                        <Disc className="w-3.5 h-3.5" />
                        <span>DaisyDisk Sunburst</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsCommandPaletteOpen(true)}
                      className="text-xs font-mono text-ash hover:text-snow flex items-center space-x-1"
                    >
                      <Search className="w-3.5 h-3.5 text-blue-cornflower" />
                      <span>Spotlight Filter (Ctrl+K)</span>
                    </button>
                  </div>

                  {vizMode === 'treemap' ? (
                    <TreemapView
                      currentTree={currentTree}
                      proposedTree={proposedTree}
                      cleanupProgress={cleanupProgress}
                      onCleanupProgressChange={setCleanupProgress}
                      filterQuery={filterQuery}
                      onSelectFile={handleSelectFileForPreview}
                    />
                  ) : (
                    <DaisyDiskSunburstView
                      data={cleanupProgress >= 50 ? (proposedTree || currentTree) : (currentTree || proposedTree)}
                      onSelectFile={handleSelectFileForPreview}
                    />
                  )}
                </div>
              )}

              {activeTab === 'tree' && (
                <BeforeAfterTreeView
                  currentTree={currentTree}
                  proposedTree={proposedTree}
                  onOverrideCategory={handleOverrideCategory}
                  onSelectFile={handleSelectFileForPreview}
                />
              )}

              {activeTab === 'duplicates' && (
                <DuplicateClustersView
                  duplicates={duplicates}
                  onSelectFile={handleSelectFileForPreview}
                />
              )}

              {activeTab === 'files' && (
                <div className="border border-steel-border bg-card-carbon overflow-hidden">
                  <div className="px-4 py-2.5 bg-deep-coal border-b border-steel-border text-xs text-ash font-mono flex justify-between">
                    <span>INDEXED RECORDS: {files.length}</span>
                    {selectedCategory && <span>FILTER: {selectedCategory}</span>}
                  </div>
                  <div className="divide-y divide-steel-border max-h-[500px] overflow-y-auto">
                    {files.map(f => (
                      <div
                        key={f.id}
                        onClick={() => handleSelectFileForPreview(f)}
                        className="p-3 hover:bg-deep-coal flex items-center justify-between text-xs transition-colors cursor-pointer group"
                      >
                        <div className="truncate max-w-lg">
                          <div className="font-medium text-snow truncate group-hover:text-blue-cornflower group-hover:underline">
                            {f.name}
                          </div>
                          <div className="text-[11px] text-fog truncate font-mono">{f.path}</div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 font-mono">
                          <span className="text-fog text-[11px]">{formatBytes(f.size)}</span>
                          <span className="px-2 py-0.5 bg-deep-coal text-ash border border-steel-border text-[10px]">
                            {f.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Folder Picker Modal */}
      <FolderPickerModal
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelectWorkspace={selectWorkspace}
      />

      {/* Plan Review Modal */}
      <PlanReviewModal
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        planId={activePlanId}
        onApplied={() => {
          if (workspace) reloadWorkspaceData(workspace.id);
        }}
      />

      {/* History & Undo Modal */}
      <JournalHistoryView
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        workspaceId={workspace?.id}
        onUndone={() => {
          if (workspace) reloadWorkspaceData(workspace.id);
        }}
      />

      {/* Docked Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        workspaceId={workspace?.id}
        activeModel={activeModel}
        onPlanGenerated={(newPlanId) => {
          setActivePlanId(newPlanId);
          setIsPlanOpen(true);
        }}
      />

      {/* In-App Live File Preview Modal */}
      <FilePreviewModal
        file={selectedFileForPreview}
        isOpen={Boolean(selectedFileForPreview)}
        onClose={() => setSelectedFileForPreview(null)}
        activeModel={activeModel}
        onCategoryOverridden={() => {
          if (workspace) reloadWorkspaceData(workspace.id);
        }}
      />

      {/* Ctrl+K Spotlight Command Palette */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        files={files}
        onSelectFile={handleSelectFileForPreview}
        onApplyFilter={(q) => setFilterQuery(q)}
        activeFilter={filterQuery}
      />
    </div>
  );
}
