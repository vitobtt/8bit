// ============================================================
//  PIZZA PANZA - Snake de 8 bits con un pizzero glotón
//  Todo corre en el navegador: no hace falta servidor.
// ============================================================
const $ = s => document.querySelector(s);
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const FONT = '"Press Start 2P", "Courier New", monospace';

// ---- Ajustes del juego ----
const CELL = 32;                       // tamaño de casilla en píxeles
const COLS = canvas.width / CELL;      // 30
const ROWS = canvas.height / CELL;     // 20
const START = { x: 6, y: 10, len: 3 }; // punto de inicio del pizzero
const BASE_KG = 70;
const COMBO_MS = 5000;                 // tiempo para encadenar pizzas
const SEGS_PER_LEVEL = 5;              // cada 5 casillas de tamaño, nivel nuevo
const BASE_TICK = 150;                 // ms por paso con el tamaño inicial
const MIN_TICK = 55;                   // velocidad máxima
const FEVER_MS = 6000;                 // duración del efecto guindilla
const GAS_MAX = 10;                    // pizzas para llenar la barra de gases
const BURP_STEPS = 5;                  // casillas que sale disparado con el eructo turbo
const GHOST_STEPS = 3;                 // pasos extra atravesando su barriga tras el eructo
const CHAOS_MS = 6000;                 // duración del efecto de la piña

