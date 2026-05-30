// ═══════════════════════ USER DASHBOARD ═══════════════════════
function renderDashboard() {
  const u     = state.currentUser;
  const tasks = userTasks(u.id);
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${u.name.split(' ')[0]} 👋`;

  const inProg   = tasks.filter(t => t.status === 'in-progress').length;
  const done     = tasks.filter(t => t.status === 'done').length;
  const total    = tasks.length;
  const totalSec = tasks.reduce((a, t) => a + t.timeSpent, 0);

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accent-bg)">📋</div>
      <div class="stat-val" style="color:var(--accent)">${total}</div>
      <div class="stat-lbl">Total Tasks</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--amber-bg)">⚡</div>
      <div class="stat-val" style="color:var(--amber)">${inProg}</div>
      <div class="stat-lbl">In Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--green-bg)">✅</div>
      <div class="stat-val" style="color:var(--green)">${done}</div>
      <div class="stat-lbl">Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--blue-bg)">⏱</div>
      <div class="stat-val" style="color:var(--blue)">${Math.floor(totalSec / 3600)}h</div>
      <div class="stat-lbl">Time Tracked</div>
    </div>`;

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const activeEl    = document.getElementById('user-active-tasks');
  activeEl.innerHTML = activeTasks.length
    ? activeTasks.slice(0, 4).map(renderMiniTaskCard).join('')
    : `<div class="empty"><div class="empty-icon">🎉</div><div>All tasks complete!</div></div>`;

  const todayLogs = [];
  tasks.forEach(t => t.logs.filter(l => l.date === today()).forEach(l => todayLogs.push({ task: t, log: l })));
  const logEl = document.getElementById('time-log-today');
  logEl.innerHTML = todayLogs.length
    ? todayLogs.map(({ task, log }) => `
        <div class="time-log-entry">
          <div class="log-dot" style="background:${priorityColor(task.priority)}"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--text)">${task.name}</div>
            <div class="text-sm text-muted">${log.note}</div>
          </div>
          <div class="mono text-sm" style="color:var(--text2)">${fmtShort(log.duration)}</div>
        </div>`).join('')
    : `<div class="text-muted text-sm" style="padding:16px 0">No time logged today yet. Start a timer!</div>`;
}

function renderMiniTaskCard(t) {
  const running  = !!state.activeTimers[t.id];
  const totalSec = t.timeSpent + (running ? liveTime(t.id) : 0);
  return `
    <div class="task-card ${t.status === 'in-progress' ? 'in-progress' : t.status === 'hold' ? 'hold' : t.status === 'review' ? 'review' : ''}">
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        <div class="task-meta">
          ${statusBadge(t.status)}
          <span class="chip pri-${t.priority}">${t.priority}</span>
        </div>
      </div>
      <div class="task-time ${running ? 'pulse text-amber' : ''}" data-timer="${running ? t.id : ''}">${fmt(totalSec)}</div>
      <div class="task-actions">
        ${t.status === 'done' ? '' : running
          ? `<button class="btn btn-ghost btn-sm" onclick="pauseTimer('${t.id}')" title="Pause">⏸</button>`
          : `<button class="btn btn-success btn-sm" onclick="startTimer('${t.id}')" title="Start">▶</button>`}
      </div>
    </div>`;
}

// ═══════════════════════ MY TASKS ═══════════════════════
function renderMyTasks() {
  const u  = state.currentUser;
  let tasks = userTasks(u.id);
  const sf  = document.getElementById('filter-status')?.value;
  const pf  = document.getElementById('filter-priority')?.value;
  if (sf) tasks = tasks.filter(t => t.status === sf);
  if (pf) tasks = tasks.filter(t => t.priority === pf);

  const el = document.getElementById('my-tasks-list');
  if (!tasks.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div>No tasks found</div></div>`;
    return;
  }

  el.innerHTML = tasks.map(t => {
    const running  = !!state.activeTimers[t.id];
    const totalSec = t.timeSpent + (running ? liveTime(t.id) : 0);
    const estSec   = (t.estimatedHours || 0) * 3600;
    const pct      = estSec ? Math.min(100, Math.round(totalSec / estSec * 100)) : 0;
    return `
    <div class="task-card ${t.status==='in-progress'?'in-progress':t.status==='done'?'done':t.status==='hold'?'hold':t.status==='review'?'review':''}">
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        <div class="task-desc">${t.desc}</div>
        <div class="task-meta" style="margin-bottom:8px">
          ${statusBadge(t.status)}
          <span class="chip pri-${t.priority}">${t.priority}</span>
          ${t.due ? `<span class="text-sm text-muted">Due: ${t.due}</span>` : ''}
          ${t.estimatedHours ? `<span class="text-sm text-muted">Est: ${t.estimatedHours}h</span>` : ''}
        </div>
        ${estSec ? `<div class="progress-bar" style="width:200px"><div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>60?'var(--amber)':'var(--accent)'}"></div></div>` : ''}
      </div>
      <div>
        <div class="task-time ${running ? 'pulse' : 'text-muted'}" style="${running ? 'color:var(--amber)' : ''}" data-timer="${running ? t.id : ''}">${fmt(totalSec)}</div>
        <div class="text-sm text-muted mono" style="margin-top:2px">${estSec ? pct + '% of ' + t.estimatedHours + 'h' : ''}</div>
      </div>
      <div class="task-actions" style="flex-direction:column;gap:6px;min-width:130px;">
        ${t.status === 'done'
          ? `<span class="text-sm text-muted" style="padding:4px 0">Completed ✓</span>`
          : `<select class="status-select status-${t.status}" onchange="setTaskStatus('${t.id}', this.value)" title="Change status">
               <option value="todo"        ${t.status==='todo'?'selected':''}>📋 To Do</option>
               <option value="in-progress" ${t.status==='in-progress'?'selected':''}>⚡ In Progress</option>
               <option value="hold"        ${t.status==='hold'?'selected':''}>⏸ On Hold</option>
               <option value="review"      ${t.status==='review'?'selected':''}>🔍 In Review</option>
               <option value="done"        ${t.status==='done'?'selected':''}>✅ Done</option>
             </select>
             <div style="display:flex;gap:6px;">
               ${running
                 ? `<button class="btn btn-ghost btn-sm" onclick="pauseTimer('${t.id}')" title="Pause timer">⏸</button>`
                 : `<button class="btn btn-success btn-sm" onclick="startTimer('${t.id}')" title="Start timer">▶</button>`}
               <button class="btn btn-ghost btn-sm" onclick="openManualTime('${t.id}')" title="Log time">+ Log</button>
             </div>`
        }
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════ TIME LOG ═══════════════════════
function renderTimelog() {
  const tasks   = userTasks(state.currentUser.id);
  const allLogs = [];
  tasks.forEach(t => t.logs.forEach(l => allLogs.push({ task: t, log: l })));
  allLogs.sort((a, b) => b.log.date.localeCompare(a.log.date));

  const totalSec = allLogs.reduce((a, { log }) => a + log.duration, 0);
  document.getElementById('total-logged').textContent = 'Total: ' + fmtShort(totalSec);

  const tbody = document.getElementById('timelog-body');
  if (!allLogs.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text3)">No time logged yet</td></tr>`;
    return;
  }
  tbody.innerHTML = allLogs.map(({ task, log }) => `
    <tr>
      <td><div style="font-weight:500;color:var(--text)">${task.name}</div><div class="text-sm text-muted">${log.note || '—'}</div></td>
      <td>${log.date}</td>
      <td><span class="mono">${fmtShort(log.duration)}</span></td>
      <td>${statusBadge(task.status)}</td>
    </tr>`).join('');
}
