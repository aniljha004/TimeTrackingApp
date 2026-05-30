// ═══════════════════════ ADMIN DASHBOARD ═══════════════════════
function renderAdminDash() {
  const users    = db.users.filter(u => u.role === 'user');
  const tasks    = db.tasks;
  const inProg   = tasks.filter(t => t.status === 'in-progress').length;
  const done     = tasks.filter(t => t.status === 'done').length;
  const totalSec = tasks.reduce((a, t) => a + t.timeSpent, 0);

  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accent-bg)">👥</div>
      <div class="stat-val" style="color:var(--accent)">${users.length}</div>
      <div class="stat-lbl">Active Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--blue-bg)">📋</div>
      <div class="stat-val" style="color:var(--blue)">${tasks.length}</div>
      <div class="stat-lbl">Total Tasks</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--amber-bg)">⚡</div>
      <div class="stat-val" style="color:var(--amber)">${inProg}</div>
      <div class="stat-lbl">In Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--green-bg)">⏱</div>
      <div class="stat-val" style="color:var(--green)">${Math.round(totalSec / 3600)}h</div>
      <div class="stat-lbl">Hours Tracked</div>
    </div>`;

  document.getElementById('admin-activity').innerHTML = db.activity.slice(0, 8).map(a => {
    const u = getUser(a.userId), t = getTask(a.taskId);
    return `<tr>
      <td><span class="avatar" style="display:inline-flex;width:24px;height:24px;font-size:10px;background:${u?.color+'33'};color:${u?.color}">${initials(u?.name||'?')}</span> <span style="color:var(--text)">${u?.name||'?'}</span></td>
      <td>${t?.name||'?'}</td>
      <td>${a.action}</td>
      <td class="text-muted">${a.time}</td>
    </tr>`;
  }).join('');

  const statuses = ['todo','in-progress','hold','review','done'];
  const labels   = { 'todo':'To Do','in-progress':'In Progress','hold':'On Hold','review':'In Review','done':'Done' };
  const colors   = { 'todo':'var(--text3)','in-progress':'var(--amber)','hold':'var(--blue)','review':'#a78bfa','done':'var(--green)' };
  const counts   = Object.fromEntries(statuses.map(s => [s, tasks.filter(t => t.status === s).length]));
  const max      = Math.max(...Object.values(counts), 1);
  document.getElementById('admin-status-chart').innerHTML = statuses.map(s => `
    <div style="margin-bottom:14px">
      <div class="flex-center gap-8 mb-4">
        <div style="font-size:13px;color:var(--text2);width:90px">${labels[s]}</div>
        <div style="flex:1;background:var(--bg4);border-radius:3px;height:8px;overflow:hidden">
          <div style="height:100%;width:${Math.round(counts[s]/max*100)}%;background:${colors[s]};border-radius:3px;transition:width 0.6s"></div>
        </div>
        <div class="mono text-sm" style="color:${colors[s]};width:20px;text-align:right">${counts[s]}</div>
      </div>
    </div>`).join('');
}

// ═══════════════════════ ADMIN TASKS TABLE ═══════════════════════
function renderAdminTasks() {
  const tbody = document.getElementById('admin-tasks-body');
  tbody.innerHTML = db.tasks.map(t => {
    const u = getUser(t.assignedTo);
    return `<tr>
      <td>
        <div style="font-weight:500;color:var(--text)">${t.name}</div>
        <div class="text-sm text-muted">${t.desc.slice(0,50)}${t.desc.length>50?'...':''}</div>
      </td>
      <td>
        <div class="flex-center gap-8">
          <div class="avatar" style="width:24px;height:24px;font-size:10px;background:${u?.color+'33'};color:${u?.color}">${initials(u?.name||'?')}</div>
          ${u?.name||'Unassigned'}
        </div>
      </td>
      <td><span class="pri-${t.priority}">${t.priority.toUpperCase()}</span></td>
      <td>${statusBadge(t.status)}</td>
      <td><span class="mono">${fmtShort(t.timeSpent)}</span></td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="openTaskModal('${t.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ═══════════════════════ ADMIN USERS TABLE ═══════════════════════