const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ------------------------------------------------------------
//  Guardado local (récords, logros, pizzero elegido)
// ------------------------------------------------------------
const SAVE_KEY = 'pizzapanza-v1';
const save = loadSave();
function loadSave() {
  const def = { name: '', best: 0, top: [], ach: {}, skin: 'clasico', pizzas: 0, games: 0, muted: false };
  try { return { ...def, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { return def; }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

// ------------------------------------------------------------
//  Logros y pizzeros desbloqueables
// ------------------------------------------------------------
const ACHS = [
  { id: 'first',     name: 'PRIMER BOCADO',       desc: 'Come tu primera pizza',           test: r => r.pizzas >= 1 },
  { id: 'p10',       name: 'CON HAMBRE',          desc: '10 pizzas en una partida',        test: r => r.pizzas >= 10 },
  { id: 'chili',     name: '¡PICA PICA!',         desc: 'Cómete una guindilla',            test: r => r.chilis >= 1 },
  { id: 'burp',      name: '¡BUUURP!',            desc: 'Suelta un eructo turbo',          test: r => r.burps >= 1 },
  { id: 'p25',       name: 'BUEN SAQUE',          desc: '25 pizzas en una partida',        test: r => r.pizzas >= 25 },
  { id: 'combo5',    name: 'MÁQUINA DE COMBOS',   desc: 'Consigue un combo x5',            test: r => r.bestCombo >= 5 },
  { id: 'gold3',     name: 'FIEBRE DEL ORO',      desc: '3 pizzas doradas en una partida', test: r => r.golds >= 3 },
  { id: 'pina3',     name: 'SIN MIEDO A LA PIÑA', desc: 'Come 3 piñas en una partida',     test: r => r.pinas >= 3 },
  { id: 'lvl5',      name: 'VELOCISTA',           desc: 'Llega al nivel 5',                test: r => r.level >= 5 },
  { id: 'kg150',     name: 'PESO PESADO',         desc: 'Llega a 150 kg',                  test: r => r.kg >= 150 },
  { id: 'score3000', name: 'MAESTRO PIZZERO',     desc: 'Haz 3000 puntos',                 test: r => r.score >= 3000 },
  { id: 'p50',       name: 'ESTÓMAGO SIN FONDO',  desc: '50 pizzas en una partida',        test: r => r.pizzas >= 50 },
  { id: 'games10',   name: 'CLIENTE FIEL',        desc: 'Juega 10 partidas',               test: () => save.games >= 10 },
  { id: 'total200',  name: 'LEYENDA DE LA PIZZA', desc: '200 pizzas en total',             test: () => save.pizzas >= 200 },
];

const SKINS = [
  { id: 'clasico', name: 'CLÁSICO',    req: null,        hat: '#fff1e8', hatD: '#c2c3c7', coat: '#fff1e8', coatD: '#c2c3c7', trim: '#ff004d', skin: '#ffccaa', hair: '#5f3a1e' },
  { id: 'napoli',  name: 'NAPOLITANO', req: 'p10',       hat: '#fff1e8', hatD: '#c2c3c7', coat: '#00e436', coatD: '#008751', trim: '#ff004d', skin: '#ffccaa', hair: '#1a1a1a' },
  { id: 'picante', name: 'PICANTE',    req: 'chili',     hat: '#ff004d', hatD: '#7e2553', coat: '#ff004d', coatD: '#7e2553', trim: '#ffec27', skin: '#ffccaa', hair: '#1a1a1a' },
  { id: 'ninja',   name: 'NINJA',      req: 'combo5',    hat: '#5f574f', hatD: '#333333', coat: '#5f574f', coatD: '#333333', trim: '#ff004d', skin: '#ffccaa', hair: '#1a1a1a' },
  { id: 'hawai',   name: 'HAWAIANO',   req: 'pina3',     hat: '#ffec27', hatD: '#ffa300', coat: '#29adff', coatD: '#065ab5', trim: '#ff77a8', skin: '#ffccaa', hair: '#5f3a1e' },
  { id: 'oro',     name: 'DORADO',     req: 'score3000', hat: '#ffec27', hatD: '#ffa300', coat: '#ffa300', coatD: '#ab5236', trim: '#fff1e8', skin: '#ffccaa', hair: '#ab5236' },
  { id: 'galaxia', name: 'GALÁCTICO',  req: 'total200',  hat: '#83769c', hatD: '#1d2b53', coat: '#7e2553', coatD: '#1d2b53', trim: '#29adff', skin: '#c2f0ff', hair: '#29adff' },
];
const skinUnlocked = s => !s.req || !!save.ach[s.req];
const currentSkin = () => SKINS.find(s => s.id === save.skin && skinUnlocked(s)) || SKINS[0];

// ------------------------------------------------------------
//  Sonido 8 bits (WebAudio, sin archivos)
// ------------------------------------------------------------
let actx = null;
function initAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep(freq, dur, { type = 'square', vol = 0.07, slide = 0, delay = 0 } = {}) {
  if (!actx || save.muted) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
const sfx = {
  // Cuanto más largo el combo, más aguda la nota: da gusto encadenar.
  eat: combo => {
    const f = 392 * Math.pow(2, Math.min(combo - 1, 12) / 12);
    beep(f, 0.06); beep(f * 1.5, 0.08, { delay: 0.05 });
  },
  gold: () => [784, 988, 1175, 1568].forEach((f, i) => beep(f, 0.08, { delay: i * 0.05, vol: 0.06 })),
  chili: () => beep(200, 0.35, { type: 'sawtooth', slide: 900, vol: 0.06 }),
  salad: () => [330, 262, 196].forEach((f, i) => beep(f, 0.14, { delay: i * 0.1, type: 'triangle', vol: 0.1 })),
  level: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.12, { delay: i * 0.09 })),
  ach: () => [659, 784, 1046, 1318].forEach((f, i) => beep(f, 0.1, { delay: i * 0.07, type: 'triangle', vol: 0.12 })),
  death: () => [440, 330, 220, 110].forEach((f, i) => beep(f, 0.14, { delay: i * 0.11, vol: 0.07 })),
  record: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => beep(f, 0.14, { delay: 0.6 + i * 0.12 })),
  go: () => beep(1046, 0.15),
  // Eructo: ráfaga de notas graves y desafinadas
  burp: () => { for (let k = 0; k < 7; k++) beep(70 + Math.random() * 50, 0.08, { type: 'sawtooth', vol: 0.14, delay: k * 0.045, slide: -25 }); },
  gasReady: () => { beep(330, 0.1, { type: 'triangle', vol: 0.1 }); beep(494, 0.14, { type: 'triangle', vol: 0.1, delay: 0.1 }); },
  pina: () => [880, 440, 990, 330, 1320, 262].forEach((f, i) => beep(f, 0.07, { delay: i * 0.05, type: 'triangle', vol: 0.1 })),
};

// ------------------------------------------------------------
//  Sprites de píxel (8x8, cada letra es un color)
// ------------------------------------------------------------
const PIZZA = [
  '..cccc..',
  '.cyyyyc.',
  'cyrryyyc',
  'cyyyyrrc',
  'cyrryyyc',
  'cyyyrryc',
  '.cyyyyc.',
  '..cccc..',
];
const CHILI = [
  '......g.',
  '.....gg.',
  '....rr..',
  '...rwr..',
  '..rrrr..',
  '.rrrr...',
  '.rrr....',
  'rr......',
];
const SALAD = [
  '........',
  '.gGgGgg.',
  'gGgGgGgg',
  'GgGrGgGG',
  'wwwwwwww',
  '.wwwwww.',
  '..wwww..',
  '........',
];
const PINA = [
  '..g.g...',
  '...gg.g.',
  '..yyyy..',
  '.yoyoyy.',
  '.yyoyoy.',
  '.yoyoyy.',
  '.yyoyoy.',
  '..yyyy..',
];
const OVEN = [
  'bbbbbbbb',
  'bBbbBbbB',
  'bbbbbbbb',
  'b......b',
  'b.fFfF.b',
  'bfFfFfFb',
  'bbbbbbbb',
  'BbbBbbBb',
];
const PAL = {
  pizza:  { c: '#ab5236', y: '#ffec27', r: '#ff004d' },
  gold:   { c: '#ffa300', y: '#ffec27', r: '#fff1e8' },
  chili:  { g: '#00e436', r: '#ff004d', w: '#fff1e8' },
  salad:  { g: '#00e436', G: '#008751', r: '#ff004d', w: '#c2c3c7' },
  oven:   { b: '#5f574f', B: '#ab5236', f: '#ffa300', F: '#ff004d' },
  pina:   { g: '#00e436', y: '#ffec27', o: '#ab5236' },
};

function drawSprite(g, rows, pal, x, y, px) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(Math.round(x + c * px), Math.round(y + r * px), Math.ceil(px), Math.ceil(px));
    }
  }
}

