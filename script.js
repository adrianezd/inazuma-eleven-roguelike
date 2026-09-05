'use strict';
/* =========================================================================
   INAZUMA ELEVEN ROGUELIKE (fan, no oficial)
   Juego de fútbol por turnos con elementos reales de Inazuma Eleven.
   Sin frameworks, sin backend. El estado de la partida vive en memoria;
   el meta-progreso (Puntos de Espíritu, desbloqueos, mejores marcas) se
   guarda en localStorage.
   ========================================================================= */

/* ---------------------------------------------------------------------
   1. CONSTANTES DERIVADAS DE LOS DATOS REALES (roster-data.js)
   --------------------------------------------------------------------- */

// TYPES, CYCLE, POSITIONS, TYPE_MARK, RIVAL_TEAM_NAMES, ROSTER vienen de roster-data.js

var POSITION_TEMPLATES = {
  Portero: { tiro: 20, pase: 50, defensa: 78, especial: 52, variance: 6 },
  Defensa: { tiro: 38, pase: 52, defensa: 72, especial: 50, variance: 6 },
  Centrocampista: { tiro: 54, pase: 72, defensa: 50, especial: 58, variance: 6 },
  Delantero: { tiro: 74, pase: 46, defensa: 34, especial: 62, variance: 6 }
};

var MAX_SQUAD = 4;
var MATCH_TURNS = 14; // 7 ataques para cada equipo (antes 10/5; cada turno es una interacción rápida sin animaciones bloqueantes, así que un partido más largo sigue siendo ágil en móvil y deja mucho más margen para usar la especial)
var SPIRIT_PER_NODE = 4;
var SPIRIT_PER_MATCH = 10;
var SPIRIT_PER_BOSS = 30;

// Bonificación de rival "jefe": crece PROPORCIONALMENTE a la profundidad del
// nodo en vez de ser un bonus plano idéntico para todos los jefes. Esto evita
// el "muro" artificial de dificultad detectado y corregido en el proyecto
// hermano (Elemental Strikers): allí un jefe de la fila 4 (40% de la
// temporada) recibía el mismo bonus absoluto que el jefe final de la fila 9,
// lo que producía una tasa de victoria en jefes muy inferior a la de
// partidos normales. Aquí el bonus base es pequeño y además escala con depth.
function bossBonusRange(depth) {
  var d = depth || 0;
  return {
    statMin: 2 + Math.floor(d * 0.25),
    statMax: 5 + Math.floor(d * 0.35),
    specialMin: 3 + Math.floor(d * 0.3),
    specialMax: 6 + Math.floor(d * 0.4) // -1 desde el original (7): pequeño ajuste a la baja del techo del bonus especial de los jefes, para que sean "un pelín" más fáciles sin tocar el resto del diseño ya validado por simulación
  };
}

/* ---------------------------------------------------------------------
   2. UTILIDADES
   --------------------------------------------------------------------- */

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function choice(arr) { return arr[rand(0, arr.length - 1)]; }
function uid() { return 'p' + Math.random().toString(36).slice(2, 10); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function typeAdvantage(a, b) {
  if (a === b) return 0;
  var ia = CYCLE.indexOf(a), ib = CYCLE.indexOf(b);
  if (ia === -1 || ib === -1) return 0;
  if ((ia + 1) % CYCLE.length === ib) return 1;  // a vence a b
  if ((ib + 1) % CYCLE.length === ia) return -1; // b vence a a
  return 0;
}

function typeBadge(tipo) {
  return '<span class="type-badge type-' + tipo.toLowerCase().replace('ñ', 'n') + '">' +
    '<span class="type-mark" aria-hidden="true">' + TYPE_MARK[tipo] + '</span>' + tipo + '</span>';
}

function initials(nombre) {
  var parts = String(nombre).trim().split(/\s+/);
  var a = parts[0] ? parts[0][0] : '';
  var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

function avatarHtml(p) {
  return '<span class="avatar type-bg-' + p.tipo.toLowerCase().replace('ñ', 'n') + '" aria-hidden="true">' + initials(p.nombre) + '</span>';
}

/* ---------------------------------------------------------------------
   3. GENERACIÓN DE RIVALES (equipos genéricos, no personajes reales)
   --------------------------------------------------------------------- */

function generateRivalPlayer(depth, forcedPosition) {
  var posicion = forcedPosition || choice(POSITIONS);
  var tipo = choice(TYPES);
  var t = POSITION_TEMPLATES[posicion];
  var scale = 1 + (depth || 0) * 0.015;
  function s(base) { return clamp(Math.round((base + rand(-t.variance, t.variance)) * scale), 15, 99); }
  return {
    id: uid(),
    nombre: posicion + ' rival',
    posicion: posicion,
    tipo: tipo,
    tiro: s(t.tiro),
    pase: s(t.pase),
    defensa: s(t.defensa),
    especial: s(t.especial),
    hissatsu: null,
    fatigado: false
  };
}

function generateOpponentSquad(depth, isBoss) {
  var squad = [];
  var bonus = bossBonusRange(depth);
  for (var i = 0; i < 4; i++) {
    // Slot 0 se fuerza siempre a Portero: antes cada jugador rival tenía una
    // posición 100% aleatoria e independiente, así que un equipo rival podía
    // (por azar) no tener NINGÚN portero. Eso rompía la mecánica de que los
    // tiros y especiales del jugador siempre se enfrenten al portero rival
    // (ver pickDefender), así que garantizamos exactamente 1 portero por equipo.
    var p = generateRivalPlayer(depth, i === 0 ? 'Portero' : null);
    if (isBoss) {
      p.tiro = clamp(p.tiro + rand(bonus.statMin, bonus.statMax), 15, 99);
      p.pase = clamp(p.pase + rand(bonus.statMin, bonus.statMax), 15, 99);
      p.defensa = clamp(p.defensa + rand(bonus.statMin, bonus.statMax), 15, 99);
      p.especial = clamp(p.especial + rand(bonus.specialMin, bonus.specialMax), 15, 99);
    }
    squad.push(p);
  }
  return squad;
}

function randomTeamName() { return choice(RIVAL_TEAM_NAMES); }

/* ---------------------------------------------------------------------
   4. SELECCIÓN DE CAPITÁN / FICHAJES (plantel real)
   --------------------------------------------------------------------- */

function rosterInstance(entry) {
  var clone = Object.assign({}, entry);
  clone.instanceId = uid();
  clone.fatigado = false;
  return clone;
}

function offerCaptains() {
  var pool = ROSTER.filter(function (p) { return !p.locked; });
  var unlocked = getUnlockedIds();
  ROSTER.filter(function (p) { return p.locked; }).forEach(function (p) {
    if (unlocked.indexOf(p.id) !== -1) pool.push(p);
  });
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}

function generateRecruitOptions() {
  var squadRosterIds = G.run.squad.map(function (p) { return p.id; });
  var unlocked = getUnlockedIds();
  var pool = ROSTER.filter(function (p) {
    if (squadRosterIds.indexOf(p.id) !== -1) return false;
    if (p.locked && unlocked.indexOf(p.id) === -1) return false;
    return true;
  });
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}

/* ---------------------------------------------------------------------
   5. PERSISTENCIA (localStorage)
   --------------------------------------------------------------------- */

var STORAGE_KEY = 'inazumaRoguelike_v1';

function loadMeta() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('none');
    var data = JSON.parse(raw);
    return Object.assign({ points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0 }, data);
  } catch (e) {
    return { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0 };
  }
}

