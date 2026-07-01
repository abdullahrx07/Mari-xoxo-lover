// ====== XOXO Game Logic ======

const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const createBtn = document.getElementById('createBtn');
const shareSection = document.getElementById('shareSection');
const shareLinkInput = document.getElementById('shareLink');
const copyBtn = document.getElementById('copyBtn');
const boardEl = document.getElementById('board');
const statusText = document.getElementById('statusText');
const youTag = document.getElementById('youTag');
const rematchBtn = document.getElementById('rematchBtn');
const newGameBtn = document.getElementById('newGameBtn');

let roomId = null;
let mySymbol = null; // 'X' or 'O'
let myPlayerId = null;
let unsubscribe = null;

const NAMES = { X: 'rX', O: 'Maria' };

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function genId(len = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function getPlayerId() {
  let pid = localStorage.getItem('xoxo_player_id');
  if (!pid) {
    pid = genId(10);
    localStorage.setItem('xoxo_player_id', pid);
  }
  return pid;
}

function checkWinner(cells) {
  for (const [a,b,c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) {
      return { winner: cells[a], line: [a,b,c] };
    }
  }
  if (cells.every(c => c)) return { winner: 'draw', line: [] };
  return null;
}

async function createRoom() {
  myPlayerId = getPlayerId();
  roomId = genId(6);
  mySymbol = 'X';

  await db.collection('rooms').doc(roomId).set({
    cells: Array(9).fill(null),
    turn: 'X',
    players: { X: myPlayerId, O: null },
    status: 'waiting', // waiting -> playing -> finished
    winner: null,
    rematchVotes: {},
    createdAt: Date.now()
  });

  const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  shareLinkInput.value = url;
  shareSection.classList.remove('hidden');
  createBtn.classList.add('hidden');

  listenToRoom();
}

async function joinRoom(id) {
  myPlayerId = getPlayerId();
  roomId = id;
  const ref = db.collection('rooms').doc(roomId);
  const snap = await ref.get();

  if (!snap.exists) {
    alert('Ei room ta khuje pawa jay nai! Link ta check koro.');
    window.location.href = window.location.pathname;
    return;
  }

  const data = snap.data();

  // already a player in this room (reload case)
  if (data.players.X === myPlayerId) {
    mySymbol = 'X';
  } else if (data.players.O === myPlayerId) {
    mySymbol = 'O';
  } else if (!data.players.O) {
    // join as O
    mySymbol = 'O';
    await ref.update({
      'players.O': myPlayerId,
      status: 'playing'
    });
  } else {
    alert('Ei room already full! Naya game baniyo.');
    window.location.href = window.location.pathname;
    return;
  }

  showGameScreen();
  listenToRoom();
}

function listenToRoom() {
  if (unsubscribe) unsubscribe();
  unsubscribe = db.collection('rooms').doc(roomId).onSnapshot(doc => {
    if (!doc.exists) return;
    renderGame(doc.data());
  });
}

function showGameScreen() {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  youTag.textContent = `Tumi: ${NAMES[mySymbol]} (${mySymbol})`;
}

function renderGame(data) {
  if (data.status === 'playing' || data.status === 'finished') {
    if (gameScreen.classList.contains('hidden')) showGameScreen();
  }

  const { cells, turn, status, winner, players, rematchVotes } = data;

  // Build board
  boardEl.innerHTML = '';
  cells.forEach((val, i) => {
    const div = document.createElement('div');
    div.className = 'cell' + (val === 'X' ? ' x' : val === 'O' ? ' o' : '');
    div.textContent = val || '';
    div.onclick = () => handleCellClick(i, data);
    boardEl.appendChild(div);
  });

  rematchBtn.classList.add('hidden');
  newGameBtn.classList.add('hidden');

  if (status === 'waiting') {
    statusText.textContent = `${NAMES.O} er জন্য wait kortesi...`;
  } else if (status === 'playing') {
    statusText.textContent = turn === mySymbol ? '👉 Tomar turn!' : `${NAMES[turn]} er turn...`;
  } else if (status === 'finished') {
    if (winner === 'draw') {
      statusText.textContent = "🤝 Draw hoye gelo!";
    } else if (winner === mySymbol) {
      statusText.textContent = '🎉 Tumi jitse!';
    } else {
      statusText.textContent = `😢 ${NAMES[winner]} jitse!`;
    }
    rematchBtn.classList.remove('hidden');
    newGameBtn.classList.remove('hidden');

    const votes = rematchVotes || {};
    const voteCount = Object.keys(votes).length;
    if (voteCount === 1 && !votes[myPlayerId]) {
      rematchBtn.textContent = '🔁 Rematch (Opponent wants!)';
    } else if (votes[myPlayerId]) {
      rematchBtn.textContent = '⏳ Waiting for opponent...';
      rematchBtn.disabled = true;
    } else {
      rematchBtn.textContent = '🔁 Rematch';
      rematchBtn.disabled = false;
    }
  }
}

async function handleCellClick(index, data) {
  if (data.status !== 'playing') return;
  if (data.turn !== mySymbol) return;
  if (data.cells[index]) return;

  const newCells = [...data.cells];
  newCells[index] = mySymbol;

  const result = checkWinner(newCells);
  const ref = db.collection('rooms').doc(roomId);

  if (result) {
    await ref.update({
      cells: newCells,
      status: 'finished',
      winner: result.winner,
      rematchVotes: {}
    });
  } else {
    await ref.update({
      cells: newCells,
      turn: mySymbol === 'X' ? 'O' : 'X'
    });
  }
}

async function requestRematch() {
  const ref = db.collection('rooms').doc(roomId);
  const snap = await ref.get();
  const data = snap.data();
  const votes = { ...(data.rematchVotes || {}), [myPlayerId]: true };

  if (Object.keys(votes).length >= 2) {
    // both voted -> reset game
    await ref.update({
      cells: Array(9).fill(null),
      turn: 'X',
      status: 'playing',
      winner: null,
      rematchVotes: {}
    });
  } else {
    await ref.update({ rematchVotes: votes });
  }
}

function startNewGame() {
  if (unsubscribe) unsubscribe();
  window.location.href = window.location.pathname;
}

// ===== Init =====
createBtn.addEventListener('click', createRoom);
copyBtn.addEventListener('click', () => {
  shareLinkInput.select();
  navigator.clipboard.writeText(shareLinkInput.value);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
});
rematchBtn.addEventListener('click', requestRematch);
newGameBtn.addEventListener('click', startNewGame);

(function init() {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    createBtn.classList.add('hidden');
    joinRoom(roomParam);
  }
})();
