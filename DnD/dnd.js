// =============================================================================
// CONSTANTS
// =============================================================================

const DIE_SIZES = [4, 6, 8, 10, 12, 20];

// localStorage key names for each data store
const KEYS = {
  players:    'dnd_players',
  characters: 'dnd_characters',
  sessions:   'dnd_sessions',
  rolls:      'dnd_rolls'
};

const DEFAULT_PLAYER    = 'DM';
const DEFAULT_CHARACTER = 'DM';

// =============================================================================
// STORAGE HELPERS
// Read/write arrays to localStorage as JSON. storageGet returns [] on miss.
// =============================================================================

function storageGet(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// =============================================================================
// DATA INITIALIZATION
// Ensures the default "DM" player and "DM" character always exist.
// Runs on app start; safe to call multiple times (idempotent).
// =============================================================================

function initDefaults() {
  const players = storageGet(KEYS.players);
  if (!players.includes(DEFAULT_PLAYER)) {
    players.unshift(DEFAULT_PLAYER);
    storageSet(KEYS.players, players);
  }
  const characters = storageGet(KEYS.characters);
  const dmExists = characters.some(c => c.name === DEFAULT_CHARACTER && c.player === DEFAULT_PLAYER);
  if (!dmExists) {
    characters.unshift({ name: DEFAULT_CHARACTER, player: DEFAULT_PLAYER });
    storageSet(KEYS.characters, characters);
  }
}

// =============================================================================
// PLAYERS
// Players are real people (Casey, Zac, DM). They are the root of the
// Player → Characters tree.
// =============================================================================

function getPlayers() {
  return storageGet(KEYS.players);
}

// Adds a new player by real name. Returns false if the name is blank or
// already exists.
function addPlayer(name) {
  name = name.trim();
  if (!name) return false;
  const players = getPlayers();
  if (players.includes(name)) return false;
  players.push(name);
  storageSet(KEYS.players, players);
  return true;
}

// =============================================================================
// CHARACTERS
// Characters are the "leaves" under a Player. Each entry is { name, player }.
// Important NPCs also live here under the "DM" player.
// The "DM" character is the catch-all for unimportant or unassigned rolls.
// =============================================================================

function getCharacters() {
  return storageGet(KEYS.characters);
}

// Returns only characters whose player field matches playerName.
function getCharactersByPlayer(playerName) {
  return getCharacters().filter(c => c.player === playerName);
}

// Adds a character under a given player. Returns false on blank name or
// duplicate (same name + same player).
function addCharacter(name, playerName) {
  name = name.trim();
  if (!name || !playerName) return false;
  const characters = getCharacters();
  if (characters.some(c => c.name === name && c.player === playerName)) return false;
  characters.push({ name, player: playerName });
  storageSet(KEYS.characters, characters);
  return true;
}

// =============================================================================
// SESSIONS
// A session object: { arcName, arcSession, absoluteSession, displayName, date }
//   arcName:         the name of the current story arc (e.g. "Throat Cave")
//   arcSession:      which session this is within that arc (auto-counted)
//   absoluteSession: the campaign-wide session counter (auto-counted)
//   displayName:     the rendered label, e.g. "Throat Cave 2, Session 4"
//   date:            locale date string at time of creation
// =============================================================================

function getSessions() {
  return storageGet(KEYS.sessions);
}

// Returns the last session in the list (most recently created), or null.
function getMostRecentSession() {
  const sessions = getSessions();
  return sessions.length ? sessions[sessions.length - 1] : null;
}

// Creates a new session for the given arc name. Arc and absolute session numbers
// are computed automatically from existing session history.
function createSession(arcName) {
  arcName = arcName.trim();
  const sessions  = getSessions();
  const absoluteSession = sessions.length + 1;
  const arcSession      = sessions.filter(s => s.arcName === arcName).length + 1;
  const displayName     = `${arcName} ${arcSession}, Session ${absoluteSession}`;
  const session = { arcName, arcSession, absoluteSession, displayName, date: new Date().toLocaleDateString() };
  sessions.push(session);
  storageSet(KEYS.sessions, sessions);
  return session;
}

// =============================================================================
// ROLLS  (the source of truth)
// Each entry: { player, character, session, dSize, result, timestamp }
//   player    — real name (e.g. "Casey")
//   character — character name (e.g. "Aria")
//   session   — session displayName string (used as the join key)
//   dSize     — integer die face count (4, 6, 8, 10, 12, or 20)
//   result    — integer result of the roll (1 – dSize)
//   timestamp — ISO string, used for ordering and future audit use
// All aggregate stats are computed from this array; nothing is cached.
// =============================================================================

function getRolls() {
  return storageGet(KEYS.rolls);
}

// Appends one roll record to the log and persists immediately.
function addRoll(player, character, session, dSize, result) {
  const rolls = getRolls();
  rolls.push({ player, character, session, dSize, result, timestamp: new Date().toISOString() });
  storageSet(KEYS.rolls, rolls);
}

function getRollsForSession(sessionName) {
  return getRolls().filter(r => r.session === sessionName);
}

function getRollsForCharacter(characterName) {
  return getRolls().filter(r => r.character === characterName);
}

function getRollsForPlayer(playerName) {
  return getRolls().filter(r => r.player === playerName);
}

// Returns all rolls whose session displayName is in the provided array.
// Used for the "aggregate specific sessions" feature.
function getRollsForSessions(sessionNames) {
  const nameSet = new Set(sessionNames);
  return getRolls().filter(r => nameSet.has(r.session));
}

// =============================================================================
// STATS COMPUTATION
// Given a set of roll objects and a target die size, produces:
//   counts  — array[dSize] where counts[i] = number of times face (i+1) was rolled
//   total   — total rolls of this die in the set
//   mean    — average result, rounded to 2 decimal places
//   modes   — array of face values tied for most-rolled (plural handles ties)
// Returns zeroed-out stats when no rolls exist for that die.
// =============================================================================

function computeStats(rolls, dSize) {
  const filtered = rolls.filter(r => r.dSize === dSize);
  const counts   = new Array(dSize).fill(0);

  for (const r of filtered) {
    counts[r.result - 1]++;
  }

  const total = filtered.length;
  if (total === 0) return { counts, total, mean: 0, modes: [] };

  // Mean: weighted sum of (face value × count), divided by total rolls
  const sum  = counts.reduce((acc, count, i) => acc + count * (i + 1), 0);
  const mean = Math.round((sum / total) * 100) / 100;

  // Mode: find all face values tied for the highest roll count
  const maxCount = Math.max(...counts);
  const modes    = counts
    .map((count, i) => ({ count, face: i + 1 }))
    .filter(({ count }) => count === maxCount && maxCount > 0)
    .map(({ face }) => face);

  return { counts, total, mean, modes };
}

// =============================================================================
// BAR CHART RENDERER  (HTML5 Canvas)
// Draws a frequency histogram for one die type onto the given canvas element.
// Bars represent how often each face value was rolled.
// The tallest bar (the mode) is drawn in the accent blue; others use a muted blue.
// X-axis labels show each face value; Y-axis shows count range (0 → max).
// =============================================================================

function renderBarChart(canvas, counts, dSize) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const pad      = { top: 16, right: 10, bottom: 28, left: 30 };
  const chartW   = W - pad.left - pad.right;
  const chartH   = H - pad.top - pad.bottom;
  const maxCount = Math.max(...counts, 1);
  const barW     = chartW / dSize;

  counts.forEach((count, i) => {
    const barH = (count / maxCount) * chartH;
    const x    = pad.left + i * barW;
    const y    = pad.top + chartH - barH;

    // Highlight the mode bar; mute all others
    ctx.fillStyle = (count === maxCount && count > 0) ? '#4a6fa5' : '#2e4a6e';
    ctx.fillRect(x + 2, y, barW - 4, barH);

    // Face value label along X-axis
    ctx.fillStyle   = '#7a7a9a';
    ctx.font        = '10px Segoe UI, Arial';
    ctx.textAlign   = 'center';
    ctx.fillText(String(i + 1), x + barW / 2, H - pad.bottom + 13);
  });

  // Y-axis boundary labels (0 at bottom, max at top)
  ctx.fillStyle  = '#7a7a9a';
  ctx.font       = '10px Segoe UI, Arial';
  ctx.textAlign  = 'right';
  ctx.fillText(maxCount, pad.left - 4, pad.top + 8);
  ctx.fillText('0',      pad.left - 4, pad.top + chartH);
}