function saveMeta(meta) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meta)); } catch (e) { /* almacenamiento no disponible */ }
}

function getUnlockedIds() { return loadMeta().unlocked; }

/* ---------------------------------------------------------------------
   6. GENERACIÓN DEL MAPA (ramificado, jefe cada ~5 nodos)
   --------------------------------------------------------------------- */

var NODE_LABELS = {
  partido: 'Partido',
  entrenamiento: 'Entrenamiento',
  fichaje: 'Fichaje',
  descanso: 'Descanso',
  evento: 'Evento Especial',
  jefe: 'Jefe'
};

function generateMap() {
  var rowDefs = [3, 3, 3, 3, 1, 3, 3, 3, 3, 1];
  var rows = [];
  var idCounter = 0;

  rowDefs.forEach(function (count, rowIndex) {
    var isBoss = count === 1;
    var nodes = [];
    for (var c = 0; c < count; c++) {
      // La primera fila siempre es Fichaje o Entrenamiento: nunca un partido
      // (ni evento/descanso) nada más empezar la partida con un plantel de
      // un solo jugador, para dar margen a prepararse antes del primer choque.
      var type = isBoss ? 'jefe' : (rowIndex === 0 ? choice(['fichaje', 'entrenamiento']) : weightedNodeType());
      nodes.push({ id: 'n' + (idCounter++), row: rowIndex, col: c, type: type, cleared: false });
    }
    rows.push(nodes);
  });

  var edges = {};
  for (var r = 0; r < rows.length - 1; r++) {
    var curRow = rows[r], nextRow = rows[r + 1];
    curRow.forEach(function (node) {
      var targets = [];
      if (nextRow.length === 1) {
        targets = [nextRow[0].id];
      } else if (curRow.length === 1) {
        targets = nextRow.map(function (n) { return n.id; });
      } else {
        var idx = node.col;
        [idx - 1, idx, idx + 1].forEach(function (t) {
          if (t >= 0 && t < nextRow.length) targets.push(nextRow[t].id);
        });
        if (targets.length === 0) targets.push(nextRow[Math.min(idx, nextRow.length - 1)].id);
      }
      edges[node.id] = targets;
    });
  }
  for (var r2 = 0; r2 < rows.length - 1; r2++) {
    var curRow2 = rows[r2], nextRow2 = rows[r2 + 1];
    if (curRow2.length === 1 || nextRow2.length === 1) continue;
    var incoming = {};
    nextRow2.forEach(function (n) { incoming[n.id] = 0; });
    curRow2.forEach(function (n) { edges[n.id].forEach(function (t) { incoming[t]++; }); });
    nextRow2.forEach(function (n) {
      if (incoming[n.id] === 0) {
        var nearest = curRow2[Math.min(n.col, curRow2.length - 1)];
        edges[nearest.id].push(n.id);
      }
    });
  }

  return { rows: rows, edges: edges };
}

function weightedNodeType() {
  var roll = Math.random() * 100;
  if (roll < 40) return 'partido';
  if (roll < 58) return 'entrenamiento';
  if (roll < 72) return 'fichaje';
  if (roll < 87) return 'descanso';
  return 'evento';
}

function mapDepth(nodeId, map) {
  for (var r = 0; r < map.rows.length; r++) {
    for (var c = 0; c < map.rows[r].length; c++) {
      if (map.rows[r][c].id === nodeId) return r;
    }
  }
  return 0;
}

function findNode(map, nodeId) {
  for (var r = 0; r < map.rows.length; r++) {
    for (var c = 0; c < map.rows[r].length; c++) {
      if (map.rows[r][c].id === nodeId) return map.rows[r][c];
    }
  }
  return null;
}

/* ---------------------------------------------------------------------
   7. ESTADO GLOBAL
   --------------------------------------------------------------------- */

var G = {
  screen: 'menu',
  meta: (typeof localStorage !== 'undefined') ? loadMeta() : { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0 },
  run: null,
  match: null,
  pendingCaptainOffers: null,
  pendingRecruits: null,
  pendingTraining: null
};

function newRun() {
  G.run = {
    squad: [],
    map: generateMap(),
    currentNodeId: null,
    clearedCount: 0,
    matchesWon: 0,
    spiritEarned: 0,
    victory: false,
    startedAt: Date.now()
  };
}

/* ---------------------------------------------------------------------
   8. RENDER: NAVEGACIÓN PRINCIPAL
   --------------------------------------------------------------------- */

var appEl = null;

function render() {
  if (!appEl) appEl = document.getElementById('app');
  var html = '';
  switch (G.screen) {
    case 'menu': html = renderMenu(); break;
    case 'captainSelect': html = renderCaptainSelect(); break;
    case 'map': html = renderMap(); break;
    case 'match': html = renderMatch(); break;
    case 'entrenamiento': html = renderTraining(); break;
    case 'fichaje': html = renderRecruit(); break;
    case 'descanso': html = renderRest(); break;
    case 'evento': html = renderEvento(); break;
    case 'summary': html = renderSummary(); break;
    case 'vestuario': html = renderVestuario(); break;
    default: html = renderMenu();
  }
  appEl.innerHTML = html;
  if (G.screen === 'map') drawMapConnections();
}

