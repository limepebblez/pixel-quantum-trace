const mapScreen = document.getElementById('map-screen');
const gameScreen = document.getElementById('game-screen');
const totalStarsEl = document.getElementById('total-stars');

const mapCanvas = document.getElementById('map-canvas');
const mapCtx = mapCanvas.getContext('2d');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const levelTitleEl = document.getElementById('level-title');
const attemptsLeftEl = document.getElementById('attempts-left');
const fireBtn = document.getElementById('fire-btn');
const restartBtn = document.getElementById('restart-btn');
const nextBtn = document.getElementById('next-btn');
const mapBackBtn = document.getElementById('map-back-btn');

let audioCtx = null;
let humNodes = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playRotateSound() {
  const ac = getAudioContext();
  const now = ac.currentTime;
  const duration = 0.28;

  const buffer = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 6.5;
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(3200, now + duration * 0.4);
  filter.frequency.exponentialRampToValueAtTime(150, now + duration);

  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.3, now + duration * 0.35);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ac.destination);

  const sciFiOsc = ac.createOscillator();
  const sciFiGain = ac.createGain();
  sciFiOsc.type = 'sine';
  sciFiOsc.frequency.setValueAtTime(1400, now);
  sciFiOsc.frequency.exponentialRampToValueAtTime(300, now + duration);
  sciFiGain.gain.setValueAtTime(0.001, now);
  sciFiGain.gain.exponentialRampToValueAtTime(0.12, now + duration * 0.25);
  sciFiGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  sciFiOsc.connect(sciFiGain); sciFiGain.connect(ac.destination);

  noise.start(now); sciFiOsc.start(now);
  noise.stop(now + duration); sciFiOsc.stop(now + duration);
}

function startLaserHumSound() {
  if (humNodes) stopLaserHumSound();
  const ac = getAudioContext();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(90, now);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(220, now);

  const mainGain = ac.createGain();
  mainGain.gain.setValueAtTime(0.05, now);
  mainGain.gain.linearRampToValueAtTime(0.18, now + 0.1);

  osc.connect(filter); filter.connect(mainGain); mainGain.connect(ac.destination);
  osc.start(now);
  humNodes = { osc, mainGain, ac };
}

function stopLaserHumSound() {
  if (!humNodes) return;
  const { osc, mainGain, ac } = humNodes;
  mainGain.gain.linearRampToValueAtTime(0.001, ac.currentTime + 0.08);
  setTimeout(() => { try { osc.stop(); } catch(e){} }, 100);
  humNodes = null;
}

function playVictoryFanfare() {
  const ac = getAudioContext();
  const now = ac.currentTime;
  const notes = [
    { freq: 523.25, time: 0.00, duration: 0.12 },
    { freq: 659.25, time: 0.10, duration: 0.12 },
    { freq: 783.99, time: 0.20, duration: 0.12 },
    { freq: 1046.50, time: 0.30, duration: 0.15 },
    { freq: 1318.51, time: 0.45, duration: 0.60 }
  ];

  notes.forEach(n => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const noteTime = now + n.time;
    osc.frequency.setValueAtTime(n.freq, noteTime);
    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.2, noteTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.duration);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(noteTime); osc.stop(noteTime + n.duration);
  });
}

function playMishitSound() {
  const ac = getAudioContext();
  const now = ac.currentTime;
  const duration = 0.35;
  const osc = ac.createOscillator();
  const oscGain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + duration);
  oscGain.gain.setValueAtTime(0.2, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(oscGain); oscGain.connect(ac.destination);
  osc.start(now); osc.stop(now + duration);
}

