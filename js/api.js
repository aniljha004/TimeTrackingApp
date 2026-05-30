// ═══════════════════════ AUTHENTICATED FETCH HELPER ═══════════════════════
function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

// ═══════════════════════ LOAD USERS ═══════════════════════
async function loadUsers() {
  try {
    const res = await apiFetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to load users');
    db.users = (await res.json()).map(u => ({
      ...u,
      id: u._id,
      color: u.color || stringToColor(u.name || u.email || u._id),
    }));
    return db.users;
  } catch (err) {
    console.error('loadUsers failed', err);
    toast('Unable to load users from server', 'error');
    return [];
  }
}

// ═══════════════════════ LOAD TASKS ═══════════════════════
async function loadTasks() {
  try {
    const res = await apiFetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('Failed to load tasks');
    const raw = await res.json();
    db.tasks = raw.map(t => ({
      ...t,
      id: t._id,
      name: t.title || t.name || 'Untitled',
      desc: t.description || t.desc || '',
      assignedTo: t.userId?._id || t.userId || t.assignedTo || null,
      due: t.dueDate ? t.dueDate.split('T')[0] : (t.due || ''),
      estimatedHours: t.estimatedTime ? t.estimatedTime / 3600 : (t.estimatedHours || 0),
      timeSpent: t.timeSpent || 0,
      logs: t.logs || [],
      status: normaliseStatus(t.status),
      priority: t.priority || 'medium',
    }));
    return db.tasks;
  } catch (err) {
    console.error('loadTasks failed', err);
    toast('Unable to load tasks from server', 'error');
    return [];
  }
}

// ═══════════════════════ UPDATE TASK (shared helper) ═══════════════════════
async function apiUpdateTask(taskId, payload) {
  const res = await apiFetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new Error(d?.message || `Server error ${res.status}`);
  }
  return res.json();
}
