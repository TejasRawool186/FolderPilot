'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, ExternalLink, HardDrive, FileText, Lock, Sparkles, Check, 
  Copy, Play, ShieldAlert, Folder, Terminal, Download, FileCode,
  BookOpen, Table as TableIcon, Binary, Eye
} from 'lucide-react';
import { fetchFileText, getFilePreviewUrl, revealInExplorer, overrideCategory, fetchAiSummary } from '../api';
import { formatBytes, getCategoryColor, CATEGORY_COLORS } from '../utils/colors';

export default function FilePreviewModal({ file, isOpen, onClose, onCategoryOverridden, activeModel = 'gemma3:1b' }) {
  const modelDisplay = activeModel || 'Local AI';
  const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'metadata', 'ai'
  const [textContent, setTextContent] = useState(null);
  const [textLoading, setTextLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subfolder, setSubfolder] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [pdfSubView, setPdfSubView] = useState('embed'); // 'embed' or 'text'
  const [fileDetails, setFileDetails] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    if (file) {
      setSelectedCategory(file.category || 'Others');
      setSubfolder(file.subfolder || '');
      setPdfSubView('embed');
      setAiSummary(null);
      setSummaryError(null);
      
      const ext = getFileExtension(file.name);
      const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
      const isVid = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext);
      const isAud = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext);

      // Preload initial text snippet if available on the file object
      if (file.text_snippet) {
        setTextContent(file.text_snippet);
      } else {
        setTextContent(null);
      }

      // If it's a document, code, text, pdf, or binary, fetch full text / hex dump
      if (file.path && (!isImg && !isVid && !isAud)) {
        loadTextContent(file.path);
      } else {
        setTextLoading(false);
      }
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const ext = getFileExtension(file.name);
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext);
  const isPdf = ext === 'pdf';
  const isDoc = ['docx', 'doc', 'pptx', 'ppt', 'odt', 'rtf'].includes(ext);
  const isSheet = ['csv', 'tsv', 'xlsx', 'xls'].includes(ext);
  const isCode = isTextOrCode(ext);
  const catColor = getCategoryColor(file.category || 'Others').bg;

  function getFileExtension(filename = '') {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  function isTextOrCode(ext) {
    const textExts = [
      'py', 'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'html', 'css', 
      'yaml', 'yml', 'txt', 'log', 'sh', 'bat', 'sql', 'c', 
      'cpp', 'h', 'rs', 'go', 'env', 'ini', 'toml', 'xml', 'ps1',
      'scss', 'less', 'vue', 'svelte'
    ];
    return textExts.includes(ext);
  }

  async function loadTextContent(filePath) {
    if (!filePath) return;
    try {
      setTextLoading(true);
      const res = await fetchFileText(filePath);
      setTextContent(res.content || '');
      setFileDetails(res);
    } catch (e) {
      if (!textContent) {
        setTextContent(`// Could not load file text: ${e.message}`);
      }
    } finally {
      setTextLoading(false);
    }
  }

  async function handleReveal() {
    if (!file?.path) return;
    try {
      setRevealing(true);
      await revealInExplorer(file.path);
    } catch (e) {
      alert(`Could not open explorer: ${e.message}`);
    } finally {
      setRevealing(false);
    }
  }

  function handleCopyText() {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveCategory() {
    if (!file.id) return;
    try {
      setSavingCategory(true);
      await overrideCategory(file.id, selectedCategory, subfolder || null);
      if (onCategoryOverridden) onCategoryOverridden(file.id, selectedCategory);
      onClose();
    } catch (e) {
      alert(`Failed to override category: ${e.message}`);
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSummarizeWithAi() {
    if (!file) return;
    try {
      setSummarizing(true);
      setSummaryError(null);
      const res = await fetchAiSummary({
        path: file.path,
        filename: file.name,
        content: textContent || file.text_snippet
      });
      setAiSummary(res.summary);
      setActiveTab('ai'); // Switch to AI tab to view full insights
    } catch (e) {
      setSummaryError(e.message || `Failed to generate AI summary with ${modelDisplay}.`);
    } finally {
      setSummarizing(false);
    }
  }

  // Ensure previewUrl is strictly null or a valid non-empty string (NEVER empty string "")
  const previewUrl = (typeof file?.path === 'string' && file.path.trim().length > 0)
    ? getFilePreviewUrl(file.path.trim())
    : null;

  // Render CSV / TSV parsed rows
  function renderTablePreview(raw) {
    if (!raw) return null;
    const delimiter = ext === 'tsv' ? '\t' : ',';
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 50);
    if (lines.length === 0) return null;
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '')));

    return (
      <div className="w-full border border-steel-border bg-[#0d1017] overflow-hidden flex flex-col font-mono text-xs">
        <div className="px-4 py-2 bg-[#161a24] border-b border-steel-border flex items-center justify-between text-ash text-[11px]">
          <span>SPREADSHEET: {ext.toUpperCase()} (Showing first {lines.length} rows)</span>
          <span>COLUMNS: {headers.length}</span>
        </div>
        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#121622] border-b border-steel-border text-slate-300">
                <th className="p-2 border-r border-steel-border text-ash text-[10px] w-10 text-center">#</th>
                {headers.map((h, i) => (
                  <th key={i} className="p-2 border-r border-steel-border font-semibold truncate max-w-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-border text-slate-200">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#151a26]">
                  <td className="p-2 border-r border-steel-border text-ash text-[10px] text-center font-mono">{rIdx + 1}</td>
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="p-2 border-r border-steel-border truncate max-w-xs">{row[cIdx] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-4xl bg-[#0e1117] border border-steel-border flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
        style={{ borderTop: `3px solid ${catColor}` }}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#141822] border-b border-steel-border flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div 
              className="w-9 h-9 border flex items-center justify-center shrink-0"
              style={{ borderColor: catColor, backgroundColor: `color-mix(in srgb, ${catColor} 20%, #000)` }}
            >
              {isCode ? (
                <FileCode className="w-4 h-4" style={{ color: catColor }} />
              ) : isDoc ? (
                <BookOpen className="w-4 h-4" style={{ color: catColor }} />
              ) : (
                <FileText className="w-4 h-4" style={{ color: catColor }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm text-snow truncate">{file.name}</h3>
                {file.is_sensitive && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-red-950 text-red-400 border border-red-800">
                    <Lock className="w-3 h-3 mr-1" /> SENSITIVE
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-ash font-mono mt-0.5">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span style={{ color: catColor }} className="font-medium">{file.category}</span>
                <span>•</span>
                <span className="truncate max-w-md text-fog">{file.path || 'Workspace file'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {file.path && (
              <button
                onClick={handleReveal}
                disabled={revealing}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1a202c] hover:bg-[#252d3d] border border-steel-border text-xs text-snow transition-colors"
                title="Reveal in Windows File Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-cornflower" />
                <span>{revealing ? 'Opening...' : 'Reveal'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-card-carbon text-ash hover:text-snow transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-6 bg-[#0a0d13] border-b border-steel-border flex items-center justify-between text-xs font-mono">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-2.5 uppercase tracking-wider border-b-2 font-medium transition-colors ${
                activeTab === 'preview' ? 'border-blue-cornflower text-snow' : 'border-transparent text-ash hover:text-snow'
              }`}
            >
              {isDoc ? 'Document Reader' : isCode ? 'Code Inspector' : isSheet ? 'Data Sheet' : 'Content Preview'}
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`py-2.5 uppercase tracking-wider border-b-2 font-medium transition-colors ${
                activeTab === 'metadata' ? 'border-blue-cornflower text-snow' : 'border-transparent text-ash hover:text-snow'
              }`}
            >
              Technical Metadata
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2.5 uppercase tracking-wider border-b-2 font-medium transition-colors ${
                activeTab === 'ai' ? 'border-blue-cornflower text-snow' : 'border-transparent text-ash hover:text-snow'
              }`}
            >
              AI & Target Destination
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSummarizeWithAi}
                disabled={summarizing}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs text-blue-cornflower font-medium transition-colors disabled:opacity-50"
                title={`Summarize document using local ${modelDisplay}`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${summarizing ? 'animate-spin' : ''}`} />
                <span>{summarizing ? 'Summarizing...' : `Summarize (${modelDisplay})`}</span>
              </button>

              {textContent && isPdf && (
                <div className="flex items-center space-x-1 border border-steel-border bg-[#141822] p-0.5 text-[11px]">
                  <button
                    onClick={() => setPdfSubView('embed')}
                    className={`px-2 py-0.5 ${pdfSubView === 'embed' ? 'bg-blue-cornflower text-black font-semibold' : 'text-ash'}`}
                  >
                    Visual PDF
                  </button>
                  <button
                    onClick={() => setPdfSubView('text')}
                    className={`px-2 py-0.5 ${pdfSubView === 'text' ? 'bg-blue-cornflower text-black font-semibold' : 'text-ash'}`}
                  >
                    Text Extract
                  </button>
                </div>
              )}

              {textContent && (
                <button
                  onClick={handleCopyText}
                  className="flex items-center space-x-1 text-xs text-ash hover:text-snow transition-colors"
                  title="Copy content to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#07090e]">
          {/* TAB 1: CONTENT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex flex-col items-center justify-center min-h-[360px] w-full">
              {/* IMAGE PREVIEW */}
              {isImage && previewUrl && (
                <div className="w-full flex flex-col items-center space-y-3">
                  <div className="border border-steel-border bg-[#050608] p-3 max-w-full flex items-center justify-center overflow-auto max-h-[500px]">
                    <img
                      key={previewUrl}
                      src={previewUrl}
                      alt={file.name}
                      className="max-h-[460px] w-auto object-contain select-none shadow-lg"
                      loading="eager"
                    />
                  </div>
                  <div className="text-[11px] font-mono text-ash flex items-center space-x-4">
                    <span>FORMAT: {ext.toUpperCase()} IMAGE</span>
                    <span>SIZE: {formatBytes(file.size)}</span>
                    <button onClick={handleReveal} className="text-blue-cornflower hover:underline">
                      Reveal in Explorer
                    </button>
                  </div>
                </div>
              )}

              {/* VIDEO PREVIEW: STRICTLY RENDER ONLY WHEN previewUrl IS VALID NON-EMPTY STRING */}
              {isVideo && previewUrl && (
                <div className="w-full max-w-3xl border border-steel-border bg-black flex flex-col items-center">
                  <video
                    key={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[480px] bg-black"
                  >
                    <source src={previewUrl} />
                    Your browser does not support HTML5 video streaming.
                  </video>
                  <div className="w-full p-2.5 bg-[#121620] border-t border-steel-border flex items-center justify-between text-[11px] font-mono text-ash">
                    <span>STREAM: {ext.toUpperCase()} HTML5</span>
                    <span>SIZE: {formatBytes(file.size)}</span>
                    <button onClick={handleReveal} className="text-blue-cornflower hover:underline">
                      Open with Windows Default Player
                    </button>
                  </div>
                </div>
              )}

              {/* AUDIO PREVIEW */}
              {isAudio && previewUrl && (
                <div className="w-full max-w-md p-8 border border-steel-border bg-[#10141d] flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-black border border-steel-border flex items-center justify-center text-blue-cornflower">
                    <Play className="w-8 h-8 fill-current" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm text-snow">{file.name}</div>
                    <div className="text-xs text-ash font-mono mt-1">{formatBytes(file.size)} • {ext.toUpperCase()} Audio Track</div>
                  </div>
                  <audio key={previewUrl} controls className="w-full pt-2">
                    <source src={previewUrl} />
                  </audio>
                </div>
              )}

              {/* PDF PREVIEW */}
              {isPdf && (
                <div className="w-full flex flex-col space-y-2">
                  {pdfSubView === 'embed' && previewUrl ? (
                    <div className="w-full h-[520px] border border-steel-border bg-white">
                      <iframe
                        src={`${previewUrl}#toolbar=0`}
                        className="w-full h-full"
                        title={file.name}
                      />
                    </div>
                  ) : (
                    <div className="w-full border border-steel-border bg-[#0d1017] p-5 max-h-[500px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-blue-cornflower selection:text-black">
                      {textLoading ? (
                        <div className="text-ash flex items-center space-x-2 py-8 justify-center">
                          <span className="animate-spin text-blue-cornflower">⠋</span>
                          <span>Extracting PDF text via PyMuPDF...</span>
                        </div>
                      ) : (
                        textContent || '// No extracted text in this PDF'
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DOCUMENT READER PREVIEW (.docx, .doc, .pptx, .ppt, .odt) */}
              {isDoc && (
                <div className="w-full border border-steel-border bg-[#0d1017] flex flex-col font-sans">
                  <div className="px-5 py-3 bg-[#151924] border-b border-steel-border flex items-center justify-between text-xs text-ash font-mono">
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-cornflower font-semibold uppercase">{ext} DOCUMENT READER</span>
                      <span>•</span>
                      <span>{fileDetails?.word_count ? `${fileDetails.word_count} words` : formatBytes(file.size)}</span>
                    </div>
                    <button
                      onClick={handleReveal}
                      className="px-3 py-1 bg-deep-coal hover:bg-[#202738] border border-steel-border text-snow text-[11px] transition-colors"
                    >
                      Open in Desktop Word
                    </button>
                  </div>
                  <div className="p-8 max-h-[500px] overflow-y-auto bg-[#0a0d13] text-slate-200 leading-relaxed space-y-4">
                    {textLoading ? (
                      <div className="text-ash flex items-center space-x-2 py-12 justify-center font-mono text-xs">
                        <span className="animate-spin text-blue-cornflower">⠋</span>
                        <span>Extracting document text paragraphs...</span>
                      </div>
                    ) : textContent ? (
                      textContent.split('\n\n').map((para, idx) => (
                        <p key={idx} className="text-sm font-sans text-slate-200 leading-relaxed border-l-2 border-transparent hover:border-blue-cornflower pl-2 transition-colors">
                          {para}
                        </p>
                      ))
                    ) : (
                      <div className="text-center py-10 text-ash text-xs font-mono">
                        // No text could be parsed from this document.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SPREADSHEET TABULAR PREVIEW (.csv, .tsv) */}
              {isSheet && (ext === 'csv' || ext === 'tsv') && (
                <div className="w-full">
                  {textLoading ? (
                    <div className="text-ash flex items-center space-x-2 py-12 justify-center font-mono text-xs">
                      <span className="animate-spin text-blue-cornflower">⠋</span>
                      <span>Loading spreadsheet rows...</span>
                    </div>
                  ) : (
                    renderTablePreview(textContent)
                  )}
                </div>
              )}

              {/* CODE & PLAIN TEXT PREVIEW */}
              {isCode && (
                <div className="w-full border border-steel-border bg-[#0d1017] overflow-hidden flex flex-col font-mono text-xs">
                  <div className="px-4 py-2 bg-[#161a24] border-b border-steel-border flex items-center justify-between text-ash text-[11px]">
                    <span>SYNTAX: {ext.toUpperCase()}</span>
                    <span>SIZE: {formatBytes(file.size)}</span>
                  </div>
                  <div className="p-4 overflow-x-auto max-h-[480px] text-slate-200 leading-relaxed font-mono whitespace-pre selection:bg-blue-cornflower selection:text-black">
                    {textLoading ? (
                      <div className="text-ash flex items-center space-x-2 py-8 justify-center">
                        <span className="animate-spin text-blue-cornflower">⠋</span>
                        <span>Reading file content...</span>
                      </div>
                    ) : (
                      textContent || '// Empty file'
                    )}
                  </div>
                </div>
              )}

              {/* BINARY / EXECUTABLE / ARCHIVE / UNKNOWN FILE INSPECTOR */}
              {!isImage && !isVideo && !isAudio && !isPdf && !isDoc && !(isSheet && (ext === 'csv' || ext === 'tsv')) && !isCode && (
                <div className="w-full space-y-4">
                  <div className="border border-steel-border bg-[#0d1017] p-4 flex flex-col font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-steel-border pb-2.5 mb-3 text-ash text-[11px]">
                      <div className="flex items-center space-x-2">
                        <Binary className="w-4 h-4 text-blue-cornflower" />
                        <span className="text-snow font-medium">BINARY INSPECTOR: .{ext.toUpperCase() || 'BIN'}</span>
                      </div>
                      <span className="text-fog">{formatBytes(file.size)}</span>
                    </div>
                    {textLoading ? (
                      <div className="text-ash flex items-center space-x-2 py-8 justify-center">
                        <span className="animate-spin text-blue-cornflower">⠋</span>
                        <span>Reading binary byte headers...</span>
                      </div>
                    ) : textContent ? (
                      <div className="p-3 bg-black/60 border border-steel-border overflow-x-auto max-h-[300px] text-emerald-400 font-mono text-[11px] leading-snug whitespace-pre select-all">
                        {textContent}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-ash text-xs">
                        Binary structure ({formatBytes(file.size)})
                      </div>
                    )}
                  </div>

                  <div className="p-4 border border-steel-border bg-[#141822] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-snow">Open in Native System Application</div>
                      <p className="text-[11px] text-ash mt-0.5">
                        Launch this file directly with Windows default application or reveal in File Explorer.
                      </p>
                    </div>
                    <button
                      onClick={handleReveal}
                      className="px-4 py-2 bg-snow hover:bg-slate-200 text-black text-xs font-semibold transition-colors"
                    >
                      Open in Explorer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: METADATA */}
          {activeTab === 'metadata' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="border border-steel-border bg-[#10141d] divide-y divide-steel-border text-xs font-mono">
                <div className="p-3 flex justify-between">
                  <span className="text-ash">FILE NAME:</span>
                  <span className="text-snow font-medium">{file.name}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-ash">EXTENSION:</span>
                  <span className="text-blue-cornflower font-medium">.{ext || 'none'}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-ash">FILE SIZE:</span>
                  <span className="text-snow">{formatBytes(file.size)} ({file.size} bytes)</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-ash">ABSOLUTE PATH:</span>
                  <span className="text-snow truncate max-w-md" title={file.path}>{file.path}</span>
                </div>
                {file.sha256 && (
                  <div className="p-3 flex justify-between">
                    <span className="text-ash">SHA-256 HASH:</span>
                    <span className="text-fog text-[11px] truncate max-w-xs">{file.sha256}</span>
                  </div>
                )}
                {file.dup_group_id && (
                  <div className="p-3 flex justify-between bg-amber-950/20">
                    <span className="text-amber-400 font-semibold">DUPLICATE STATUS:</span>
                    <span className="text-amber-300">Cluster ID #{file.dup_group_id}</span>
                  </div>
                )}
                {file.mtime && (
                  <div className="p-3 flex justify-between">
                    <span className="text-ash">MODIFIED TIME:</span>
                    <span className="text-slate-300">{new Date(file.mtime * 1000).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AI & TARGET DESTINATION */}
          {activeTab === 'ai' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Local Document Intelligence Card */}
              <div className="border border-steel-border bg-[#10141d] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono text-snow uppercase">
                    <Sparkles className="w-4 h-4 text-blue-cornflower" />
                    <span>Local Document Intelligence ({modelDisplay})</span>
                  </div>
                  <button
                    onClick={handleSummarizeWithAi}
                    disabled={summarizing}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-cornflower hover:bg-blue-400 text-black text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${summarizing ? 'animate-spin' : ''}`} />
                    <span>{summarizing ? `Analyzing with ${modelDisplay}...` : (aiSummary ? 'Regenerate Summary' : 'Generate AI Summary')}</span>
                  </button>
                </div>

                {summaryError && (
                  <div className="p-3 bg-red-950/30 border border-red-800/50 text-red-300 text-xs font-mono">
                    ⚠️ {summaryError}
                  </div>
                )}

                {aiSummary ? (
                  <div className="p-4 bg-black/40 border border-steel-border text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-line space-y-2">
                    {aiSummary}
                  </div>
                ) : !summarizing ? (
                  <div className="p-4 bg-black/20 border border-steel-border/50 text-xs text-ash font-mono leading-relaxed">
                    💡 Click <strong>"Generate AI Summary"</strong> to run local <strong>{modelDisplay}</strong> on this document. It will extract an overview, 3 key takeaways, and suggested organizational tags with 100% offline privacy.
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-ash font-mono space-y-2">
                    <span className="inline-block animate-spin text-blue-cornflower text-base">⠋</span>
                    <p>{modelDisplay} is reading and summarizing file contents...</p>
                  </div>
                )}
              </div>

              {/* Classification Intelligence Card */}
              <div className="border border-steel-border bg-[#10141d] p-5 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-mono text-ash uppercase">
                  <Sparkles className="w-4 h-4 text-blue-cornflower" />
                  <span>Local Classifier Diagnostics</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-black/40 border border-steel-border">
                    <span className="text-[10px] text-ash font-mono block">DETECTED CATEGORY</span>
                    <span className="text-sm font-bold text-snow mt-1 block" style={{ color: catColor }}>
                      {file.category}
                    </span>
                  </div>

                  <div className="p-3 bg-black/40 border border-steel-border">
                    <span className="text-[10px] text-ash font-mono block">AI CONFIDENCE</span>
                    <span className="text-sm font-bold text-emerald-400 mt-1 block font-mono">
                      {file.confidence ? `${Math.round(file.confidence * 100)}%` : '100% (Rule)'}
                    </span>
                  </div>
                </div>

                {file.reason && (
                  <div className="p-3 bg-black/30 border border-steel-border text-xs text-ash italic">
                    "{file.reason}"
                  </div>
                )}
              </div>

              {/* Manual Override Destination */}
              <div className="border border-steel-border bg-[#10141d] p-5 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-snow uppercase">
                  <Folder className="w-4 h-4 text-blue-cornflower" />
                  <span>Override Target Reorganization Category</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-ash block mb-1 font-mono">TARGET CATEGORY</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-[#161a24] border border-steel-border px-3 py-2 text-xs text-snow focus:outline-none focus:border-blue-cornflower"
                    >
                      {Object.keys(CATEGORY_COLORS).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-ash block mb-1 font-mono">SUBFOLDER (OPTIONAL)</label>
                    <input
                      type="text"
                      value={subfolder}
                      onChange={(e) => setSubfolder(e.target.value)}
                      placeholder="e.g. Invoices/2026 or Projects"
                      className="w-full bg-[#161a24] border border-steel-border px-3 py-2 text-xs text-snow focus:outline-none focus:border-blue-cornflower font-mono"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveCategory}
                      disabled={savingCategory}
                      className="px-4 py-2 bg-snow text-black hover:bg-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {savingCategory ? 'Updating...' : 'Save Reorganization Override'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