// Cabeza del pizzero: gorro, bigote y mofletes. Mira hacia donde va.
function headRows(dir, chomp) {
  const eyeShift = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const eyes = 'SSSSSSSS'.split('');
  eyes[2 + eyeShift] = 'E';
  eyes[5 + eyeShift] = 'E';
  return [
    '..HHHH..',
    '.HHHHHH.',
    '.HHHHHH.',
    '.hhhhhh.',
    '.KSSSSK.',
    eyes.join(''),
    'SCMMMMCS',
    chomp ? '.SSOOSS.' : '.SSSSSS.',
  ];
}
function drawHead(g, skin, cx, cy, size, dir, chomp) {
  const px = size / 8;
  const pal = { H: skin.hat, h: skin.hatD, S: skin.skin, K: skin.hair, E: '#000', C: '#ff77a8', M: skin.hair, O: '#7e2553' };
  drawSprite(g, headRows(dir, chomp), pal, cx - size / 2, cy - size / 2, px);
}

// Suelo de la pizzería, pre-dibujado una sola vez
const floor = document.createElement('canvas');
floor.width = canvas.width; floor.height = canvas.height;
(() => {
  const g = floor.getContext('2d');
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = (x + y) % 2 ? '#2b1620' : '#3a1d27';
      g.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  g.strokeStyle = '#7e2553';
  g.lineWidth = 4;
  g.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
})();

// ------------------------------------------------------------
//  Estado de la partida
// ------------------------------------------------------------
// state: 'menu' | 'ready' | 'play' | 'pause' | 'dying' | 'over'
let state = 'menu';
let run = null;
let stateAt = 0;
let acc = 0, lastFrame = 0;
let particles = [], texts = [];
let shake = { until: 0, power: 0 };
let banner = null;       // texto grande temporal ("NIVEL 3")
let chompUntil = 0;

const now = () => performance.now();

function newRun() {
  const body = [];
  for (let i = 0; i < START.len; i++) body.push({ x: START.x - i, y: START.y });
  run = {
    body, dir: 'right', queue: [], grow: 0,
    score: 0, pizzas: 0, golds: 0, chilis: 0, pinas: 0, burps: 0, kg: BASE_KG, level: 1,
    combo: 0, bestCombo: 0, lastEat: -1e9, feverUntil: 0,
    gas: 0, dash: 0, ghost: 0, chaos: null, steps: 0,
    items: [], ovens: [], newAchs: [], deathReason: '',
    startBest: save.best,
  };
  spawnItem('pizza');
  particles = []; texts = []; banner = null;
}

function startGame() {
  initAudio();
  const name = $('#nameInput').value.trim().toUpperCase();
  save.name = name || 'PIZZERO';
  save.games++;
  persist();
  newRun();
  checkAchs();
  setState('ready');
  showOverlay(null);
  // Quita el foco de botones/inputs para que ESPACIO no los vuelva a pulsar en plena partida
  if (document.activeElement) document.activeElement.blur();
}

function setState(s) { state = s; stateAt = now(); }

// Tamaño contando lo que aún está creciendo
function size() { return run.body.length + run.grow; }

// La dificultad va con el tamaño: cada casilla que crece el pizzero lo acelera un poco.
// Si adelgaza con una ensalada, también frena.
function tickMs() {
  if (run.dash > 0) return 28;         // eructo turbo: sale disparado
  const base = Math.max(MIN_TICK, BASE_TICK * Math.pow(0.98, size() - START.len));
  return now() < run.feverUntil ? base * 0.75 : base;
}

function fatStage() { return Math.min(5, Math.floor((run.kg - BASE_KG) / 12)); }

function occupied(x, y) {
  return run.body.some(s => s.x === x && s.y === y)
    || run.ovens.some(o => o.x === x && o.y === y)
    || run.items.some(i => i.x === x && i.y === y);
}

function freeCell(minDistFromHead = 3, avoidAhead = false) {
  const h = run.body[0];
  const v = DIRS[run.dir];
  for (let tries = 0; tries < 500; tries++) {
    const x = 1 + Math.floor(Math.random() * (COLS - 2));
    const y = 1 + Math.floor(Math.random() * (ROWS - 2));
    if (occupied(x, y)) continue;
    if (Math.abs(x - h.x) + Math.abs(y - h.y) < minDistFromHead) continue;
    // No poner hornos justo en la trayectoria del pizzero
    if (avoidAhead && (v.x ? y === h.y && Math.sign(x - h.x) === v.x : x === h.x && Math.sign(y - h.y) === v.y)) continue;
    return { x, y };
  }
  return null;
}

const ITEM_LIFE = { gold: 6000, chili: 7000, salad: 9000, pina: 8000 };
function spawnItem(type) {
  const c = freeCell(type === 'salad' ? 4 : 3);
  if (!c) return;
  // Cuanto más alto el nivel, menos duran los objetos especiales (mínimo la mitad)
  const life = ITEM_LIFE[type] ? ITEM_LIFE[type] * Math.max(0.5, 1 - (run.level - 1) * 0.06) : 0;
  run.items.push({ type, ...c, born: now(), until: life ? now() + life : 0 });
}
const hasItem = t => run.items.some(i => i.type === t);

