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
    theme: { type: 'earth', base: '#0ea5e9', secondary: '#0369a1', atmosphere: '#38bdf8', ring: false },
    sublevels: [
      { name: "1.1", cols: 2, rows: 2, tileSize: 120, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 1, y: 1 }, grid: [[0, 2], [0, 0]] },
      { name: "1.2", cols: 2, rows: 2, tileSize: 120, source: { x: 0, y: 0, dx: 0, dy: 1 }, target: { x: 1, y: 1 }, grid: [[0, 0], [2, 0]] }
    ]
  },
  {
    id: 2,
    name: "Golden Gas Giant",
    theme: { type: 'gas', base: '#d97706', secondary: '#78350f', atmosphere: '#fbbf24', ring: true },
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
    theme: { type: 'alien', base: '#059669', secondary: '#064e3b', atmosphere: '#34d399', ring: false },
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
    theme: { type: 'lava', base: '#dc2626', secondary: '#450a0a', atmosphere: '#f87171', ring: false },
    sublevels: [
      { name: "4.1", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 0, 2, 0], [1, 0, 2, 0], [1, 0, 0, 2], [0, 0, 0, 0]] },
      { name: "4.2", cols: 4, rows: 4, tileSize: 60, source: { x: 0, y: 0, dx: 1, dy: 0 }, target: { x: 3, y: 3 }, grid: [[0, 0, 0, 2], [0, 1, 0, 2], [0, 1, 2, 0], [0, 0, 1, 0]] }
    ]
  },
  {
    id: 5,
    name: "Violet Void Realm",
    theme: { type: 'void', base: '#7c3aed', secondary: '#3b0764', atmosphere: '#c084fc', ring: true },
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

// DYNAMIC CANVAS RESIZING TO PREVENT OVAL DISTORTION
function syncMapCanvasResolution() {
  const rect = mapCanvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    if (mapCanvas.width !== rect.width || mapCanvas.height !== rect.height) {
      mapCanvas.width = rect.width;
      mapCanvas.height = rect.height;
    }
  }
}

// PLANET POSITIONS (AS PERCENTAGE OF CANVAS SIZE TO FIT ANY ASPECT RATIO PERFECTLY)
const planetPosRatios = [
  { rx: 0.50, ry: 0.84 }, // Level 1
  { rx: 0.28, ry: 0.66 }, // Level 2
  { rx: 0.72, ry: 0.48 }, // Level 3
  { rx: 0.32, ry: 0.30 }, // Level 4
  { rx: 0.62, ry: 0.12 }  // Level 5
];

// SPACE BACKGROUND SYSTEM
const stars = Array.from({ length: 70 }, () => ({
  rx: Math.random(),
  ry: Math.random(),
  speed: 0.0005 + Math.random() * 0.002,
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
      rx: Math.random() * 0.5,
      ry: Math.random() * 0.5,
      vx: 0.015,
      vy: 0.01,
      life: 0,
      maxLife: 40
    };
  } else if (choice === 'astronaut') {
    spaceEntity = {
      type: 'astronaut',
      rx: Math.random() * 0.8,
      ry: -0.05,
      vy: 0.002,
      vx: 0.0008,
      rot: 0,
      vRot: 0.02
    };
  } else if (choice === 'comet') {
    spaceEntity = {
      type: 'comet',
      rx: -0.05,
      ry: Math.random() * 0.5,
      vx: 0.008,
      vy: 0.005,
      tail: []
    };
  } else if (choice === 'satellite') {
    spaceEntity = {
      type: 'satellite',
      rx: 1.05,
      ry: Math.random() * 0.6,
      vx: -0.002,
      vy: 0.001,
      rot: 0
    };
  }
}

