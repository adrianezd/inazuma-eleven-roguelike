'use strict';
/* =========================================================================
   INAZUMA ELEVEN ROGUELIKE (fan, no oficial)
   Juego de fútbol por turnos con elementos reales de Inazuma Eleven.
   Sin frameworks, sin backend. El estado de la partida vive en memoria;
   el meta-progreso (Puntos de Espíritu, desbloqueos, mejores marcas) se
   guarda en localStorage.
   ========================================================================= */

/* ---------------------------------------------------------------------
   0. MODO DÍA / NOCHE (tema visual, independiente del meta-progreso)
   --------------------------------------------------------------------- */

var THEME_KEY = 'inazumaRoguelike_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'light' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo noche' : 'Cambiar a modo día');
  }
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#f3f0e8' : '#0d1512');
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var next = current === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* almacenamiento no disponible */ }
  applyTheme(next);
}

(function initTheme() {
  var saved = 'dark';
  try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { /* almacenamiento no disponible */ }
  applyTheme(saved);
})();

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
// Convierte un diccionario {clave: {..., count}} (goleadores/asistentes,
// de partidos por turnos o de FutDraft/Liga) en una lista ordenada de
// mayor a menor count. Uso compartido por renderSummary y las pantallas
// de resumen de FutDraft/Liga.
function sortedStatsList(dict) {
  return Object.keys(dict || {}).map(function (k) { return dict[k]; }).sort(function (a, b) { return b.count - a.count; });
}

// Generador determinista (mulberry32), usado SOLO para el Modo Diario: hace
// que la plantilla y el mapa sean iguales para todo el mundo ese día. El
// combate en sí sigue usando el azar real de siempre (no tendría sentido
// "predecir" un partido, solo el reto de partida/plantel debe ser igual).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dailySeed() {
  var key = todayKey();
  var hash = 0;
  for (var i = 0; i < key.length; i++) { hash = (hash * 31 + key.charCodeAt(i)) | 0; }
  return hash;
}
// Sustituye Math.random por una versión con semilla SOLO durante fn(), y la
// restaura al terminar (incluso si fn lanza un error).
function withSeededRandom(seed, fn) {
  var original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

// Aplica un cambio PERMANENTE (para esta partida) a una estadística de un
// jugador y marca visualmente la dirección del último cambio: verde si
// subió, rojo si bajó. La marca se queda toda la partida (no se limpia),
// salvo que otro cambio posterior a esa misma stat vaya en la dirección
// contraria. No se usa para la fatiga (efecto temporal y reversible, con
// su propio indicador ya existente).
function applyStatChange(player, stat, delta) {
  // Sin techo: un jugador muy entrenado puede superar el 99 "de manual" y
  // seguir subiendo (ver statBarsHtml, que lo pinta en verde en vez del
  // antiguo blanco de "al máximo").
  player[stat] = Math.max(0, player[stat] + delta);
  player.boostedStats = player.boostedStats || [];
  player.reducedStats = player.reducedStats || [];
  if (delta > 0) {
    if (player.boostedStats.indexOf(stat) === -1) player.boostedStats.push(stat);
    var ri = player.reducedStats.indexOf(stat);
    if (ri !== -1) player.reducedStats.splice(ri, 1);
  } else if (delta < 0) {
    if (player.reducedStats.indexOf(stat) === -1) player.reducedStats.push(stat);
    var bi = player.boostedStats.indexOf(stat);
    if (bi !== -1) player.boostedStats.splice(bi, 1);
  }
}
function choice(arr) { return arr[rand(0, arr.length - 1)]; }
function uid() { return 'p' + Math.random().toString(36).slice(2, 10); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Codifica/decodifica un objeto cualquiera en un parámetro de URL
// (JSON -> UTF-8 -> base64), para "compartir con un enlace" sin
// necesidad de backend -- usado por Modo Jugador y FutDraft (plantilla
// y resultado de torneo). unescape/escape con encodeURIComponent/
// decodeURIComponent es el truco de siempre para que btoa/atob (que solo
// entienden Latin1) no rompan con acentos/ñ.
function encodeShareParam(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function decodeShareParam(encoded) {
  try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))); } catch (e) { return null; }
}

/* ---------------------------------------------------------------------
   2b. CONDICIÓN DE TERRENO: con baja probabilidad (5%), un partido puede
   arrancar con una condición climática que da un pequeño empujón o
   penalización -- solo variedad, el 95% de las veces no hay ninguna.
   Se usa tanto en los partidos por turnos (resolveAttack) como en
   FutDraft (que no resuelve ataque a ataque, así que usa un multiplicador
   simétrico sobre la puntuación de equipo en vez de un ajuste por tipo).
   --------------------------------------------------------------------- */
