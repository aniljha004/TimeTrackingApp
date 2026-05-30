// ═══════════════════════ API CONFIG ═══════════════════════
const API_BASE = 'https://timeflow-app-production.up.railway.app/api';

// JWT token — set after login, sent as Authorization: Bearer <token>
let AUTH_TOKEN = '';

// ═══════════════════════ STATE ═══════════════════════
let state = {
  currentUser: null,
  editingTaskId: null,
  editingUserId: null,
  manualTimeTaskId: null,
  activeTimers: {},
  timerInterval: null,
};

// ═══════════════════════ IN-MEMORY DB ═══════════════════════
let db = {
  users: [],
  tasks: [],
  activity: [],
};