// MAIN LEVELS & SUB-LEVELS STRUCTURE
const mainLevels = [
  {
    id: 1,
    name: "Cyber Oasis",
    theme: { base: '#0ea5e9', secondary: '#0284c7', atmosphere: '#38bdf8', ring: false },
    sublevels: [
      { name: "1.1", cols: 2, rows: 2, tileSize: 120, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 1, y: 1 }, grid: [[0, 2], [0, 0]] },
      { name: "1.2", cols: 2, rows: 2, tileSize: 120, source: { x: 0, y: 0, dx: 0, dy: 1 }, target: { x: 1, y: 1 }, grid: [[0, 0], [2, 0]] }
    ]
  },
  {
    id: 2,
    name: "Golden Gas Giant",
    theme: { base: '#d97706', secondary: '#b45309', atmosphere: '#fbbf24', ring: true },
    sublevels: [
      { name: "2.1", cols: 3, rows: 3, tileSize: 80, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 2, y: 2 }, grid: [[0, 0, 1], [0, 0, 0], [0, 0, 0]] },
      { name: "2.2", cols: 3, rows: 3, tileSize: 80, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 2, y: 2 }, grid: [[0, 2, 0], [0, 0, 0], [0, 1, 0]] },
      { name: "2.3", cols: 3, rows: 3, tileSize: 80, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 2, y: 2 }, grid: [[0, 2, 0], [0, 2, 1], [0, 0, 0]] },
      { name: "2.4", cols: 3, rows: 3, tileSize: 80, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 2, y: 2 }, grid: [[0, 0, 2], [1, 0, 1], [2, 0, 0]] }
    ]
  },
  {
    id: 3,
    name: "Emerald Nebula World",
    theme: { base: '#059669', secondary: '#047857', atmosphere: '#34d399', ring: false },
    sublevels: [
      { name: "3.1", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
      { name: "3.2", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0]] },
      { name: "3.3", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 2, 0, 0], [0, 0, 0, 0], [0, 1, 0, 2], [0, 0, 0, 0]] },
      { name: "3.4", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 2, 0, 0], [1, 2, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0]] }
    ]
  },
  {
    id: 4,
    name: "Crimson Lava Core",
    theme: { base: '#dc2626', secondary: '#991b1b', atmosphere: '#f87171', ring: false },
    sublevels: [
      { name: "4.1", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 0, 2, 0], [1, 0, 2, 0], [1, 0, 0, 2], [0, 0, 0, 0]] },
      { name: "4.2", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 0, 0, 2], [0, 1, 0, 2], [0, 1, 2, 0], [0, 0, 1, 0]] }
    ]
  },
  {
    id: 5,
    name: "Violet Void Realm",
    theme: { base: '#7c3aed', secondary: '#5b21b6', atmosphere: '#c084fc', ring: true },
    sublevels: [
      { name: "5.1", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 2, 0, 0], [0, 1, 0, 2], [0, 1, 2, 0], [0, 0, 1, 0]] },
      { name: "5.2", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 0, dy: 1 }, target: { x: 3, y: 3 }, grid: [[0, 0, 0, 0], [1, 2, 0, 2], [0, 1, 2, 0], [0, 0, 1, 0]] }
    ]
  }
];

let playerProgress = {
  unlockedLevel: 0,
  levelStars: Array(mainLevels.length).fill(0)
};

// SPACE BACKGROUND SYSTEM
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * 380,
  y: Math.random() * 520,
  speed: 0.3 + Math.random() * 1.2,
  size: 0.8 + Math.random() * 1.5,
  alpha: 0.3 + Math.random() * 0.7
}));

let spaceEntity = null;
let spaceEntityTimer = 0;

function spawnSpaceEntity() {
  const types = ['shooting_star', 'astronaut', 'comet', 'satellite'];
  const choice = types[Math.floor(Math.random() * types.length)];

  if (choice === 'shooting_star') {
    spaceEntity = {
      type: 'shooting_star',
      x: Math.random() * 200,
      y: Math.random() * 200,
      vx: 6 + Math.random() * 4,
      vy: 4 + Math.random() * 3,
      life: 0,
      maxLife: 40
    };
  } else if (choice === 'astronaut') {
    spaceEntity = {
      type: 'astronaut',
      x: Math.random() * 300,
      y: -20,
      vy: 0.8,
      vx: 0.3,
      rot: 0,
      vRot: 0.02
    };
  } else if (choice === 'comet') {
    spaceEntity = {
      type: 'comet',
      x: -30,
      y: Math.random() * 250,
      vx: 3.5,
      vy: 2.2,
      tail: []
    };
  } else if (choice === 'satellite') {
    spaceEntity = {
      type: 'satellite',
      x: 400,
      y: Math.random() * 300,
      vx: -0.6,
      vy: 0.4,
      rot: 0
    };
  }
}

