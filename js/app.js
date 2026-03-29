// ============================================================
// MUSIC TRIVIA — PLAYER APP
// ============================================================

// --- State ---
const S = {
  view:       'password',   // password | join | lobby | question | submitted | roundEnd | gameEnd
  playerId:   null,
  playerName: null,
  game:       null,         // live game object from Firebase
  players:    {},           // all players
  myAnswer:   null,         // submitted answer for current question key
  timerInterval: null,
  prevQuestionKey: null,    // detect when question changes
};

// --- Firebase ---
let db, gameRef, playersRef, answersRef;

// --- Helpers ---
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
  document.getElementById('root').innerHTML = buildView();
}

function currentQuestion() {
  if (!S.game) return null;
  return QUESTIONS.find(q => q.round === S.game.round && QUESTIONS.filter(x => x.round === S.game.round).indexOf(q) === S.game.questionIndex) || null;
}

function roundQuestions(round) {
  return QUESTIONS.filter(q => q.round === round);
}

function currentQuestionKey() {
  if (!S.game) return null;
  return `r${S.game.round}_q${S.game.questionIndex}`;
}

// --- Password ---
async function submitPassword() {
  const val = document.getElementById('pw-input').value;
  const errEl = document.getElementById('pw-error');
  errEl.textContent = '';
  if (!val) { errEl.textContent = 'Enter the event password.'; return; }

  const inputHash  = await hashStr(val);
  const correctHash = await hashStr(PLAYER_PASSWORD);
  if (inputHash !== correctHash) {
    errEl.textContent = 'Incorrect password. Try again.';
    return;
  }

  localStorage.setItem('triviaAuth', 'true');
  S.view = S.playerName ? 'lobby' : 'join';
  render();
}

// --- Join ---
async function submitJoin() {
  const name = document.getElementById('name-input').value.trim();
  const errEl = document.getElementById('join-error');
  errEl.textContent = '';
  if (!name) { errEl.textContent = 'Enter your name.'; return; }
  if (name.length > 24) { errEl.textContent = 'Name too long (max 24 chars).'; return; }

  S.playerName = name;
  localStorage.setItem('triviaPlayerName', name);

  // Write player to Firebase
  await db.ref(`trivia/players/${S.playerId}`).set({
    name,
    score:       0,
    round1Score: 0,
    round2Score: 0,
    joinedAt:    Date.now(),
  });

  S.view = 'lobby';
  render();
}

// --- Answer submission ---
async function submitAnswer() {
  const input  = document.getElementById('answer-input');
  const answer = input ? input.value.trim() : '';
  if (!answer) { toast('Type your answer first!'); return; }

  const key = currentQuestionKey();
  if (!key) return;

  // Lock: write to Firebase (rules prevent overwrite)
  await db.ref(`trivia/answers/${key}/${S.playerId}`).set(answer);
  S.myAnswer = answer;
  S.view = 'submitted';
  clearTimer();
  render();
}

// --- Timer ---
function startTimer() {
  clearTimer();
  const bar     = () => document.querySelector('.timer-bar');
  const num     = () => document.querySelector('.timer-number');
  const totalMs = QUESTION_TIME_SECONDS * 1000;
  const endTime = S.game?.questionEndTime || (Date.now() + totalMs);
  const circumference = 188.4; // 2π × 30

  function tick() {
    const remaining = Math.max(0, endTime - Date.now());
    const secs = Math.ceil(remaining / 1000);
    const pct  = remaining / totalMs;
    const offset = circumference * (1 - pct);

    const barEl = bar();
    const numEl = num();
    if (barEl) {
      barEl.style.strokeDashoffset = offset;
      barEl.classList.toggle('urgent', secs <= 10);
    }
    if (numEl) {
      numEl.textContent = secs;
      numEl.classList.toggle('urgent', secs <= 10);
    }

    if (remaining <= 0) {
      clearTimer();
      // Lock input if still on question view
      const inp = document.getElementById('answer-input');
      const btn = document.getElementById('submit-btn');
      if (inp) inp.disabled = true;
      if (btn) { btn.disabled = true; btn.textContent = "Time's Up"; }
    }
  }

  tick();
  S.timerInterval = setInterval(tick, 250);
}

function clearTimer() {
  if (S.timerInterval) { clearInterval(S.timerInterval); S.timerInterval = null; }
}

// --- Firebase listeners ---
function initFirebase() {
  firebase.initializeApp(FIREBASE_CONFIG);
  db         = firebase.database();
  gameRef    = db.ref('trivia/game');
  playersRef = db.ref('trivia/players');
  answersRef = db.ref('trivia/answers');

  gameRef.on('value', snap => {
    const prev = S.game;
    S.game = snap.val();
    handleGameState(prev);
  });

  playersRef.on('value', snap => {
    S.players = snap.val() || {};
    if (['lobby','roundEnd','gameEnd'].includes(S.view)) render();
  });
}