function renderMenu() {
  var m = G.meta;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<p class="currency-display">' + spiritIcon() + ' ' + m.points + ' Puntos de Espíritu</p>' +
        '<div class="stats-summary">' +
          '<div class="stat-tile"><div class="num">' + m.bestNode + '</div><div class="label">Mejor progreso (nodos)</div></div>' +
          '<div class="stat-tile"><div class="num">' + m.bestWins + '</div><div class="label">Mejor racha de victorias</div></div>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionStartRun()">Jugar</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoVestuario()">Vestuario</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h2 class="panel-title">La rueda elemental</h2>' +
        '<p class="dim small">Fuego vence a Bosque · Bosque vence a Viento · Viento vence a Montaña · Montaña vence a Fuego. Es la rueda de ventajas real de Inazuma Eleven.</p>' +
        '<div class="btn-row">' + TYPES.map(typeBadge).join('') + '</div>' +
      '</div>' +
    '</div>'
  );
}

function spiritIcon() { return '<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 16.5 L6 21 L8 13.5 L2 9 L9.5 9 Z"/></svg>'; }

function actionStartRun() { G.pendingCaptainOffers = offerCaptains(); G.screen = 'captainSelect'; render(); }
function actionGoVestuario() { G.screen = 'vestuario'; render(); }
function actionBackToMenu() { G.screen = 'menu'; render(); }

