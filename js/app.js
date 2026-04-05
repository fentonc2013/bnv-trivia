// ============================================================
// MUSIC TRIVIA — PLAYER APP
// ============================================================

// --- State ---
const S = {
  view:       'password',   // password | join | lobby | question | submitted | questionResults | roundEnd | gameEnd
  playerId:   null,
  playerName: null,
  game:       null,         // live game object from Firebase
  players:    {},           // all players
  myAnswer:   null,         // submitted answer for current question key
  myResult:   null,         // true/false/null after question is scored
  answerCount: 0,           // how many players have answered current question
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
  if (S.view === 'question') requestAnimationFrame(() => window.scrollTo(0, 0));
}

function roundQuestions(round) {
  if (!S.game) return [];
  const ids = round === 1 ? S.game.r1Questions : round === 2 ? S.game.r2Questions : S.game.r3Questions;
  if (ids) return ids.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
  return QUESTIONS.filter(q => q.round === round); // fallback for legacy game state
}

const TIEBREAKER_STATES = ['tiebreaker_active','tiebreaker_closed','tiebreaker_results'];

function currentQuestion() {
  if (!S.game) return null;
  if (TIEBREAKER_STATES.includes(S.game.state))
    return QUESTIONS.find(q => q.id === S.game.tiebreakerQuestionId) || null;
  return roundQuestions(S.game.round)[S.game.questionIndex] ?? null;
}