function updateSpaceBackground() {
  // Parallax Moving Stars
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > 520) {
      s.y = 0;
      s.x = Math.random() * 380;
    }
  });

  // Random Entity Spawning
  spaceEntityTimer++;
  if (!spaceEntity && spaceEntityTimer > 280) {
    spawnSpaceEntity();
    spaceEntityTimer = 0;
  }

  // Update Entity
  if (spaceEntity) {
    if (spaceEntity.type === 'shooting_star') {
      spaceEntity.x += spaceEntity.vx;
      spaceEntity.y += spaceEntity.vy;
      spaceEntity.life++;
      if (spaceEntity.life >= spaceEntity.maxLife) spaceEntity = null;
    } else if (spaceEntity.type === 'astronaut') {
      spaceEntity.x += spaceEntity.vx;
      spaceEntity.y += spaceEntity.vy;
      spaceEntity.rot += spaceEntity.vRot;
      if (spaceEntity.y > 540) spaceEntity = null;
    } else if (spaceEntity.type === 'comet') {
      spaceEntity.x += spaceEntity.vx;
      spaceEntity.y += spaceEntity.vy;
      spaceEntity.tail.push({ x: spaceEntity.x, y: spaceEntity.y });
      if (spaceEntity.tail.length > 15) spaceEntity.tail.shift();
      if (spaceEntity.x > 420 || spaceEntity.y > 540) spaceEntity = null;
    } else if (spaceEntity.type === 'satellite') {
      spaceEntity.x += spaceEntity.vx;
      spaceEntity.y += spaceEntity.vy;
      spaceEntity.rot += 0.01;
      if (spaceEntity.x < -40 || spaceEntity.y > 540) spaceEntity = null;
    }
  }
}

function drawSpaceBackground() {
  mapCtx.fillStyle = '#020617';
  mapCtx.fillRect(0, 0, 380, 520);

  // Draw Stars
  stars.forEach(s => {
    mapCtx.fillStyle = `rgba(248, 250, 252, ${s.alpha})`;
    mapCtx.beginPath();
    mapCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    mapCtx.fill();
  });

  // Draw Passing Space Objects
  if (spaceEntity) {
    if (spaceEntity.type === 'shooting_star') {
      mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.moveTo(spaceEntity.x, spaceEntity.y);
      mapCtx.lineTo(spaceEntity.x - spaceEntity.vx * 3, spaceEntity.y - spaceEntity.vy * 3);
      mapCtx.stroke();
    } else if (spaceEntity.type === 'astronaut') {
      mapCtx.save();
      mapCtx.translate(spaceEntity.x, spaceEntity.y);
      mapCtx.rotate(spaceEntity.rot);
      mapCtx.fillStyle = '#f8fafc';
      mapCtx.beginPath(); mapCtx.arc(0, -3, 4, 0, Math.PI * 2); mapCtx.fill(); // Helmet
      mapCtx.fillStyle = '#0284c7';
      mapCtx.fillRect(-2, -2, 4, 2); // Visor
      mapCtx.fillStyle = '#cbd5e1';
      mapCtx.fillRect(-3, 1, 6, 6); // Suit Body
      mapCtx.restore();
    } else if (spaceEntity.type === 'comet') {
      spaceEntity.tail.forEach((t, idx) => {
        let r = (idx / spaceEntity.tail.length) * 4;
        mapCtx.fillStyle = `rgba(56, 189, 248, ${idx / spaceEntity.tail.length})`;
        mapCtx.beginPath(); mapCtx.arc(t.x, t.y, r, 0, Math.PI * 2); mapCtx.fill();
      });
    } else if (spaceEntity.type === 'satellite') {
      mapCtx.save();
      mapCtx.translate(spaceEntity.x, spaceEntity.y);
      mapCtx.rotate(spaceEntity.rot);
      mapCtx.fillStyle = '#64748b';
      mapCtx.fillRect(-4, -4, 8, 8); // Body
      mapCtx.fillStyle = '#0284c7';
      mapCtx.fillRect(-12, -2, 7, 4); mapCtx.fillRect(5, -2, 7, 4); // Panels
      mapCtx.restore();
    }
  }
}