// =============================================================================
// APP STATE
// Central mutable state object. All view renderers read from this; all event
// handlers write to it and then call the appropriate re-render function.
// =============================================================================

const state = {
  currentSession:    null,             // the active session object
  selectedDieSize:   20,               // die size shown in roll panel and stats
  selectedPlayer:    DEFAULT_PLAYER,
  selectedCharacter: DEFAULT_CHARACTER,
  previousPlayer:    null,             // set on every player change; enables "previous" button
  previousCharacter: null,
  statsFilter:       'session'         // 'session' | 'character'
};

// =============================================================================
// VIEW MANAGEMENT
// All views are siblings in the DOM; only one is visible at a time.
// viewId must match a DOM element with id="view-{viewId}".
// =============================================================================

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + viewId).classList.remove('hidden');
}

// =============================================================================
// HOME VIEW
// Enables or disables the "Continue" button based on whether sessions exist,
// and fills in the most recent session name if so.
// =============================================================================

function renderHome() {
  const recent      = getMostRecentSession();
  const continueBtn = document.getElementById('btn-continue');
  continueBtn.disabled    = !recent;
  continueBtn.textContent = recent ? `Continue: ${recent.displayName}` : 'No Sessions Yet';
  showView('home');
}

// =============================================================================
// NEW SESSION VIEW
// Populates the arc name <datalist> with previously used arc names so the
// browser can autocomplete repeat arcs.
// =============================================================================