function handleGameState(prev) {
  if (!S.game) return;

  // Skip if not past auth screens
  if (['password','join'].includes(S.view)) { render(); return; }

  const state = S.game.state;
  const newKey = currentQuestionKey();

  // Detect question change — reset answer
  if (newKey !== S.prevQuestionKey) {
    S.myAnswer = null;
    S.prevQuestionKey = newKey;
  }

  // Check if already answered this question
  if (state === 'question_active' && !S.myAnswer) {
    // Check Firebase in case of reconnect
    db.ref(`trivia/answers/${newKey}/${S.playerId}`).once('value').then(snap => {
      if (snap.val()) {
        S.myAnswer = snap.val();
        S.view = 'submitted';
      } else {
        S.view = 'question';
        startTimer();
      }
      render();
    });
    return;
  }

  switch (state) {
    case 'lobby':
      clearTimer();
      S.view = 'lobby';
      break;
    case 'question_active':
      // already answered
      if (S.myAnswer) { S.view = 'submitted'; clearTimer(); }
      break;
    case 'question_closed':
    case 'scoring':
      clearTimer();
      S.view = 'submitted';
      break;
    case 'round_end':
      clearTimer();
      S.view = 'roundEnd';
      break;
    case 'game_end':
      clearTimer();
      S.view = 'gameEnd';
      break;
  }

  render();
}

// --- View builders ---
function buildView() {
  switch (S.view) {
    case 'password':  return buildPassword();
    case 'join':      return buildJoin();
    case 'lobby':     return buildLobby();
    case 'question':  return buildQuestion();
    case 'submitted': return buildSubmitted();
    case 'roundEnd':  return buildRoundEnd();
    case 'gameEnd':   return buildGameEnd();
    default: return '';
  }
}

function buildPassword() {
  return `
    <div class="screen">
      <div class="card gold-border" style="max-width:360px">
        <div class="auth-logo">🎵</div>
        <div class="auth-title">${esc(GAME_NAME)}</div>
        <div class="auth-subtitle">Enter the event password to join</div>
        <div class="form-group">
          <input class="form-input" id="pw-input" type="password" placeholder="Event password"
            onkeydown="if(event.key==='Enter') submitPassword()" autocomplete="off">
        </div>
        <div class="form-error" id="pw-error"></div>
        <button class="btn btn-gold mt-8" onclick="submitPassword()">Join the Game →</button>
      </div>
    </div>`;
}

function buildJoin() {
  return `
    <div class="screen">
      <div class="card gold-border" style="max-width:360px">
        <div class="auth-logo">🎤</div>
        <div class="auth-title">What's your name?</div>
        <div class="auth-subtitle">This is how you'll appear on the leaderboard</div>
        <div class="form-group">
          <input class="form-input" id="name-input" type="text" placeholder="Your name"
            maxlength="24" onkeydown="if(event.key==='Enter') submitJoin()" autocomplete="off">
        </div>
        <div class="form-error" id="join-error"></div>
        <button class="btn btn-gold mt-8" onclick="submitJoin()">Let's Play!</button>
      </div>
    </div>`;
}

function buildLobby() {
  const playerList = Object.values(S.players).sort((a,b) => a.joinedAt - b.joinedAt);
  const round = S.game?.round || 1;
  return `
    <div class="screen">
      <div class="card gold-border" style="max-width:400px;width:100%">
        <div class="auth-logo">🎶</div>
        <div class="auth-title text-center">${round === 1 ? 'Get Ready!' : 'Round 2 Coming Up!'}</div>
        <div class="auth-subtitle">Waiting for the host to start Round ${round}…</div>
        <hr class="gold-rule">
        <div class="card-title">Players Joined (${playerList.length})</div>
        <div class="player-list">
          ${playerList.map(p => `
            <div class="player-item">
              <div class="player-dot"></div>
              <div class="player-name-text">${esc(p.name)}${p.name === S.playerName ? ' <span style="color:var(--gold);font-size:12px">(you)</span>' : ''}</div>
            </div>`).join('')}
        </div>
        ${playerList.length === 0 ? '<div class="text-muted text-center text-sm">No players yet…</div>' : ''}
      </div>
    </div>`;
}

function buildQuestion() {
  const q = currentQuestion();
  if (!q) return '<div class="screen"><p class="text-muted">Loading question…</p></div>';

  const rqs      = roundQuestions(S.game.round);
  const qNum     = S.game.questionIndex + 1;
  const total    = rqs.length;
  const circ     = 188.4;
  const endTime  = S.game.questionEndTime || (Date.now() + QUESTION_TIME_SECONDS * 1000);
  const remaining = Math.max(0, endTime - Date.now());
  const initSecs = Math.ceil(remaining / 1000);
  const initOffset = circ * (1 - remaining / (QUESTION_TIME_SECONDS * 1000));

  return `
    <div class="screen" style="justify-content:flex-start;padding-top:24px">
      <div style="width:100%;max-width:480px">
        <div class="question-meta">
          <span class="question-round-label">Round ${S.game.round}</span>
          <span class="question-number">Question ${qNum} of ${total}</span>
        </div>

        <div class="timer-wrap">
          <div class="timer-circle">
            <svg class="timer-svg" viewBox="0 0 72 72">
              <circle class="timer-track" cx="36" cy="36" r="30"/>
              <circle class="timer-bar" cx="36" cy="36" r="30"
                style="stroke-dashoffset:${initOffset}"
                id="timer-bar-el"/>
            </svg>
            <div class="timer-number${initSecs <= 10 ? ' urgent' : ''}" id="timer-num-el">${initSecs}</div>
          </div>
        </div>

        <div class="card gold-border mb-16">
          <p class="question-text">${esc(q.question)}</p>
          <textarea class="form-input answer-input" id="answer-input"
            placeholder="Type your answer here…" rows="3"
            maxlength="200" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
        </div>

        <button class="btn btn-gold" id="submit-btn" onclick="submitAnswer()">
          Submit Answer ✓
        </button>
        <p class="text-center text-sm text-muted mt-8">You can't change your answer after submitting.</p>
      </div>
    </div>`;
}