function updateSpaceBackground() {
  const w = mapCanvas.width;
  const h = mapCanvas.height;

  stars.forEach(s => {
    s.ry += s.speed;
    if (s.ry > 1.0) {
      s.ry = 0;
      s.rx = Math.random();
    }
  });

  spaceEntityTimer++;
  if (!spaceEntity && spaceEntityTimer > 260) {
    spawnSpaceEntity();
    spaceEntityTimer = 0;
  }

  if (spaceEntity) {
    if (spaceEntity.type === 'shooting_star') {
      spaceEntity.rx += spaceEntity.vx;
      spaceEntity.ry += spaceEntity.vy;
      spaceEntity.life++;
      if (spaceEntity.life >= spaceEntity.maxLife) spaceEntity = null;
    } else if (spaceEntity.type === 'astronaut') {
      spaceEntity.rx += spaceEntity.vx;
      spaceEntity.ry += spaceEntity.vy;
      spaceEntity.rot += spaceEntity.vRot;
      if (spaceEntity.ry > 1.1) spaceEntity = null;
    } else if (spaceEntity.type === 'comet') {
      spaceEntity.rx += spaceEntity.vx;
      spaceEntity.ry += spaceEntity.vy;
      spaceEntity.tail.push({ x: spaceEntity.rx * w, y: spaceEntity.ry * h });
      if (spaceEntity.tail.length > 15) spaceEntity.tail.shift();
      if (spaceEntity.rx > 1.1 || spaceEntity.ry > 1.1) spaceEntity = null;
    } else if (spaceEntity.type === 'satellite') {
      spaceEntity.rx += spaceEntity.vx;
      spaceEntity.ry += spaceEntity.vy;
      spaceEntity.rot += 0.01;
      if (spaceEntity.rx < -0.1 || spaceEntity.ry > 1.1) spaceEntity = null;
    }
  }
}

function drawSpaceBackground() {
  const w = mapCanvas.width;
  const h = mapCanvas.height;

  mapCtx.fillStyle = '#020617';
  mapCtx.fillRect(0, 0, w, h);

  stars.forEach(s => {
    mapCtx.fillStyle = `rgba(248, 250, 252, ${s.alpha})`;
    mapCtx.beginPath();
    mapCtx.arc(s.rx * w, s.ry * h, s.size, 0, Math.PI * 2);
    mapCtx.fill();
  });

  if (spaceEntity) {
    const ex = spaceEntity.rx * w;
    const ey = spaceEntity.ry * h;

    if (spaceEntity.type === 'shooting_star') {
      mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.moveTo(ex, ey);
      mapCtx.lineTo(ex - spaceEntity.vx * w * 3, ey - spaceEntity.vy * h * 3);
      mapCtx.stroke();
    } else if (spaceEntity.type === 'astronaut') {
      mapCtx.save();
      mapCtx.translate(ex, ey);
      mapCtx.rotate(spaceEntity.rot);
      mapCtx.fillStyle = '#f8fafc';
      mapCtx.beginPath(); mapCtx.arc(0, -3, 4, 0, Math.PI * 2); mapCtx.fill();
      mapCtx.fillStyle = '#0284c7';
      mapCtx.fillRect(-2, -2, 4, 2);
      mapCtx.fillStyle = '#cbd5e1';
      mapCtx.fillRect(-3, 1, 6, 6);
      mapCtx.restore();
    } else if (spaceEntity.type === 'comet') {
      spaceEntity.tail.forEach((t, idx) => {
        let r = (idx / spaceEntity.tail.length) * 4;
        mapCtx.fillStyle = `rgba(56, 189, 248, ${idx / spaceEntity.tail.length})`;
        mapCtx.beginPath(); mapCtx.arc(t.x, t.y, r, 0, Math.PI * 2); mapCtx.fill();
      });
    } else if (spaceEntity.type === 'satellite') {
      mapCtx.save();
      mapCtx.translate(ex, ey);
      mapCtx.rotate(spaceEntity.rot);
      mapCtx.fillStyle = '#64748b';
      mapCtx.fillRect(-4, -4, 8, 8);
      mapCtx.fillStyle = '#0284c7';
      mapCtx.fillRect(-12, -2, 7, 4); mapCtx.fillRect(5, -2, 7, 4);
      mapCtx.restore();
    }
  }
}