function currentQuestionKey() {
  if (!S.game) return null;
  if (TIEBREAKER_STATES.includes(S.game.state))
    return `tb_${S.game.tiebreakerQuestionId}`;
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

  const duplicate = Object.values(S.players).some(
    p => p.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) { errEl.textContent = 'That name is already taken — pick another.'; return; }

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
  const bar     = () => document.querySelector('.timer-bar-fill');
  const num     = () => document.querySelector('.timer-pill');
  const totalMs = QUESTION_TIME_SECONDS * 1000;
  const endTime = S.game?.questionEndTime || (Date.now() + totalMs);

  function tick() {
    const remaining = Math.max(0, endTime - Date.now());
    const secs = Math.ceil(remaining / 1000);
    const pct  = remaining / totalMs;

    const barEl = bar();
    const numEl = num();
    if (barEl) {
      barEl.style.width = (pct * 100) + '%';
      barEl.classList.toggle('urgent', secs <= 10);
    }
    if (numEl) {
      numEl.textContent = secs + 's';
      numEl.classList.toggle('urgent', secs <= 10);
    }

    if (remaining <= 0) {
      clearTimer();
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
    // Re-check all-answered if on submitted view
    if (S.view === 'submitted') render();
  });

  answersRef.on('value', snap => {
    const key = currentQuestionKey();
    const keyAnswers = (snap.val() || {})[key] || {};
    S.answerCount = Object.keys(keyAnswers).length;
    if (S.view === 'submitted') render();
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
    S.myResult = null;
    S.answerCount = 0;
    S.prevQuestionKey = newKey;
  }

  // Check if already answered this question (regular or tiebreaker)
  if ((state === 'question_active' || state === 'tiebreaker_active') && !S.myAnswer) {
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
      // Auto-re-register if player record was deleted (e.g. after admin reset)
      if (S.playerName && S.playerId && !S.players[S.playerId]) {
        db.ref(`trivia/players/${S.playerId}`).set({
          name:        S.playerName,
          score:       0,
          round1Score: 0,
          round2Score: 0,
          joinedAt:    Date.now(),
        });
      }
      break;
    case 'question_active':
    case 'tiebreaker_active':
      if (S.myAnswer) { S.view = 'submitted'; clearTimer(); }
      break;
    case 'question_closed':
    case 'tiebreaker_closed':
    case 'scoring':
      clearTimer();
      S.view = 'submitted';
      break;
    case 'tiebreaker_results':
    case 'question_results': {
      clearTimer();
      const key = currentQuestionKey();
      Promise.all([
        db.ref(`trivia/scoring/${key}/${S.playerId}`).once('value'),
        S.myAnswer ? Promise.resolve(null) : db.ref(`trivia/answers/${key}/${S.playerId}`).once('value'),
      ]).then(([scoreSnap, answerSnap]) => {
        S.myResult = scoreSnap.val();
        if (answerSnap?.val()) S.myAnswer = answerSnap.val();
        S.view = 'questionResults';
        render();
      });
      return;
    }
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
    case 'submitted':        return buildSubmitted();
    case 'questionResults':  return buildQuestionResults();
    case 'roundEnd':         return buildRoundEnd();
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
        <div class="auth-title text-center">${round === 1 ? 'Get Ready!' : round === 2 ? 'Round 2 Coming Up!' : 'Round 3 Coming Up!'}</div>
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
  const endTime  = S.game.questionEndTime || (Date.now() + QUESTION_TIME_SECONDS * 1000);
  const remaining = Math.max(0, endTime - Date.now());
  const initSecs = Math.ceil(remaining / 1000);
  const initPct  = (remaining / (QUESTION_TIME_SECONDS * 1000) * 100).toFixed(1);

  return `
    <div class="screen" style="justify-content:flex-start;padding-top:16px">
      <div style="width:100%;max-width:480px">

        <div class="question-meta">
          ${S.game.state === 'tiebreaker_active'
            ? `<span class="tiebreaker-badge">⚡ Tiebreaker</span>`
            : `<span class="question-round-label">Round ${S.game.round}</span>
               <span class="question-number">Q ${qNum} / ${total}</span>
               <span class="points-badge points-${q.points}">${q.points} pt${q.points !== 1 ? 's' : ''}</span>`}
          <span class="timer-pill${initSecs <= 10 ? ' urgent' : ''}">${initSecs}s</span>
        </div>

        <div class="timer-bar-wrap">
          <div class="timer-bar-fill${initSecs <= 10 ? ' urgent' : ''}" style="width:${initPct}%"></div>
        </div>

        <div class="card gold-border mb-16" style="margin-top:12px">
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
        ${(() => {
          const total = Object.keys(S.players).length;
          if (state === 'scoring' || state === 'question_closed')
            return '<p class="waiting-text">⚖️ All answers in — host is scoring…</p>';
          if (S.answerCount >= total && total > 0)
            return '<p class="waiting-text">🎉 Everyone answered — waiting for host to close…</p>';
          return `<p class="waiting-text">⏳ Waiting for other players… (${S.answerCount}/${total})</p>`;
        })()}
      </div>
    </div>`;
}

function buildQuestionResults() {
  const q = currentQuestion();
  const correct = S.myResult === true;
  const didAnswer = S.myAnswer !== null;

  return `
    <div class="screen">
      <div class="card gold-border" style="max-width:400px;width:100%">
        <div style="text-align:center;font-size:48px;margin-bottom:8px">${
          !didAnswer ? '🤷' : correct ? '✅' : '❌'
        }</div>
        <div class="auth-title">${
          !didAnswer ? 'No answer submitted' : correct ? 'Correct!' : 'Not quite!'
        }</div>
        ${didAnswer ? `
          <div class="submitted-box" style="margin-top:16px">
            <div class="submitted-label">Your answer</div>
            <div class="submitted-answer" style="color:${correct ? 'var(--success)' : 'var(--danger)'}">${esc(S.myAnswer)}</div>
          </div>` : ''}
        <div class="result-answer-box">
          <div class="submitted-label">Correct answer</div>
          <div class="result-correct-text">${esc(q?.answer || '—')}</div>
        </div>
        <p class="waiting-text mt-16">⏳ Next question coming up…</p>
      </div>
    </div>`;
}

function buildRoundEnd() {
  const round  = S.game?.round || 1;
  const sorted = Object.entries(S.players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a,b) => b.score - a.score);
  const roundKey = `round${round}Score`;
  const roundMax = Math.max(0, ...sorted.map(p => p[roundKey] || 0));
  const roundWinners = sorted.filter(p => roundMax > 0 && (p[roundKey] || 0) === roundMax);

  return `
    <div class="screen" style="justify-content:flex-start;padding-top:24px">
      <div style="width:100%;max-width:480px">
        <div style="text-align:center;font-size:48px;margin-bottom:8px">🏆</div>
        <div class="auth-title text-center">Round ${round} Complete!</div>
        ${roundWinners.length > 0 ? `
          <div class="winner-banner">
            <div class="winner-label">Round ${round} Winner${roundWinners.length > 1 ? 's' : ''}</div>
            <div class="winner-name">${roundWinners.map(p => esc(p.name)).join(' &amp; ')}</div>
          </div>` : ''}
        <div class="leaderboard mt-16">
          ${sorted.map((p, i) => `
            <div class="leaderboard-row rank-${i+1}${p.id === S.playerId ? ' is-me' : ''}">
              <div class="rank-badge">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</div>
              <div class="leaderboard-name">${esc(p.name)}${p.id === S.playerId ? ' <span style="color:var(--gold);font-size:12px">◀ you</span>' : ''}</div>
              <div>
                <div class="leaderboard-score">${p.score}</div>
                <div class="score-breakdown">R1: ${p.round1Score||0} · R2: ${p.round2Score||0}${round >= 3 ? ` · R3: ${p.round3Score||0}` : ''}</div>
              </div>
            </div>`).join('')}
          ${sorted.length === 0 ? '<p class="text-muted text-center">No scores yet</p>' : ''}
        </div>
        ${round < 3 ? `<p class="text-muted text-center text-sm mt-24">Come back for Round ${round + 1} later!</p>` : ''}
      </div>
    </div>`;
}

function buildGameEnd() {
  const sorted = Object.entries(S.players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a,b) => b.score - a.score);

  const me = sorted.find(p => p.id === S.playerId);
  const myRank = me ? sorted.indexOf(me) + 1 : null;

  const r1Max = Math.max(0, ...sorted.map(p => p.round1Score || 0));
  const r2Max = Math.max(0, ...sorted.map(p => p.round2Score || 0));
  const r3Max = Math.max(0, ...sorted.map(p => p.round3Score || 0));
  const totalMax = Math.max(0, ...sorted.map(p => p.score || 0));
  const r1Winners = sorted.filter(p => r1Max > 0 && (p.round1Score || 0) === r1Max);
  const r2Winners = sorted.filter(p => r2Max > 0 && (p.round2Score || 0) === r2Max);
  const r3Winners = sorted.filter(p => r3Max > 0 && (p.round3Score || 0) === r3Max);
  const grandWinners = sorted.filter(p => totalMax > 0 && p.score === totalMax);

  return `
    <div class="screen" style="justify-content:flex-start;padding-top:24px">
      <div style="width:100%;max-width:480px">
        <div style="text-align:center;font-size:56px;margin-bottom:8px">🎉</div>
        <div class="auth-title text-center">Final Results</div>
        ${myRank ? `<p class="text-center text-gold mt-8" style="font-size:15px">You finished <strong>#${myRank}</strong> with <strong>${me.score} point${me.score!==1?'s':''}</strong></p>` : ''}

        ${grandWinners.length > 0 ? `
          <div class="winner-banner winner-grand mt-16">
            <div class="winner-label">🏆 Grand Total Winner${grandWinners.length > 1 ? 's' : ''}</div>
            <div class="winner-name">${grandWinners.map(p => esc(p.name)).join(' &amp; ')}</div>
          </div>` : ''}

        <div style="display:flex;gap:8px;margin-top:12px">
          ${r1Winners.length > 0 ? `
            <div class="round-winner-box">
              <div class="winner-label">R1 Winner</div>
              <div class="round-winner-name">${r1Winners.map(p => esc(p.name)).join(' &amp; ')}</div>
            </div>` : ''}
          ${r2Winners.length > 0 ? `
            <div class="round-winner-box">
              <div class="winner-label">R2 Winner</div>
              <div class="round-winner-name">${r2Winners.map(p => esc(p.name)).join(' &amp; ')}</div>
            </div>` : ''}
          ${r3Winners.length > 0 ? `
            <div class="round-winner-box">
              <div class="winner-label">R3 Winner</div>
              <div class="round-winner-name">${r3Winners.map(p => esc(p.name)).join(' &amp; ')}</div>
            </div>` : ''}
        </div>

        <div class="leaderboard mt-16">
          ${sorted.map((p, i) => `
            <div class="leaderboard-row rank-${i+1}${p.id === S.playerId ? ' is-me' : ''}">
              <div class="rank-badge">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</div>
              <div class="leaderboard-name">${esc(p.name)}${p.id === S.playerId ? ' <span style="color:var(--gold);font-size:12px">◀ you</span>' : ''}</div>
              <div>
                <div class="leaderboard-score">${p.score}</div>
                <div class="score-breakdown">R1: ${p.round1Score||0} · R2: ${p.round2Score||0}${r3Max > 0 ? ` · R3: ${p.round3Score||0}` : ''}</div>
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