function rollSpecials() {
  if (!hasItem('gold') && Math.random() < 0.13) spawnItem('gold');
  if (!hasItem('chili') && run.level >= 2 && Math.random() < 0.09) spawnItem('chili');
  if (!hasItem('salad') && run.pizzas >= 5 && Math.random() < 0.14) spawnItem('salad');
  if (!hasItem('pina') && run.level >= 2 && Math.random() < 0.1) spawnItem('pina');
}

// ------------------------------------------------------------
//  Piña: efecto de caos aleatorio
// ------------------------------------------------------------
const CHAOS = [
  { id: 'reves',  text: '¡CONTROLES AL REVÉS!', color: '#ff77a8' },
  { id: 'vuelta', text: '¡EL MUNDO DEL REVÉS!', color: '#29adff' },
  { id: 'huida',  text: '¡LAS PIZZAS HUYEN!',   color: '#ffa300' },
  { id: 'lluvia', text: '¡LLUEVEN PIZZAS!',     color: '#ffec27' },
];
const chaosOn = id => !!run && !!run.chaos && run.chaos.id === id && now() < run.chaos.until;

function startChaos() {
  const c = CHAOS[Math.floor(Math.random() * CHAOS.length)];
  run.chaos = { ...c, until: now() + CHAOS_MS };
  showBanner(`PIÑA: ${c.text}`, c.color);
  shakeScreen(300, 6);
  if (c.id === 'lluvia') {
    // Pizzas extra que caen del cielo y desaparecen al acabar el efecto
    for (let k = 0; k < 6; k++) {
      const cell = freeCell(2);
      if (!cell) break;
      run.items.push({ type: 'pizza', ...cell, born: now(), until: run.chaos.until, extra: true });
      burst(cell.x * CELL + CELL / 2, cell.y * CELL, ['#ffec27', '#ff004d'], 6);
    }
  }
}

// Las pizzas se alejan una casilla del pizzero (cada dos pasos, para que se puedan alcanzar)
function fleeItems() {
  const h = run.body[0];
  for (const it of run.items) {
    if (it.type !== 'pizza' && it.type !== 'gold') continue;
    let best = null, bestD = Math.abs(it.x - h.x) + Math.abs(it.y - h.y);
    for (const v of Object.values(DIRS)) {
      const x = it.x + v.x, y = it.y + v.y;
      if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1 || occupied(x, y)) continue;
      const d = Math.abs(x - h.x) + Math.abs(y - h.y);
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    if (best) { it.x = best.x; it.y = best.y; }
  }
}

// ------------------------------------------------------------
//  Eructo turbo
// ------------------------------------------------------------
function addGas(n) {
  const wasFull = run.gas >= GAS_MAX;
  run.gas = Math.min(GAS_MAX, run.gas + n);
  if (!wasFull && run.gas >= GAS_MAX) {
    sfx.gasReady();
    showBanner('¡GASES A TOPE! ESPACIO = ERUCTO', '#00e436');
  }
}

function burp() {
  if (state !== 'play' || run.gas < GAS_MAX || run.dash > 0) return;
  run.gas = 0;
  run.burps++;
  run.dash = BURP_STEPS;
  run.ghost = BURP_STEPS + GHOST_STEPS;
  acc = 0;
  const h = run.body[0];
  const cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
  floatText('¡BUUURP!', cx, cy - 24, '#00e436');
  burst(cx, cy, ['#00e436', '#a8e72e', '#008751'], 24);
  shakeScreen(300, 7);
  sfx.burp();
  checkAchs();
}

// ------------------------------------------------------------
//  Lógica de cada paso
// ------------------------------------------------------------
function queueDir(d) {
  if (chaosOn('reves')) d = OPP[d];
  if (state === 'ready' && run.queue.length === 0 && d !== OPP[run.dir]) { run.dir = d; return; }
  if (state !== 'play' && state !== 'ready') return;
  const last = run.queue.length ? run.queue[run.queue.length - 1] : run.dir;
  if (d === last || d === OPP[last] || run.queue.length >= 3) return;
  run.queue.push(d);
}

function step() {
  if (run.queue.length) run.dir = run.queue.shift();
  const v = DIRS[run.dir];
  const h = run.body[0];
  const nx = h.x + v.x, ny = h.y + v.y;
  // La cola se mueve en este mismo paso, salvo que esté creciendo
  const bodyToCheck = run.grow > 0 ? run.body : run.body.slice(0, -1);

  const ghost = run.ghost > 0;         // tras el eructo atraviesa su barriga y los hornos

  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
    if (run.dash > 0) { run.dash = 0; return; }   // el eructo frena en seco contra la pared
    return die('¡TE HAS COMIDO LA PARED!');
  }
  if (!ghost && bodyToCheck.some(s => s.x === nx && s.y === ny)) return die('¡TE HAS MORDIDO LA BARRIGA!');
  if (!ghost && run.ovens.some(o => o.x === nx && o.y === ny)) return die('¡TE HAS METIDO EN EL HORNO!');

  run.body.unshift({ x: nx, y: ny });
  if (run.grow > 0) run.grow--; else run.body.pop();

  if (run.dash > 0) {
    run.dash--;
    const tail = run.body[run.body.length - 1];
    burst(tail.x * CELL + CELL / 2, tail.y * CELL + CELL / 2, ['#00e436', '#a8e72e'], 3);
  }
  if (run.ghost > 0) run.ghost--;

  const i = run.items.findIndex(it => it.x === nx && it.y === ny);
  if (i >= 0) eat(run.items.splice(i, 1)[0]);

  run.steps++;
  if (chaosOn('huida') && run.steps % 2 === 0) fleeItems();
}

