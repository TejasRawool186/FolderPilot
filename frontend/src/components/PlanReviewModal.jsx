'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import { fetchPlanOps, updatePlanOps, fetchDryRun, applyPlan } from '../api';
import { formatBytes } from '../utils/colors';

export default function PlanReviewModal({ isOpen, onClose, planId, onApplied }) {
  const [ops, setOps] = useState([]);
  const [dryRun, setDryRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen && planId) {
      loadPlanData();
    }
  }, [isOpen, planId]);

  async function loadPlanData() {
    try {
      setLoading(true);
      setError(null);
      const [opsData, dryData] = await Promise.all([
        fetchPlanOps(planId),
        fetchDryRun(planId)
      ]);
      setOps(opsData);
      setDryRun(dryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleOp(opId, currentStatus) {
    try {
      await updatePlanOps(planId, [opId], !currentStatus);
      setOps(prev => prev.map(o => o.id === opId ? { ...o, approved: !currentStatus ? 1 : 0 } : o));
      const updatedDry = await fetchDryRun(planId);
      setDryRun(updatedDry);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleAll(approved) {
    try {
      const allIds = ops.map(o => o.id);
      await updatePlanOps(planId, allIds, approved);
      setOps(prev => prev.map(o => ({ ...o, approved: approved ? 1 : 0 })));
      const updatedDry = await fetchDryRun(planId);
      setDryRun(updatedDry);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApply() {
    if (dryRun?.requires_number_confirmation) {
      if (confirmInput.trim() !== String(dryRun.total_ops)) {
        setError(`Please type '${dryRun.total_ops}' to confirm this large organization batch.`);
        return;
      }
    }

    try {
      setApplying(true);
      setError(null);
      const res = await applyPlan(planId);
      if (onApplied) onApplied(res);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  if (!isOpen) return null;

  const approvedCount = ops.filter(o => o.approved).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/85 backdrop-blur-none p-4">
      <div className="w-full max-w-4xl bg-card-carbon border border-steel-border rounded-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-steel-border flex items-center justify-between bg-deep-coal">
          <div className="flex items-center space-x-3">
            <CheckSquare className="w-4 h-4 text-blue-cornflower" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ash block">EXECUTION GATE</span>
              <h2 className="text-sm font-semibold text-snow">Review & Approve Plan Operations</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-ash hover:text-snow transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dry Run Strip */}
        {dryRun && (
          <div className="px-6 py-3 bg-page-ink border-b border-steel-border grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-fog block text-[10px] uppercase tracking-wider">APPROVED OPS:</span>
              <span className="text-sm font-semibold text-blue-cornflower">{approvedCount} / {dryRun.total_ops}</span>
            </div>
            <div>
              <span className="text-fog block text-[10px] uppercase tracking-wider">FOLDERS CREATED:</span>
              <span className="text-sm font-semibold text-snow">{dryRun.mkdir_count}</span>
            </div>
            <div>
              <span className="text-fog block text-[10px] uppercase tracking-wider">FILES MOVED:</span>
              <span className="text-sm font-semibold text-snow">{dryRun.move_count}</span>
            </div>
            <div>
              <span className="text-fog block text-[10px] uppercase tracking-wider">STORAGE AFFECTED:</span>
              <span className="text-sm font-semibold text-snow">{formatBytes(dryRun.total_bytes_affected)}</span>
            </div>
          </div>
        )}

        {/* Conflicts Banner */}
        {dryRun?.conflicts?.length > 0 && (
          <div className="px-6 py-2 bg-deep-coal border-b border-steel-border text-xs text-ash flex items-center space-x-2 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-cornflower shrink-0" />
            <span>{dryRun.conflicts.length} name collisions detected: auto-suffixing enabled (zero overwrite).</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="px-6 py-2.5 bg-deep-coal/60 border-b border-steel-border flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3 font-mono">
            <button
              onClick={() => handleToggleAll(true)}
              className="text-blue-cornflower hover:underline text-[11px] uppercase tracking-wider"
            >
              APPROVE ALL ({ops.length})
            </button>
            <span className="text-steel-border">•</span>
            <button
              onClick={() => handleToggleAll(false)}
              className="text-ash hover:text-snow text-[11px] uppercase tracking-wider"
            >
              UNAPPROVE ALL
            </button>
          </div>
          <span className="text-fog text-[11px]">Unapproved operations will remain untouched on disk.</span>
        </div>

        {/* Operations List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {error && (
            <div className="p-3 rounded-md bg-deep-coal border border-red-500/40 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {ops.map(op => {
            const isApproved = Boolean(op.approved);
            return (
              <div
                key={op.id}
                onClick={() => toggleOp(op.id, isApproved)}
                className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                  isApproved
                    ? 'bg-deep-coal border-blue-cornflower/40 text-snow'
                    : 'bg-page-ink border-steel-border text-ash hover:border-graphite'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <button className="text-blue-cornflower shrink-0">
                    {isApproved ? <CheckSquare className="w-4 h-4 text-blue-cornflower" /> : <Square className="w-4 h-4 text-fog" />}
                  </button>

                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm bg-deep-coal border border-steel-border text-ash">
                    {op.type}
                  </span>

                  <div className="text-xs truncate font-mono">
                    <span className="text-ash truncate">{op.src.split('\\').pop() || op.src}</span>
                    <ArrowRight className="inline-block w-3 h-3 mx-1 text-fog" />
                    <span className="text-snow font-medium">{op.dst.split('\\').slice(-2).join('/')}</span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-fog uppercase tracking-wider">
                  {op.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Large Change Guard Confirmation Input */}
        {dryRun?.requires_number_confirmation && (
          <div className="px-6 py-3 bg-deep-coal border-t border-steel-border flex items-center justify-between text-xs">
            <span className="text-ash font-mono">
              Large batch confirmation: type <strong>{dryRun.total_ops}</strong> to confirm:
            </span>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={String(dryRun.total_ops)}
              className="w-24 bg-page-ink border border-graphite rounded-md px-2 py-1 text-center font-mono text-snow focus:outline-none focus:border-blue-cornflower"
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-steel-border bg-deep-coal flex items-center justify-between">
          <div className="text-xs text-fog font-mono">
            AUDIT JOURNAL ATOMIC COMMIT WITH TWO-PHASE UNDO
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-page-ink border border-graphite text-snow hover:bg-card-carbon text-xs font-medium"
            >
              Cancel
            </button>
            <button
              disabled={applying || approvedCount === 0}
              onClick={handleApply}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-md bg-snow text-page-ink hover:bg-slate-200 text-xs font-medium disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{applying ? 'Applying...' : `Execute (${approvedCount} Approved)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