// MAP PLANET POSITIONS
const planetPositions = [
  { x: 190, y: 440 }, // Level 1
  { x: 110, y: 340 }, // Level 2
  { x: 270, y: 240 }, // Level 3
  { x: 120, y: 140 }, // Level 4
  { x: 240, y: 50 }   // Level 5
];

let bridgeAnim = null; // Stores bridge unlock animation state

function drawPlanet(x, y, radius, levelObj, isUnlocked, isCompleted, isCurrent, nowTime) {
  mapCtx.save();

  // Atmosphere Pulse
  let pulse = Math.sin(nowTime * 0.004) * 3;
  let atmosphereColor = isUnlocked ? levelObj.theme.atmosphere : '#334155';

  mapCtx.shadowColor = atmosphereColor;
  mapCtx.shadowBlur = isCurrent ? 22 + pulse : (isUnlocked ? 12 : 0);

  // Base Planet Sphere Gradient (3D Shading)
  let grad = mapCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
  if (isUnlocked) {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, levelObj.theme.base);
    grad.addColorStop(1, levelObj.theme.secondary);
  } else {
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(1, '#1e293b');
  }

  mapCtx.fillStyle = grad;
  mapCtx.beginPath();
  mapCtx.arc(x, y, radius, 0, Math.PI * 2);
  mapCtx.fill();
  mapCtx.shadowBlur = 0;

  // Planetary Ring for Gas Giants
  if (levelObj.theme.ring && isUnlocked) {
    mapCtx.save();
    mapCtx.translate(x, y);
    mapCtx.rotate(-Math.PI / 6 + Math.sin(nowTime * 0.001) * 0.05);
    mapCtx.strokeStyle = levelObj.theme.atmosphere;
    mapCtx.lineWidth = 4;
    mapCtx.beginPath();
    mapCtx.ellipse(0, 0, radius * 1.6, radius * 0.4, 0, 0, Math.PI * 2);
    mapCtx.stroke();
    mapCtx.restore();
  }

  // Text / Icon Label
  mapCtx.fillStyle = isUnlocked ? '#ffffff' : '#64748b';
  mapCtx.font = 'bold 15px system-ui';
  mapCtx.textAlign = 'center';
  mapCtx.textBaseline = 'middle';
  mapCtx.fillText(isUnlocked ? levelObj.id : '🔒', x, y);

  // Stars Display for Completed Levels
  if (isCompleted) {
    let starsStr = '⭐'.repeat(playerProgress.levelStars[levelObj.id - 1]);
    mapCtx.font = '11px system-ui';
    mapCtx.fillText(starsStr, x, y + radius + 14);
  }

  mapCtx.restore();
}

