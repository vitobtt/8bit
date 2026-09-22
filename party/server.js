// ============================================================
//  8 BITS BATTLE - Servidor de juego (PartyKit)
//  Misma lógica que el server.js original (LAN), adaptada a
//  conexiones de PartyKit en vez de sockets crudos + WebSocketServer.
// ============================================================

// ---------- Configuración ----------
const TICK_MS = 1000 / 30;          // 30 actualizaciones por segundo
const TILE = 16;
const MAX_SHOTS = 10;               // 10 tiros como máximo por jugador y partida
const MAX_HP = 3;                   // vidas por jugador
const SPEED = 2.2;                  // px por tick
const BULLET_SPEED = 6;             // px por tick
const BULLET_LIFE = 90;             // ticks (3 s)
const SHOT_COOLDOWN = 350;          // ms entre disparos
const PLAYER_R = 6;                 // radio del jugador (caja 12x12)
const COUNTDOWN_MS = 3000;
const END_SCREEN_MS = 7000;
const ZONE_DELAY = 25000;           // la zona empieza a cerrarse a los 25 s
const ZONE_SHRINK = 60000;          // tarda 60 s en cerrarse del todo
const ZONE_DMG_EVERY = 1500;        // fuera de la zona pierdes 1 vida cada 1,5 s
const NAME_MAX = 12;

// Paleta tipo 8 bits para los jugadores
const COLORS = [
  '#ff004d', '#29adff', '#00e436', '#ffec27', '#ff77a8', '#ffa300',
  '#83769c', '#ffccaa', '#00b3a4', '#c2c3c7', '#ab5236', '#7e2553',
];

// Mapa 30x20: '#' = muro, '.' = suelo
const MAP = [
  '##############################',
  '#............................#',
  '#..##......#......#......##..#',
  '#..#.......#......#.......#..#',
  '#..........#......#..........#',
  '#....###..............###....#',
  '#............................#',
  '#......##....####....##......#',
  '#..#......................#..#',
  '#..#.....#..........#.....#..#',
  '#..#.....#..........#.....#..#',
  '#..#......................#..#',
  '#......##....####....##......#',
  '#............................#',
  '#....###..............###....#',
  '#..........#......#..........#',
  '#..#.......#......#.......#..#',
  '#..##......#......#......##..#',
  '#............................#',
  '##############################',
];
const ROWS = MAP.length;
const COLS = MAP[0].length;
const W = COLS * TILE;
const H = ROWS * TILE;
const ZONE_START_R = Math.hypot(W / 2, H / 2) + 10;

const isWall = (tx, ty) =>
  tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || MAP[ty][tx] === '#';
const wallAt = (x, y) => isWall(Math.floor(x / TILE), Math.floor(y / TILE));

function boxHitsWall(x, y, r) {
  return wallAt(x - r, y - r) || wallAt(x + r - 0.01, y - r) ||
         wallAt(x - r, y + r - 0.01) || wallAt(x + r - 0.01, y + r - 0.01);
}

export default class BattleServer {
  constructor(room) {
    this.room = room;
    this.players = new Map();   // conn.id -> jugador
    this.bullets = [];
    this.events = [];
    this.phase = 'lobby';        // lobby | countdown | playing | ended
    this.phaseStart = Date.now();
    this.winner = null;
    this.colorIdx = 0;
    this.hostId = null;          // primera conexión abierta = profesor
    this.interval = null;
  }

  ensureTicking() {
    if (!this.interval) {
      this.interval = setInterval(() => this.tick(), TICK_MS);
    }
  }

  setPhase(p) { this.phase = p; this.phaseStart = Date.now(); }

  zoneRadius() {
    if (this.phase !== 'playing') return ZONE_START_R;
    const t = Date.now() - this.phaseStart - ZONE_DELAY;
    if (t <= 0) return ZONE_START_R;
    return Math.max(0, ZONE_START_R * (1 - t / ZONE_SHRINK));
  }