function renderAdminUsers() {
  const tbody = document.getElementById('admin-users-body');
  tbody.innerHTML = db.users.map(u => {
    const tasks    = userTasks(u.id);
    const totalSec = tasks.reduce((a, t) => a + t.timeSpent, 0);
    return `<tr>
      <td>
        <div class="flex-center gap-8">
          <div class="avatar" style="width:32px;height:32px;font-size:12px;background:${u.color+'33'};color:${u.color}">${initials(u.name)}</div>
          <div>
            <div style="font-weight:500;color:var(--text)">${u.name}</div>
            <div class="text-sm text-muted">${u.id}</div>
          </div>
        </div>
      </td>
      <td>${u.email}</td>
      <td>${u.role==='admin'?`<span class="badge badge-admin">Admin</span>`:`<span class="badge badge-user">User</span>`}</td>
      <td>${tasks.length}</td>
      <td><span class="mono">${fmtShort(totalSec)}</span></td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="openUserModal('${u.id}')">Edit</button>
          ${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Del</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ═══════════════════════ ADMIN REPORTS ═══════════════════════
function renderAdminReports() {
  const users = db.users.filter(u => u.role === 'user');
  const el    = document.getElementById('admin-reports-content');

  const timeByUser = users.map(u => {
    const tasks  = userTasks(u.id);
    const sec    = tasks.reduce((a, t) => a + t.timeSpent, 0);
    const maxSec = Math.max(...users.map(uu => userTasks(uu.id).reduce((a, t) => a + t.timeSpent, 0)), 1);
    return `<div style="margin-bottom:16px">
      <div class="flex-center gap-8 mb-4">
        <div class="avatar" style="width:24px;height:24px;font-size:10px;background:${u.color+'33'};color:${u.color}">${initials(u.name)}</div>
        <div style="font-size:13px;color:var(--text2);flex:1">${u.name}</div>
        <div class="mono text-sm" style="color:var(--text2)">${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(sec/maxSec*100)}%;background:${u.color}"></div></div>
    </div>`;
  }).join('');

  const completionRate = users.map(u => {
    const tasks = userTasks(u.id);
    const done  = tasks.filter(t => t.status === 'done').length;
    const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    return `<div style="margin-bottom:16px">
      <div class="flex-center gap-8 mb-4">
        <div style="font-size:13px;color:var(--text2);flex:1">${u.name}</div>
        <div class="mono text-sm" style="color:var(--green)">${pct}%</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--green)"></div></div>
    </div>`;
  }).join('');

  const taskRows = db.tasks.map(t => {
    const u    = getUser(t.assignedTo);
    const est  = (t.estimatedHours || 0) * 3600;
    const diff = t.timeSpent - est;
    return `<tr>
      <td style="color:var(--text);font-weight:500">${t.name}</td>
      <td>${u?.name||'—'}</td>
      <td>${statusBadge(t.status)}</td>
      <td><span class="pri-${t.priority}">${t.priority}</span></td>
      <td class="mono">${t.estimatedHours ? t.estimatedHours+'h' : '—'}</td>
      <td class="mono">${fmtShort(t.timeSpent)}</td>
      <td class="mono" style="color:${diff>0?'var(--red)':diff<0?'var(--green)':'var(--text3)'}">
        ${est ? `${diff>0?'+':''}${fmtShort(Math.abs(diff))}${diff===0?' on track':''}` : '—'}
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="grid-2 mb-24">
      <div class="table-wrap">
        <div class="table-header"><div class="table-title">Time by User</div></div>
        <div style="padding:16px">${timeByUser}</div>
      </div>
      <div class="table-wrap">
        <div class="table-header"><div class="table-title">Task Completion Rate</div></div>
        <div style="padding:16px">${completionRate}</div>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><div class="table-title">Task Details Report</div></div>
      <table>
        <thead><tr><th>Task</th><th>Assigned</th><th>Status</th><th>Priority</th><th>Estimated</th><th>Tracked</th><th>Variance</th></tr></thead>
        <tbody>${taskRows}</tbody>
      </table>
    </div>`;
}