function buildSubmitted() {
  const q    = currentQuestion();
  const state = S.game?.state;
  return `
    <div class="screen">
      <div class="card gold-border" style="max-width:400px;width:100%">
        <div style="text-align:center;font-size:40px;margin-bottom:8px">✅</div>
        <div class="auth-title">Answer Submitted!</div>
        <div class="submitted-box">
          <div class="submitted-label">Your answer</div>
          <div class="submitted-answer">${esc(S.myAnswer || '—')}</div>
        </div>
        ${state === 'scoring'
          ? '<p class="waiting-text">⚖️ Host is scoring answers…</p>'
          : '<p class="waiting-text">⏳ Waiting for other players…</p>'}
      </div>
    </div>`;
}

function buildRoundEnd() {
  const round   = S.game?.round || 1;
  const sorted  = Object.entries(S.players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a,b) => b.score - a.score);

  return `
    <div class="screen" style="justify-content:flex-start;padding-top:24px">
      <div style="width:100%;max-width:480px">
        <div style="text-align:center;font-size:48px;margin-bottom:8px">🏆</div>
        <div class="auth-title text-center">Round ${round} Complete!</div>
        <div class="auth-subtitle">Scores after Round ${round}</div>
        <div class="leaderboard mt-16">
          ${sorted.map((p, i) => `
            <div class="leaderboard-row rank-${i+1}${p.id === S.playerId ? ' is-me' : ''}">
              <div class="rank-badge">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</div>
              <div class="leaderboard-name">${esc(p.name)}${p.id === S.playerId ? ' <span style="color:var(--gold);font-size:12px">◀ you</span>' : ''}</div>
              <div>
                <div class="leaderboard-score">${p.score}</div>
                <div class="score-breakdown">R1: ${p.round1Score||0} · R2: ${p.round2Score||0}</div>
              </div>
            </div>`).join('')}
          ${sorted.length === 0 ? '<p class="text-muted text-center">No scores yet</p>' : ''}
        </div>
        ${round < 2 ? '<p class="text-muted text-center text-sm mt-24">Come back for Round 2 later!</p>' : ''}
      </div>
    </div>`;
}

function buildGameEnd() {
  const sorted = Object.entries(S.players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a,b) => b.score - a.score);

  const me = sorted.find(p => p.id === S.playerId);
  const myRank = me ? sorted.indexOf(me) + 1 : null;

  return `
    <div class="screen" style="justify-content:flex-start;padding-top:24px">
      <div style="width:100%;max-width:480px">
        <div style="text-align:center;font-size:56px;margin-bottom:8px">🎉</div>
        <div class="auth-title text-center">Final Results</div>
        <div class="auth-subtitle">${esc(GAME_NAME)}</div>
        ${myRank ? `<p class="text-center text-gold mt-8" style="font-size:15px">You finished <strong>#${myRank}</strong> with <strong>${me.score} point${me.score!==1?'s':''}</strong></p>` : ''}
        <div class="leaderboard mt-16">
          ${sorted.map((p, i) => `
            <div class="leaderboard-row rank-${i+1}${p.id === S.playerId ? ' is-me' : ''}">
              <div class="rank-badge">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</div>
              <div class="leaderboard-name">${esc(p.name)}</div>
              <div>
                <div class="leaderboard-score">${p.score}</div>
                <div class="score-breakdown">R1: ${p.round1Score||0} · R2: ${p.round2Score||0}</div>
              </div>
            </div>`).join('')}
        </div>
        <p class="text-center text-muted text-sm mt-24">Thanks for playing! 🎵</p>
      </div>
    </div>`;
}

// --- Keyboard submit ---
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && S.view === 'question') {
    if (document.activeElement?.id !== 'answer-input') submitAnswer();
  }
});

// --- Boot ---
window.onload = function() {
  // Restore session
  S.playerId   = localStorage.getItem('triviaPlayerId') || genId();
  S.playerName = localStorage.getItem('triviaPlayerName') || null;
  localStorage.setItem('triviaPlayerId', S.playerId);

  const authed = localStorage.getItem('triviaAuth') === 'true';

  if (!authed) {
    S.view = 'password';
    render();
    // Still init Firebase so it's ready when they pass the password screen
    initFirebase();
    return;
  }

  if (!S.playerName) {
    S.view = 'join';
  } else {
    S.view = 'lobby';
  }

  render();
  initFirebase();
};