function drawMapBridges(nowTime) {
  for (let i = 0; i < mainLevels.length - 1; i++) {
    const p1 = planetPositions[i];
    const p2 = planetPositions[i + 1];
    const isUnlocked = i + 1 <= playerProgress.unlockedLevel;

    mapCtx.save();
    if (bridgeAnim && bridgeAnim.fromIdx === i) {
      // Animated Bridge Progress
      let curX = p1.x + (p2.x - p1.x) * bridgeAnim.progress;
      let curY = p1.y + (p2.y - p1.y) * bridgeAnim.progress;

      mapCtx.strokeStyle = '#38bdf8';
      mapCtx.lineWidth = 5;
      mapCtx.shadowColor = '#38bdf8';
      mapCtx.shadowBlur = 15;
      mapCtx.beginPath();
      mapCtx.moveTo(p1.x, p1.y);
      mapCtx.lineTo(curX, curY);
      mapCtx.stroke();
    } else if (isUnlocked) {
      // Completed / Unlocked Bridge Line
      mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      mapCtx.lineWidth = 4;
      mapCtx.setLineDash([8, 6]);
      mapCtx.lineDashOffset = -nowTime * 0.02;
      mapCtx.beginPath();
      mapCtx.moveTo(p1.x, p1.y);
      mapCtx.lineTo(p2.x, p2.y);
      mapCtx.stroke();
    } else {
      // Locked Bridge Line
      mapCtx.strokeStyle = '#334155';
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.moveTo(p1.x, p1.y);
      mapCtx.lineTo(p2.x, p2.y);
      mapCtx.stroke();
    }
    mapCtx.restore();
  }
}

function renderMapCanvas(nowTime) {
  drawSpaceBackground();
  drawMapBridges(nowTime);

  let sumStars = playerProgress.levelStars.reduce((a, b) => a + b, 0);
  totalStarsEl.textContent = `Total Stars: ⭐ ${sumStars}`;

  mainLevels.forEach((lvl, idx) => {
    const pos = planetPositions[idx];
    const isUnlocked = idx <= playerProgress.unlockedLevel;
    const isCompleted = playerProgress.levelStars[idx] > 0;
    const isCurrent = idx === playerProgress.unlockedLevel;

    drawPlanet(pos.x, pos.y, 26, lvl, isUnlocked, isCompleted, isCurrent, nowTime);
  });
}

let mapAnimFrameId = null;

function startMapLoop() {
  function loop(now) {
    updateSpaceBackground();

    // Update Bridge Unlock Animation
    if (bridgeAnim) {
      bridgeAnim.progress += 0.02;
      if (bridgeAnim.progress >= 1.0) {
        bridgeAnim = null; // Animation finished
      }
    }

    renderMapCanvas(now);

    if (mapScreen.style.display !== 'none') {
      mapAnimFrameId = requestAnimationFrame(loop);
    }
  }
  mapAnimFrameId = requestAnimationFrame(loop);
}

function showMapScreen() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  stopLaserHumSound();
  gameScreen.style.display = 'none';
  mapScreen.style.display = 'flex';

  if (justCompletedLevelIdx !== null) {
    bridgeAnim = { fromIdx: justCompletedLevelIdx, progress: 0.0 };
    justCompletedLevelIdx = null;
  }

  startMapLoop();
}

mapCanvas.addEventListener('click', (e) => {
  const rect = mapCanvas.getBoundingClientRect();
  const scaleX = mapCanvas.width / rect.width;
  const scaleY = mapCanvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  mainLevels.forEach((lvl, idx) => {
    const pos = planetPositions[idx];
    const dist = Math.sqrt((clickX - pos.x) ** 2 + (clickY - pos.y) ** 2);

    if (dist <= 30 && idx <= playerProgress.unlockedLevel) {
      startMainLevel(idx);
    }
  });
});

// GAME ENGINE STATE & HANDLERS
let currentMainIdx = 0;
let currentSubIdx = 0;
let activeSubConfig = null;
let grid = [];
let renderAngles = [];
let targetAngles = [];
let COLS, ROWS, TILE_SIZE, source, target;

let attemptsUsed = 0;
const MAX_ATTEMPTS = 3;
let currentLevelMinStars = 3;
let isStageWon = false;
let isStageFailed = false;

let fullPathPoints = [];
let animDistance = 0;
let totalPathLength = 0;
let isLaserAnimating = false;
let targetHitOnCurrentShot = false;

let animFrameId = null;
let lastTimestamp = 0;
let justCompletedLevelIdx = null;

