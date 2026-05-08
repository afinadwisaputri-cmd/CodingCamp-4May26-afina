/* ============================================================
   LIFE DASHBOARD — script.js
   Vanilla JS only | Local Storage | No frameworks
   ============================================================ */

'use strict';

/* ============================================================
   SECTION 1 — UTILITIES
   ============================================================ */

/**
 * Retrieve a value from Local Storage (parsed JSON).
 * Returns `fallback` if the key is missing or JSON is invalid.
 */
function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Persist a value to Local Storage as JSON. */
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Generate a simple unique ID. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Escape HTML to prevent XSS when inserting user text. */
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/** Show a temporary message in an element, then clear it. */
function flashMsg(el, msg, durationMs = 2500) {
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; }, durationMs);
}

/* ============================================================
   SECTION 2 — THEME TOGGLE (Challenge #1)
   ============================================================ */

const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon      = document.getElementById('themeIcon');
const htmlEl         = document.documentElement;

const THEME_KEY = 'ld_theme';

function applyTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
  lsSet(THEME_KEY, theme);
}

function initTheme() {
  const saved = lsGet(THEME_KEY, null);
  // Respect OS preference if no saved preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

themeToggleBtn.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

initTheme();

/* ============================================================
   SECTION 3 — CLOCK, DATE & GREETING
   ============================================================ */

const clockEl    = document.getElementById('clock');
const dateEl     = document.getElementById('dateDisplay');
const greetingEl = document.getElementById('greeting');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function getGreeting(hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function pad2(n) { return String(n).padStart(2, '0'); }

function updateClock() {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();
  const s    = now.getSeconds();

  clockEl.textContent    = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  greetingEl.textContent = getGreeting(h);

  const day   = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date  = now.getDate();
  const year  = now.getFullYear();
  dateEl.textContent = `${day}, ${month} ${date}, ${year}`;
}

updateClock();
setInterval(updateClock, 1000);

/* ============================================================
   SECTION 4 — CUSTOM USER NAME (Challenge #3)
   ============================================================ */

const userNameEl  = document.getElementById('userName');
const nameInput   = document.getElementById('nameInput');
const saveNameBtn = document.getElementById('saveNameBtn');

const NAME_KEY = 'ld_username';

function loadUserName() {
  const saved = lsGet(NAME_KEY, '');
  if (saved) {
    userNameEl.textContent = saved;
    nameInput.value = saved;
  }
}

saveNameBtn.addEventListener('click', saveName);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveName();
});

function saveName() {
  const val = nameInput.value.trim();
  if (!val) return;
  userNameEl.textContent = val;
  lsSet(NAME_KEY, val);
  nameInput.blur();
}

loadUserName();

/* ============================================================
   SECTION 5 — POMODORO FOCUS TIMER
   ============================================================ */

const timerDisplay  = document.getElementById('timerDisplay');
const timerLabel    = document.getElementById('timerLabel');
const startBtn      = document.getElementById('startBtn');
const stopBtn       = document.getElementById('stopBtn');
const resetBtn      = document.getElementById('resetBtn');
const presetBtns    = document.querySelectorAll('.btn-preset');

let timerInterval   = null;
let totalSeconds    = 25 * 60;   // default 25 min
let remainingSeconds = totalSeconds;
let timerRunning    = false;

const TIMER_LABELS = {
  25: 'Pomodoro Session',
  15: 'Short Focus',
  5:  'Quick Break',
};

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(remainingSeconds);

  if (timerRunning) {
    timerDisplay.classList.add('running');
    timerDisplay.classList.remove('finished');
  } else if (remainingSeconds === 0) {
    timerDisplay.classList.add('finished');
    timerDisplay.classList.remove('running');
  } else {
    timerDisplay.classList.remove('running', 'finished');
  }
}

function startTimer() {
  if (timerRunning) return;
  if (remainingSeconds === 0) return;

  timerRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled  = false;

  timerInterval = setInterval(() => {
    remainingSeconds--;
    renderTimer();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      startBtn.disabled = false;
      stopBtn.disabled  = true;
      timerLabel.textContent = '✓ Session complete!';
      // Browser notification if permitted
      notifyTimerDone();
    }
  }, 1000);

  renderTimer();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled  = true;
  renderTimer();
}

function resetTimer() {
  stopTimer();
  remainingSeconds = totalSeconds;
  const mins = totalSeconds / 60;
  timerLabel.textContent = TIMER_LABELS[mins] || 'Focus Session';
  renderTimer();
}

function setPreset(minutes) {
  totalSeconds = minutes * 60;
  resetTimer();
  presetBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes) === minutes);
  });
}

function notifyTimerDone() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Life Dashboard', { body: 'Focus session complete! Take a break.' });
  }
}

// Request notification permission on first start
startBtn.addEventListener('click', () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  startTimer();
});

stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => setPreset(parseInt(btn.dataset.minutes)));
});

renderTimer();

/* ============================================================
   SECTION 6 — TO-DO LIST
   ============================================================ */

const taskInput        = document.getElementById('taskInput');
const addTaskBtn       = document.getElementById('addTaskBtn');
const taskList         = document.getElementById('taskList');
const duplicateMsg     = document.getElementById('duplicateMsg');
const taskCountEl      = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterBtns       = document.querySelectorAll('.filter-btn');

const TASKS_KEY = 'ld_tasks';

let tasks       = lsGet(TASKS_KEY, []);   // Array of { id, text, completed }
let activeFilter = 'all';

/* ---- Persistence ---- */
function saveTasks() {
  lsSet(TASKS_KEY, tasks);
}