let bridgeAnim = null;

// HIGH-QUALITY 3D PLANET PROCEDURAL SHADER & TEXTURE ENGINE
function draw3DPlanet(x, y, radius, levelObj, isUnlocked, isCompleted, isCurrent, nowTime) {
  const rotOffset = (nowTime * 0.015) % (radius * 2);

  // 1. BACK RING PASS (Renders behind the planet body for 3D depth wrapping)
  if (levelObj.theme.ring && isUnlocked) {
    mapCtx.save();
    mapCtx.translate(x, y);
    mapCtx.rotate(-Math.PI / 7);
    mapCtx.strokeStyle = levelObj.theme.atmosphere;
    mapCtx.lineWidth = 6;
    mapCtx.globalAlpha = 0.55;
    mapCtx.beginPath();
    mapCtx.ellipse(0, 0, radius * 1.85, radius * 0.42, 0, Math.PI, Math.PI * 2); // Top Back Arc
    mapCtx.stroke();
    mapCtx.restore();
  }

  // 2. ATMOSPHERIC SHADOW GLOW / RIM
  if (isUnlocked) {
    mapCtx.save();
    mapCtx.shadowColor = levelObj.theme.atmosphere;
    mapCtx.shadowBlur = isCurrent ? 26 + Math.sin(nowTime * 0.005) * 6 : 14;
    mapCtx.fillStyle = levelObj.theme.base;
    mapCtx.beginPath();
    mapCtx.arc(x, y, radius, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.restore();
  }

  // 3. PLANET SPHERE & MOVING SURFACE TEXTURES
  mapCtx.save();
  mapCtx.beginPath();
  mapCtx.arc(x, y, radius, 0, Math.PI * 2); // Clip texture strictly inside perfect circle
  mapCtx.clip();

  if (isUnlocked) {
    // Base Color Fill
    mapCtx.fillStyle = levelObj.theme.secondary;
    mapCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    // Procedural Moving Surface Details (Simulates 3D Planet Rotation)
    mapCtx.fillStyle = levelObj.theme.base;
    mapCtx.globalAlpha = 0.65;

    for (let i = -2; i <= 2; i++) {
      let stripeY = y + i * (radius * 0.38);
      let stripeX = x - radius + ((rotOffset + i * 18) % (radius * 2));

      mapCtx.beginPath();
      mapCtx.ellipse(stripeX, stripeY, radius * 0.8, radius * 0.18, 0, 0, Math.PI * 2);
      mapCtx.ellipse(stripeX - radius * 2, stripeY, radius * 0.8, radius * 0.18, 0, 0, Math.PI * 2);
      mapCtx.fill();
    }

    // 3D SPHERICAL SHADING OVERLAY (Realistic Light Source from Top-Left)
    let shadowGrad = mapCtx.createRadialGradient(
      x - radius * 0.45, y - radius * 0.45, radius * 0.1,
      x + radius * 0.2, y + radius * 0.2, radius * 1.05
    );
    shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)'); // Specular Light Spot
    shadowGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.0)'); // Midtone Transition
    shadowGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.55)');     // Dark Shadow Side
    shadowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.90)');      // Deep Night Side

    mapCtx.globalAlpha = 1.0;
    mapCtx.fillStyle = shadowGrad;
    mapCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  } else {
    // Locked Planet Grey Shading
    let lockedGrad = mapCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
    lockedGrad.addColorStop(0, '#64748b');
    lockedGrad.addColorStop(1, '#0f172a');
    mapCtx.fillStyle = lockedGrad;
    mapCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  mapCtx.restore(); // Exit sphere clipping

  // 4. FRONT RING PASS (Renders in front of the planet for true 3D depth)
  if (levelObj.theme.ring && isUnlocked) {
    mapCtx.save();
    mapCtx.translate(x, y);
    mapCtx.rotate(-Math.PI / 7);
    mapCtx.strokeStyle = levelObj.theme.atmosphere;
    mapCtx.lineWidth = 6;
    mapCtx.globalAlpha = 0.9;
    mapCtx.beginPath();
    mapCtx.ellipse(0, 0, radius * 1.85, radius * 0.42, 0, 0, Math.PI); // Bottom Front Arc
    mapCtx.stroke();
    mapCtx.restore();
  }

  // 5. TEXT / ICON LABELS
  mapCtx.save();
  mapCtx.fillStyle = isUnlocked ? '#ffffff' : '#94a3b8';
  mapCtx.font = 'bold 16px system-ui';
  mapCtx.textAlign = 'center';
  mapCtx.textBaseline = 'middle';
  mapCtx.fillText(isUnlocked ? levelObj.id : '🔒', x, y);

  // Star Ratings Below Completed Planet
  if (isCompleted) {
    let starsStr = '⭐'.repeat(playerProgress.levelStars[levelObj.id - 1]);
    mapCtx.font = '12px system-ui';
    mapCtx.fillText(starsStr, x, y + radius + 15);
  }
  mapCtx.restore();
}

