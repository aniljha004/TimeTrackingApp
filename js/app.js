// ═══════════════════════ APP SETUP ═══════════════════════
function setupApp() {
  const u     = state.currentUser;
  const color = u.color || '#4fa3f5';
  const av    = document.getElementById('topbar-avatar');
  av.textContent       = initials(u.name);
  av.style.background  = color + '33';
  av.style.color       = color;
  av.style.fontFamily  = 'Syne, sans-serif';
  document.getElementById('topbar-username').textContent = u.name;

  const nav = document.getElementById('top-nav');
  if (u.role === 'admin') {
    nav.innerHTML = `
      <button class="nav-btn active" onclick="switchPage('admin-dash', this)">Dashboard</button>
      <button class="nav-btn" onclick="switchPage('admin-tasks', this)">Tasks & Users</button>
      <button class="nav-btn" onclick="switchPage('admin-reports', this)">Reports</button>`;
    renderPage('admin-dash');
  } else {
    nav.innerHTML = `
      <button class="nav-btn active" onclick="switchPage('dashboard', this)">Dashboard</button>
      <button class="nav-btn" onclick="switchPage('mytasks', this)">My Tasks</button>
      <button class="nav-btn" onclick="switchPage('timelog', this)">Time Log</button>`;
    renderPage('dashboard');
  }

  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimers, 1000);
}

// ═══════════════════════ PAGE ROUTING ═══════════════════════
async function switchPage(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('p-' + page).classList.add('active');
  if (btn) btn.classList.add('active');
  await Promise.all([loadUsers(), loadTasks()]);
  renderPage(page);
}

function renderPage(p) {
  if      (p === 'dashboard')     renderDashboard();
  else if (p === 'mytasks')       renderMyTasks();
  else if (p === 'timelog')       renderTimelog();
  else if (p === 'admin-dash')    renderAdminDash();
  else if (p === 'admin-tasks')   { renderAdminTasks(); renderAdminUsers(); }
  else if (p === 'admin-reports') renderAdminReports();
}

function renderCurrentPage() {
  const active = document.querySelector('.page.active');
  if (!active) return;
  renderPage(active.id.replace('p-', ''));
}

// ═══════════════════════ TIMERS ═══════════════════════
async function startTimer(taskId) {
  const task = getTask(taskId);
  if (!task || state.activeTimers[taskId]) return;
  state.activeTimers[taskId] = { startedAt: Date.now(), accumulated: 0 };
  task.status = 'in-progress';
  addActivity(state.currentUser.id, taskId, 'started timer');
  try {
    await apiUpdateTask(taskId, { status: 'in-progress' });
    toast(`Timer started for "${task.name}"`);
  } catch (err) {
    console.error('Failed to start timer', err);
    toast(`Failed to start timer: ${err.message}`, 'error');
  }
  renderCurrentPage();
}

async function pauseTimer(taskId) {
  const task  = getTask(taskId);
  const timer = state.activeTimers[taskId];
  if (!timer) return;
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
  task.timeSpent += elapsed;
  task.logs.push({ date: today(), duration: elapsed, note: 'Timer session' });
  delete state.activeTimers[taskId];
  task.status = 'hold';
  addActivity(state.currentUser.id, taskId, `logged ${fmtShort(elapsed)}`);
  try {
    await apiUpdateTask(taskId, { timeSpent: task.timeSpent, status: 'hold' });
    toast(`Timer paused — ${fmtShort(elapsed)} logged`);
  } catch (err) {
    console.error('Failed to save timer', err);
    toast(`Failed to save time: ${err.message}`, 'error');
  }
  renderCurrentPage();
}

async function setTaskStatus(taskId, newStatus) {
  const task = getTask(taskId);
  if (!task) return;
  // Stop timer inline if running and moving away from in-progress
  if (state.activeTimers[taskId] && newStatus !== 'in-progress') {
    const timer   = state.activeTimers[taskId];
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
    task.timeSpent += elapsed;
    task.logs.push({ date: today(), duration: elapsed, note: 'Timer session' });
    delete state.activeTimers[taskId];
    addActivity(state.currentUser.id, taskId, `logged ${fmtShort(elapsed)}`);
  }
  task.status = newStatus;
  addActivity(state.currentUser.id, taskId, `set to ${statusLabel(newStatus)}`);
  try {
    await apiUpdateTask(taskId, { status: newStatus, timeSpent: task.timeSpent });
    toast(`Status updated to "${statusLabel(newStatus)}"`);
  } catch (err) {
    console.error('Failed to update status', err);
    toast(`Failed to update status: ${err.message}`, 'error');
  }
  renderCurrentPage();
}

function tickTimers() {
  Object.keys(state.activeTimers).forEach(tid => {
    const els  = document.querySelectorAll(`[data-timer="${tid}"]`);
    const live = liveTime(tid);
    const task = getTask(tid);
    if (!task) return;
    const total = task.timeSpent + live;
    els.forEach(el => el.textContent = fmt(total));
  });
}

// ═══════════════════════ ADMIN TAB SWITCH ═══════════════════════
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('admin-tab-tasks').style.display = tab === 'tasks' ? 'block' : 'none';
  document.getElementById('admin-tab-users').style.display = tab === 'users' ? 'block' : 'none';
}