function updateAttemptsUI() {
  const remaining = MAX_ATTEMPTS - attemptsUsed;
  attemptsLeftEl.textContent = `Energy Shots: ${'⚡'.repeat(remaining)}${'❌'.repeat(attemptsUsed)}`;
}

function startMainLevel(mainIdx) {
  currentMainIdx = mainIdx;
  currentSubIdx = 0;
  currentLevelMinStars = 3;
  mapScreen.style.display = 'none';
  gameScreen.style.display = 'flex';
  loadSubLevel(currentMainIdx, currentSubIdx);
}

function getAngleForTile(tile) {
  return tile === 1 ? -Math.PI / 4 : Math.PI / 4;
}

function initAngles() {
  renderAngles = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  targetAngles = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== 0) {
        let initialAngle = getAngleForTile(grid[r][c]);
        renderAngles[r][c] = initialAngle;
        targetAngles[r][c] = initialAngle;
      }
    }
  }
}

function loadSubLevel(mainIdx, subIdx) {
  currentMainIdx = mainIdx;
  currentSubIdx = subIdx;

  const currentLevelObj = mainLevels[currentMainIdx];
  activeSubConfig = currentLevelObj.sublevels[currentSubIdx];

  COLS = activeSubConfig.cols;
  ROWS = activeSubConfig.rows;
  TILE_SIZE = activeSubConfig.tileSize;
  source = { ...activeSubConfig.source };
  target = { ...activeSubConfig.target };
  grid = activeSubConfig.grid.map(row => [...row]);

  attemptsUsed = 0;
  isStageWon = false;
  isStageFailed = false;

  animDistance = 0;
  totalPathLength = 0;
  fullPathPoints = [];
  targetHitOnCurrentShot = false;
  isLaserAnimating = false;
  stopLaserHumSound();

  levelTitleEl.textContent = `Level ${activeSubConfig.name}`;
  updateAttemptsUI();

  nextBtn.textContent = (currentSubIdx < currentLevelObj.sublevels.length - 1) ? `Next Stage ➔` : `Finish Level ➔`;

  fireBtn.disabled = false;
  nextBtn.disabled = true;
  nextBtn.style.display = 'inline-block';
  restartBtn.style.display = 'none';
  statusEl.textContent = 'Plan your mirrors and click Shoot Laser';
  statusEl.className = '';

  scrambleUntilUnsolved();
  initAngles();
  startAnimationLoop();
}

function validateBoardState() {
  let currX = source.x, currY = source.y;
  let dirX = source.dx, dirY = source.dy;
  let mirrorsHit = 0;

  for (let step = 0; step < 25; step++) {
    let nextX = currX + dirX, nextY = currY + dirY;
    if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS) break;
    currX = nextX; currY = nextY;

    if (currX === target.x && currY === target.y) return false;

    let tile = grid[currY][currX];
    if (tile !== 0) {
      mirrorsHit++;
      if (mirrorsHit === 1) {
        let nextDirX = dirX, nextDirY = dirY;
        if (tile === 1) { let old = nextDirX; nextDirX = -nextDirY; nextDirY = -old; }
        else if (tile === 2) { let old = nextDirX; nextDirX = nextDirY; nextDirY = old; }

        let lookAheadX = currX + nextDirX, lookAheadY = currY + nextDirY;
        if (lookAheadX >= 0 && lookAheadX < COLS && lookAheadY >= 0 && lookAheadY < ROWS) {
          if (grid[lookAheadY][lookAheadX] !== 0 || (lookAheadX === target.x && lookAheadY === target.y)) return false;
        }
      }
      if (tile === 1) { let oldDx = dirX; dirX = -dirY; dirY = -oldDx; }
      else if (tile === 2) { let oldDx = dirX; dirX = dirY; dirY = oldDx; }
    }
  }
  return true;
}

function scrambleUntilUnsolved() {
  let attempts = 0;
  while (!validateBoardState() && attempts < 50) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== 0) grid[r][c] = Math.random() < 0.5 ? 1 : 2;
      }
    }
    attempts++;
  }
}

