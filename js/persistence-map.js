/* ---------------------------------------------------------------------
   5. PERSISTENCIA (localStorage)
   --------------------------------------------------------------------- */

// v2: subida de costes de desbloqueo + solo 4 personajes iniciales (antes 12).
// Cambiar la clave de almacenamiento resetea Puntos de Espíritu y
// desbloqueos de TODOS los jugadores (los datos de v1 quedan huérfanos),
// pedido explícitamente al cambiar el sistema de desbloqueo.
var STORAGE_KEY = 'inazumaRoguelike_v2';

function loadMeta() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('none');
    var data = JSON.parse(raw);
    return Object.assign({ points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0, normalWins: 0, bestSurvivalWave: 0, tournamentsWon: 0, dailyLastDate: null, dailyLastResult: null, ligaTierUnlocked: { normal: true, dificil: false, extremo: false }, unlockedShields: [], equippedShield: null }, data);
  } catch (e) {
    return { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0, normalWins: 0, bestSurvivalWave: 0, tournamentsWon: 0, dailyLastDate: null, dailyLastResult: null, ligaTierUnlocked: { normal: true, dificil: false, extremo: false }, unlockedShields: [], equippedShield: null };
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

function generateMap(hardMode) {
  // Nº de nodos por fila variable (3 a 5), como un mapa de rutas ramificadas
  // real, en vez de un número fijo; las filas de jefe (1) se mantienen fijas.
  // Modo Difícil: mismo criterio horizontal que el normal (3 a 5 nodos por
  // fila), pero con más filas verticales por tramo antes de cada jefe: 4
  // filas en vez de 3 para llegar al 1º y 2º jefe, y 2 filas (igual que en
  // normal) para el 3º y el 4º (jefe final, muy difícil) -- 4 jefes en total
  // en vez de 3.
  var rowDefs = hardMode
    ? [rand(3, 5), rand(3, 5), rand(3, 5), rand(3, 5), 1, rand(3, 5), rand(3, 5), rand(3, 5), rand(3, 5), 1, rand(3, 5), rand(3, 5), 1, rand(3, 5), rand(3, 5), 1]
    : [rand(3, 5), rand(3, 5), rand(3, 5), 1, rand(3, 5), rand(3, 5), rand(3, 5), 1, rand(3, 5), rand(3, 5), 1];
  var rows = [];
  var idCounter = 0;
  // Cuenta los nodos de Fichaje del tramo actual (entre un jefe y el
  // siguiente, o desde el principio hasta el primer jefe) para no pasar de
  // MAX_FICHAJE_PER_SEGMENT -- se reinicia cada vez que se cruza un jefe.
  var fichajeInSegment = 0;

  rowDefs.forEach(function (count, rowIndex) {
    var isBoss = count === 1;
    var nodes = [];
    for (var c = 0; c < count; c++) {
      var canFichaje = fichajeInSegment < MAX_FICHAJE_PER_SEGMENT;
      var type;
      if (isBoss) {
        type = 'jefe';
      } else if (rowIndex === 0) {
        // La primera fila siempre es Fichaje o Entrenamiento: nunca un
        // partido (ni evento/descanso) nada más empezar la partida con un
        // plantel de un solo jugador, para dar margen a prepararse.
        type = canFichaje ? choice(['fichaje', 'entrenamiento']) : 'entrenamiento';
      } else {
        type = weightedNodeType(canFichaje);
      }
      if (type === 'fichaje') fichajeInSegment++;
      nodes.push({ id: 'n' + (idCounter++), row: rowIndex, col: c, type: type, cleared: false });
    }
    if (isBoss) fichajeInSegment = 0;
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
        // Posición PROPORCIONAL (no índice bruto) para que la ventana de
        // vecinos tenga sentido aunque las dos filas tengan distinto nº de
        // nodos (2 a 4): evita saltos "de un lado al otro" del mapa.
        var propTarget = curRow.length > 1
          ? (node.col / (curRow.length - 1)) * (nextRow.length - 1)
          : (nextRow.length - 1) / 2;
        var candidates = [];
        for (var t = 0; t < nextRow.length; t++) {
          if (Math.abs(t - propTarget) <= 1.5) candidates.push(nextRow[t].id);
        }
        if (candidates.length === 0) candidates.push(nextRow[Math.round(propTarget)].id);
        // No se puede ir a TODOS los nodos siguientes: entre 1 y 4 al azar
        // (nunca más de los candidatos cercanos que existan de verdad).
        var howMany = Math.min(candidates.length, rand(1, 4));
        var shuffled = candidates.slice().sort(function () { return Math.random() - 0.5; });
        targets = shuffled.slice(0, howMany);
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

// Tope de nodos de Fichaje por tramo (entre un jefe y el siguiente), para
// que subir su probabilidad no inunde el mapa de fichajes -- pedido
// explícito: "como máximo en 3 nodos distintos" entre jefe y jefe.
var MAX_FICHAJE_PER_SEGMENT = 3;

// allowFichaje: si el tramo actual ya llegó a MAX_FICHAJE_PER_SEGMENT, el
// hueco que le tocaría a Fichaje pasa a Descanso en su lugar.
function weightedNodeType(allowFichaje) {
  var roll = Math.random() * 100;
  if (roll < 38) return 'partido';
  if (roll < 52) return 'entrenamiento';
  if (roll < 72) return allowFichaje ? 'fichaje' : 'descanso';
  if (roll < 86) return 'descanso';
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