function renderCaptainSelect() {
  var cards = G.pendingCaptainOffers.map(function (c) {
    return playerCardHtml(c, 'selectCaptain(\'' + c.instanceId + '\')', false, false);
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel">' +
        '<h2 class="panel-title">Elige a tu capitán</h2>' +
        '<p class="dim small">Este jugador iniciará tu plantilla. Podrás fichar hasta 3 compañeros más durante la partida.</p>' +
      '</div>' +
      '<div class="card-grid">' + cards + '</div>' +
    '</div>'
  );
}

function selectCaptain(instanceId) {
  var captain = G.pendingCaptainOffers.find(function (c) { return c.instanceId === instanceId; });
  newRun();
  G.run.squad.push(captain);
  G.screen = 'map';
  render();
}

function playerCardHtml(p, onclickAttr, selected, disabled) {
  var cls = 'player-card' + (selected ? ' selected' : '') + (disabled ? ' disabled' : '') + (p.fatigado ? ' fatigued' : '');
  var attr = disabled ? '' : ' onclick="' + onclickAttr + '"';
  var hissatsuHtml = p.hissatsu ? '<div class="hissatsu-tag">' + p.hissatsu.map(escapeHtml).join(' · ') + '</div>' : '';
  var origHtml = p.original ? '<span class="player-original">(' + escapeHtml(p.original) + ')</span>' : '';
  return (
    '<div class="' + cls + '"' + attr + '>' +
      '<div class="player-card-head">' +
        avatarHtml(p) +
        '<div class="player-head-text">' +
          '<span class="player-name">' + escapeHtml(p.nombre) + '</span>' + origHtml +
        '</div>' +
        typeBadge(p.tipo) +
      '</div>' +
      '<div class="player-pos">' + p.posicion + '</div>' +
      statBarsHtml(p) +
      hissatsuHtml +
      (p.fatigado ? '<div class="fatigue-tag">Fatigado (-10 a todo)</div>' : '') +
    '</div>'
  );
}

function statBarsHtml(p) {
  var stats = [['Tiro', p.tiro], ['Pase', p.pase], ['Defensa', p.defensa], ['Especial', p.especial]];
  return '<div class="stat-bars">' + stats.map(function (s) {
    return '<span class="stat-label">' + s[0] + '</span>' +
      '<span class="stat-bar-track"><span class="stat-bar-fill" style="width:' + clamp(s[1], 0, 100) + '%"></span></span>' +
      '<span class="stat-value">' + s[1] + '</span>';
  }).join('') + '</div>';
}

/* ---------------------------------------------------------------------
   9. RENDER: MAPA
   --------------------------------------------------------------------- */

function availableNodeIds() {
  var run = G.run;
  if (!run.currentNodeId) return run.map.rows[0].map(function (n) { return n.id; });
  return run.map.edges[run.currentNodeId] || [];
}

function nodeIconSvg(type) {
  switch (type) {
    case 'partido': return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6 L15 9 L14 13 L10 13 L9 9 Z" fill="currentColor"/></svg>';
    case 'entrenamiento': return '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="4" height="4" fill="currentColor"/><rect x="17" y="10" width="4" height="4" fill="currentColor"/><rect x="7" y="11" width="10" height="2" fill="currentColor"/></svg>';
    case 'fichaje': return '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    case 'descanso': return '<svg viewBox="0 0 24 24"><path d="M5 13a7 7 0 1 0 12.6-6.1A8 8 0 1 1 5 13Z" fill="currentColor"/></svg>';
    case 'evento': return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="6" width="2" height="8" fill="currentColor"/><rect x="11" y="16" width="2" height="2" fill="currentColor"/></svg>';
    case 'jefe': return '<svg viewBox="0 0 24 24"><path d="M4 8 L8 11 L12 5 L16 11 L20 8 L18 17 L6 17 Z" fill="currentColor"/></svg>';
    default: return '';
  }
}

function renderMap() {
  var run = G.run;
  var avail = availableNodeIds();
  var rowsHtml = run.map.rows.map(function (rowNodes) {
    var nodesHtml = rowNodes.map(function (n) {
      var classes = 'node-btn';
      if (n.type === 'jefe') classes += ' boss';
      var isAvailable = avail.indexOf(n.id) !== -1;
      var isCurrent = run.currentNodeId === n.id;
      if (n.cleared) classes += ' cleared';
      if (isCurrent) classes += ' current';
      if (isAvailable && !n.cleared) classes += ' available';
      var disabled = !isAvailable || n.cleared;
      var attr = disabled ? ' disabled' : ' onclick="enterNode(\'' + n.id + '\')"';
      return (
        '<div class="node-btn-wrap">' +
          '<button class="' + classes + '" data-node="' + n.id + '"' + attr + ' aria-label="' + NODE_LABELS[n.type] + '">' +
            nodeIconSvg(n.type) +
          '</button>' +
          '<span class="node-label">' + NODE_LABELS[n.type] + '</span>' +
        '</div>'
      );
    }).join('');
    return '<div class="map-row">' + nodesHtml + '</div>';
  }).join('');

  return (
    '<div class="screen">' +
      '<div class="panel">' +
        '<h2 class="panel-title mb0">Mapa de la temporada</h2>' +
        '<p class="dim small">Nodos superados: ' + run.clearedCount + ' · Partidos ganados: ' + run.matchesWon + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Tu plantilla</h3>' +
        '<div class="card-grid">' + run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
      '</div>' +
      '<div class="map-wrap">' +
        '<div class="map-rows" id="mapRows">' + rowsHtml + '<svg class="map-svg" id="mapSvg"></svg></div>' +
      '</div>' +
      '<div class="legend">' +
        '<span>' + nodeIconSvg('partido') + ' Partido</span>' +
        '<span>' + nodeIconSvg('entrenamiento') + ' Entrenamiento</span>' +
        '<span>' + nodeIconSvg('fichaje') + ' Fichaje</span>' +
        '<span>' + nodeIconSvg('descanso') + ' Descanso</span>' +
        '<span>' + nodeIconSvg('evento') + ' Evento Especial</span>' +
        '<span>' + nodeIconSvg('jefe') + ' Jefe</span>' +
      '</div>' +
    '</div>'
  );
}

function drawMapConnections() {
  var wrap = document.getElementById('mapRows');
  var svg = document.getElementById('mapSvg');
  if (!wrap || !svg) return;
  var run = G.run;
  var edges = run.map.edges;
  var rect = wrap.getBoundingClientRect();
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  var lines = '';
  Object.keys(edges).forEach(function (fromId) {
    var fromEl = wrap.querySelector('[data-node="' + fromId + '"]');
    if (!fromEl) return;
    var fr = fromEl.getBoundingClientRect();
    var fx = fr.left - rect.left + fr.width / 2;
    var fy = fr.top - rect.top + fr.height / 2;
    edges[fromId].forEach(function (toId) {
      var toEl = wrap.querySelector('[data-node="' + toId + '"]');
      if (!toEl) return;
      var tr = toEl.getBoundingClientRect();
      var tx = tr.left - rect.left + tr.width / 2;
      var ty = tr.top - rect.top + tr.height / 2;
      var fromNode = findNode(run.map, fromId);
      var stroke = fromNode.cleared ? '#2f9e6b' : '#2a3b4a';
      lines += '<line x1="' + fx + '" y1="' + fy + '" x2="' + tx + '" y2="' + ty + '" stroke="' + stroke + '" stroke-width="3" />';
    });
  });
  svg.innerHTML = lines;
}

window.addEventListener('resize', function () {
  if (G.screen === 'map') drawMapConnections();
});

function enterNode(nodeId) {
  var node = findNode(G.run.map, nodeId);
  if (!node || node.cleared) return;
  G.run.currentNodeId = nodeId;
  switch (node.type) {
    case 'partido': startMatch(nodeId, false); break;
    case 'jefe': startMatch(nodeId, true); break;
    case 'entrenamiento': G.pendingTraining = generateTrainingOptions(); G.screen = 'entrenamiento'; render(); break;
    case 'fichaje': G.pendingRecruits = generateRecruitOptions(); G.screen = 'fichaje'; render(); break;
    case 'descanso': G.screen = 'descanso'; render(); break;
    case 'evento': G.pendingEventResult = resolveEventoNode(); G.screen = 'evento'; render(); break;
  }
}

function clearCurrentNode() {
  var node = findNode(G.run.map, G.run.currentNodeId);
  if (node && !node.cleared) { node.cleared = true; G.run.clearedCount++; }
}

function returnToMap() { clearCurrentNode(); G.screen = 'map'; render(); }

/* ---------------------------------------------------------------------
   10. ENTRENAMIENTO
   --------------------------------------------------------------------- */

var STAT_KEYS = ['tiro', 'pase', 'defensa', 'especial'];
var STAT_LABELS = { tiro: 'Tiro', pase: 'Pase', defensa: 'Defensa', especial: 'Especial' };

function generateTrainingOptions() {
  var options = [];
  var used = {};
  var guard = 0;
  while (options.length < 3 && guard < 50) {
    guard++;
    var player = choice(G.run.squad);
    var stat = choice(STAT_KEYS);
    var key = player.instanceId + stat;
    if (used[key]) continue;
    used[key] = true;
    options.push({ playerId: player.instanceId, stat: stat, amount: rand(8, 14) });
  }
  return options;
}

function renderTraining() {
  var cards = G.pendingTraining.map(function (opt, i) {
    var player = G.run.squad.find(function (p) { return p.instanceId === opt.playerId; });
    return (
      '<div class="choice-card">' +
        '<h3>' + escapeHtml(player.nombre) + ' ' + typeBadge(player.tipo) + '</h3>' +
        '<p>Mejora permanente: <strong>+' + opt.amount + ' ' + STAT_LABELS[opt.stat] + '</strong> (actual: ' + player[opt.stat] + ')</p>' +
        '<button class="btn btn-primary btn-block" onclick="applyTraining(' + i + ')">Entrenar</button>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">Entrenamiento</h2><p class="dim small">Elige una mejora de estadística para un jugador de tu plantilla.</p></div>' +
      cards +
    '</div>'
  );
}

function applyTraining(index) {
  var opt = G.pendingTraining[index];
  var player = G.run.squad.find(function (p) { return p.instanceId === opt.playerId; });
  player[opt.stat] = clamp(player[opt.stat] + opt.amount, 0, 99);
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   11. FICHAJE
   --------------------------------------------------------------------- */

function renderRecruit() {
  var full = G.run.squad.length >= MAX_SQUAD;
  var cards = G.pendingRecruits.map(function (cand, i) {
    var actionsHtml = '<button class="btn btn-primary btn-block" onclick="recruitPlayer(' + i + ', null)">Fichar</button>';
    if (full) {
      actionsHtml = '<p class="dim small">Plantilla completa. Elige a quién sustituir:</p>' +
        '<div class="btn-row">' + G.run.squad.map(function (p) {
          return '<button class="btn btn-danger" onclick="recruitPlayer(' + i + ', \'' + p.instanceId + '\')">Sustituir a ' + escapeHtml(p.nombre) + '</button>';
        }).join('') + '</div>';
    }
    return (
      '<div class="choice-card">' +
        '<h3>' + escapeHtml(cand.nombre) + ' ' + typeBadge(cand.tipo) + '</h3>' +
        '<p class="dim">' + cand.posicion + (cand.original ? ' · ' + escapeHtml(cand.original) : '') + '</p>' +
        statBarsHtml(cand) +
        (cand.hissatsu ? '<div class="hissatsu-tag">' + cand.hissatsu.map(escapeHtml).join(' · ') + '</div>' : '') +
        '<div class="mt">' + actionsHtml + '</div>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">Fichaje</h2><p class="dim small">' + (full ? 'Tu plantilla ya tiene 4 jugadores.' : 'Añade un nuevo jugador real de Inazuma Eleven a tu plantilla (máx. 4).') + '</p></div>' +
      cards +
      '<button class="btn btn-outline btn-block mt" onclick="returnToMap()">Rechazar y continuar</button>' +
    '</div>'
  );
}

function recruitPlayer(index, replaceInstanceId) {
  var cand = G.pendingRecruits[index];
  if (replaceInstanceId) {
    var idx = G.run.squad.findIndex(function (p) { return p.instanceId === replaceInstanceId; });
    if (idx !== -1) G.run.squad[idx] = cand;
  } else if (G.run.squad.length < MAX_SQUAD) {
    G.run.squad.push(cand);
  }
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   12. DESCANSO
   --------------------------------------------------------------------- */

function renderRest() {
  var anyFatigued = G.run.squad.some(function (p) { return p.fatigado; });
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Descanso</h2>' +
        '<p class="dim">Tu equipo recupera fuerzas antes del siguiente reto.</p>' +
        '<div class="card-grid">' + G.run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
        '<button class="btn btn-primary btn-block mt" onclick="applyRest()">' + (anyFatigued ? 'Quitar fatiga y continuar' : 'Continuar') + '</button>' +
      '</div>' +
    '</div>'
  );
}

function applyRest() {
  G.run.squad.forEach(function (p) { p.fatigado = false; });
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   12b. EVENTOS ESPECIALES (nodo nuevo: resultado aleatorio entre 3 opciones)
   --------------------------------------------------------------------- */

function resolveEventoNode() {
  var squad = G.run.squad;
  var roll = rand(1, 3);
  if (roll === 1) {
    var p = choice(squad);
    var amount = rand(10, 18);
    p.especial = clamp(p.especial + amount, 0, 99);
    return { type: 'tecnica', text: escapeHtml(p.nombre) + ' aprende una nueva técnica en un entrenamiento especial: +' + amount + ' a Especial.' };
  }
  if (roll === 2) {
    if (squad.length >= MAX_SQUAD) {
      return { type: 'fichaje', text: 'Un jugador prometedor se ofrece a unirse al equipo, pero tu plantilla ya está completa.' };
    }
    var squadIds = squad.map(function (x) { return x.id; });
    var unlocked = getUnlockedIds();
    var pool = ROSTER.filter(function (x) {
      if (squadIds.indexOf(x.id) !== -1) return false;
      if (x.locked && unlocked.indexOf(x.id) === -1) return false;
      return true;
    });
    if (pool.length === 0) {
      return { type: 'fichaje', text: 'No hay ningún jugador disponible para unirse ahora mismo.' };
    }
    var newPlayer = rosterInstance(choice(pool));
    squad.push(newPlayer);
    return { type: 'fichaje', text: escapeHtml(newPlayer.nombre) + ' se une a tu plantilla gratis tras el evento.' };
  }
  var p2 = choice(squad);
  p2.fatigado = true;
  return { type: 'fatiga', text: escapeHtml(p2.nombre) + ' vuelve agotado del evento y queda fatigado (-10 a todo hasta el próximo descanso).' };
}

function renderEvento() {
  var result = G.pendingEventResult || { text: '' };
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Evento Especial</h2>' +
        '<p>' + result.text + '</p>' +
        '<div class="card-grid">' + G.run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
        '<button class="btn btn-primary btn-block mt" onclick="applyEvento()">Continuar</button>' +
      '</div>' +
    '</div>'
  );
}

function applyEvento() {
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   13. SISTEMA DE PARTIDO
   --------------------------------------------------------------------- */

function startMatch(nodeId, isBoss) {
  var depth = mapDepth(nodeId, G.run.map);
  var oppSquad = generateOpponentSquad(depth, isBoss);
  var oppName = (isBoss ? 'Jefe: ' : '') + randomTeamName();
  G.match = {
    isBoss: isBoss,
    oppName: oppName,
    oppSquad: oppSquad,
    turn: 1,
    order: buildTurnOrder(),
    playerScore: 0,
    oppScore: 0,
    // La Especial ya no depende de un medidor de carga lenta: se rige por un
    // cooldown aleatorio de 2 o 3 ataques propios (ver specialStatus), que se
    // vuelve a sortear cada vez que se usa. El Pase adelanta la recarga un
    // ataque extra (su motivo de ser ahora que ya no existe el medidor), y no
    // se puede repetir la misma técnica (mismo nombre de "hissatsu") dos
    // veces seguidas: hay que cambiar de jugador o esperar a la siguiente vez.
    playerAtkCount: 0,
    playerLastSpecialAt: 0,
    playerCooldownNeeded: rand(2, 3),
    playerCooldownBoost: 0,
    playerLastSpecialMove: null,
    oppAtkCount: 0,
    oppLastSpecialAt: 0,
    oppCooldownNeeded: rand(2, 3),
    oppCooldownBoost: 0,
    oppLastSpecialMove: null,
    log: [],
    selectedAttackerId: null,
    lastEvent: null,
    lastEventClass: '',
    finished: false,
    suddenDeath: false,
    sdRound: 0,
    sdStage: 'jugador'
  };
  G.screen = 'match';
  render();
}

function buildTurnOrder() {
  var startsPlayer = Math.random() < 0.5;
  var order = [];
  for (var i = 0; i < MATCH_TURNS; i++) {
    var playerAttacks = (i % 2 === 0) ? startsPlayer : !startsPlayer;
    order.push(playerAttacks ? 'jugador' : 'rival');
  }
  return order;
}

function currentAttacker() {
  if (G.match.suddenDeath) return G.match.sdStage;
  return G.match.order[G.match.turn - 1];
}

// Cooldown de la Especial: lista tras "needed" ataques propios (2 o 3,
// sorteado al azar cada vez que se usa), con el Pase adelantando el
// contador un ataque extra ("boost") como su razón de ser en este sistema.
function specialStatus(atkCount, lastSpecialAt, boost, needed) {
  var need = needed || 2;
  var atkNum = atkCount + 1; // número del próximo ataque de este bando
  var since = (atkNum - lastSpecialAt) + (boost || 0);
  var ready = since >= need;
  return {
    ready: ready,
    turnsLeft: ready ? 0 : (need - since),
    pct: clamp(Math.round((Math.min(since, need) / need) * 100), 0, 100)
  };
}

// Elige quién defiende según la jugada: Tiro y Especial (disparos a puerta)
// los enfrenta el Portero rival si el equipo tiene uno; Pase prefiere un
// Defensa; si esa posición no está en la plantilla, cae a una elección
// aleatoria. Esto es lo que hace que tener portero/defensas importe de verdad.
function pickDefender(squad, action) {
  if (action === 'tiro' || action === 'especial') {
    var gk = squad.find(function (p) { return p.posicion === 'Portero'; });
    if (gk) return gk;
  } else if (action === 'pase') {
    var def = squad.find(function (p) { return p.posicion === 'Defensa'; });
    if (def) return def;
  }
  return choice(squad);
}

// ¿Tiene este plantel un especialista real (portero para tiro/especial,
// defensa para pase) para la acción dada? Se usa para saber si el equipo
// del JUGADOR está jugando "desnudo" de portero/defensa, y compensarlo.
function hasDefensiveSpecialist(squad, action) {
  if (action === 'tiro' || action === 'especial') {
    return squad.some(function (p) { return p.posicion === 'Portero'; });
  }
  if (action === 'pase') {
    return squad.some(function (p) { return p.posicion === 'Defensa'; });
  }
  return true;
}

function renderMatch() {
  var m = G.match;
  if (!m) return '';
  var isPlayerTurn = currentAttacker() === 'jugador' && !m.finished;
  var fieldClass = 'field' + (m.lastEventClass ? ' ' + m.lastEventClass : '');
  var pStatus = specialStatus(m.playerAtkCount, m.playerLastSpecialAt, m.playerCooldownBoost, m.playerCooldownNeeded);

  var body = '';
  if (m.finished) {
    body = renderMatchEnd();
  } else if (isPlayerTurn) {
    body = renderPlayerTurn();
  } else {
    body = '<div class="panel center-text"><p>El rival está atacando…</p><button class="btn btn-primary btn-block" onclick="resolveOpponentTurn()">Continuar</button></div>';
  }

  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><div class="score-name">Tu equipo</div><div class="score-num">' + m.playerScore + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><div class="score-name">' + escapeHtml(m.oppName) + '</div><div class="score-num">' + m.oppScore + '</div></div>' +
      '</div>' +
      '<div class="turn-indicator">' + (m.suddenDeath ? 'Muerte súbita — ronda ' + m.sdRound : 'Turno ' + m.turn + ' de ' + MATCH_TURNS) + (m.finished ? '' : (isPlayerTurn ? ' · Tu ataque' : ' · Ataque rival')) + '</div>' +
      (m.suddenDeath && !m.finished ? '<p class="dim small center-text">Gana quien marque más goles en esta ronda; si sigue empatado, continúa otra ronda.</p>' : '') +
      '<div class="' + fieldClass + '"><div class="field-event">' + (m.lastEvent || (isPlayerTurn ? 'Elige a tu jugador y tu jugada' : '')) + '</div></div>' +
      '<div class="meter-wrap">' +
        '<div class="meter-label"><span>Especial</span><span>' + (pStatus.ready ? '¡Lista!' : 'Disponible en ' + pStatus.turnsLeft + ' turno' + (pStatus.turnsLeft === 1 ? '' : 's')) + '</span></div>' +
        '<div class="meter-track"><div class="meter-fill' + (pStatus.ready ? ' full' : '') + '" style="width:' + pStatus.pct + '%"></div></div>' +
      '</div>' +
      body +
      '<div class="log-panel">' + m.log.slice(-6).map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>' +
    '</div>'
  );
}

function renderPlayerTurn() {
  var m = G.match;
  var squad = G.run.squad;
  var selected = m.selectedAttackerId;
  var cards = squad.map(function (p) {
    return playerCardHtml(p, 'selectAttacker(\'' + p.instanceId + '\')', selected === p.instanceId, false);
  }).join('');

  var pStatus = specialStatus(m.playerAtkCount, m.playerLastSpecialAt, m.playerCooldownBoost, m.playerCooldownNeeded);
  var selectedPlayer = selected ? squad.find(function (p) { return p.instanceId === selected; }) : null;
  var specialLabel = selectedPlayer && selectedPlayer.hissatsu ? selectedPlayer.hissatsu[0] : 'Especial';
  // No se puede repetir la misma técnica dos veces seguidas: si el jugador
  // seleccionado tiene la misma "hissatsu" que se usó la última vez, hay que
  // cambiar de jugador (o esperar a que ese cooldown se reinicie con otro).
  var isRepeat = selectedPlayer && specialLabel === m.playerLastSpecialMove;
  var canSpecial = pStatus.ready && selected && !isRepeat;
  var specialHint = isRepeat ? 'Repetida: cambia de jugador' : (pStatus.ready ? '¡Lista!' : ('Disponible en ' + pStatus.turnsLeft + ' turno' + (pStatus.turnsLeft === 1 ? '' : 's')));

  var matchupHtml = '';
  if (selectedPlayer) {
    var oppGk = m.oppSquad.find(function (p) { return p.posicion === 'Portero'; }) || m.oppSquad[0];
    var adv = typeAdvantage(selectedPlayer.tipo, oppGk.tipo);
    var advWord = adv === 1 ? 'ventaja elemental' : (adv === -1 ? 'desventaja elemental' : 'sin ventaja elemental');
    matchupHtml = '<p class="dim small matchup-info">' + selectedPlayer.tipo + ' vs ' + oppGk.tipo + ' (portero rival): ' + advWord + '</p>';
  }

  var actions = (
    '<div class="action-row">' +
      '<button class="btn action-btn" ' + (selected ? '' : 'disabled') + ' onclick="playAction(\'tiro\')">Tiro<small>Directo a puerta</small></button>' +
      '<button class="btn action-btn" ' + (selected ? '' : 'disabled') + ' onclick="playAction(\'pase\')">Pase<small>Seguro, prepara la especial</small></button>' +
      '<button class="btn action-btn btn-primary" ' + (canSpecial ? '' : 'disabled') + ' onclick="playAction(\'especial\')">' + escapeHtml(specialLabel) + '<small>' + specialHint + '</small></button>' +
    '</div>'
  );

  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Elige jugador</h3>' +
      '<div class="card-grid">' + cards + '</div>' +
      matchupHtml +
      actions +
    '</div>'
  );
}

function selectAttacker(instanceId) { G.match.selectedAttackerId = instanceId; render(); }

function effectiveStats(p) {
  if (!p.fatigado) return p;
  return {
    tiro: clamp(p.tiro - 10, 5, 99),
    pase: clamp(p.pase - 10, 5, 99),
    defensa: clamp(p.defensa - 10, 5, 99),
    especial: clamp(p.especial - 10, 5, 99),
    tipo: p.tipo,
    nombre: p.nombre,
    hissatsu: p.hissatsu
  };
}

function playAction(action) {
  var m = G.match;
  var attackerRaw = G.run.squad.find(function (p) { return p.instanceId === m.selectedAttackerId; });
  if (!attackerRaw) return;
  var defenderRaw = pickDefender(m.oppSquad, action);
  resolveAttack(attackerRaw, defenderRaw, action, true);
  advanceTurn();
}

function resolveOpponentTurn() {
  var m = G.match;
  var attackerRaw = choice(m.oppSquad);
  // La ventaja elemental para decidir la jugada se calcula contra el rival
  // "probable" (el portero del jugador, ya que tiro/especial siempre lo
  // enfrentan) para que la IA decida con la misma info que se le mostraría al jugador.
  var likelyDefender = G.run.squad.find(function (p) { return p.posicion === 'Portero'; }) || choice(G.run.squad);
  var adv = typeAdvantage(attackerRaw.tipo, likelyDefender.tipo);
  var oppStatus = specialStatus(m.oppAtkCount, m.oppLastSpecialAt, m.oppCooldownBoost, m.oppCooldownNeeded);
  var oppMoveName = attackerRaw.hissatsu ? attackerRaw.hissatsu[0] : null;
  var oppIsRepeat = oppMoveName && oppMoveName === m.oppLastSpecialMove;
  var action;
  if (oppStatus.ready && !oppIsRepeat && (adv >= 0 || Math.random() < 0.6)) {
    action = 'especial';
  } else {
    action = Math.random() < 0.65 ? 'tiro' : 'pase';
  }
  var defenderRaw = pickDefender(G.run.squad, action);
  var defHasSpecialist = hasDefensiveSpecialist(G.run.squad, action);
  resolveAttack(attackerRaw, defenderRaw, action, false, defHasSpecialist);
  advanceTurn();
}

function resolveAttack(attackerRaw, defenderRaw, action, isPlayerAttacking, defenderHasSpecialist) {
  var m = G.match;
  var attacker = effectiveStats(attackerRaw);
  var defender = effectiveStats(defenderRaw);
  var adv = typeAdvantage(attacker.tipo, defender.tipo);

  var atkStat, chance;
  if (action === 'tiro') { atkStat = attacker.tiro; chance = 50 + (atkStat - defender.defensa) * 0.6; }
  else if (action === 'pase') { atkStat = attacker.pase; chance = 30 + (atkStat - defender.defensa) * 0.5; }
  else if (isPlayerAttacking) {
    // Tu Especial es un gol casi garantizado: base muy alta y el estatus
    // defensivo del rival solo la penaliza levemente (peso 0.15 en vez de
    // 0.6), así que ni un portero legendario la baja de ~85%.
    atkStat = attacker.especial;
    chance = 94 + (atkStat - defender.defensa) * 0.15;
  } else {
    // La Especial rival es peligrosa pero NO casi-garantizada como la tuya:
    // si no fuera así, un equipo rival podía marcar en prácticamente todos
    // sus turnos contra un equipo sin portero/defensa reales (reportado:
    // 7 goles rivales en 7 turnos).
    atkStat = attacker.especial;
    chance = 58 + (atkStat - defender.defensa) * 0.35;
  }

  chance += adv * (action === 'especial' ? 8 : 14);

  // El equipo rival marca muchos menos goles en general (bajado a petición
  // explícita tras varias partidas injustamente duras para el jugador).
  if (!isPlayerAttacking) chance -= 22;

  var maxChance = (action === 'especial' && isPlayerAttacking) ? 99 : (isPlayerAttacking ? 95 : 65);
  var minChance = (action === 'especial' && isPlayerAttacking) ? 85 : 5;
  chance = clamp(Math.round(chance), minChance, maxChance);

  var roll = rand(1, 100);
  var success = roll <= chance;

  var scoreKey = isPlayerAttacking ? 'playerScore' : 'oppScore';
  var actorLabel = isPlayerAttacking ? escapeHtml(attackerRaw.nombre) : escapeHtml(attackerRaw.nombre) + ' (rival)';
  var advText = adv === 1 ? (' ¡Ventaja elemental (' + attacker.tipo + ' vs ' + defender.tipo + ')!') :
    (adv === -1 ? (' Desventaja elemental (' + attacker.tipo + ' vs ' + defender.tipo + ').') : '');
  var moveName = action === 'especial' && attacker.hissatsu ? attacker.hissatsu[0] : null;

  // Cooldown de la Especial (ver specialStatus): se reinicia y se vuelve a
  // sortear (2 o 3 ataques) al usarla, sea gol o parada. El Pase adelanta
  // el contador un ataque extra (su utilidad ahora que no hay medidor).
  if (isPlayerAttacking) {
    m.playerAtkCount++;
    if (action === 'pase') m.playerCooldownBoost++;
    if (action === 'especial') {
      m.playerLastSpecialAt = m.playerAtkCount;
      m.playerCooldownBoost = 0;
      m.playerCooldownNeeded = rand(2, 3);
      m.playerLastSpecialMove = moveName;
    }
  } else {
    m.oppAtkCount++;
    if (action === 'pase') m.oppCooldownBoost++;
    if (action === 'especial') {
      m.oppLastSpecialAt = m.oppAtkCount;
      m.oppCooldownBoost = 0;
      m.oppCooldownNeeded = rand(2, 3);
      m.oppLastSpecialMove = moveName;
    }
  }

  // Para que se note QUIÉN defiende (y por tanto para qué sirve tener
  // portero/defensa reales), se nombra siempre al defensor cuando el
  // rival es quien ataca, con su posición.
  var defenderTag = (!isPlayerAttacking && (action === 'tiro' || action === 'especial' || action === 'pase'))
    ? (' (' + escapeHtml(defenderRaw.nombre) + ', tu ' + defenderRaw.posicion + ')')
    : '';

  if (success) {
    m[scoreKey]++;
    var verb = action === 'especial' ? ('¡' + escapeHtml(moveName || 'jugada especial') + ' imparable!') : (action === 'tiro' ? '¡GOL!' : '¡Gol tras un gran pase!');
    m.lastEvent = actorLabel + ': ' + verb + defenderTag + advText;
    m.lastEventClass = 'goal';
    m.log.push(m.lastEvent);
  } else {
    var missVerb = action === 'pase' ? 'el pase se corta.' : (action === 'especial' ? (escapeHtml(moveName || 'la jugada especial') + ' es bloqueada.') : 'el tiro es bloqueado.');
    m.lastEvent = actorLabel + ': ' + missVerb + defenderTag + advText;
    m.lastEventClass = 'block';
    m.log.push(m.lastEvent);
  }
  m.selectedAttackerId = null;
}

function advanceTurn() {
  var m = G.match;
  if (m.suddenDeath) {
    if (m.sdStage === 'jugador') { m.sdStage = 'rival'; render(); return; }
    if (m.playerScore !== m.oppScore) { finishMatch(); return; }
    m.sdRound++;
    if (m.sdRound > 5) {
      if (Math.random() < 0.5) m.playerScore++; else m.oppScore++;
      finishMatch();
      return;
    }
    m.sdStage = 'jugador';
    render();
    return;
  }

  m.turn++;
  if (m.turn > MATCH_TURNS) {
    if (m.playerScore === m.oppScore) {
      m.suddenDeath = true;
      m.sdRound = 1;
      m.sdStage = 'jugador';
      m.log.push('Empate — ¡muerte súbita!');
      render();
      return;
    }
    finishMatch();
    return;
  }
  render();
}

function finishMatch() {
  var m = G.match;
  m.finished = true;
  var won = m.playerScore > m.oppScore;
  if (won) {
    G.run.matchesWon++;
    var reward = SPIRIT_PER_MATCH + (m.isBoss ? SPIRIT_PER_BOSS : 0);
    G.run.spiritEarned += reward;
    var candidate = choice(G.run.squad);
    candidate.fatigado = true;
    m.log.push('¡Victoria! +' + reward + ' Puntos de Espíritu (se sumarán al terminar la partida).');
  } else {
    m.log.push('Derrota. Tu temporada termina aquí.');
  }
  render();
}

function renderMatchEnd() {
  var m = G.match;
  var won = m.playerScore > m.oppScore;
  var html = '<div class="panel center-text">';
  if (won) {
    html += '<h3>Victoria ' + m.playerScore + ' - ' + m.oppScore + '</h3>';
    html += '<p class="dim">Tu equipo avanza en el mapa.</p>';
    html += '<button class="btn btn-primary btn-block" onclick="afterMatchWin()">Continuar</button>';
  } else {
    html += '<h3>Derrota ' + m.playerScore + ' - ' + m.oppScore + '</h3>';
    html += '<p class="dim">La partida ha terminado.</p>';
    html += '<button class="btn btn-danger btn-block" onclick="afterMatchLoss()">Ver resumen</button>';
  }
  html += '</div>';
  return html;
}

function afterMatchWin() {
  var wasFinalBoss = mapDepth(G.run.currentNodeId, G.run.map) === G.run.map.rows.length - 1;
  G.match = null;
  clearCurrentNode();
  if (wasFinalBoss) {
    G.run.victory = true;
    G.run.spiritEarned += SPIRIT_PER_BOSS;
    finishRun();
    return;
  }
  G.screen = 'map';
  render();
}

function afterMatchLoss() { G.run.victory = false; finishRun(); }

function finishRun() {
  var meta = G.meta;
  meta.points += G.run.spiritEarned;
  meta.runsPlayed++;
  var depthReached = G.run.clearedCount;
  if (depthReached > meta.bestNode) meta.bestNode = depthReached;
  if (G.run.matchesWon > meta.bestWins) meta.bestWins = G.run.matchesWon;
  saveMeta(meta);
  G.meta = meta;
  G.screen = 'summary';
  render();
}

/* ---------------------------------------------------------------------
   14. RESUMEN
   --------------------------------------------------------------------- */

function renderSummary() {
  var run = G.run;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">' + (run.victory ? '¡Campeones de la temporada!' : 'Resumen de la temporada') + '</h2>' +
        (run.victory ? '<p class="dim">Has superado todo el bracket sin perder ni un partido. ¡Enhorabuena!</p>' : '') +
        '<div class="stats-summary">' +
          '<div class="stat-tile"><div class="num">' + run.clearedCount + '</div><div class="label">Nodos superados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.matchesWon + '</div><div class="label">Partidos ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.spiritEarned + '</div><div class="label">Puntos de Espíritu ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + G.meta.points + '</div><div class="label">Total acumulado</div></div>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionBackToMenu()">Volver al menú</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   15. VESTUARIO (desbloqueos de meta-progreso)
   --------------------------------------------------------------------- */

function renderVestuario() {
  var meta = G.meta;
  var locked = ROSTER.filter(function (p) { return p.locked; });
  var items = locked.map(function (c) {
    var unlocked = meta.unlocked.indexOf(c.id) !== -1;
    var right = unlocked
      ? '<span class="dim">Desbloqueado</span>'
      : '<button class="btn btn-primary" ' + (meta.points >= c.cost ? '' : 'disabled') + ' onclick="buyCaptain(\'' + c.id + '\')">Desbloquear</button>';
    return (
      '<div class="shop-item">' +
        '<div>' +
          avatarHtml(c) + ' <strong>' + escapeHtml(c.nombre) + '</strong> ' + typeBadge(c.tipo) + '<br>' +
          '<span class="dim small">' + c.posicion + ' · ' + escapeHtml(c.desc) + '</span>' +
        '</div>' +
        '<div class="cost">' + (unlocked ? '' : c.cost + ' pts. ') + right + '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Vestuario</h2>' +
        '<p class="currency-display">' + spiritIcon() + ' ' + meta.points + ' Puntos de Espíritu</p>' +
        '<p class="dim small">Desbloquea jugadores adicionales que podrán aparecer al empezar una nueva partida.</p>' +
      '</div>' +
      items +
      '<button class="btn btn-block mt" onclick="actionBackToMenu()">Volver</button>' +
    '</div>'
  );
}

function buyCaptain(playerId) {
  var meta = G.meta;
  var entry = ROSTER.find(function (p) { return p.id === playerId; });
  if (!entry) return;
  if (meta.unlocked.indexOf(playerId) !== -1) return;
  if (meta.points < entry.cost) return;
  meta.points -= entry.cost;
  meta.unlocked.push(playerId);
  saveMeta(meta);
  render();
}

/* ---------------------------------------------------------------------
   16. INICIALIZACIÓN
   --------------------------------------------------------------------- */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    appEl = document.getElementById('app');
    render();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    typeAdvantage: typeAdvantage,
    generateOpponentSquad: generateOpponentSquad,
    generateMap: generateMap,
    bossBonusRange: bossBonusRange,
    ROSTER: ROSTER,
    TYPES: TYPES,
    CYCLE: CYCLE
  };
}