function eat(item) {
  const t = now();
  const cx = item.x * CELL + CELL / 2, cy = item.y * CELL + CELL / 2;
  chompUntil = t + 160;

  if (item.type === 'salad') {
    const cut = Math.min(3, run.body.length - START.len);
    if (cut > 0) run.body.splice(run.body.length - cut, cut);
    run.grow = 0;
    run.kg = Math.max(BASE_KG, run.kg - 6);
    run.combo = 0;
    floatText('¡DIETA! -6 KG', cx, cy, '#00e436');
    floatText('MÁS LENTO', cx, cy - 18, '#29adff');
    burst(cx, cy, ['#00e436', '#008751'], 14);
    sfx.salad();
    return;
  }

  run.combo = t - run.lastEat <= COMBO_MS ? run.combo + 1 : 1;
  run.lastEat = t;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  const fever = t < run.feverUntil;
  const mult = Math.min(run.combo, 5) * (fever ? 2 : 1);

  let pts = 0;
  if (item.type === 'pizza') {
    pts = 10; run.grow += 1; run.kg += 2; run.pizzas++; save.pizzas++;
    addGas(1);
    burst(cx, cy, ['#ffec27', '#ff004d', '#ab5236'], 10);
    sfx.eat(run.combo);
    // Las pizzas de la lluvia de la piña no reponen la pizza principal
    if (!item.extra) { spawnItem('pizza'); rollSpecials(); }
  } else if (item.type === 'pina') {
    pts = 30; run.grow += 1; run.kg += 2; run.pizzas++; run.pinas++; save.pizzas++;
    addGas(2);
    burst(cx, cy, ['#ffec27', '#00e436', '#ab5236'], 18);
    sfx.pina();
    startChaos();
  } else if (item.type === 'gold') {
    pts = 50; run.grow += 3; run.kg += 5; run.pizzas++; run.golds++; save.pizzas++;
    addGas(3);
    burst(cx, cy, ['#ffec27', '#fff1e8', '#ffa300'], 24);
    sfx.gold();
    shakeScreen(150, 3);
  } else if (item.type === 'chili') {
    pts = 20; run.kg += 1; run.chilis++;
    run.feverUntil = t + FEVER_MS;
    burst(cx, cy, ['#ff004d', '#ffa300'], 18);
    sfx.chili();
    showBanner('¡PICANTE! PUNTOS X2', '#ff004d');
  }
  pts *= mult;
  run.score += pts;
  floatText(`+${pts}`, cx, cy, item.type === 'gold' ? '#ffec27' : '#fff1e8');
  if (run.combo >= 2) floatText(`COMBO X${Math.min(run.combo, 5)}`, cx, cy - 18, '#29adff');

  // El nivel sube con el tamaño y nunca baja (aunque adelgaces)
  const lvl = 1 + Math.floor((size() - START.len) / SEGS_PER_LEVEL);
  if (lvl > run.level) levelUp(lvl);
  checkAchs();
}

function levelUp(lvl) {
  run.level = lvl;
  sfx.level();
  // A partir del nivel 3 aparecen hornos en el suelo
  if (lvl >= 3 && run.ovens.length < 14) {
    for (let k = 0; k < 2; k++) {
      const c = freeCell(6, true);
      if (c) run.ovens.push(c);
    }
    showBanner(`NIVEL ${lvl} · ¡OJO CON LOS HORNOS!`, '#ffa300');
  } else {
    showBanner(`NIVEL ${lvl} · ¡MÁS RÁPIDO!`, '#ffec27');
  }
}

function checkAchs() {
  for (const a of ACHS) {
    if (save.ach[a.id] || !a.test(run)) continue;
    save.ach[a.id] = Date.now();
    run.newAchs.push(a);
    const skin = SKINS.find(s => s.req === a.id);
    toast(`LOGRO: ${a.name}`, skin ? `¡NUEVO PIZZERO: ${skin.name}!` : a.desc);
    sfx.ach();
    renderAchs();
  }
  persist();
}

function die(reason) {
  run.deathReason = reason;
  setState('dying');
  sfx.death();
  shakeScreen(450, 8);
  const h = run.body[0];
  burst(h.x * CELL + CELL / 2, h.y * CELL + CELL / 2, ['#ff004d', '#fff1e8', '#ffec27'], 40);
  finishRun();
}

function finishRun() {
  const entry = { name: save.name, score: run.score, kg: run.kg, when: Date.now() };
  if (run.score > 0) save.top.push(entry);
  save.top.sort((a, b) => b.score - a.score);
  save.top = save.top.slice(0, 5);
  run.rank = save.top.indexOf(entry);
  run.newBest = run.score > save.best;
  if (run.newBest) save.best = run.score;
  persist();
  renderTop(entry);
}

// ------------------------------------------------------------
//  Efectos
// ------------------------------------------------------------
function burst(x, y, colors, n) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 180;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.5, t: 0,
      c: colors[k % colors.length], s: 4 + Math.floor(Math.random() * 3) * 2 });
  }
}
function floatText(s, x, y, c) { texts.push({ s, x, y, c, t: 0 }); }
function shakeScreen(ms, power) { shake = { until: now() + ms, power }; }
function showBanner(s, c) { banner = { s, c, at: now() }; }

