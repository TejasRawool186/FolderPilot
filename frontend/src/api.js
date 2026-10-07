export async function fetchBrowse(path = '') {
  const url = path ? `/fs/browse?path=${encodeURIComponent(path)}` : '/fs/browse';
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function openNativeFolderDialog(initialPath = '') {
  const url = initialPath ? `/fs/browse-dialog?initial_path=${encodeURIComponent(initialPath)}` : '/fs/browse-dialog';
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createWorkspace(path, readOnly = false) {
  const res = await fetch('/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, read_only: readOnly })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listWorkspaces() {
  const res = await fetch('/workspaces');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startScan(wsId, recursive = true, maxDepth = 10) {
  const res = await fetch(`/workspaces/${wsId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recursive, max_depth: maxDepth })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchJobStatus(jobId) {
  const res = await fetch(`/jobs/${jobId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cancelScanJob(jobId) {
  const res = await fetch(`/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchStats(wsId) {
  const res = await fetch(`/workspaces/${wsId}/stats`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchTree(wsId, view = 'current') {
  const res = await fetch(`/workspaces/${wsId}/tree?view=${view}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFiles(wsId, category = null, search = null, sensitiveOnly = false) {
  let url = `/workspaces/${wsId}/files?`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (sensitiveOnly) url += `sensitive_only=true&`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchDuplicates(wsId) {
  const res = await fetch(`/workspaces/${wsId}/duplicates`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function overrideCategory(fileId, category, subfolder = null) {
  const res = await fetch(`/classification/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, subfolder })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generatePlan(wsId) {
  const res = await fetch(`/workspaces/${wsId}/plan`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchPlanOps(planId) {
  const res = await fetch(`/plan/${planId}/ops`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePlanOps(planId, opIds, approved) {
  const res = await fetch(`/plan/${planId}/ops`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op_ids: opIds, approved })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchDryRun(planId) {
  const res = await fetch(`/plan/${planId}/dryrun`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function applyPlan(planId) {
  const res = await fetch(`/plan/${planId}/apply`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function triggerUndo(scope = 'batch', targetId = null) {
  const res = await fetch('/journal/undo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, target_id: targetId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchJournal(wsId) {
  const res = await fetch(`/workspaces/${wsId}/journal`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendChatMessage(wsId, message) {
  const urls = [`http://127.0.0.1:8000/workspaces/${wsId}/chat`, `/workspaces/${wsId}/chat`];
  let lastError = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text();
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.detail || errText;
      } catch (_) {}
      lastError = new Error(detail);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to communicate with chat engine.");
}

export async function fetchChatHistory(wsId) {
  const res = await fetch(`/workspaces/${wsId}/chat/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function clearChatHistory(wsId) {
  const res = await fetch(`/workspaces/${wsId}/chat/clear`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFileText(path) {
  const res = await fetch(`/fs/file/text?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getFilePreviewUrl(path) {
  return `/fs/file?path=${encodeURIComponent(path)}`;
}

export async function revealInExplorer(path) {
  const res = await fetch('/fs/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchAiStatus() {
  const res = await fetch('/api/ai/status');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function setAiModel(model) {
  const res = await fetch('/api/ai/model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchAiSummary({ path, filename, content }) {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, filename, content })
  });
  if (!res.ok) {
    const errText = await res.text();
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || errText;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}


