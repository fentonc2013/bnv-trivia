// ============================================================
// MUSIC TRIVIA — ADMIN APP
// ============================================================

const A = {
  view:      'password',  // password | main
  tab:       'control',   // control | scoring | leaderboard
  game:      null,
  players:   {},
  answers:   {},          // { 'r1_q0': { playerId: answerText, ... } }
  markings:  {},          // local: { playerId: true/false } for current question
  scoringApplied: false,  // prevent double-apply
};

let db, gameRef, playersRef, answersRef;

// --- Helpers ---
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function hashStr(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast${type !== 'info' ? ' ' + type : ''}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

function render() {
  document.getElementById('root').innerHTML = A.view === 'password' ? buildPassword() : buildMain();
}

function roundQuestions(round) {
  if (!A.game) return [];
  const ids = round === 1 ? A.game.r1Questions : A.game.r2Questions;
  if (ids) return ids.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
  return QUESTIONS.filter(q => q.round === round); // fallback for legacy game state
}

function currentQuestion() {
  if (!A.game) return null;
  const rqs = roundQuestions(A.game.round);
  return rqs[A.game.questionIndex] || null;
}

function currentKey() {
  if (!A.game) return null;
  return `r${A.game.round}_q${A.game.questionIndex}`;
}

function sortedPlayers() {
  return Object.entries(A.players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a,b) => b.score - a.score);
}

// --- Auth ---
async function adminLogin() {
  const val  = document.getElementById('admin-pw').value;
  const errEl = document.getElementById('admin-err');
  errEl.textContent = '';
  if (!val) { errEl.textContent = 'Enter the admin password.'; return; }

  const h1 = await hashStr(val);
  const h2 = await hashStr(ADMIN_PASSWORD);
  if (h1 !== h2) { errEl.textContent = 'Incorrect password.'; return; }

  sessionStorage.setItem('triviaAdmin', 'true');
  A.view = 'main';
  render();
  initFirebase();
}

// --- Firebase ---
function initFirebase() {
  if (firebase.apps.length === 0) firebase.initializeApp(FIREBASE_CONFIG);
  db         = firebase.database();
  gameRef    = db.ref('trivia/game');
  playersRef = db.ref('trivia/players');
  answersRef = db.ref('trivia/answers');

  gameRef.on('value', snap => {
    const prevKey = currentKey();
    A.game = snap.val();
    const newKey = currentKey();
    if (newKey !== prevKey) {
      A.markings = {};
      A.scoringApplied = false;
      // Load answers for new question
      if (newKey) loadAnswers(newKey);
    }
    render();
  });

  playersRef.on('value', snap => {
    A.players = snap.val() || {};
    render();
  });

  answersRef.on('value', snap => {
    A.answers = snap.val() || {};
    render();
  });
}

function loadAnswers(key) {
  db.ref(`trivia/answers/${key}`).once('value').then(snap => {
    if (!A.answers) A.answers = {};
    A.answers[key] = snap.val() || {};
    render();
  });
}

// --- Game Controls ---
async function resetGame() {
  if (!confirm('Reset the entire game? This clears all players, answers, and scores.')) return;
  const order = generateQuestionOrder();
  await db.ref('trivia').set({
    game: {
      state: 'lobby', round: 1, questionIndex: 0, questionEndTime: 0,
      r1Questions: order.r1,
      r2Questions: order.r2,
    },
    players: null,
    answers: null,
    scoring: null,
  });
  A.markings = {};
  A.scoringApplied = false;
  toast('Game reset. Players can now join.', 'success');
}

async function startRound(round) {
  await gameRef.update({ state: 'lobby', round, questionIndex: 0 });
  toast(`Round ${round} lobby open. Press "Open Question 1" when ready.`);
}

async function openQuestion() {
  if (!A.game) return;
  const qIdx    = A.game.questionIndex; // capture so stale timers don't close future questions
  const endTime = Date.now() + QUESTION_TIME_SECONDS * 1000;
  await gameRef.update({
    state: 'question_active',
    questionEndTime: endTime,
  });

  // Auto-close after timer (admin can also close manually)
  setTimeout(async () => {
    const snap = await gameRef.once('value');
    const g = snap.val();
    if (g && g.state === 'question_active' && g.questionIndex === qIdx) {
      await gameRef.update({ state: 'question_closed' });
    }
  }, QUESTION_TIME_SECONDS * 1000 + 2000);

  toast('Question opened — timer running!');
}