let toastTimer = 0;
function toast(title, sub) {
  const el = $('#toast');
  el.replaceChildren();
  const small = document.createElement('small');
  small.textContent = title;
  el.append(small, sub);
  el.hidden = false;
  // reinicia la animación de entrada
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// ------------------------------------------------------------
//  Bucle principal
// ------------------------------------------------------------
function frame(t) {
  const dt = Math.min(0.05, (t - lastFrame) / 1000 || 0);
  lastFrame = t;

  if (state === 'ready' && t - stateAt > 900) { setState('play'); acc = 0; sfx.go(); }
  if (state === 'play') {
    acc += dt * 1000;
    const ms = tickMs();
    while (acc >= ms && state === 'play') { acc -= ms; step(); }
    run.items = run.items.filter(i => !i.until || t < i.until);
  }
  if (state === 'dying' && t - stateAt > 1100) { setState('over'); showOver(); }

  for (const p of particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; }
  particles = particles.filter(p => p.t < p.life);
  for (const s of texts) s.t += dt;
  texts = texts.filter(s => s.t < 1);

  render(t);
  updateHud(t);
  requestAnimationFrame(frame);
}

function render(t) {
  ctx.save();
  if (t < shake.until) {
    ctx.translate((Math.random() - 0.5) * shake.power * 2, (Math.random() - 0.5) * shake.power * 2);
  }
  // Piña "mundo del revés": se gira todo el tablero (los textos grandes no)
  ctx.save();
  if (chaosOn('vuelta')) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  }
  ctx.drawImage(floor, 0, 0);

  if (run) {
    // Punto de inicio marcado en el suelo
    ctx.fillStyle = 'rgba(255, 236, 39, .12)';
    ctx.fillRect(START.x * CELL, START.y * CELL, CELL, CELL);

    for (const o of run.ovens) drawOven(o, t);
    for (const it of run.items) drawItem(it, t);
    drawPizzero(t);

    // Fiebre picante: el borde parpadea en rojo
    if (t < run.feverUntil && Math.floor(t / 120) % 2) {
      ctx.strokeStyle = '#ff004d';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    }
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const s of texts) {
    ctx.globalAlpha = 1 - s.t;
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#000';
    ctx.fillText(s.s, s.x + 2, s.y - s.t * 40 + 2);
    ctx.fillStyle = s.c;
    ctx.fillText(s.s, s.x, s.y - s.t * 40);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Aviso del efecto de la piña con la cuenta atrás
  if (run && run.chaos && t < run.chaos.until && state === 'play') {
    bigText(`${run.chaos.text} ${Math.ceil((run.chaos.until - t) / 1000)}`, canvas.height - 28, run.chaos.color, 14);
  }
  if (banner && t - banner.at < 1800) bigText(banner.s, canvas.height * 0.2, banner.c, 20);
  if (state === 'ready') bigText('¡PREPARADO!', canvas.height / 2 - 60, '#ffec27', 28);
  if (state === 'pause') {
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bigText('PAUSA', canvas.height / 2, '#ffec27', 36);
    bigText('PULSA P PARA SEGUIR', canvas.height / 2 + 50, '#fff1e8', 12);
  }
  ctx.restore();
}

function bigText(s, y, color, size) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(s, canvas.width / 2 + 4, y + 4);
  ctx.fillStyle = color;
  ctx.fillText(s, canvas.width / 2, y);
}

function drawOven(o, t) {
  const flick = Math.floor(t / 150 + o.x) % 2;
  const pal = flick ? PAL.oven : { ...PAL.oven, f: '#ff004d', F: '#ffa300' };
  drawSprite(ctx, OVEN, pal, o.x * CELL, o.y * CELL, CELL / 8);
}

function drawItem(it, t) {
  // Los objetos que caducan parpadean en sus 2 últimos segundos
  if (it.until && it.until - t < 2000 && Math.floor(t / 100) % 2) return;
  const bob = Math.round(Math.sin((t - it.born) / 180) * 2);
  const x = it.x * CELL, y = it.y * CELL + bob;
  if (it.type === 'pizza') drawSprite(ctx, PIZZA, PAL.pizza, x, y, CELL / 8);
  else if (it.type === 'gold') {
    drawSprite(ctx, PIZZA, PAL.gold, x, y, CELL / 8);
    if (Math.random() < 0.15) burst(x + Math.random() * CELL, y + Math.random() * CELL, ['#fff1e8'], 1);
  }
  else if (it.type === 'chili') drawSprite(ctx, CHILI, PAL.chili, x, y, CELL / 8);
  else if (it.type === 'salad') drawSprite(ctx, SALAD, PAL.salad, x, y, CELL / 8);
  else if (it.type === 'pina') {
    // La piña tiembla un poco: se nota que es peligrosa
    drawSprite(ctx, PINA, PAL.pina, x + (Math.floor(t / 80) % 2 ? 1 : -1), y, CELL / 8);
  }
}