function computeLaserTrajectory() {
  let points = [];
  let currX = source.x, currY = source.y;
  let dirX = source.dx, dirY = source.dy;
  let isHit = false;

  points.push({ x: (currX + 0.5) * TILE_SIZE, y: (currY + 0.5) * TILE_SIZE });

  for (let step = 0; step < 25; step++) {
    let nextX = currX + dirX, nextY = currY + dirY;

    if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS) {
      points.push({ x: (currX + 0.5 + dirX * 0.5) * TILE_SIZE, y: (currY + 0.5 + dirY * 0.5) * TILE_SIZE });
      break;
    }

    currX = nextX; currY = nextY;
    points.push({ x: (currX + 0.5) * TILE_SIZE, y: (currY + 0.5) * TILE_SIZE });

    if (currX === target.x && currY === target.y) {
      isHit = true;
      break;
    }

    let tile = grid[currY][currX];
    if (tile === 1) { let oldDx = dirX; dirX = -dirY; dirY = -oldDx; }
    else if (tile === 2) { let oldDx = dirX; dirX = dirY; dirY = oldDx; }
  }

  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    let dx = points[i+1].x - points[i].x;
    let dy = points[i+1].y - points[i].y;
    totalDist += Math.sqrt(dx * dx + dy * dy);
  }

  return { points, totalDist, isHit };
}

function fireLaser() {
  if (isStageWon || isStageFailed || isLaserAnimating) return;

  attemptsUsed++;
  updateAttemptsUI();

  const res = computeLaserTrajectory();
  fullPathPoints = res.points;
  totalPathLength = res.totalDist;
  targetHitOnCurrentShot = res.isHit;

  animDistance = 0;
  isLaserAnimating = true;
  fireBtn.disabled = true;

  startLaserHumSound();
  startAnimationLoop();
}

function updateLaserAnimation(dt) {
  if (!isLaserAnimating) return false;

  const speed = 480;
  animDistance += speed * dt;

  if (animDistance >= totalPathLength) {
    animDistance = totalPathLength;
    isLaserAnimating = false;

    stopLaserHumSound();

    if (targetHitOnCurrentShot) {
      isStageWon = true;
      nextBtn.disabled = false;

      const subEarnedStars = 4 - attemptsUsed;
      currentLevelMinStars = Math.min(currentLevelMinStars, subEarnedStars);

      statusEl.textContent = `SIGNAL CONNECTED! (${'⭐'.repeat(subEarnedStars)})`;
      statusEl.className = 'win';
      playVictoryFanfare();
    } else {
      playMishitSound();
      if (attemptsUsed < MAX_ATTEMPTS) {
        fireBtn.disabled = false;
        const remaining = MAX_ATTEMPTS - attemptsUsed;
        statusEl.textContent = `MISSED! ${remaining} ATTEMPT${remaining > 1 ? 'S' : ''} LEFT!`;
        statusEl.className = 'warn';
      } else {
        isStageFailed = true;
        restartBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        statusEl.textContent = 'PIXEL TRACING FAILED! Click Restart to try again.';
        statusEl.className = 'fail';
      }
    }
  }
  return true;
}