async function closeQuestion() {
  await gameRef.update({ state: 'question_closed' });
  toast('Question closed. Switch to Scoring tab.');
}

async function applyScores() {
  if (A.scoringApplied) { toast('Scores already applied for this question.'); return; }
  const q   = currentQuestion();
  const key = currentKey();
  if (!q || !key) return;

  const updates = {};
  const round = A.game.round;
  const roundKey = `round${round}Score`;

  for (const [pid, correct] of Object.entries(A.markings)) {
    if (correct) {
      const p = A.players[pid];
      if (!p) continue;
      const newScore = (p.score || 0) + q.points;
      const newRound = (p[roundKey] || 0) + q.points;
      updates[`${pid}/score`]    = newScore;
      updates[`${pid}/${roundKey}`] = newRound;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref('trivia/players').update(updates);
  }

  // Save scoring record
  await db.ref(`trivia/scoring/${key}`).set(A.markings);

  A.scoringApplied = true;
  toast('Scores applied! Showing results to players…', 'success');
  await gameRef.update({ state: 'question_results' });
  setTimeout(() => nextQuestion(), 7000);
}

async function nextQuestion() {
  if (!A.game) return;
  const rqs    = roundQuestions(A.game.round);
  const nextIdx = A.game.questionIndex + 1;

  if (nextIdx < rqs.length) {
    await gameRef.update({
      state: 'question_active',
      questionIndex: nextIdx,
      questionEndTime: Date.now() + QUESTION_TIME_SECONDS * 1000,
    });
    A.markings = {};
    A.scoringApplied = false;
    toast(`Question ${nextIdx + 1} opened.`);

    setTimeout(async () => {
      const snap = await gameRef.once('value');
      const g = snap.val();
      if (g && g.state === 'question_active' && g.questionIndex === nextIdx) {
        await gameRef.update({ state: 'question_closed' });
      }
    }, QUESTION_TIME_SECONDS * 1000 + 2000);
  } else {
    await gameRef.update({ state: 'round_end' });
    toast(`Round ${A.game.round} complete! Leaderboard shown to players.`);
  }
}

async function endGame() {
  if (!confirm('End the game and show final scores to all players?')) return;
  await gameRef.update({ state: 'game_end' });
  toast('Game over! Final scores displayed.', 'success');
}

// --- Local marking ---
function markAnswer(playerId, correct) {
  A.markings[playerId] = correct;
  // Update just the answer row
  const row = document.getElementById(`answer-row-${playerId}`);
  if (row) {
    row.className = `answer-row ${correct ? 'marked-correct' : 'marked-incorrect'}`;
    row.querySelectorAll('.mark-btn').forEach(btn => btn.className = 'mark-btn');
    const btns = row.querySelectorAll('.mark-btn');
    if (btns[0]) btns[0].className = `mark-btn ${correct ? 'correct' : ''}`;
    if (btns[1]) btns[1].className = `mark-btn ${!correct ? 'incorrect' : ''}`;
  }
  // Update apply button state
  updateApplyBtn();
}

function updateApplyBtn() {
  const btn = document.getElementById('apply-scores-btn');
  if (!btn) return;
  const key = currentKey();
  const answers = (A.answers[key] || {});
  const totalAnswers = Object.keys(answers).length;
  const marked = Object.keys(A.markings).length;
  btn.textContent = `Apply Scores (${marked}/${totalAnswers} marked)`;
  btn.disabled = A.scoringApplied || marked === 0;
}

function setTab(tab) {
  A.tab = tab;
  render();
}

// --- View builders ---
function buildPassword() {
  return `
    <div class="screen">
      <div class="card gold-border" style="max-width:360px">
        <div class="auth-logo">🎛️</div>
        <div class="auth-title">Admin Panel</div>
        <div class="auth-subtitle">${esc(GAME_NAME)}</div>
        <div class="form-group">
          <label class="form-label">Admin Password</label>
          <input class="form-input" id="admin-pw" type="password" placeholder="Password"
            onkeydown="if(event.key==='Enter') adminLogin()" autocomplete="off">
        </div>
        <div class="form-error" id="admin-err"></div>
        <button class="btn btn-gold mt-8" onclick="adminLogin()">Enter Admin Panel</button>
      </div>
    </div>`;
}

function buildMain() {
  const g     = A.game;
  const state = g?.state || 'lobby';
  const round = g?.round || 1;
  const qIdx  = g?.questionIndex ?? 0;
  const rqs   = roundQuestions(round);
  const q     = currentQuestion();
  const key   = currentKey();

  return `
    <div class="admin-layout">
      <div class="app-header">
        <div class="app-logo">🎵</div>
        <div>
          <div class="app-title">${esc(GAME_NAME)} — Admin</div>
          <div class="app-subtitle">Round ${round} · ${stateLabel(state)}</div>
        </div>
        <div style="margin-left:auto">
          <span class="state-badge${state === 'question_active' ? ' active' : ''}">${stateLabel(state)}</span>
        </div>
      </div>

      <div class="admin-content">

        <div class="admin-tabs">
          <button class="admin-tab${A.tab==='control'?' active':''}"    onclick="setTab('control')">🎮 Control</button>
          <button class="admin-tab${A.tab==='scoring'?' active':''}"    onclick="setTab('scoring')">✏️ Scoring</button>
          <button class="admin-tab${A.tab==='leaderboard'?' active':''}" onclick="setTab('leaderboard')">🏆 Scores</button>
        </div>

        ${A.tab === 'control'    ? buildControlTab(g, state, round, qIdx, rqs, q) : ''}
        ${A.tab === 'scoring'    ? buildScoringTab(q, key, state) : ''}
        ${A.tab === 'leaderboard' ? buildLeaderboardTab() : ''}

      </div>
    </div>`;
}

function stateLabel(state) {
  return {
    lobby:           'Lobby',
    question_active: 'Question Active',
    question_closed: 'Question Closed',
    scoring:         'Scoring',
    round_end:       'Round End',
    game_end:        'Game Over',
  }[state] || state;
}

function buildControlTab(g, state, round, qIdx, rqs, q) {
  const playerCount = Object.keys(A.players).length;
  const answerCount = g ? Object.keys((A.answers[currentKey()] || {})).length : 0;

  return `
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-value">${playerCount}</div>
        <div class="stat-label">Players</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">R${round} Q${qIdx+1}/${rqs.length}</div>
        <div class="stat-label">Progress</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${answerCount}</div>
        <div class="stat-label">Answers In</div>
      </div>
    </div>

    ${q ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Current Question</div>
        <p style="font-size:16px;line-height:1.5;margin-bottom:8px">${esc(q.question)}</p>
        <p class="text-sm" style="color:var(--gold)">✓ Answer: ${esc(q.answer)}</p>
      </div>` : ''}

    <div class="card">
      <div class="card-title">Game Controls</div>

      ${state === 'lobby' && round === 1 ? `
        <button class="btn btn-gold" onclick="startRound(1)">▶ Start Round 1</button>` : ''}

      ${state === 'lobby' && round === 2 ? `
        <button class="btn btn-gold" onclick="startRound(2)">▶ Start Round 2</button>` : ''}

      ${state === 'lobby' && g ? `
        <p class="text-muted text-sm mt-16 text-center">Waiting for players to join…</p>
        ${playerCount > 0 ? `<button class="btn btn-gold mt-16" onclick="openQuestion()">▶ Open Question ${qIdx+1}</button>` : ''}` : ''}

      ${state === 'question_active' ? `
        <p class="text-muted text-sm mb-16">Question is live — <strong>${answerCount}</strong> of <strong>${playerCount}</strong> players have answered.</p>
        <button class="btn btn-outline" onclick="closeQuestion()">⏹ Close Question Early</button>` : ''}

      ${state === 'question_closed' ? `
        <p class="text-muted text-sm mb-16"><strong>${answerCount}</strong> answers received.</p>
        ${answerCount > 0
          ? `<button class="btn btn-gold" onclick="setTab('scoring')">✏️ Score Answers →</button>`
          : `<button class="btn btn-gold" onclick="nextQuestion()">→ Skip &amp; Next Question / End Round</button>`}` : ''}

      ${state === 'scoring' ? `
        <button class="btn btn-gold" onclick="setTab('scoring')">✏️ Go to Scoring Tab</button>` : ''}

      ${state === 'question_results' ? `
        <p class="text-muted text-sm text-center">Showing results to players… next question opens automatically.</p>` : ''}

      ${state === 'round_end' ? `
        ${round < 2
          ? `<button class="btn btn-gold" onclick="startRound(2)">▶ Start Round 2</button>`
          : `<button class="btn btn-gold" onclick="endGame()">🏁 End Game & Show Final Scores</button>`}` : ''}

      ${state === 'game_end' ? `
        <p class="text-center text-gold" style="font-size:18px;font-weight:700">🎉 Game Over!</p>` : ''}

      <hr style="border-color:var(--border);margin:16px 0">
      <button class="btn btn-outline" onclick="resetGame()">🔄 Reset / New Game</button>
    </div>

    <div class="card mt-16">
      <div class="card-title">Player List</div>
      <div class="player-list">
        ${Object.values(A.players).sort((a,b)=>a.joinedAt-b.joinedAt).map(p => `
          <div class="player-item">
            <div class="player-dot"></div>
            <div class="player-name-text">${esc(p.name)}</div>
            <div class="player-score-badge">${p.score} pts</div>
          </div>`).join('')}
        ${playerCount === 0 ? '<p class="text-muted text-sm text-center">No players yet</p>' : ''}
      </div>
    </div>`;
}

function buildScoringTab(q, key, state) {
  if (!q) return '<div class="card"><p class="text-muted text-center">No active question.</p></div>';

  const answers = key ? (A.answers[key] || {}) : {};
  const playerIds = Object.keys(answers);

  return `
    <div class="card mb-16">
      <div class="card-title">Question</div>
      <p style="font-size:15px;line-height:1.5;margin-bottom:12px">${esc(q.question)}</p>
      <div class="correct-answer-ref">
        <strong>Reference Answer:</strong> ${esc(q.answer)}
        <span style="color:var(--text-muted);font-size:12px"> · Accept reasonable variations</span>
      </div>
    </div>

    ${playerIds.length === 0
      ? `<div class="card">
           <p style="text-align:center;color:var(--text-muted);padding:16px 0">No answers submitted for this question.</p>
           <button class="btn btn-gold" onclick="nextQuestion()">→ Skip &amp; Next Question / End Round</button>
         </div>`
      : `<div style="margin-bottom:16px">
          ${playerIds.map(pid => {
            const p = A.players[pid];
            const name = p ? p.name : pid;
            const ans  = answers[pid];
            const mark = A.markings[pid];
            const rowClass = mark === true ? 'marked-correct' : mark === false ? 'marked-incorrect' : '';
            return `
              <div class="answer-row ${rowClass}" id="answer-row-${pid}">
                <div class="answer-info">
                  <div class="answer-player">${esc(name)}</div>
                  <div class="answer-text">${esc(ans)}</div>
                </div>
                <div class="answer-actions">
                  <button class="mark-btn ${mark===true?'correct':''}" onclick="markAnswer('${pid}', true)"  title="Correct">✓</button>
                  <button class="mark-btn ${mark===false?'incorrect':''}" onclick="markAnswer('${pid}', false)" title="Wrong">✗</button>
                </div>
              </div>`;
          }).join('')}
        </div>
        <button class="btn btn-gold" id="apply-scores-btn"
          onclick="applyScores()"
          ${A.scoringApplied || Object.keys(A.markings).length === 0 ? 'disabled' : ''}>
          Apply Scores (${Object.keys(A.markings).length}/${playerIds.length} marked)
        </button>
        <p class="text-muted text-sm text-center mt-8">Players not marked get 0. Scores apply and game advances automatically.</p>`}
  `;
}

function buildLeaderboardTab() {
  const sorted = sortedPlayers();
  const round  = A.game?.round || 1;

  return `
    <div class="card">
      <div class="card-title">Leaderboard — After Round ${round}</div>
      <div class="leaderboard">
        ${sorted.map((p, i) => `
          <div class="leaderboard-row rank-${i+1}">
            <div class="rank-badge">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</div>
            <div class="leaderboard-name">${esc(p.name)}</div>
            <div>
              <div class="leaderboard-score">${p.score}</div>
              <div class="score-breakdown">R1: ${p.round1Score||0} · R2: ${p.round2Score||0}</div>
            </div>
          </div>`).join('')}
        ${sorted.length === 0 ? '<p class="text-muted text-center">No scores yet</p>' : ''}
      </div>
    </div>`;
}

// --- Boot ---
window.onload = function() {
  if (sessionStorage.getItem('triviaAdmin') === 'true') {
    A.view = 'main';
    render();
    initFirebase();
  } else {
    render();
  }
};
