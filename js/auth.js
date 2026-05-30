// ═══════════════════════ LOGIN ═══════════════════════
async function doLogin() {
  const email  = document.getElementById('login-email').value.trim();
  const pass   = document.getElementById('login-pass').value.trim();
  const errEl  = document.getElementById('login-err');
  errEl.style.display = 'none';

  if (!email || !pass) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await apiFetch(`${API_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      errEl.textContent = data?.message || 'Invalid credentials. Please try again.';
      errEl.style.display = 'block';
      return;
    }
    state.currentUser = { ...data, id: data._id || data.id };
    AUTH_TOKEN = data.token; // store JWT for all subsequent requests
    await loadUsers();
    await loadTasks();
    errEl.style.display = 'none';
    switchView('v-app');
    setupApp();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Login failed. Please try again.';
    errEl.style.display = 'block';
  }
}

// ═══════════════════════ LOGOUT ═══════════════════════
function doLogout() {
  // Flush any running timers to hold status
  Object.keys(state.activeTimers).forEach(tid => {
    const task = getTask(tid);
    if (task) {
      const elapsed = Math.floor((Date.now() - state.activeTimers[tid].startedAt) / 1000);
      task.timeSpent += elapsed;
      task.status = 'hold';
    }
  });
  state.activeTimers = {};
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.currentUser   = null;
  AUTH_TOKEN          = ''; // clear token on logout
  switchView('v-login');
}