  cleanName(raw) {
    let n = String(raw || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX);
    if (!n) n = 'Jugador';
    const taken = new Set([...this.players.values()].map(p => p.name.toLowerCase()));
    let final = n, i = 2;
    while (taken.has(final.toLowerCase())) final = `${n.slice(0, NAME_MAX - 2)}${i++}`;
    return final;
  }

  randomSpawn(taken) {
    let best = null, bestDist = -1;
    for (let tries = 0; tries < 60; tries++) {
      const tx = 1 + Math.floor(Math.random() * (COLS - 2));
      const ty = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (isWall(tx, ty)) continue;
      const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
      const d = taken.length ? Math.min(...taken.map(p => Math.hypot(p.x - x, p.y - y))) : 999;
      if (d > bestDist) { best = { x, y }; bestDist = d; }
      if (d > 120) break;
    }
    return best;
  }

  startCountdown() {
    const joined = [...this.players.values()].filter(p => p.joined);
    if (joined.length < 2 || this.phase !== 'lobby') return;
    this.bullets = [];
    const taken = [];
    for (const p of joined) {
      const s = this.randomSpawn(taken);
      taken.push(s);
      Object.assign(p, {
        x: s.x, y: s.y, hp: MAX_HP, ammo: MAX_SHOTS, alive: true, inGame: true,
        kills: 0, lastShot: 0, lastZoneHit: 0,
        input: { u: false, d: false, l: false, r: false },
      });
    }
    this.setPhase('countdown');
  }

  backToLobby() {
    this.bullets = [];
    this.winner = null;
    for (const p of this.players.values()) { p.inGame = false; p.alive = false; }
    this.setPhase('lobby');
  }

  damage(p, killer) {
    p.hp--;
    this.events.push({ k: 'hit', id: p.id });
    if (p.hp <= 0) {
      p.alive = false;
      if (killer) killer.kills++;
      this.events.push({ k: 'kill', killer: killer ? killer.name : 'la zona', victim: p.name, id: p.id });
    }
  }

  tryShoot(p, angle) {
    if (this.phase !== 'playing' || !p.inGame || !p.alive) return;
    const now = Date.now();
    if (p.ammo <= 0 || now - p.lastShot < SHOT_COOLDOWN) return;
    if (typeof angle !== 'number' || !isFinite(angle)) return;
    p.lastShot = now;
    p.ammo--;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    this.bullets.push({
      x: p.x + dx * (PLAYER_R + 2), y: p.y + dy * (PLAYER_R + 2),
      dx: dx * BULLET_SPEED, dy: dy * BULLET_SPEED, owner: p.id, life: BULLET_LIFE,
    });
    this.events.push({ k: 'shot', id: p.id });
  }

  update() {
    const now = Date.now();

    if (this.phase === 'countdown' && now - this.phaseStart >= COUNTDOWN_MS) this.setPhase('playing');
    if (this.phase === 'ended' && now - this.phaseStart >= END_SCREEN_MS) this.backToLobby();
    if (this.phase !== 'playing') return;

    const fighters = [...this.players.values()].filter(p => p.inGame && p.alive);

    for (const p of fighters) {
      let mx = (p.input.r ? 1 : 0) - (p.input.l ? 1 : 0);
      let my = (p.input.d ? 1 : 0) - (p.input.u ? 1 : 0);
      if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
      const nx = p.x + mx * SPEED;
      if (!boxHitsWall(nx, p.y, PLAYER_R)) p.x = nx;
      const ny = p.y + my * SPEED;
      if (!boxHitsWall(p.x, ny, PLAYER_R)) p.y = ny;
    }

    const survivors = [];
    for (const b of this.bullets) {
      let dead = false;
      for (let s = 0; s < 2 && !dead; s++) {
        b.x += b.dx / 2; b.y += b.dy / 2;
        if (wallAt(b.x, b.y)) { dead = true; this.events.push({ k: 'wall', x: Math.round(b.x), y: Math.round(b.y) }); break; }
        for (const p of fighters) {
          if (!p.alive || p.id === b.owner) continue;
          if (Math.abs(p.x - b.x) <= PLAYER_R + 1 && Math.abs(p.y - b.y) <= PLAYER_R + 1) {
            this.damage(p, this.players.get(b.owner));
            dead = true;
            break;
          }
        }
      }
      if (!dead && --b.life > 0) survivors.push(b);
    }
    this.bullets = survivors;

    const zr = this.zoneRadius();
    for (const p of fighters) {
      if (!p.alive) continue;
      const out = Math.hypot(p.x - W / 2, p.y - H / 2) > zr;
      if (out && now - p.lastZoneHit >= ZONE_DMG_EVERY) {
        p.lastZoneHit = now;
        this.damage(p, null);
      }
    }

    const alive = fighters.filter(p => p.alive);
    if (alive.length <= 1) {
      this.winner = alive.length === 1 ? alive[0].name : null;
      this.bullets = [];
      this.setPhase('ended');
      this.events.push({ k: 'end', winner: this.winner });
    }
  }

