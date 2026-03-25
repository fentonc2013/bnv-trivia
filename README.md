# BNV Music Trivia 2026

A mobile-friendly, real-time music trivia app hosted on GitHub Pages.

---

## Setup (one-time, ~15 minutes)

### 1. Firebase Realtime Database

1. Go to [firebase.google.com](https://firebase.google.com) → **Add project**
2. Give it a name (e.g. `bnv-trivia`), disable Google Analytics if prompted
3. In the left sidebar → **Build** → **Realtime Database** → **Create Database**
4. Choose a region, start in **test mode** (you'll update rules below)
5. Click the ⚙️ gear → **Project Settings** → **Your apps** → **Add app** (Web `</>`)
6. Copy the `firebaseConfig` object shown

### 2. Firebase Security Rules

In Realtime Database → **Rules** tab, paste:

```json
{
  "rules": {
    "trivia": {
      ".read": true,
      "answers": {
        "$key": {
          "$uid": {
            ".write": "!data.exists()"
          }
        }
      },
      ".write": true
    }
  }
}
```

Click **Publish**.

### 3. Fill in config.js

Copy `js/config.example.js` → `js/config.js` and fill in:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "...",   // from Firebase project settings
  authDomain:        "...",
  databaseURL:       "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "..."
};

const ADMIN_PASSWORD  = "Tr1viaT1me";
const PLAYER_PASSWORD = "bnv2026";
const GAME_NAME             = "BNV Music Trivia 2026";
const QUESTION_TIME_SECONDS = 45;
```

### 4. Deploy to GitHub Pages

> **Important:** `config.js` is gitignored but must be deployed.
> Use one of these methods:

**Option A — Simple push (easiest):**
```bash
# In the music-trivia folder:
git init
git add .
git add -f js/config.js    # force-add the gitignored file just for deployment
git commit -m "Deploy trivia app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bnv-trivia.git
git push -u origin main
```
Then in GitHub → repo → **Settings** → **Pages** → Source: `main` branch, root `/`.

**Option B — Separate deploy branch (keeps config out of history):**
Use a `gh-pages` branch and only push there, never to `main`.

---

## Running the Game (Night-Of)

### Before guests arrive
1. Open `https://YOUR_USERNAME.github.io/bnv-trivia/admin.html`
2. Enter admin password: `Tr1viaT1me`
3. Click **Reset / New Game** — clears any previous data
4. Share the player URL: `https://YOUR_USERNAME.github.io/bnv-trivia/`

### Round Flow

**Players:** Navigate to the URL, enter event password `bnv2026`, enter their name. They'll wait in the lobby.

**Admin — per question:**
1. **Control tab** → click **Open Question** (timer starts, question appears on all phones)
2. Watch answer count climb in real time
3. Click **Close Question** when ready (or wait for auto-close)
4. Switch to **Scoring tab**
5. For each player's answer — tap ✓ (correct) or ✗ (wrong)
6. Click **Apply Scores**
7. Click **→ Next Question / End Round**

**Between rounds:** Players see the Round 1 leaderboard automatically. Click **Start Round 2** when ready.

**End:** Click **End Game** — all phones show the final leaderboard.

---

## Customizing Questions

Edit `js/questions.js`. Each question:

```javascript
{
  id: 'q1',      // unique string, any format
  round: 1,      // 1 or 2
  question: "Question text here?",
  answer: "Reference answer (admin-only)",
  points: 1      // points awarded for correct answer
}
```

Round 1 questions: `round: 1`
Round 2 questions: `round: 2`

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Player-facing app |
| `admin.html` | Admin control panel |
| `style.css` | Black & gold styles |
| `js/app.js` | Player logic |
| `js/admin.js` | Admin logic |
| `js/questions.js` | Your questions |
| `js/config.js` | Firebase keys + passwords *(gitignored)* |
| `js/config.example.js` | Template for config.js |
