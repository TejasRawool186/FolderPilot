'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import FolderPickerModal from '../components/FolderPickerModal';
import ScanningProgress from '../components/ScanningProgress';
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

import {
  listWorkspaces,
  fetchStats,
  fetchTree,
  fetchDuplicates,
  fetchFiles,
  startScan,
  fetchJobStatus,
  generatePlan,
  overrideCategory
} from '../api';
import { LayoutGrid, GitFork, Copy, FileText, Sparkles, Folder, Disc, Search } from 'lucide-react';
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-6 space-y-6">
        {/* Welcome Empty State */}
        {!stats || stats.total_files === 0 ? (
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

      {/* Floating Scanning Progress */}
      <ScanningProgress
        job={scanJob}
        onCancel={() => {
          setActiveJobId(null);
          setScanJob(null);
        }}
      />

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