  snapshot() {
    const now = Date.now();
    return JSON.stringify({
      t: 's',
      ph: this.phase,
      cd: this.phase === 'countdown' ? Math.ceil((COUNTDOWN_MS - (now - this.phaseStart)) / 1000) : 0,
      zt: this.phase === 'playing' ? Math.max(0, Math.ceil((ZONE_DELAY - (now - this.phaseStart)) / 1000)) : 0,
      z: Math.round(this.zoneRadius()),
      w: this.winner,
      p: [...this.players.values()].filter(p => p.joined).map(p => ({
        id: p.id, n: p.name, c: p.color,
        x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
        a: Math.round((p.angle || 0) * 100) / 100,
        hp: p.hp, am: p.ammo, al: p.alive, ig: p.inGame, k: p.kills,
      })),
      b: this.bullets.map(b => [Math.round(b.x), Math.round(b.y)]),
      e: this.events,
    });
  }

  tick() {
    try {
      this.update();
      const msg = this.snapshot();
      this.events = [];
      this.room.broadcast(msg);
    } catch (err) {
      // Un error aquí no debe detener el intervalo para el resto de la clase.
      console.error('tick error', err);
    }
  }

  onConnect(conn) {
    this.ensureTicking();
    const isHost = this.hostId === null;
    if (isHost) this.hostId = conn.id;

    const p = {
      id: conn.id, conn, name: '', joined: false, isHost,
      color: COLORS[this.colorIdx++ % COLORS.length],
      x: 0, y: 0, angle: 0, hp: 0, ammo: 0, alive: false, inGame: false, kills: 0,
      lastShot: 0, lastZoneHit: 0, input: { u: false, d: false, l: false, r: false },
    };
    this.players.set(p.id, p);

    conn.send(JSON.stringify({
      t: 'welcome', id: p.id, isHost, roomUrl: this.room.id,
      map: MAP, tile: TILE, maxShots: MAX_SHOTS, maxHp: MAX_HP,
    }));
  }

  onMessage(raw, sender) {
    const p = this.players.get(sender.id);
    if (!p) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;

    switch (m.t) {
      case 'join':
        if (p.joined) return;
        p.name = this.cleanName(m.name);
        p.joined = true;
        p.conn.send(JSON.stringify({ t: 'joined', name: p.name }));
        break;
      case 'in':
        p.input = { u: !!m.u, d: !!m.d, l: !!m.l, r: !!m.r };
        if (typeof m.a === 'number' && isFinite(m.a)) p.angle = m.a;
        break;
      case 'shoot':
        if (typeof m.a === 'number' && isFinite(m.a)) p.angle = m.a;
        this.tryShoot(p, m.a);
        break;
      case 'start':
        if (p.isHost) this.startCountdown();
        break;
      case 'stop':
        if (p.isHost && this.phase !== 'lobby') this.backToLobby();
        break;
    }
  }

  onClose(conn) {
    const p = this.players.get(conn.id);
    if (p && p.inGame && p.alive && this.phase === 'playing') {
      this.events.push({ k: 'kill', killer: 'desconexión', victim: p.name, id: p.id });
    }
    this.players.delete(conn.id);
    if (this.hostId === conn.id) this.hostId = null; // el próximo en conectar será el profesor
  }
}
