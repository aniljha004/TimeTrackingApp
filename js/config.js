// ═══════════════════════ API CONFIG ═══════════════════════
const API_BASE = 'https://timeflow-app-production.up.railway.app/api';

// API key — read from <meta name="x-api-key"> injected by the server,
// or fall back to the VITE/window global for local dev.
const _metaKey = document.querySelector('meta[name="x-api-key"]')?.content;
const API_KEY  = _metaKey && _metaKey !== '__API_KEY__' ? _metaKey : '';

// ═══════════════════════ STATE ═══════════════════════
let state = {
  currentUser: null,
  editingTaskId: null,
  editingUserId: null,
  manualTimeTaskId: null,
  activeTimers: {},   // taskId -> { startedAt, accumulated }
  timerInterval: null,
};

// ═══════════════════════ IN-MEMORY DB ═══════════════════════
let db = {
  users: [],
  tasks: [],
  activity: [],
};
