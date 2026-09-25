'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, History, ArrowRight } from 'lucide-react';
import { fetchJournal, triggerUndo } from '../api';

export default function JournalHistoryView({ isOpen, onClose, workspaceId, onUndone }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadJournal();
    }
  }, [isOpen, workspaceId]);

  async function loadJournal() {
    try {
      setLoading(true);
      const data = await fetchJournal(workspaceId);
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUndoAll() {
    try {
      setUndoing(true);
      setMessage(null);
      const res = await triggerUndo('all', workspaceId);
      setMessage(`Successfully reverted ${res.length} operations.`);
      await loadJournal();
      if (onUndone) onUndone();
    } catch (err) {
      setMessage(`Undo failed: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  }

  async function handleUndoSingle(journalId) {
    try {
      setUndoing(true);
      const res = await triggerUndo('op', journalId);
      setMessage(res.message);
      await loadJournal();
      if (onUndone) onUndone();
    } catch (err) {
      setMessage(`Undo failed: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/85 backdrop-blur-none p-4">
      <div className="w-full max-w-3xl bg-card-carbon border border-steel-border rounded-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-steel-border flex items-center justify-between bg-deep-coal">
          <div className="flex items-center space-x-2.5">
            <History className="w-4 h-4 text-blue-cornflower" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ash block">AUDIT TRAIL</span>
              <h2 className="text-sm font-semibold text-snow">Append-Only Execution Journal</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-ash hover:text-snow transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="px-6 py-2.5 bg-deep-coal border-b border-steel-border text-xs text-blue-cornflower font-mono flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-ash hover:text-snow text-xs">Dismiss</button>
          </div>
        )}

        {/* Action Header */}
        <div className="px-6 py-3 bg-page-ink border-b border-steel-border flex items-center justify-between font-mono text-xs">
          <span className="text-ash uppercase tracking-wider">LOGGED OPERATIONS: {entries.length}</span>
          <button
            disabled={undoing || entries.length === 0}
            onClick={handleUndoAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-deep-coal hover:bg-card-carbon text-snow border border-graphite rounded-md text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{undoing ? 'REVERTING...' : 'REVERT ALL WORKSPACE CHANGES'}</span>
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {entries.length === 0 && (
            <div className="text-center py-12 text-fog text-xs font-mono uppercase tracking-wider">
              NO FILESYSTEM OPERATIONS LOGGED YET
            </div>
          )}

          {entries.map(entry => {
            const isUndone = Boolean(entry.undone_at);
            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-md border text-xs flex items-center justify-between space-x-4 ${
                  isUndone
                    ? 'bg-page-ink border-steel-border opacity-50'
                    : 'bg-deep-coal border-steel-border'
                }`}
              >
                <div className="space-y-1 truncate flex-1 font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded-sm bg-card-carbon text-ash border border-steel-border text-[10px] uppercase">
                      {entry.type}
                    </span>
                    <span className="text-fog text-[10px]">{entry.ts}</span>
                    {isUndone && (
                      <span className="text-blue-cornflower text-[10px]">[REVERTED]</span>
                    )}
                  </div>
                  <div className="text-ash truncate">
                    <span>{entry.src.split('\\').pop() || entry.src}</span>
                    <ArrowRight className="inline-block w-3 h-3 mx-1 text-fog" />
                    <span className="text-snow font-medium">{entry.dst.split('\\').slice(-2).join('/')}</span>
                  </div>
                </div>

                {!isUndone && (
                  <button
                    disabled={undoing}
                    onClick={() => handleUndoSingle(entry.id)}
                    className="p-1.5 rounded-md bg-card-carbon hover:bg-page-ink border border-steel-border text-ash hover:text-snow transition-colors"
                    title="Undo this operation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