function drawMapBridges(nowTime) {
  const w = mapCanvas.width;
  const h = mapCanvas.height;

  for (let i = 0; i < mainLevels.length - 1; i++) {
    const p1 = { x: planetPosRatios[i].rx * w, y: planetPosRatios[i].ry * h };
    const p2 = { x: planetPosRatios[i + 1].rx * w, y: planetPosRatios[i + 1].ry * h };
    const isUnlocked = i + 1 <= playerProgress.unlockedLevel;

    mapCtx.save();
    if (bridgeAnim && bridgeAnim.fromIdx === i) {
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
      mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      mapCtx.lineWidth = 4;
      mapCtx.setLineDash([8, 6]);
      mapCtx.lineDashOffset = -nowTime * 0.02;
      mapCtx.beginPath();
      mapCtx.moveTo(p1.x, p1.y);
      mapCtx.lineTo(p2.x, p2.y);
      mapCtx.stroke();
    } else {
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
  syncMapCanvasResolution();

  const w = mapCanvas.width;
  const h = mapCanvas.height;
  const planetRadius = Math.min(w, h) * 0.085; // Perfectly round scaling radius

  drawSpaceBackground();
  drawMapBridges(nowTime);

  let sumStars = playerProgress.levelStars.reduce((a, b) => a + b, 0);
  totalStarsEl.textContent = `Total Stars: ⭐ ${sumStars}`;

  mainLevels.forEach((lvl, idx) => {
    const pos = { x: planetPosRatios[idx].rx * w, y: planetPosRatios[idx].ry * h };
    const isUnlocked = idx <= playerProgress.unlockedLevel;
    const isCompleted = playerProgress.levelStars[idx] > 0;
    const isCurrent = idx === playerProgress.unlockedLevel;

    draw3DPlanet(pos.x, pos.y, planetRadius, lvl, isUnlocked, isCompleted, isCurrent, nowTime);
  });
}

let mapAnimFrameId = null;

function startMapLoop() {
  function loop(now) {
    updateSpaceBackground();

    if (bridgeAnim) {
      bridgeAnim.progress += 0.02;
      if (bridgeAnim.progress >= 1.0) {
        bridgeAnim = null;
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

  const w = mapCanvas.width;
  const h = mapCanvas.height;
  const planetRadius = Math.min(w, h) * 0.085;

  mainLevels.forEach((lvl, idx) => {
    const pos = { x: planetPosRatios[idx].rx * w, y: planetPosRatios[idx].ry * h };
    const dist = Math.sqrt((clickX - pos.x) ** 2 + (clickY - pos.y) ** 2);

    if (dist <= planetRadius * 1.3 && idx <= playerProgress.unlockedLevel) {
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