function drawPizzero(t) {
  const skin = currentSkin();
  const stage = fatStage();
  const body = run.body;
  const th = Math.round(CELL * (0.46 + stage * 0.1));   // grosor de la barriga
  const dying = state === 'dying' && Math.floor(t / 90) % 2;
  const coat = dying ? '#ff004d' : skin.coat;
  const center = s => ({ x: s.x * CELL + CELL / 2, y: s.y * CELL + CELL / 2 });
  // Mientras atraviesa cosas tras el eructo, el pizzero se ve medio transparente
  if (run.ghost > 0) ctx.globalAlpha = Math.floor(t / 60) % 2 ? 0.35 : 0.65;

  // Tramos del cuerpo: rectángulos que unen el centro de cada casilla con la siguiente
  const seg = (a, b, w, color) => {
    const x1 = Math.min(a.x, b.x) - w / 2, y1 = Math.min(a.y, b.y) - w / 2;
    ctx.fillStyle = color;
    ctx.fillRect(x1, y1, Math.abs(a.x - b.x) + w, Math.abs(a.y - b.y) + w);
  };
  for (let i = body.length - 1; i > 0; i--) seg(center(body[i]), center(body[i - 1]), th + 4, dying ? '#7e2553' : skin.coatD);
  for (let i = body.length - 1; i > 0; i--) seg(center(body[i]), center(body[i - 1]), th, coat);

  // Botones del uniforme
  ctx.fillStyle = skin.trim;
  for (let i = 2; i < body.length; i += 2) {
    const c = center(body[i]);
    ctx.fillRect(c.x - 3, c.y - 3, 6, 6);
  }
  // Zapatos en la cola
  const tail = center(body[body.length - 1]);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(tail.x - th / 2, tail.y - th / 2, th, th);

  // Pañuelo al cuello y cabeza (más grande cuanto más gordo)
  const h = center(body[0]);
  ctx.fillStyle = skin.trim;
  ctx.fillRect(h.x - th / 2 - 2, h.y - th / 2 - 2, th + 4, th + 4);
  const size = Math.round(CELL * (1.05 + stage * 0.1));
  const chomp = t < chompUntil || (state === 'play' && Math.floor(t / 220) % 2 && nearFood());
  drawHead(ctx, skin, h.x, h.y - 2, size, run.dir, chomp || run.dash > 0);
  ctx.globalAlpha = 1;
}

// El pizzero abre la boca cuando tiene comida cerca
function nearFood() {
  const h = run.body[0];
  return run.items.some(i => i.type !== 'salad' && Math.abs(i.x - h.x) + Math.abs(i.y - h.y) <= 3);
}

// ------------------------------------------------------------
//  HUD, menús y paneles
// ------------------------------------------------------------
let lastHud = '';
function updateHud(t) {
  if (!run) return;
  const comboLeft = Math.max(0, 1 - (t - run.lastEat) / COMBO_MS);
  const comboOn = run.combo >= 1 && comboLeft > 0 && state === 'play';
  const speed = (BASE_TICK / tickMs()).toFixed(1);
  const key = [run.score, save.best, run.kg, run.level, speed, comboOn ? run.combo : 0].join('|');
  if (key !== lastHud) {
    lastHud = key;
    $('#hudScore').textContent = run.score;
    $('#hudBest').textContent = Math.max(save.best, run.score);
    $('#hudKg').textContent = `${run.kg} KG`;
    $('#hudLevel').textContent = run.level;
    $('#hudSpeed').textContent = `X${speed}`;
    $('#hudCombo').textContent = comboOn ? `X${Math.min(run.combo, 5)}` : '-';
  }
  $('#hudComboBar').style.width = `${comboOn ? comboLeft * 100 : 0}%`;
  $('#hudGas').style.width = `${(run.gas / GAS_MAX) * 100}%`;
  $('#hudGasBox').classList.toggle('full', run.gas >= GAS_MAX);
}

function showOverlay(id) {
  $('#menu').hidden = id !== 'menu';
  $('#over').hidden = id !== 'over';
}

function showOver() {
  $('#oScore').textContent = run.score;
  $('#oPizzas').textContent = run.pizzas;
  $('#oKg').textContent = `${run.kg} KG`;
  $('#oCombo').textContent = run.bestCombo ? `X${Math.min(run.bestCombo, 5)}` : '-';
  $('#overReason').textContent = run.deathReason + ' VUELVES AL PUNTO DE INICIO.';

  const rec = $('#oRecord');
  rec.classList.toggle('new', run.newBest);
  if (run.newBest && run.startBest > 0) { rec.textContent = '¡NUEVO RÉCORD!'; sfx.record(); }
  else if (run.newBest) rec.textContent = '¡PRIMER RÉCORD!';
  else if (run.score === 0) rec.textContent = '¡LA PRÓXIMA VEZ CÓMETE ALGUNA PIZZA!';
  else if (run.rank >= 0) rec.textContent = `¡ENTRAS EN EL TOP 5! (PUESTO ${run.rank + 1})`;
  else rec.textContent = `TE FALTARON ${save.best - run.score + 1} PUNTOS PARA TU RÉCORD`;

  const achs = $('#oAchs');
  achs.replaceChildren();
  for (const a of run.newAchs) {
    const d = document.createElement('div');
    const skin = SKINS.find(s => s.req === a.id);
    d.textContent = `✓ ${a.name}${skin ? ` → PIZZERO ${skin.name}` : ''}`;
    achs.appendChild(d);
  }

  const next = ACHS.find(a => !save.ach[a.id]);
  $('#oNext').textContent = next ? `PRÓXIMO LOGRO: ${next.desc.toUpperCase()}` : '¡TIENES TODOS LOS LOGROS!';
  $('#overTitle').textContent = run.newBest ? '¡QUÉ BANQUETE!' : '¡CATAPUM!';
  showOverlay('over');
}