function renderNewSession() {
  const arcNames = [...new Set(getSessions().map(s => s.arcName))];
  const datalist  = document.getElementById('arc-suggestions');
  datalist.innerHTML = arcNames.map(a => `<option value="${a}">`).join('');
  showView('new-session');
}

// =============================================================================
// SESSION VIEW
// Full session screen. Rebuilds the player/character dropdowns from storage,
// highlights the currently selected die, and draws the initial stats chart.
// =============================================================================

function renderSession(session) {
  state.currentSession = session;
  document.getElementById('session-title').textContent = session.displayName;
  document.getElementById('session-date').textContent  = session.date;
  populatePlayerDropdown();
  populateCharacterDropdown();
  highlightDieButton(state.selectedDieSize);
  document.getElementById('roll-value').max = state.selectedDieSize;
  document.getElementById('stats-die-label').textContent     = state.selectedDieSize;
  updateChart();
  showView('session');
}

// Rebuilds the player <select> from storage, preserving the current selection.
function populatePlayerDropdown() {
  const sel = document.getElementById('select-player');
  sel.innerHTML = getPlayers().map(p =>
    `<option value="${p}" ${p === state.selectedPlayer ? 'selected' : ''}>${p}</option>`
  ).join('');
}

// Rebuilds the character <select> filtered to only the currently selected player.
// If the previously selected character is no longer in the list, falls back to
// the first character available for that player.
function populateCharacterDropdown() {
  const chars = getCharactersByPlayer(state.selectedPlayer);
  const sel   = document.getElementById('select-character');
  sel.innerHTML = chars.map(c =>
    `<option value="${c.name}" ${c.name === state.selectedCharacter ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  if (!chars.find(c => c.name === state.selectedCharacter)) {
    state.selectedCharacter = chars[0]?.name ?? DEFAULT_CHARACTER;
  }
}

// Moves the 'selected' class to the button for the given die size.
function highlightDieButton(dSize) {
  DIE_SIZES.forEach(d => {
    document.getElementById(`die-btn-${d}`)?.classList.toggle('selected', d === dSize);
  });
}

// Reads current state, fetches the appropriate roll set, computes stats for
// the selected die, and redraws the chart and summary text.
function updateChart() {
  const rolls = state.statsFilter === 'character'
    ? getRollsForCharacter(state.selectedCharacter)
    : getRollsForSession(state.currentSession.displayName);

  const stats  = computeStats(rolls, state.selectedDieSize);
  const canvas = document.getElementById('stats-chart');
  renderBarChart(canvas, stats.counts, state.selectedDieSize);

  document.getElementById('stats-summary').textContent = stats.total === 0
    ? 'No rolls yet for this die.'
    : `${stats.total} rolls — Mean: ${stats.mean} — Mode: ${stats.modes.join(', ')}`;
}

// =============================================================================
// ROSTER VIEW
// =============================================================================

function renderRoster() {
  populateRosterPlayerDropdown();
  renderRosterLists();
  showView('roster');
}

function populateRosterPlayerDropdown() {
  const sel = document.getElementById('roster-char-player');
  sel.innerHTML = getPlayers().map(p => `<option value="${p}">${p}</option>`).join('');
}

// Redraws the player list and character list in the roster view.
function renderRosterLists() {
  document.getElementById('roster-player-list').innerHTML =
    getPlayers().map(p => `<li>${p}</li>`).join('');

  document.getElementById('roster-char-list').innerHTML =
    getCharacters().map(c => `<li><strong>${c.name}</strong> — ${c.player}</li>`).join('');
}

// =============================================================================
// LOAD SESSION VIEW
// Shows sessions newest-first. Each row is a button; clicking it opens that
// session immediately.
// =============================================================================

function renderLoadSession() {
  const list     = document.getElementById('session-list');
  const sessions = getSessions().slice().reverse();

  list.innerHTML = sessions.map(s =>
    `<li>
       <button class="session-load-btn" data-name="${s.displayName}">
         ${s.displayName} <span class="session-date-tag">${s.date}</span>
       </button>
     </li>`
  ).join('');

  // Wire each row button after injecting HTML
  list.querySelectorAll('.session-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const session = getSessions().find(s => s.displayName === btn.dataset.name);
      if (session) renderSession(session);
    });
  });

  showView('load');
}

// =============================================================================
// OVERVIEW VIEW
// Each session gets a checkbox. After the user picks sessions and a die size,
// "View Selected" merges their rolls and renders an aggregated bar chart.
// =============================================================================

function renderOverview() {
  const sessions = getSessions().slice().reverse();
  document.getElementById('overview-session-list').innerHTML = sessions.map(s =>
    `<li>
       <label>
         <input type="checkbox" class="overview-check" value="${s.displayName}">
         ${s.displayName} <span class="session-date-tag">${s.date}</span>
       </label>
     </li>`
  ).join('');

  // Highlight the correct die button for the current state
  DIE_SIZES.forEach(d => {
    document.getElementById(`overview-die-btn-${d}`)?.classList.toggle('selected', d === state.selectedDieSize);
  });
  document.getElementById('overview-die-label').textContent = state.selectedDieSize;
  document.getElementById('overview-stats-panel').classList.add('hidden');
  showView('overview');
}

// =============================================================================
// EVENT WIRING
// All DOM event listeners are attached here, called once during init.
// =============================================================================

function wireEvents() {

  // --- Home ---
  document.getElementById('btn-continue').addEventListener('click', () => {
    const recent = getMostRecentSession();
    if (recent) renderSession(recent);
  });
  document.getElementById('btn-new-session').addEventListener('click', renderNewSession);
  document.getElementById('btn-load-session').addEventListener('click', renderLoadSession);
  document.getElementById('btn-overview').addEventListener('click', renderOverview);
  document.getElementById('btn-roster').addEventListener('click', renderRoster);

  // --- Back buttons (any element with .btn-back-home returns to home) ---
  document.querySelectorAll('.btn-back-home').forEach(btn => {
    btn.addEventListener('click', renderHome);
  });

  // --- New session form ---
  document.getElementById('new-session-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('arc-name-input');
    const name  = input.value.trim();
    if (!name) return;
    const session = createSession(name);
    input.value = '';
    renderSession(session);
  });

  // --- Player selector: save previous selection before switching ---
  document.getElementById('select-player').addEventListener('change', e => {
    state.previousPlayer    = state.selectedPlayer;
    state.previousCharacter = state.selectedCharacter;
    state.selectedPlayer    = e.target.value;
    // Default to the first character under the newly selected player
    const chars = getCharactersByPlayer(state.selectedPlayer);
    state.selectedCharacter = chars[0]?.name ?? DEFAULT_CHARACTER;
    populateCharacterDropdown();
    updateChart();
  });

  document.getElementById('select-character').addEventListener('change', e => {
    state.selectedCharacter = e.target.value;
    updateChart();
  });

  // Swaps current and previous player/character so the DM can quickly toggle
  // between the last two selectors without using the dropdowns.
  document.getElementById('btn-prev-player').addEventListener('click', () => {
    if (!state.previousPlayer) return;
    [state.selectedPlayer,    state.previousPlayer]    = [state.previousPlayer,    state.selectedPlayer];
    [state.selectedCharacter, state.previousCharacter] = [state.previousCharacter, state.selectedCharacter];
    populatePlayerDropdown();
    populateCharacterDropdown();
    updateChart();
  });

  // --- Die size buttons in session view ---
  // Selecting a die updates the state, highlights the button, clamps the roll
  // input to the new valid range, and refreshes the stats chart.
  DIE_SIZES.forEach(d => {
    document.getElementById(`die-btn-${d}`).addEventListener('click', () => {
      state.selectedDieSize = d;
      highlightDieButton(d);
      document.getElementById('stats-die-label').textContent = d;
      const input = document.getElementById('roll-value');
      input.max   = d;
      if (parseInt(input.value) > d) input.value = '';
      updateChart();
    });
  });

  // Fills the number input with a random result in [1, selectedDieSize].
  // Does NOT record or submit the roll — user must click Confirm.
  document.getElementById('btn-random').addEventListener('click', () => {
    const result = Math.floor(Math.random() * state.selectedDieSize) + 1;
    document.getElementById('roll-value').value = result;
  });

  // Validates the input value, writes the roll to localStorage, updates the
  // last-roll display, clears the input, and refreshes the chart.
  document.getElementById('btn-confirm-roll').addEventListener('click', () => {
    const input  = document.getElementById('roll-value');
    const result = parseInt(input.value);
    if (!result || result < 1 || result > state.selectedDieSize) {
      alert(`Enter a number between 1 and ${state.selectedDieSize}.`);
      return;
    }
    addRoll(state.selectedPlayer, state.selectedCharacter,
            state.currentSession.displayName, state.selectedDieSize, result);
    document.getElementById('last-roll-display').textContent =
      `Last: ${state.selectedCharacter} rolled ${result} on a d${state.selectedDieSize}`;
    input.value = '';
    updateChart();
  });

  // --- Stats filter toggle (session-wide vs. single-character) ---
  document.getElementById('stats-filter-session').addEventListener('click', () => {
    state.statsFilter = 'session';
    document.getElementById('stats-filter-session').classList.add('active');
    document.getElementById('stats-filter-character').classList.remove('active');
    updateChart();
  });
  document.getElementById('stats-filter-character').addEventListener('click', () => {
    state.statsFilter = 'character';
    document.getElementById('stats-filter-character').classList.add('active');
    document.getElementById('stats-filter-session').classList.remove('active');
    updateChart();
  });

  // --- Roster forms ---
  document.getElementById('add-player-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('new-player-name');
    if (!addPlayer(input.value)) { alert('Player already exists or name is empty.'); return; }
    input.value = '';
    renderRosterLists();
    populateRosterPlayerDropdown();
  });

  document.getElementById('add-char-form').addEventListener('submit', e => {
    e.preventDefault();
    const nameInput = document.getElementById('new-char-name');
    const playerSel = document.getElementById('roster-char-player');
    if (!addCharacter(nameInput.value, playerSel.value)) {
      alert('Character already exists under that player, or name is empty.');
      return;
    }
    nameInput.value = '';
    renderRosterLists();
  });

  // --- Overview: die size buttons ---
  // These share state.selectedDieSize with the session view so the die choice
  // is preserved when switching between views.
  DIE_SIZES.forEach(d => {
    document.getElementById(`overview-die-btn-${d}`)?.addEventListener('click', () => {
      state.selectedDieSize = d;
      document.querySelectorAll('.overview-die-btn').forEach(b => b.classList.remove('selected'));
      document.getElementById(`overview-die-btn-${d}`).classList.add('selected');
      document.getElementById('overview-die-label').textContent = d;
    });
  });

  // Gathers checked sessions, merges their rolls, and renders an aggregated chart.
  document.getElementById('btn-view-selected').addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.overview-check:checked')).map(cb => cb.value);
    if (!checked.length) { alert('Select at least one session.'); return; }

    const rolls  = getRollsForSessions(checked);
    const stats  = computeStats(rolls, state.selectedDieSize);
    const canvas = document.getElementById('overview-chart');
    renderBarChart(canvas, stats.counts, state.selectedDieSize);

    document.getElementById('overview-stats-summary').textContent = stats.total === 0
      ? 'No rolls for this die in the selected sessions.'
      : `${stats.total} rolls — Mean: ${stats.mean} — Mode: ${stats.modes.join(', ')}`;

    document.getElementById('overview-stats-panel').classList.remove('hidden');
  });
}

// =============================================================================
// INIT
// Entry point. Runs once when the DOM is ready.
// =============================================================================

function init() {
  initDefaults();
  wireEvents();
  renderHome();
}

document.addEventListener('DOMContentLoaded', init);
