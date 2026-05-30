// ═══════════════════════ TASK MODAL ═══════════════════════
function openTaskModal(taskId) {
  state.editingTaskId = taskId || null;
  const task = taskId ? getTask(taskId) : null;
  document.getElementById('task-modal-title').textContent = task ? 'Edit Task' : 'Create New Task';

  const assignSel = document.getElementById('t-assign');
  assignSel.innerHTML = db.users
    .filter(u => u.role === 'user')
    .map(u => `<option value="${u.id}">${u.name}</option>`)
    .join('');

  if (task) {
    document.getElementById('t-name').value     = task.name;
    document.getElementById('t-desc').value     = task.desc;
    document.getElementById('t-assign').value   = task.assignedTo;
    document.getElementById('t-priority').value = task.priority;
    document.getElementById('t-due').value      = task.due || '';
    document.getElementById('t-est').value      = task.estimatedHours || '';
  } else {
    document.getElementById('t-name').value     = '';
    document.getElementById('t-desc').value     = '';
    document.getElementById('t-priority').value = 'medium';
    document.getElementById('t-due').value      = '';
    document.getElementById('t-est').value      = '';
  }
  openModal('modal-task');
}

function saveTask() {
  const name = document.getElementById('t-name').value.trim();
  if (!name) { toast('Task name is required', 'error'); return; }

  const data = {
    title:         name,
    description:   document.getElementById('t-desc').value.trim(),
    userId:        document.getElementById('t-assign').value,
    priority:      document.getElementById('t-priority').value,
    dueDate:       document.getElementById('t-due').value || null,
    estimatedTime: (parseFloat(document.getElementById('t-est').value) || 0) * 3600,
  };

  const isUpdate = Boolean(state.editingTaskId);
  const url      = isUpdate ? `${API_BASE}/tasks/${state.editingTaskId}` : `${API_BASE}/tasks`;
  const method   = isUpdate ? 'PUT' : 'POST';

  apiFetch(url, { method, body: JSON.stringify(data) })
    .then(async res => {
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Failed to save task');
      }
      return res.json();
    })
    .then(async () => {
      await loadTasks();
      toast(isUpdate ? 'Task updated successfully' : 'Task created and assigned!');
      closeModal('modal-task');
      renderAdminTasks();
    })
    .catch(err => { toast(err.message || 'Failed to save task', 'error'); console.error(err); });
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  apiFetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
    .then(async res => {
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Failed to delete task');
      }
      return res.json();
    })
    .then(async () => {
      await loadTasks();
      toast('Task deleted');
      renderAdminTasks();
    })
    .catch(err => { toast(err.message || 'Failed to delete task', 'error'); console.error(err); });
}

// ═══════════════════════ USER MODAL ═══════════════════════
function openUserModal(userId) {
  const user = userId ? getUser(userId) : null;
  document.getElementById('user-modal-title').textContent = user ? 'Edit User' : 'Add New User';
  state.editingUserId = userId || null;
  if (user) {
    document.getElementById('u-name').value  = user.name;
    document.getElementById('u-email').value = user.email;
    document.getElementById('u-role').value  = user.role;
    document.getElementById('u-pass').value  = '';
  } else {
    document.getElementById('u-name').value  = '';
    document.getElementById('u-email').value = '';
    document.getElementById('u-role').value  = 'user';
    document.getElementById('u-pass').value  = '';
  }
  openModal('modal-user');
}

function saveUser() {
  const name     = document.getElementById('u-name').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const role     = document.getElementById('u-role').value;
  const password = document.getElementById('u-pass').value.trim();
  if (!name || !email) { toast('Name and email required', 'error'); return; }

  const payload = { name, email, role };
  if (password) payload.password = password;

  const isUpdate = Boolean(state.editingUserId);
  const url      = isUpdate ? `${API_BASE}/users/${state.editingUserId}` : `${API_BASE}/users`;
  const method   = isUpdate ? 'PUT' : 'POST';

  apiFetch(url, { method, body: JSON.stringify(payload) })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try { message = JSON.parse(text).message || text; } catch { /* ignore */ }
        throw new Error(message || 'Failed to save user');
      }
      return res.json();
    })
    .then(async () => {
      await loadUsers();
      toast(isUpdate ? 'User updated successfully' : 'User added successfully');
      renderAdminUsers();
      closeModal('modal-user');
    })
    .catch(err => { toast(err.message || 'Failed to save user', 'error'); console.error(err); });
}

function deleteUser(id) {
  if (!confirm('Delete this user? Their tasks will be unassigned.')) return;
  apiFetch(`${API_BASE}/users/${id}`, { method: 'DELETE' })
    .then(async res => {
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Failed to delete user');
      }
      return res.json();
    })
    .then(async () => {
      db.tasks.forEach(t => { if (t.assignedTo === id) t.assignedTo = null; });
      await loadUsers();
      toast('User deleted');
      renderAdminUsers();
    })
    .catch(err => { toast(err.message || 'Failed to delete user', 'error'); console.error(err); });
}

// ═══════════════════════ MANUAL TIME MODAL ═══════════════════════
function openManualTime(taskId) {
  state.manualTimeTaskId = taskId;
  document.getElementById('mt-hours').value    = '';
  document.getElementById('mt-mins').value     = '';
  document.getElementById('mt-note').value     = '';
  document.getElementById('mt-preview').innerHTML = '';
  const task = getTask(taskId);
  document.getElementById('mt-task-name').textContent = task ? task.name : '';
  openModal('modal-time');
}

function setQuickTime(h, m) {
  document.getElementById('mt-hours').value = h || '';
  document.getElementById('mt-mins').value  = m || '';
  updateTimePreview();
}

function updateTimePreview() {
  const h    = parseInt(document.getElementById('mt-hours').value) || 0;
  const m    = parseInt(document.getElementById('mt-mins').value)  || 0;
  const prev = document.getElementById('mt-preview');
  if (h === 0 && m === 0) { prev.innerHTML = ''; return; }
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  prev.innerHTML = `<span style="color:var(--accent);font-family:'DM Mono',monospace;font-weight:500;font-size:14px;">⏱ ${parts.join(' ')}</span><span style="color:var(--text3)"> will be logged</span>`;
}

function saveManualTime() {
  const h   = parseInt(document.getElementById('mt-hours').value) || 0;
  const m   = parseInt(document.getElementById('mt-mins').value)  || 0;
  const sec = (h * 3600) + (m * 60);
  if (sec <= 0) { toast('Please enter a valid duration', 'error'); return; }

  const task = getTask(state.manualTimeTaskId);
  task.timeSpent += sec;
  task.logs.push({ date: today(), duration: sec, note: document.getElementById('mt-note').value || 'Manual entry' });
  addActivity(state.currentUser.id, task.id, `manually logged ${fmtShort(sec)}`);

  apiFetch(`${API_BASE}/tasks/${task.id}`, {
    method: 'PUT',
    body: JSON.stringify({ timeSpent: task.timeSpent }),
  }).catch(err => console.error('Failed to save manual time', err));

  toast(`Logged ${fmtShort(sec)} for "${task.name}"`);
  closeModal('modal-time');
  renderCurrentPage();
}
