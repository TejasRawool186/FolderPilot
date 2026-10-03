'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CheckSquare, Terminal } from 'lucide-react';
import { sendChatMessage, fetchChatHistory, fetchAiStatus } from '../api';

export default function ChatDrawer({ isOpen, onClose, workspaceId, onPlanGenerated, activeModel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadAiStatus();
      if (workspaceId) {
        loadHistory();
      }
    }
  }, [isOpen, workspaceId, activeModel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function loadAiStatus() {
    try {
      const status = await fetchAiStatus();
      setAiStatus(status);
    } catch (_) {
      setAiStatus({ available: false, model: activeModel || 'gemma3:1b' });
    }
  }

  const currentModel = activeModel || aiStatus?.model || 'gemma3:1b';
  const isAvailable = aiStatus?.available ?? true;

  async function loadHistory() {
    try {
      const hist = await fetchChatHistory(workspaceId);
      if (hist && hist.length > 0) {
        setMessages(hist);
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `**FolderPilot AI** (running on local **${currentModel}** via Ollama).\n\nAsk me anything about your files, structure, or organization:\n- *'How should I organize my messy downloads?'*\n- *'What files are taking up the most space?'*\n- *'How many PDFs or images do I have?'*\n- *'Rename doc.pdf to Final_Report.pdf'* (generates safe draft plan)\n\nAll AI processing is 100% private and runs entirely on your local machine.`,
          model: currentModel
        }]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: String(Date.now()), role: 'user', content: userText }]);

    try {
      setLoading(true);
      const res = await sendChatMessage(workspaceId, userText);
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.content,
        toolUsed: res.tool_used,
        actionPlanId: res.action_plan_id,
        model: res.model || currentModel
      }]);

      if (res.action_plan_id && onPlanGenerated) {
        onPlanGenerated(res.action_plan_id);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `Error: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] max-w-[90vw] bg-page-ink border-l border-steel-border flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-steel-border flex items-center justify-between bg-deep-coal shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded bg-card-carbon border border-steel-border flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-blue-cornflower" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-xs text-snow">FolderPilot Chat</h3>
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-cornflower border border-blue-500/30">
                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isAvailable ? currentModel : 'AI Offline'}</span>
              </span>
            </div>
            <span className="font-mono text-[10px] text-ash block">100% Local & Private via Ollama</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-card-carbon text-ash hover:text-snow transition-colors"
          title="Close Terminal Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-md px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line border ${
                  isUser
                    ? 'bg-card-carbon border-graphite text-snow'
                    : 'bg-deep-coal border-steel-border text-snow font-mono'
                }`}
              >
                {msg.content}
                {msg.actionPlanId && (
                  <div className="mt-2 pt-2 border-t border-steel-border flex items-center text-blue-cornflower font-sans text-xs">
                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    <span>Plan generated. Review & approve in the Review Plan drawer.</span>
                  </div>
                )}
                {!isUser && (
                  <div className="mt-2 pt-1 border-t border-steel-border/50 flex items-center text-[10px] text-fog font-mono">
                    <span className="text-emerald-400 mr-1.5">●</span>
                    <span>{msg.model || currentModel}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex space-x-2 items-center text-xs text-ash bg-deep-coal p-2.5 rounded-md border border-steel-border font-mono">
            <span className="animate-spin text-blue-cornflower">⠋</span>
            <span>Generating response with {currentModel}...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-steel-border bg-deep-coal flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask stats or command a rename..."
          className="flex-1 bg-page-ink border border-graphite rounded-md px-3 py-2 text-xs text-snow focus:outline-none focus:border-blue-cornflower placeholder-fog font-mono"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3 py-2 rounded-md bg-snow text-page-ink hover:bg-slate-200 disabled:opacity-40 transition-colors text-xs font-medium cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
