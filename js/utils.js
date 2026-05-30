// ═══════════════════════ FORMATTERS ═══════════════════════
function fmt(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtShort(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
  return `${m}m`;
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function genId() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ═══════════════════════ TOAST ═══════════════════════
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  el.className = `toast show toast-${type}`;
  document.getElementById('toast-icon').style.color =
    type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--amber)';
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ═══════════════════════ DB LOOKUPS ═══════════════════════
function getUser(id)     { return db.users.find(u => u.id === id); }
function getTask(id)     { return db.tasks.find(t => t.id === id); }
function userTasks(uid)  { return db.tasks.filter(t => t.assignedTo === uid); }

function liveTime(taskId) {
  const timer = state.activeTimers[taskId];
  if (!timer) return null;
  return Math.floor((Date.now() - timer.startedAt) / 1000) + (timer.accumulated || 0);
}

function addActivity(userId, taskId, action) {
  db.activity.unshift({ userId, taskId, action, time: 'Just now' });
  if (db.activity.length > 20) db.activity.pop();
}

// ═══════════════════════ BADGE / LABEL HELPERS ═══════════════════════
function statusBadge(s) {
  const map    = { 'todo':'badge-todo','in-progress':'badge-progress','hold':'badge-hold','review':'badge-review','done':'badge-done' };
  const labels = { 'todo':'To Do','in-progress':'In Progress','hold':'On Hold','review':'In Review','done':'Done' };
  const dots   = { 'todo':'⬜','in-progress':'🟡','hold':'🔵','review':'🟣','done':'🟢' };
  return `<span class="badge ${map[s] || 'badge-todo'}">${dots[s] || '⬜'} ${labels[s] || s}</span>`;
}

function statusLabel(s) {
  return { 'todo':'To Do','in-progress':'In Progress','hold':'On Hold','review':'In Review','done':'Done' }[s] || s;
}

function priorityColor(p) {
  return p === 'high' ? 'var(--red)' : p === 'medium' ? 'var(--amber)' : 'var(--green)';
}

// ═══════════════════════ COLOUR HELPERS ═══════════════════════
function stringToColor(str) {
  const palette = ['#4fa3f5','#7c6af7','#3dd68c','#f5a623','#f04f5a','#a78bfa','#34d399','#fb923c'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function normaliseStatus(s) {
  if (!s) return 'todo';
  if (s === 'completed') return 'done';
  if (s === 'paused') return 'hold';
  return s;
}

// ═══════════════════════ VIEW SWITCH ═══════════════════════
function switchView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════ MODAL HELPERS ═══════════════════════
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
});