function updateAngles() {
  let animating = false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== 0) {
        let diff = targetAngles[r][c] - renderAngles[r][c];
        if (Math.abs(diff) > 0.005) {
          renderAngles[r][c] += diff * 0.25;
          animating = true;
        } else {
          renderAngles[r][c] = targetAngles[r][c];
        }
      }
    }
  }
  return animating;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * TILE_SIZE); ctx.lineTo(COLS * TILE_SIZE, r * TILE_SIZE); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * TILE_SIZE, 0); ctx.lineTo(c * TILE_SIZE, ROWS * TILE_SIZE); ctx.stroke();
  }

  if (animDistance > 0 && fullPathPoints.length > 1) {
    let remainingDist = animDistance;
    let visiblePath = [fullPathPoints[0]];

    for (let i = 0; i < fullPathPoints.length - 1; i++) {
      let p1 = fullPathPoints[i];
      let p2 = fullPathPoints[i+1];
      let segDx = p2.x - p1.x;
      let segDy = p2.y - p1.y;
      let segLen = Math.sqrt(segDx * segDx + segDy * segDy);

      if (remainingDist >= segLen) {
        visiblePath.push(p2);
        remainingDist -= segLen;
      } else {
        let ratio = remainingDist / segLen;
        visiblePath.push({ x: p1.x + segDx * ratio, y: p1.y + segDy * ratio });
        break;
      }
    }

    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 15;
    visiblePath.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Source Emitter Node with Breathing Glow
  let ex = (source.x + 0.5) * TILE_SIZE;
  let ey = (source.y + 0.5) * TILE_SIZE;
  let radius = TILE_SIZE * 0.22;

  let glowBlur = 10 + Math.sin(performance.now() * 0.005) * 6;

  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = glowBlur;
  ctx.beginPath();
  ctx.arc(ex, ey, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  let arrowLen = TILE_SIZE * 0.32;
  let tipX = ex + source.dx * arrowLen;
  let tipY = ey + source.dy * arrowLen;
  let angle = Math.atan2(source.dy, source.dx);
  let headLen = TILE_SIZE * 0.1;

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headLen * Math.cos(angle - Math.PI / 6), tipY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tipX - headLen * Math.cos(angle + Math.PI / 6), tipY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isStageWon ? '#22c55e' : '#475569';
  ctx.beginPath();
  ctx.arc((target.x + 0.5) * TILE_SIZE, (target.y + 0.5) * TILE_SIZE, TILE_SIZE * 0.22, 0, Math.PI * 2);
  ctx.fill();
  if (isStageWon) {
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 0) continue;

      let cx = (c + 0.5) * TILE_SIZE;
      let cy = (r + 0.5) * TILE_SIZE;
      let offset = TILE_SIZE * 0.28;
      let currentAngle = renderAngles[r][c];

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentAngle);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-offset, 0);
      ctx.lineTo(offset, 0);
      ctx.stroke();

      ctx.restore();
    }
  }
}

function startAnimationLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  lastTimestamp = performance.now();

  function loop(now) {
    let dt = (now - lastTimestamp) / 1000;
    lastTimestamp = now;
    if (dt > 0.1) dt = 0.1;

    updateAngles();
    updateLaserAnimation(dt);

    draw();

    if (gameScreen.style.display !== 'none') {
      animFrameId = requestAnimationFrame(loop);
    }
  }
  animFrameId = requestAnimationFrame(loop);
}

canvas.addEventListener('click', (e) => {
  if (isStageFailed || isStageWon || isLaserAnimating) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
  const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);

  if (x === source.x && y === source.y) {
    fireLaser();
    return;
  }

  if (x >= 0 && x < COLS && y >= 0 && y < ROWS && grid[y][x] !== 0) {
    playRotateSound();

    grid[y][x] = grid[y][x] === 1 ? 2 : 1;
    targetAngles[y][x] += Math.PI / 2;

    animDistance = 0;
    stopLaserHumSound();

    startAnimationLoop();
  }
});

fireBtn.addEventListener('click', fireLaser);
restartBtn.addEventListener('click', () => loadSubLevel(currentMainIdx, currentSubIdx));
nextBtn.addEventListener('click', () => {
  const currentSublevels = mainLevels[currentMainIdx].sublevels;

  if (currentSubIdx < currentSublevels.length - 1) {
    loadSubLevel(currentMainIdx, currentSubIdx + 1);
  } else {
    playerProgress.levelStars[currentMainIdx] = Math.max(playerProgress.levelStars[currentMainIdx], currentLevelMinStars);
    playerProgress.unlockedLevel = Math.max(playerProgress.unlockedLevel, currentMainIdx + 1);
    justCompletedLevelIdx = currentMainIdx;

    showMapScreen();
  }
});
mapBackBtn.addEventListener('click', showMapScreen);

showMapScreen();