/* ---- Duplicate check (Challenge #2) ---- */
function isDuplicate(text, excludeId = null) {
  const normalized = text.trim().toLowerCase();
  return tasks.some(t => t.id !== excludeId && t.text.toLowerCase() === normalized);
}

/* ---- Add Task ---- */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  if (isDuplicate(text)) {
    flashMsg(duplicateMsg, '⚠ Task already exists!');
    taskInput.focus();
    return;
  }

  tasks.unshift({ id: uid(), text, completed: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
  taskInput.focus();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

/* ---- Toggle Complete ---- */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

/* ---- Delete Task ---- */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

/* ---- Edit Task (modal) ---- */
const editModal       = document.getElementById('editModal');
const editTaskInput   = document.getElementById('editTaskInput');
const saveEditBtn     = document.getElementById('saveEditBtn');
const cancelEditBtn   = document.getElementById('cancelEditBtn');
const editDupMsg      = document.getElementById('editDuplicateMsg');

let editingTaskId = null;

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  editTaskInput.value = task.text;
  editDupMsg.textContent = '';
  editModal.hidden = false;
  editTaskInput.focus();
  editTaskInput.select();
}

function closeEditModal() {
  editModal.hidden = true;
  editingTaskId = null;
}

function saveEdit() {
  const newText = editTaskInput.value.trim();
  if (!newText) return;

  if (isDuplicate(newText, editingTaskId)) {
    flashMsg(editDupMsg, '⚠ A task with this name already exists!');
    return;
  }

  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.text = newText;
    saveTasks();
    renderTasks();
  }
  closeEditModal();
}

saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', closeEditModal);
editTaskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeEditModal();
});
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

/* ---- Filters ---- */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
  });
});

/* ---- Clear Completed ---- */
clearCompletedBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
});

/* ---- Render ---- */
function getFilteredTasks() {
  if (activeFilter === 'active')    return tasks.filter(t => !t.completed);
  if (activeFilter === 'completed') return tasks.filter(t => t.completed);
  return tasks;
}

function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    const icon = activeFilter === 'completed' ? '🎉' : '📋';
    const msg  = activeFilter === 'completed'
      ? 'No completed tasks yet.'
      : activeFilter === 'active'
        ? 'All tasks done!'
        : 'No tasks yet. Add one above!';
    li.innerHTML = `<span class="empty-icon">${icon}</span>${escHtml(msg)}`;
    taskList.appendChild(li);
  } else {
    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      li.innerHTML = `
        <input
          type="checkbox"
          class="task-checkbox"
          aria-label="Mark task complete"
          ${task.completed ? 'checked' : ''}
        />
        <span class="task-text">${escHtml(task.text)}</span>
        <div class="task-actions">
          <button class="task-btn edit-btn" title="Edit task" aria-label="Edit task">✎</button>
          <button class="task-btn delete-btn" title="Delete task" aria-label="Delete task">✕</button>
        </div>
      `;

      // Checkbox
      li.querySelector('.task-checkbox').addEventListener('change', () => toggleTask(task.id));
      // Edit
      li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task.id));
      // Delete
      li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

      taskList.appendChild(li);
    });
  }

  // Update count (always based on active tasks, not filtered view)
  const activeCount = tasks.filter(t => !t.completed).length;
  taskCountEl.textContent = `${activeCount} task${activeCount !== 1 ? 's' : ''} left`;
}

renderTasks();

/* ============================================================
   SECTION 7 — QUICK LINKS
   ============================================================ */

const linkNameInput = document.getElementById('linkNameInput');
const linkUrlInput  = document.getElementById('linkUrlInput');
const addLinkBtn    = document.getElementById('addLinkBtn');
const linkGrid      = document.getElementById('linkGrid');
const linkError     = document.getElementById('linkError');

const LINKS_KEY = 'ld_links';

let links = lsGet(LINKS_KEY, []);   // Array of { id, label, url }

function saveLinks() {
  lsSet(LINKS_KEY, links);
}

function normalizeUrl(url) {
  url = url.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getFaviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return '';
  }
}

function addLink() {
  const label = linkNameInput.value.trim();
  const rawUrl = linkUrlInput.value.trim();

  if (!label) {
    flashMsg(linkError, '⚠ Please enter a label.');
    linkNameInput.focus();
    return;
  }

  const url = normalizeUrl(rawUrl);
  if (!url || !isValidUrl(url)) {
    flashMsg(linkError, '⚠ Please enter a valid URL.');
    linkUrlInput.focus();
    return;
  }

  links.push({ id: uid(), label, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

addLinkBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addLink();
});
linkNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addLink();
});

function renderLinks() {
  linkGrid.innerHTML = '';

  if (links.length === 0) {
    linkGrid.innerHTML = '<p class="links-empty">No links yet. Add your favorites above!</p>';
    return;
  }

  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'link-item';
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.setAttribute('aria-label', `Open ${escHtml(link.label)}`);

    const faviconSrc = getFaviconUrl(link.url);

    a.innerHTML = `
      <img
        class="link-favicon"
        src="${escHtml(faviconSrc)}"
        alt=""
        onerror="this.style.display='none'"
        aria-hidden="true"
      />
      <span class="link-label">${escHtml(link.label)}</span>
      <button
        class="link-delete-btn"
        title="Remove link"
        aria-label="Remove ${escHtml(link.label)}"
      >✕</button>
    `;

    // Delete button — stop propagation so the link doesn't open
    a.querySelector('.link-delete-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteLink(link.id);
    });

    linkGrid.appendChild(a);
  });
}

renderLinks();