var WEATHER_CHANCE = 0.05;
var WEATHER_CONDITIONS = {
  lluvia: { label: 'Lluvia', desc: 'El balón resbala: cuesta más acertar los tiros.' },
  viento: { label: 'Viento fuerte', desc: 'Favorece a los jugadores de tipo Viento.' },
  barro: { label: 'Terreno embarrado', desc: 'Favorece la fuerza física (tipo Montaña), penaliza la velocidad (Bosque y Viento).' }
};
function rollWeather() {
  if (Math.random() >= WEATHER_CHANCE) return null;
  var keys = Object.keys(WEATHER_CONDITIONS);
  return keys[rand(0, keys.length - 1)];
}
// Ajuste de "chance" de acierto en partidos por turnos, según la acción y
// el tipo elemental de quien ataca.
function weatherChanceDelta(weather, action, attackerTipo) {
  if (!weather) return 0;
  if (weather === 'lluvia') return (action === 'tiro' || action === 'regate') ? -4 : 0;
  if (weather === 'viento') return attackerTipo === 'Viento' ? 6 : -2;
  if (weather === 'barro') {
    if (attackerTipo === 'Montaña') return 6;
    if (attackerTipo === 'Bosque' || attackerTipo === 'Viento') return -3;
    return 0;
  }
  return 0;
}
function typeAdvantage(a, b) {
  if (a === b) return 0;
  var ia = CYCLE.indexOf(a), ib = CYCLE.indexOf(b);
  if (ia === -1 || ib === -1) return 0;
  if ((ia + 1) % CYCLE.length === ib) return 1;  // a vence a b
  if ((ib + 1) % CYCLE.length === ia) return -1; // b vence a a
  return 0;
}

function getTypeSymbol(tipo) {
  var baseUrl = window.location.pathname.includes('/inazuma') ? '/inazuma-eleven-roguelike/' : './';
  var paths = {
    'Fuego': baseUrl + 'assets/elementos/fuego.png',
    'Bosque': baseUrl + 'assets/elementos/bosque.png',
    'Viento': baseUrl + 'assets/elementos/viento.png',
    'Montaña': baseUrl + 'assets/elementos/montaña.png'
  };
  var path = paths[tipo];
  return path ? '<img src="' + path + '" style="width:22px;height:22px;vertical-align:middle;border-radius:3px;" alt="' + tipo + '" />' : '⭕';
}

function typeBadge(tipo) {
  return '<span class="type-badge type-' + tipo.toLowerCase().replace('ñ', 'n') + '">' +
    '<span class="type-symbol">' + getTypeSymbol(tipo) + '</span>' +
    '<span class="type-mark" aria-hidden="true">' + TYPE_MARK[tipo] + '</span>' + tipo + '</span>';
}

function initials(nombre) {
  var parts = String(nombre).trim().split(/\s+/);
  var a = parts[0] ? parts[0][0] : '';
  var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

// Insignia de posición: badge PNG con las siglas reales (PR/DF/MD/DL) en
// assets/posiciones, en la esquina del avatar.
function positionIconPath(pos) {
  switch (pos) {
    case 'Portero': return 'assets/posiciones/PR.png';
    case 'Defensa': return 'assets/posiciones/DF.png';
    case 'Centrocampista': return 'assets/posiciones/MD.png';
    case 'Delantero': return 'assets/posiciones/DL.png';
    default: return '';
  }
}

// Soporte genérico para sprite propio/libre: se prueba automáticamente
// "assets/sprites/{id}.png" para cada jugador (o la ruta de su campo
// "sprite" si se define una distinta a mano). Si el archivo no existe
// todavía, el navegador dispara "onerror" y se cae a las iniciales de
// siempre sin romper nada -- así puedes ir soltando sprites de uno en uno
// sin tener que tocar roster-data.js cada vez.
function avatarHtml(p) {
  var spritePath = p.sprite || ('assets/sprites/' + p.id + '.png');
  var sprite = '<img class="avatar-sprite" src="' + escapeHtml(spritePath) + '" alt="" loading="lazy" ' +
    'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'\';">';
  return '<span class="avatar type-bg-' + p.tipo.toLowerCase().replace('ñ', 'n') + '" aria-hidden="true">' +
    sprite +
    '<span class="avatar-initials" style="display:none">' + initials(p.nombre) + '</span>' +
    '<span class="avatar-pos-badge"><img src="' + escapeHtml(positionIconPath(p.posicion)) + '" alt="' + escapeHtml(p.posicion) + '" onerror="this.parentElement.style.display=\'none\';"></span>' +
    '</span>';
}