function goMenu() {
  setState('menu');
  run = null;
  lastHud = '';
  renderSkin();
  showOverlay('menu');
}

function renderTop(highlight) {
  const list = $('#topList');
  list.replaceChildren();
  if (!save.top.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'AÚN NO HAY PARTIDAS. ¡SÉ EL PRIMERO!';
    list.appendChild(li);
    return;
  }
  save.top.forEach((e, i) => {
    const li = document.createElement('li');
    if (e === highlight) li.className = 'me';
    const n = document.createElement('span');
    n.textContent = `${i + 1}. ${e.name}`;
    const s = document.createElement('span');
    s.textContent = e.score;
    li.append(n, s);
    list.appendChild(li);
  });
}

function renderAchs() {
  const list = $('#achList');
  list.replaceChildren();
  let done = 0;
  for (const a of ACHS) {
    const li = document.createElement('li');
    const ok = !!save.ach[a.id];
    if (ok) { li.className = 'done'; done++; }
    const b = document.createElement('b');
    b.textContent = a.name;
    const s = document.createElement('span');
    const skin = SKINS.find(k => k.req === a.id);
    s.textContent = a.desc + (skin ? ` · PREMIO: ${skin.name}` : '');
    li.append(b, s);
    list.appendChild(li);
  }
  $('#achCount').textContent = `${done}/${ACHS.length}`;
}

// Selector de pizzero en el menú
let skinIdx = Math.max(0, SKINS.findIndex(s => s.id === save.skin));
function renderSkin() {
  const s = SKINS[skinIdx];
  const unlocked = skinUnlocked(s);
  const c = $('#skinCanvas');
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = s.coatD; g.fillRect(24, 60, 48, 36);
  g.fillStyle = s.coat;  g.fillRect(28, 60, 40, 36);
  g.fillStyle = s.trim;  g.fillRect(28, 58, 40, 6);
  g.fillRect(45, 72, 6, 6); g.fillRect(45, 86, 6, 6);
  drawHead(g, s, 48, 38, 64, 'down', false);
  if (!unlocked) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, c.width, c.height); }
  $('#skinName').textContent = s.name;
  const req = ACHS.find(a => a.id === s.req);
  $('#skinLock').textContent = unlocked ? '' : `BLOQUEADO: ${req.desc.toUpperCase()}`;
  $('#playBtn').disabled = !unlocked;
  if (unlocked) { save.skin = s.id; persist(); }
}
function cycleSkin(d) {
  skinIdx = (skinIdx + d + SKINS.length) % SKINS.length;
  renderSkin();
  initAudio();
  beep(660, 0.05);
}

// ------------------------------------------------------------
//  Controles
// ------------------------------------------------------------
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

function togglePause() {
  if (state === 'play') setState('pause');
  else if (state === 'pause') { setState('play'); acc = 0; }
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyM') { save.muted = !save.muted; persist(); toast('SONIDO', save.muted ? 'DESACTIVADO' : 'ACTIVADO'); return; }

  if (state === 'menu') {
    if (e.code === 'ArrowLeft') cycleSkin(-1);
    else if (e.code === 'ArrowRight') cycleSkin(1);
    return;
  }
  if (state === 'over' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    startGame();
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (e.code === 'Space' || e.code === 'KeyB') { e.preventDefault(); burp(); return; }
  const d = KEYS[e.code];
  if (d) { e.preventDefault(); queueDir(d); }
});

// Si cambias de pestaña, el juego se pausa solo
window.addEventListener('blur', () => { if (state === 'play') setState('pause'); });

// Deslizar el dedo sobre el canvas
let touch0 = null;
canvas.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touch0 = { x: t.clientX, y: t.clientY };
  if (state === 'pause') togglePause();
}, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touch0) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch0.x, dy = t.clientY - touch0.y;
  touch0 = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { burp(); return; }   // un toque = eructo
  queueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}, { passive: true });

for (const b of document.querySelectorAll('#pad button')) {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (b.dataset.dir) queueDir(b.dataset.dir); else burp();
  });
}

$('#menuForm').addEventListener('submit', e => { e.preventDefault(); startGame(); });
$('#againBtn').addEventListener('click', startGame);
$('#menuBtn').addEventListener('click', goMenu);
$('#skinPrev').addEventListener('click', () => cycleSkin(-1));
$('#skinNext').addEventListener('click', () => cycleSkin(1));

// ------------------------------------------------------------
//  Arranque
// ------------------------------------------------------------
$('#nameInput').value = save.name;
$('#hudBest').textContent = save.best;
renderTop();
renderAchs();
renderSkin();
showOverlay('menu');
requestAnimationFrame(t => { lastFrame = t; requestAnimationFrame(frame); });
