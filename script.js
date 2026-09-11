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
// Multiplicador simétrico (mismo % para los dos bandos) para FutDraft, que
// no tiene ataques individuales, solo una puntuación de equipo agregada.
function weatherFutDraftMultiplier(weather) {
  if (weather === 'lluvia') return 0.9;
  if (weather === 'viento') return 1.1;
  return 1;
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

function generateOpponentSquad(depth, isBoss, isFinalBoss) {
  var squad = [];
  var bonus = bossBonusRange(depth);
  var finalMultiplier = isFinalBoss ? 1.5 : 1; // jefe final 50% más fuerte
  for (var i = 0; i < 4; i++) {
    // Slot 0 se fuerza siempre a Portero: antes cada jugador rival tenía una
    // posición 100% aleatoria e independiente, así que un equipo rival podía
    // (por azar) no tener NINGÚN portero. Eso rompía la mecánica de que los
    // tiros y especiales del jugador siempre se enfrenten al portero rival
    // (ver pickDefender), así que garantizamos exactamente 1 portero por equipo.
    // Las plazas 1-3 NUNCA pueden salir Portero (antes usaban choice(POSITIONS)
    // sin restricción, así que un equipo podía acabar con 2, 3 o hasta 4
    // porteros por azar -- nada realista, y hacía que "Portero rival ataca"
    // saliera muchísimo más de lo que debería).
    var p = generateRivalPlayer(depth, i === 0 ? 'Portero' : choice(['Defensa', 'Centrocampista', 'Delantero']));
    if (isBoss) {
      p.tiro = clamp(Math.round((p.tiro + rand(bonus.statMin, bonus.statMax)) * finalMultiplier), 15, 99);
      p.pase = clamp(Math.round((p.pase + rand(bonus.statMin, bonus.statMax)) * finalMultiplier), 15, 99);
      p.defensa = clamp(Math.round((p.defensa + rand(bonus.statMin, bonus.statMax)) * finalMultiplier), 15, 99);
      p.especial = clamp(Math.round((p.especial + rand(bonus.specialMin, bonus.specialMax)) * finalMultiplier), 15, 99);
    }
    squad.push(p);
  }
  return squad;
}

function randomTeamName(isBoss) { return choice(isBoss ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES); }

// Escudos de equipo (assets/escudos): solo unos pocos equipos rivales de las
// listas de arriba tienen escudo propio hecho. Si el nombre del rival no
// coincide con ninguno, NO se muestra ningún escudo (nada de genérico de
// relleno) -- ese equipo se queda tal cual estaba, solo texto. Las claves se
// normalizan (minúsculas, sin tildes) para no fallar por acentos
// ("Épsilon"/"Géminis") al comparar con el nombre generado.
var TEAM_SHIELD_FILES = {
  'Royal Academy': 'royal-academy.png',
  'Zeus': 'zeus.png',
  'Occult': 'occult.png',
  'Alpino': 'alpino.png',
  'Genesis': 'genesis.png',
  'Prominence': 'prominence.png',
  'Tormenta de Géminis': 'tormenta-de-geminis.png',
  'Pequeños Gigantes': 'pequeños-gigantes.png',
  'Épsilon': 'epsilon.png',
  'Big Waves': 'big-waves.png',
  'Caos': 'caos.png',
  'Chrono Storm': 'chrono-storm.png',
  'Dragon Link': 'dragon-link.png',
  'El Dorado 01': 'eldorado01.png',
  'Farm': 'farm.png',
  'Fauxshore': 'fauxshore.png',
  'Gar': 'gar.png',
  'Gir': 'gir.png',
  'Mar de Árboles': 'mar-de-arboles.png',
  'Mary Times': 'mary-times.png',
  'Neo Japón': 'neo-japon.png',
  'Orfeo': 'orfeo.png',
  'Os Reis': 'osreis.png',
  'Polvo de Diamante': 'polvo-de-diamantes.png',
  'Protocolo Omega': 'protocolo-omega.png',
  'Protocolo Omega 2.0': 'protocolo-omega2-0.png',
  'Protocolo Omega 3.0': 'protocolo-omega-3.0.png',
  'Ragnah': 'ragnah.png',
  'Shuriken': 'shuriken.png',
  'Zanark Domain': 'zanark-domain.png',
  'Equipo Zero': 'zero.png',
  'Desesperdidos': 'desesperados.png',
  'Kirkwood': 'kirkwood.png',
  'Cala Pirata': 'cala-pirata.png',
  'Flota Ixar': 'flota-ixar.png',
  'Dragones de Fuego': 'dragones-de-fuego.png',
  'Earth Eleven': 'earth-eleven.png',
  'Eclipse de Orión': 'eclipse-de-orion.png',
  'Guardianes de La Reina': 'guardianes-de-la-reina.png',
  'Inazuma Japon': 'inazuma-japon.png',
  'Leones del desierto': 'leones-del-desierto.png',
  'Academia Ogre': 'ogro.png',
  'Otaku': 'otaku.png',
  'Instituto Plenilunio': 'plenilunio.png',
  'Resistencia Japón GO': 'resistencia-japon-go.png',
  'Umbrella': 'umbrella.png',
  'Veteranos Inazuma': 'veteranos-inazuma.png',
  'Alius Masters': 'alius-masters.webp',
  'Los arions': 'arions.webp',
  'Brain': 'brain.webp',
  'Dinastía Galáctica': 'dinastia-galactica.webp',
  'El Dorado 02': 'eldorado02.webp',
  'El Dorado 03': 'eldorado03.webp',
  'Emperadores Oscuros': 'emperadores-oscuros.webp',
  'Los Emperadores': 'emperadores.webp',
  'Falam Medius': 'falam-medius.webp',
  'Raimon Inakuni': 'inakuni.webp',
  'Inazuma Japon GO': 'inazuma-japon-go.webp',
  'Instituto Alius': 'instituto-alius.webp',
  'Mar de Luna': 'mar-de-luna.webp',
  'Resistencia Japon': 'resistencia-japon.png',
  'Sallys': 'sallys.webp',
  'Tarjeteros': 'tarjeteros.webp',
  'Unicorn': 'unicorn.webp',
  'Academia Universal': 'universal.webp',
  'Wild': 'wild.webp',
  'Élite Omega': 'elite-omega.webp'
};
// team1.png es el escudo del propio jugador ("Tu equipo"), no un relleno
// genérico para rivales sin escudo -- por eso vive fuera de TEAM_SHIELD_FILES.
var PLAYER_SHIELD = 'assets/escudos/team1.png';
// Escudo de relleno para cualquier rival (normal o jefe) que no tenga uno
// propio en TEAM_SHIELD_FILES -- antes no se mostraba nada, ahora se usa
// siempre este por defecto en cualquier partido.
var SECRET_SHIELD = 'assets/escudos/secret.png';
function normalizeTeamKey(name) {
  return String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
var TEAM_SHIELDS = {};
Object.keys(TEAM_SHIELD_FILES).forEach(function (name) {
  TEAM_SHIELDS[normalizeTeamKey(name)] = 'assets/escudos/' + TEAM_SHIELD_FILES[name];
});
function teamShieldPath(name) {
  var bare = String(name).replace(/^Jefe:\s*/, '');
  return TEAM_SHIELDS[normalizeTeamKey(bare)] || SECRET_SHIELD;
}

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
  return shuffled.slice(0, 4).map(rosterInstance);
}

function generateRecruitOptions() {
  var squadRosterIds = G.run.squad.map(function (p) { return p.id; });
  var unlocked = getUnlockedIds();
  // No se puede tener dos porteros en el mismo equipo real: si ya tienes uno,
  // no se ofrecen más porteros para fichar.
  var alreadyHasPortero = G.run.squad.some(function (p) { return p.posicion === 'Portero'; });
  // Igual que el portero (máx. 1), máximo 2 defensas por equipo.
  var defensaCount = G.run.squad.filter(function (p) { return p.posicion === 'Defensa'; }).length;
  var pool = ROSTER.filter(function (p) {
    if (squadRosterIds.indexOf(p.id) !== -1) return false;
    if (p.locked && unlocked.indexOf(p.id) === -1) return false;
    if (alreadyHasPortero && p.posicion === 'Portero') return false;
    if (defensaCount >= 2 && p.posicion === 'Defensa') return false;
    return true;
  });
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}

/* ---------------------------------------------------------------------
   4b. DRAFT INICIAL (Modo Torneo y Modo Supervivencia): eliges tu plantel
   de 4 completo antes de empezar, en vez de 1 capitán + fichajes sobre la
   marcha. Mismas reglas de posición que el resto del juego (máx. 1
   Portero, máx. 2 Defensa).
   --------------------------------------------------------------------- */

function generateDraftOptions() {
  var squad = G.pendingDraftSquad;
  var squadIds = squad.map(function (p) { return p.id; });
  var unlocked = getUnlockedIds();

  // Modo Torneo: draft estructurado de 4 picks, uno por posición en el
  // orden de POSITIONS (Portero, Defensa, Centrocampista, Delantero) --
  // así siempre sales con un 1-1-1-1 en vez de un plantel al azar que
  // podía salir con 2 defensas y ningún centrocampista.
  if (G.pendingDraftMode === 'torneo') {
    var requiredPos = POSITIONS[squad.length];
    var poolTorneo = ROSTER.filter(function (p) {
      if (squadIds.indexOf(p.id) !== -1) return false;
      if (p.locked && unlocked.indexOf(p.id) === -1) return false;
      return p.posicion === requiredPos;
    });
    var shuffledTorneo = poolTorneo.slice().sort(function () { return Math.random() - 0.5; });
    return shuffledTorneo.slice(0, 3).map(rosterInstance);
  }

  var alreadyHasPortero = squad.some(function (p) { return p.posicion === 'Portero'; });
  var defensaCount = squad.filter(function (p) { return p.posicion === 'Defensa'; }).length;
  var pool = ROSTER.filter(function (p) {
    if (squadIds.indexOf(p.id) !== -1) return false;
    if (p.locked && unlocked.indexOf(p.id) === -1) return false;
    if (alreadyHasPortero && p.posicion === 'Portero') return false;
    if (defensaCount >= 2 && p.posicion === 'Defensa') return false;
    return true;
  });
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}

function actionStartDraftMode(mode) {
  G.pendingDraftMode = mode;
  G.pendingDraftSquad = [];
  G.pendingDraftOptions = generateDraftOptions();
  G.screen = 'draftPick';
  render();
}

function actionStartTournament() { G.screen = 'torneoSizeSelect'; render(); }

function actionChooseTournamentSize(size) {
  G.pendingTournamentBracket = generateTournamentBracket(size);
  actionStartDraftMode('torneo');
}

function renderTorneoSizeSelect() {
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">¿Torneo de cuántos?</h2>' +
        '<p class="dim small">Bracket de eliminación directa: tú y el resto de rivales, la mayoría de nivel jefe.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionChooseTournamentSize(8)">8 equipos</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionChooseTournamentSize(16)">16 equipos</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionChooseTournamentSize(32)">32 equipos</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function pickDraftPlayer(instanceId) {
  var picked = G.pendingDraftOptions.find(function (p) { return p.instanceId === instanceId; });
  if (!picked) return;
  G.pendingDraftSquad.push(picked);
  if (G.pendingDraftSquad.length >= MAX_SQUAD) {
    finishDraft();
  } else {
    G.pendingDraftOptions = generateDraftOptions();
    render();
  }
}

function finishDraft() {
  var mode = G.pendingDraftMode;
  newRun(mode);
  G.run.squad = G.pendingDraftSquad;
  if (mode === 'torneo') {
    var bracket = G.pendingTournamentBracket;
    var round1 = [];
    for (var i = 0; i < bracket.slots.length; i += 2) round1.push({ a: bracket.slots[i], b: bracket.slots[i + 1], winner: null });
    G.tournament = { rounds: [round1], size: bracket.size };
    G.pendingDraftMode = null;
    G.pendingDraftSquad = [];
    G.screen = 'torneoBracket';
    render();
    return;
  }
  if (mode === 'supervivencia') {
    G.run.survivalStep = 0;
    G.run.survivalWave = 0;
    G.run.survivalMatchCount = 0;
    G.pendingDraftMode = null;
    G.pendingDraftSquad = [];
    advanceSurvivalStage();
    return;
  }
  G.pendingDraftMode = null;
  G.pendingDraftSquad = [];
  G.screen = 'map';
  render();
}

function renderDraftPick() {
  var squadHtml = G.pendingDraftSquad.length
    ? '<div class="panel"><h3 style="margin-bottom:8px">Tu plantilla</h3><div class="card-grid">' +
      G.pendingDraftSquad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') +
      '</div></div>'
    : '';
  var optionsHtml = G.pendingDraftOptions.map(function (c) {
    return playerCardHtml(c, 'pickDraftPlayer(\'' + c.instanceId + '\')', false, false);
  }).join('');
  var modeLabel = G.pendingDraftMode === 'torneo' ? 'Torneo' : 'Supervivencia';
  var pickSubtitle = G.pendingDraftMode === 'torneo'
    ? 'Elige tu ' + POSITIONS[G.pendingDraftSquad.length] + ' (' + (G.pendingDraftSquad.length + 1) + ' de ' + MAX_SQUAD + ').'
    : 'Elige a tu jugador ' + (G.pendingDraftSquad.length + 1) + ' de ' + MAX_SQUAD + '.';
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">Draft inicial — ' + modeLabel + '</h2>' +
        '<p class="dim small">' + pickSubtitle + '</p></div>' +
      squadHtml +
      '<div class="panel"><h3 style="margin-bottom:8px">Elige uno</h3><div class="card-grid">' + optionsHtml + '</div></div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   4c. MODO DIARIO: plantel aleatorio con 1 Portero, 1 Defensa, 1
   Centrocampista y 1 Delantero siempre, y el mismo mapa para todo el
   mundo ese día (semilla determinista). El combate en sí sigue usando
   azar real -- solo el plantel y el mapa se generan con semilla.
   --------------------------------------------------------------------- */

function generateDailySquad() {
  var meta = G.meta;
  var eligible = ROSTER.filter(function (p) { return !p.locked || meta.unlocked.indexOf(p.id) !== -1; });
  return POSITIONS.map(function (pos) {
    var options = eligible.filter(function (p) { return p.posicion === pos; });
    if (options.length === 0) options = ROSTER.filter(function (p) { return p.posicion === pos; });
    return rosterInstance(choice(options));
  });
}

// Secuencia fija del Modo Diario (distinta de Supervivencia, que se repite
// en bucle): Partido -> Evento -> Entrenamiento -> Evento -> Jefe final.
// No se ve el mapa en ningún momento: cada etapa lleva directamente a la
// siguiente pantalla (partido, entrenamiento o evento) sin pasar por un
// mapa intermedio.
var DAILY_SEQUENCE = ['partido', 'evento', 'entrenamiento', 'evento', 'jefe'];

function actionStartDaily() {
  var today = todayKey();
  if (G.meta.dailyLastDate === today) {
    G.screen = 'dailyAlreadyPlayed';
    render();
    return;
  }
  var seed = dailySeed();
  var squad;
  // Solo la plantilla se genera con semilla (mismo reto para todo el mundo
  // ese día); el resto de la partida (partidos, eventos) usa azar real.
  withSeededRandom(seed, function () { squad = generateDailySquad(); });
  newRun('diario');
  G.run.squad = squad;
  G.run.dailyStep = 0;
  advanceDailyStage();
}

function advanceDailyStage() {
  var stepType = DAILY_SEQUENCE[G.run.dailyStep];
  G.run.dailyStep++;
  switch (stepType) {
    case 'partido': startDailyMatch(false); break;
    case 'jefe': startDailyMatch(true); break;
    case 'entrenamiento': G.pendingTraining = generateTrainingOptions(); G.screen = 'entrenamiento'; render(); break;
    case 'evento': G.pendingEventResult = resolveEventoNode(); G.screen = 'evento'; render(); break;
  }
}

function startDailyMatch(isBoss) {
  var isFinalBoss = isBoss; // el único jefe de la secuencia diaria es el final
  var oppSquad = generateOpponentSquad(isBoss ? 8 : 3, isBoss, isFinalBoss);
  var oppTeamName = randomTeamName(isBoss);
  var oppName = (isBoss ? 'Jefe: ' : '') + oppTeamName;
  G.match = {
    weather: rollWeather(),
    isBoss: isBoss, oppName: oppName, oppShield: teamShieldPath(oppTeamName), oppSquad: oppSquad, turn: 1, order: buildTurnOrder(),
    playerScore: 0, oppScore: 0,
    playerAtkCount: 0, playerLastSpecialAt: 0, playerCooldownNeeded: rand(2, 3), playerCooldownBoost: 0, playerUsedSpecialByPlayer: {},
    oppAtkCount: 0, oppLastSpecialAt: 0, oppCooldownNeeded: rand(2, 3), oppCooldownBoost: 0, oppLastSpecialMove: null,
    pendingOpp: null, defenseTechniqueUsedByPos: { Portero: false, Defensa: false },
    log: [], selectedAttackerId: null, lastEvent: null, lastEventClass: '', finished: false,
    suddenDeath: false, sdRound: 0, sdStage: 'jugador'
  };
  G.screen = 'match';
  render();
}

function renderDailyAlreadyPlayed() {
  var r = G.meta.dailyLastResult || {};
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Ya has jugado hoy</h2>' +
        '<p class="dim">El Modo Diario se renueva cada día. Vuelve mañana para un nuevo reto.</p>' +
        '<p>' + (r.victory ? '¡Superaste el reto de hoy! 🏆' : 'Hoy llegaste a la etapa ' + (r.nodes || 0) + ' de ' + DAILY_SEQUENCE.length + '.') + '</p>' +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   4d. MODO SUPERVIVENCIA: ciclo fijo que se repite sin fin (Partido,
   Entreno/Evento, Partido, Entreno/Evento, Jefe, Entreno/Evento...). No se
   ve ningún mapa: cada etapa lleva directamente a la siguiente pantalla.
   La oleada (nº de jefes superados) marca cuánto escala la dificultad.
   --------------------------------------------------------------------- */

var SURVIVAL_CYCLE = ['partido', 'entrenoOEvento', 'partido', 'entrenoOEvento', 'jefe', 'entrenoOEvento'];
var SURVIVAL_CASHOUT_EVERY = 5;

function renderSurvivalCashout() {
  var run = G.run;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mt">¿Sigues o te retiras?</h2>' +
        '<p class="dim small">Llevas ' + run.matchesWon + ' partidos ganados y <strong style="color:var(--accent-2)">' + run.spiritEarned + '</strong> Puntos de Espíritu acumulados en esta partida. Si sigues y acabas perdiendo, te los quedas igual -- esto es solo para poder parar cuando quieras sin arriesgarte a nada más.</p>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn btn-primary btn-block" onclick="actionContinueSurvival()">Seguir jugando</button></div>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn btn-outline btn-block" onclick="actionCashOutSurvival()">Retirarte con tus puntos</button></div>' +
      '</div>' +
    '</div>'
  );
}

function actionContinueSurvival() { advanceSurvivalStage(); }

function actionCashOutSurvival() {
  G.run.retired = true;
  finishRun();
}

function advanceSurvivalStage() {
  var stepType = SURVIVAL_CYCLE[G.run.survivalStep % SURVIVAL_CYCLE.length];
  if (stepType === 'entrenoOEvento') stepType = choice(['entrenamiento', 'evento']);
  G.run.survivalStep++;
  if (stepType === 'jefe') G.run.survivalWave = (G.run.survivalWave || 0) + 1;
  switch (stepType) {
    case 'partido': startSurvivalMatch(false); break;
    case 'jefe': startSurvivalMatch(true); break;
    case 'entrenamiento': G.pendingTraining = generateTrainingOptions(); G.screen = 'entrenamiento'; render(); break;
    case 'evento': G.pendingEventResult = resolveEventoNode(); G.screen = 'evento'; render(); break;
  }
}

function startSurvivalMatch(isBoss) {
  // Sin techo de dificultad: la dificultad sube un poco CADA partido (no
  // solo al pasar de oleada) -- 3 partidos por ciclo (2 normales + 1 jefe),
  // así que cada uno suma 1/3 de "oleada" de profundidad. El jefe sigue
  // sintiéndose un pico aparte gracias a su bonus propio (ver
  // bossBonusRange), que se suma encima de esta base ya más alta.
  var depth = (G.run.survivalMatchCount || 0) / 3;
  G.run.survivalMatchCount = (G.run.survivalMatchCount || 0) + 1;
  var oppSquad = generateOpponentSquad(depth, isBoss, false);
  var oppTeamName = randomTeamName(isBoss);
  var oppName = oppTeamName;
  G.match = {
    weather: rollWeather(),
    isBoss: isBoss, oppName: oppName, oppShield: teamShieldPath(oppTeamName), oppSquad: oppSquad, turn: 1, order: buildTurnOrder(),
    playerScore: 0, oppScore: 0,
    playerAtkCount: 0, playerLastSpecialAt: 0, playerCooldownNeeded: rand(2, 3), playerCooldownBoost: 0, playerUsedSpecialByPlayer: {},
    oppAtkCount: 0, oppLastSpecialAt: 0, oppCooldownNeeded: rand(2, 3), oppCooldownBoost: 0, oppLastSpecialMove: null,
    pendingOpp: null, defenseTechniqueUsedByPos: { Portero: false, Defensa: false },
    log: [], selectedAttackerId: null, lastEvent: null, lastEventClass: '', finished: false,
    suddenDeath: false, sdRound: 0, sdStage: 'jugador'
  };
  G.screen = 'match';
  render();
}

/* ---------------------------------------------------------------------
   4e. MODO TORNEO: bracket real de eliminación de 8 (tú + 7 rivales CPU:
   5 de nivel jefe, 2 normales, repartidos al azar en el cuadro). Juegas 3
   rondas (Cuartos, Semis, Final); los partidos del cuadro que no te tocan
   se resuelven solos para que se vea el cuadro completo avanzar.
   --------------------------------------------------------------------- */

function generateTournamentBracket(size) {
  var totalCpu = size - 1; // el jugador ocupa 1 plaza del cuadro
  // Reparto proporcional al caso de referencia de 8 (5 jefes, 2 normales):
  // ~70% de nivel jefe, el resto normal.
  var jefeCount = Math.round(totalCpu * 0.7);
  var normalCount = totalCpu - jefeCount;
  var tiers = [];
  for (var t1 = 0; t1 < jefeCount; t1++) tiers.push('jefe');
  for (var t2 = 0; t2 < normalCount; t2++) tiers.push('normal');
  tiers = tiers.sort(function () { return Math.random() - 0.5; });
  // Nombres SIN repetir en el mismo cuadro: antes cada rival se sorteaba
  // independiente (randomTeamName), así que dos casillas distintas podían
  // sacar el mismo equipo por pura coincidencia (más probable cuanto más
  // grande el torneo). Se reparte de dos mazos ya barajados y compartiendo
  // un set de "usados" entre jefes y normales, porque algunos nombres
  // (Royal Academy, Zeus...) están en las dos listas a la vez.
  var usedTeamNames = {};
  var bossPool = RIVAL_TEAM_BOSSES.slice().sort(function () { return Math.random() - 0.5; });
  var normalPool = RIVAL_TEAM_NAMES.slice().sort(function () { return Math.random() - 0.5; });
  function drawUniqueTeamName(pool) {
    for (var i = 0; i < pool.length; i++) {
      var key = normalizeTeamKey(pool[i]);
      if (!usedTeamNames[key]) { usedTeamNames[key] = true; return pool[i]; }
    }
    return pool[rand(0, pool.length - 1)]; // mazo agotado (torneo enorme): último recurso, puede repetir
  }
  var rivals = tiers.map(function (tier) {
    return { isPlayer: false, name: drawUniqueTeamName(tier === 'jefe' ? bossPool : normalPool), tier: tier };
  });
  var slots = new Array(size);
  var playerSlot = rand(0, size - 1);
  slots[playerSlot] = { isPlayer: true };
  var ri = 0;
  for (var i = 0; i < size; i++) {
    if (i === playerSlot) continue;
    slots[i] = rivals[ri];
    ri++;
  }
  return { slots: slots, size: size };
}

// Fuerza real del equipo (TEAM_POWER, ver roster-data.js) si el nombre está
// en la tabla; si no, un valor de reserva según el nivel (jefe/normal) para
// que nunca falte un número con el que comparar.
function teamPower(side) {
  var bare = String(side.name).replace(/^Jefe:\s*/, '');
  if (TEAM_POWER.hasOwnProperty(bare)) return TEAM_POWER[bare];
  return side.tier === 'jefe' ? 65 : 35;
}

// Resuelve un partido entre dos equipos CPU (no interviene el jugador): se
// tira un dado alrededor de la fuerza real de cada equipo (TEAM_POWER), así
// que el mejor puntuado gana más a menudo pero siempre puede haber sorpresa.
function simulateCpuMatch(a, b) {
  var powerA = clamp(teamPower(a) + rand(-12, 12), 1, 100);
  var powerB = clamp(teamPower(b) + rand(-12, 12), 1, 100);
  return powerA >= powerB ? a : b;
}

// Marcador de un partido CPU-vs-CPU (ninguno de los dos bandos es "tú"):
// usado por el resto del bracket de FutDraft y por los partidos de cada
// jornada de Liga que no son el tuyo, solo para poder repartir goles
// (y por tanto goleadores/asistentes fantasma) entre esos partidos que
// nunca se juegan de verdad. No decide el ganador -- eso lo sigue
// haciendo simulateCpuMatch con su propia tirada, sin relación con esto.
function simulateCpuMatchGoals(sideA, sideB) {
  var powerA = teamPower(sideA), powerB = teamPower(sideB);
  var golA = futDraftRandomGoals(futDraftExpectedGoals(powerA, powerB));
  var golB = futDraftRandomGoals(futDraftExpectedGoals(powerB, powerA));
  return [golA, golB];
}

function startTournamentMatch() {
  var t = G.tournament;
  var round = t.rounds[t.rounds.length - 1];
  var match = round.filter(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; })[0];
  var opp = match.a.isPlayer ? match.b : match.a;
  var isBoss = opp.tier === 'jefe';
  var roundIndex = t.rounds.length - 1; // 0 = primera ronda ... última = Final
  var totalRounds = Math.log2(t.size);
  var isFinalBoss = roundIndex === totalRounds - 1;
  // 0..10 sin importar si el torneo es de 8, 16 o 32: la última ronda
  // siempre llega al tope, escalando proporcionalmente al nº de rondas.
  var normDepth = totalRounds > 1 ? (roundIndex / (totalRounds - 1)) * 10 : 10;
  var oppSquad = generateOpponentSquad(normDepth, isBoss, isFinalBoss);
  var oppName = opp.name;
  var oppShield = teamShieldPath(opp.name);
  G.match = {
    weather: rollWeather(),
    isBoss: isBoss, oppName: oppName, oppShield: oppShield, oppSquad: oppSquad, turn: 1, order: buildTurnOrder(),
    playerScore: 0, oppScore: 0,
    playerAtkCount: 0, playerLastSpecialAt: 0, playerCooldownNeeded: rand(2, 3), playerCooldownBoost: 0, playerUsedSpecialByPlayer: {},
    oppAtkCount: 0, oppLastSpecialAt: 0, oppCooldownNeeded: rand(2, 3), oppCooldownBoost: 0, oppLastSpecialMove: null,
    pendingOpp: null, defenseTechniqueUsedByPos: { Portero: false, Defensa: false },
    log: [], selectedAttackerId: null, lastEvent: null, lastEventClass: '', finished: false,
    suddenDeath: false, sdRound: 0, sdStage: 'jugador'
  };
  G.screen = 'match';
  render();
}

function afterTournamentMatchEnd(playerWon) {
  var t = G.tournament;
  var round = t.rounds[t.rounds.length - 1];
  var match = round.filter(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; })[0];
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);
  if (G.match && G.match.isBoss) G.run.squad.forEach(function (p) { p.fatigado = false; });
  G.match = null;
  if (!playerWon) {
    G.run.victory = false;
    finishRun();
    return;
  }
  // Si esta victoria es la de la Final (queda 1 solo partido en la ronda),
  // el torneo termina aquí mismo: sin entrenamiento ni nada más después.
  if (round.length === 1) {
    completeTournamentRoundAdvance();
    return;
  }
  // Si no era la final: 1 entrenamiento (sin evento especial) antes de ver
  // avanzar el resto del cuadro (ver returnToMap / advanceTournamentPostMatchSequence).
  t.pendingRoundAdvance = true;
  G.pendingTraining = generateTrainingOptions();
  G.screen = 'entrenamiento';
  render();
}

// Se llama desde returnToMap() al terminar el entrenamiento tras un partido
// de torneo ganado (que no era la final): completa el avance de ronda.
function advanceTournamentPostMatchSequence() {
  G.tournament.pendingRoundAdvance = false;
  completeTournamentRoundAdvance();
}

function completeTournamentRoundAdvance() {
  var t = G.tournament;
  var round = t.rounds[t.rounds.length - 1];
  // Resolver el resto de partidos de esta ronda que no jugó el jugador.
  round.forEach(function (m) {
    if (m.winner === null) m.winner = simulateCpuMatch(m.a, m.b);
  });
  if (round.length === 1) {
    // Era la final y el jugador ganó: campeón del torneo.
    G.run.victory = true;
    G.run.spiritEarned += SPIRIT_PER_BOSS;
    finishRun();
    return;
  }
  var winners = round.map(function (m) { return m.winner; });
  var nextRound = [];
  for (var i = 0; i < winners.length; i += 2) nextRound.push({ a: winners[i], b: winners[i + 1], winner: null });
  t.rounds.push(nextRound);
  G.screen = 'torneoBracket';
  render();
}

function roundNameForIndex(idx, totalRounds) {
  var fromEnd = totalRounds - 1 - idx;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Cuartos de Final';
  if (fromEnd === 3) return 'Octavos de Final';
  if (fromEnd === 4) return 'Dieciseisavos de Final';
  return 'Ronda ' + (idx + 1);
}

function bracketShieldHtml(side) {
  var path = side.isPlayer ? PLAYER_SHIELD : teamShieldPath(side.name);
  return '<img class="bracket-shield" src="' + escapeHtml(path) + '" alt="">';
}

function bracketTeamHtml(side, m, colorClass) {
  var label = side.isPlayer ? 'Tú' : escapeHtml(side.name);
  var isWinner = m.winner === side;
  var isLoser = m.winner != null && m.winner !== side;
  var cls = 'bracket-team ' + (isLoser ? 'bracket-team-lost' : colorClass) + (isWinner ? ' bracket-team-winner' : '');
  return '<div class="' + cls + '">' + bracketShieldHtml(side) + '<span>' + label + '</span></div>';
}

function bracketMatchHtml(m) {
  var isPlayerMatch = m.a.isPlayer || m.b.isPlayer;
  var html = '<div class="bracket-match' + (isPlayerMatch && !m.winner ? ' bracket-match-active' : '') + '">' +
      bracketTeamHtml(m.a, m, 'bracket-team-blue') +
      bracketTeamHtml(m.b, m, 'bracket-team-gold') +
    '</div>';
  if (isPlayerMatch && !m.winner) html += '<div class="bracket-your-turn">Tu turno</div>';
  return html;
}

function renderTournamentBracket() {
  var t = G.tournament;
  var totalRounds = Math.log2(t.size);
  var html = '<div class="screen"><div class="panel center-text"><h2 class="panel-title mb0">🏆 Torneo de ' + t.size + '</h2><p class="dim small">Tú y ' + (t.size - 1) + ' rivales, eliminación directa.</p></div>';
  html += '<div class="panel bracket-panel"><div class="bracket-tree">';
  t.rounds.forEach(function (round, ri) {
    var isFinal = round.length === 1;
    html += '<div class="bracket-round-col"><div class="bracket-round-title">' + roundNameForIndex(ri, totalRounds) + '</div>';
    if (isFinal) {
      html += '<div class="bracket-final-wrap">' + bracketMatchHtml(round[0]) + '</div>';
    } else {
      html += '<div class="bracket-pairs">';
      for (var i = 0; i < round.length; i += 2) {
        html += '<div class="bracket-pair">' + bracketMatchHtml(round[i]) + bracketMatchHtml(round[i + 1]) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  });
  var lastRoundForChampion = t.rounds[t.rounds.length - 1];
  var champion = lastRoundForChampion.length === 1 ? lastRoundForChampion[0].winner : null;
  html += '<div class="bracket-round-col bracket-trophy-col"><div class="bracket-round-title">Campeón</div>' +
    '<div class="bracket-trophy-wrap">' +
      '<div class="bracket-trophy' + (champion ? '' : ' is-pending') + '">🏆</div>' +
      '<div class="bracket-champion-name">' + (champion ? (champion.isPlayer ? 'Tú' : escapeHtml(champion.name)) : '?') + '</div>' +
    '</div></div>';
  html += '</div></div>';
  var lastRound = t.rounds[t.rounds.length - 1];
  var pendingPlayerMatch = lastRound.filter(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; })[0];
  if (pendingPlayerMatch) {
    html += '<button class="btn btn-primary btn-block" onclick="startTournamentMatch()">Jugar mi partido</button>';
  }
  html += '</div>';
  return html;
}

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
    return Object.assign({ points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0, normalWins: 0, bestSurvivalWave: 0, tournamentsWon: 0, dailyLastDate: null, dailyLastResult: null, ligaTierUnlocked: { normal: true, dificil: false, extremo: false } }, data);
  } catch (e) {
    return { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0, normalWins: 0, bestSurvivalWave: 0, tournamentsWon: 0, dailyLastDate: null, dailyLastResult: null, ligaTierUnlocked: { normal: true, dificil: false, extremo: false } };
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

/* ---------------------------------------------------------------------
   7. ESTADO GLOBAL
   --------------------------------------------------------------------- */

var G = {
  screen: 'menu',
  meta: (typeof localStorage !== 'undefined') ? loadMeta() : { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0, normalWins: 0, bestSurvivalWave: 0, tournamentsWon: 0, dailyLastDate: null, dailyLastResult: null, ligaTierUnlocked: { normal: true, dificil: false, extremo: false } },
  run: null,
  match: null,
  pendingCaptainOffers: null,
  pendingRecruits: null,
  pendingTraining: null,
  pendingHardMode: false,
  pendingDraftMode: null,
  pendingDraftSquad: [],
  pendingDraftOptions: [],
  vestuarioFilter: { tipo: null, posicion: null },
  coleccionFilter: { tipo: null, posicion: null },
  gacha: { spinning: false, resultId: null }
};

// Acepta el booleano de siempre (true/false = difícil/normal) o, para los
// modos nuevos, una cadena directa ('torneo', 'supervivencia', 'diario').
function newRun(modeOrHard) {
  var mode = typeof modeOrHard === 'string' ? modeOrHard : (modeOrHard ? 'hard' : 'normal');
  var needsBranchedMap = mode === 'normal' || mode === 'hard';
  G.run = {
    squad: [],
    mode: mode,
    hardMode: mode === 'hard',
    map: needsBranchedMap ? generateMap(mode === 'hard') : null,
    currentNodeId: null,
    traversedEdges: {},
    clearedCount: 0,
    matchesWon: 0,
    spiritEarned: 0,
    victory: false,
    startedAt: Date.now(),
    // Goleadores de toda la partida (Normal/Difícil/Torneo/Supervivencia/
    // Diario): los rivales aquí no tienen identidad real (se regeneran de
    // cero en cada partido, ver generateRivalPlayer), así que se agregan
    // por su etiqueta genérica de posición ("Delantero rival", etc.).
    goalStats: { scorers: {} }
  };
}

// Se llama en cada gol de un partido por turnos (ver resolveAttack). No se
// usa en FutDraft/Liga, que llevan su propio sistema de goleadores +
// asistentes (ver futDraftRecordGoalEvents) porque ahí sí se puede simular
// una asistencia con sentido; en un partido por turnos no hay "pase que
// genera el disparo", así que aquí solo se cuenta goleador.
function recordRunGoalScorer(attackerRaw, isPlayerAttacking) {
  if (!G.run || !G.run.goalStats) return;
  var key = isPlayerAttacking ? ('p:' + attackerRaw.id) : ('r:' + attackerRaw.nombre);
  var scorers = G.run.goalStats.scorers;
  var bucket = scorers[key] || { nombre: attackerRaw.nombre + (isPlayerAttacking ? '' : ' (rival)'), count: 0 };
  bucket.count++;
  scorers[key] = bucket;
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
    case 'modeSelect': html = renderModeSelect(); break;
    case 'captainSelect': html = renderCaptainSelect(); break;
    case 'map': html = renderMap(); break;
    case 'match': html = renderMatch(); break;
    case 'entrenamiento': html = renderTraining(); break;
    case 'fichaje': html = renderRecruit(); break;
    case 'descanso': html = renderRest(); break;
    case 'evento': html = renderEvento(); break;
    case 'summary': html = renderSummary(); break;
    case 'vestuario': html = renderVestuario(); break;
    case 'gacha': html = renderGacha(); break;
    case 'penaltyMode': html = renderPenaltyMode(); break;
    case 'coleccion': html = renderColeccion(); break;
    case 'coleccionEquipos': html = renderColeccionEquipos(); break;
    case 'draftPick': html = renderDraftPick(); break;
    case 'dailyAlreadyPlayed': html = renderDailyAlreadyPlayed(); break;
    case 'survivalCashout': html = renderSurvivalCashout(); break;
    case 'torneoBracket': html = renderTournamentBracket(); break;
    case 'torneoSizeSelect': html = renderTorneoSizeSelect(); break;
    case 'futdraftModeSelect': html = renderFutDraftModeSelect(); break;
    case 'futdraftAffinitySelect': html = renderFutDraftAffinitySelect(); break;
    case 'futdraftFormationSelect': html = renderFutDraftFormationSelect(); break;
    case 'futdraftPick': html = renderFutDraftPick(); break;
    case 'futdraftTeam': html = renderFutDraftTeam(); break;
    case 'futdraftBracket': html = renderFutDraftBracket(); break;
    case 'futdraftLive': html = renderFutDraftLive(); break;
    case 'futdraftPenalty': html = renderFutDraftPenalty(); break;
    case 'futdraftMatchResult': html = renderFutDraftMatchResult(); break;
    case 'futdraftSummary': html = renderFutDraftSummary(); break;
    case 'ligaTierSelect': html = renderLigaTierSelect(); break;
    case 'ligaPoolSelect': html = renderLigaPoolSelect(); break;
    case 'ligaTable': html = renderLigaTable(); break;
    case 'ligaSummary': html = renderLigaSummary(); break;
    default: html = renderMenu();
  }
  appEl.innerHTML = html;
  if (G.screen === 'map') drawMapConnections();
  var howToEl = document.getElementById('como-jugar');
  if (howToEl) howToEl.hidden = G.screen !== 'menu';
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
          '<div class="stat-tile"><div class="num">' + (m.bestSurvivalWave || 0) + '</div><div class="label">Mejor oleada (Supervivencia)</div></div>' +
          '<div class="stat-tile"><div class="num">' + (m.tournamentsWon || 0) + '</div><div class="label">Torneos ganados</div></div>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionStartRun()">Jugar</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionStartTournament()">Modo Torneo</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionStartDraftMode(\'supervivencia\')">Modo Supervivencia</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionStartDaily()">Modo Diario' + (G.meta.dailyLastDate === todayKey() ? ' ✓' : '') + '</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionStartPenaltyMode()">Modo Penaltis</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoFutDraftModeSelect()">FutDraft</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoLigaTierSelect()">Liga</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoVestuario()">Vestuario</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoGacha()">Fichaje de Bolas</button>' +
        '</div>' +
        '<p class="dim small center-text">' + GACHA_COST + ' pts. · desbloquea un jugador al azar</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" onclick="actionGoColeccion()">Colección de personajes</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" onclick="actionGoColeccionEquipos()">Colección de equipos</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" disabled style="opacity:0.5;cursor:not-allowed;">Supertécnicas 🔒</button>' +
        '</div>' +
        '<p class="dim small center-text">Proximamente</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" disabled style="opacity:0.5;cursor:not-allowed;">Multijugador 🔒</button>' +
        '</div>' +
        '<p class="dim small center-text">Proximamente</p>' +
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

function hardModeUnlocked() {
  var meta = G.meta;
  var totalUnlocked = ROSTER.filter(function (p) { return !p.locked || meta.unlocked.indexOf(p.id) !== -1; }).length;
  return (meta.normalWins || 0) >= 3 && totalUnlocked > 10;
}

function actionStartRun() { G.screen = 'modeSelect'; render(); }
function actionStartRunWithMode(hard) {
  if (hard && !hardModeUnlocked()) return;
  G.pendingHardMode = !!hard;
  G.pendingCaptainOffers = offerCaptains();
  G.screen = 'captainSelect';
  render();
}
function renderModeSelect() {
  var meta = G.meta;
  var unlocked = hardModeUnlocked();
  var totalUnlocked = ROSTER.filter(function (p) { return !p.locked || meta.unlocked.indexOf(p.id) !== -1; }).length;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Elige el modo de juego</h2>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionStartRunWithMode(false)">Modo Normal</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" style="' + (unlocked ? 'background:#7a1212;color:#fff;' : '') + '" ' +
            (unlocked ? 'onclick="actionStartRunWithMode(true)"' : 'disabled') + '>' +
            'Modo Difícil' + (unlocked ? '' : ' 🔒') +
          '</button>' +
        '</div>' +
        (unlocked
          ? '<p class="dim small">Los rivales meten algún gol más y paran algo más. El mapa tiene 4 jefes en vez de 3 (el último, muy difícil), y en los eventos especiales puede aparecer un jefe por sorpresa.</p>'
          : '<p class="dim small">Se desbloquea ganando el Modo Normal 3 veces y teniendo más de 10 personajes desbloqueados. Progreso: ' + (meta.normalWins || 0) + '/3 victorias, ' + totalUnlocked + '/11 personajes.</p>') +
      '</div>' +
    '</div>'
  );
}
function actionGoVestuario() { G.screen = 'vestuario'; render(); }
function actionGoColeccion() { G.screen = 'coleccion'; render(); }
function actionGoColeccionEquipos() { G.screen = 'coleccionEquipos'; render(); }

function renderColeccionEquipos() {
  var normalItems = RIVAL_TEAM_NAMES.map(function (name) {
    return '<div class="shop-item">' +
      '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(name)) + '" alt="">' +
      '<div style="flex:1"><strong>' + escapeHtml(name) + '</strong></div>' +
    '</div>';
  }).join('');
  var bossItems = RIVAL_TEAM_BOSSES.map(function (name) {
    return '<div class="shop-item">' +
      '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(name)) + '" alt="">' +
      '<div style="flex:1"><strong>' + escapeHtml(name) + '</strong></div>' +
      '<div class="cost"><span class="pill">👑 Jefe</span></div>' +
    '</div>';
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Colección de equipos</h2>' +
        '<p class="dim small">Todos los equipos rivales que pueden aparecer en el juego.</p>' +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Equipos normales (' + RIVAL_TEAM_NAMES.length + ')</h3></div>' +
      normalItems +
      '<div class="panel"><h3 style="margin-bottom:8px">Equipos de jefe (' + RIVAL_TEAM_BOSSES.length + ')</h3></div>' +
      bossItems +
    '</div>'
  );
}

function renderColeccion() {
  var meta = G.meta;
  var filter = G.coleccionFilter || { tipo: null, posicion: null };
  var isUnlocked = function (c) { return !c.locked || meta.unlocked.indexOf(c.id) !== -1; };
  var unlockedCount = ROSTER.filter(isUnlocked).length;

  var filtered = ROSTER.filter(function (c) {
    if (filter.tipo && c.tipo !== filter.tipo) return false;
    if (filter.posicion && c.posicion !== filter.posicion) return false;
    return true;
  });

  var items = filtered.map(function (c) {
    var unlocked = isUnlocked(c);
    return (
      '<div class="shop-item" style="' + (unlocked ? '' : 'opacity:.55;') + '">' +
        '<div>' +
          avatarHtml(c) + ' <strong>' + escapeHtml(c.nombre) + '</strong> ' + typeBadge(c.tipo) + '<br>' +
          '<span class="dim small">' + escapeHtml(c.desc) + '</span>' +
        '</div>' +
        '<div class="cost">' + (unlocked ? '<span class="pill">Desbloqueado</span>' : (c.cost === 99999 ? '<span class="dim">Secreto</span>' : '<span class="dim">Bloqueado</span>')) + '</div>' +
      '</div>'
    );
  }).join('');

  var filterBtns = '<div class="btn-row">' +
    (filter.tipo ? '<button class="btn btn-outline" onclick="coleccionFilterChange(\'tipo\', null)">Tipo: ' + filter.tipo + ' ✕</button>' : TYPES.map(function (t) { return '<button class="btn" onclick="coleccionFilterChange(\'tipo\', \'' + t + '\')">' + t + '</button>'; }).join('')) +
    '</div><div class="btn-row">' +
    (filter.posicion ? '<button class="btn btn-outline" onclick="coleccionFilterChange(\'posicion\', null)">Pos: ' + filter.posicion + ' ✕</button>' : POSITIONS.map(function (p) { return '<button class="btn" onclick="coleccionFilterChange(\'posicion\', \'' + p + '\')">' + p + '</button>'; }).join('')) +
    '</div>';

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Colección de personajes</h2>' +
        '<p class="dim small">' + unlockedCount + ' de ' + ROSTER.length + ' desbloqueados. Mostrando ' + filtered.length + '.</p>' +
        filterBtns +
      '</div>' +
      items +
    '</div>'
  );
}

function coleccionFilterChange(filterType, value) {
  G.coleccionFilter = G.coleccionFilter || { tipo: null, posicion: null };
  G.coleccionFilter[filterType] = value;
  render();
}
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
  newRun(G.pendingHardMode);
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
      statBarsHtml(p) +
      hissatsuHtml +
      (p.fatigado ? '<div class="fatigue-tag">Fatigado (-10 a todo)</div>' : '') +
    '</div>'
  );
}

function statBarsHtml(p) {
  var stats = [['Tiro', 'tiro', p.tiro], ['Regate', 'pase', p.pase], ['Defensa', 'defensa', p.defensa], ['Especial', 'especial', p.especial]];
  var boosted = p.boostedStats || [];
  var reduced = p.reducedStats || [];
  return '<div class="stat-bars">' + stats.map(function (s) {
    var label = s[0], key = s[1], value = s[2];
    // Sin techo de 99: una stat que lo supera (por entrenamiento/bonus) se
    // queda en verde -- antes se ponía en blanco al llegar justo a 99, lo
    // que además ocultaba que siguiera subiendo por encima.
    var isBoosted = boosted.indexOf(key) !== -1 || value > 99;
    var isReduced = reduced.indexOf(key) !== -1;
    var valueColor = isBoosted ? 'color:#7cfc00;font-weight:bold;' : (isReduced ? 'color:#ff5c5c;font-weight:bold;' : '');
    var barStyle = isBoosted ? 'background:#7cfc00;' : (isReduced ? 'background:#ff5c5c;' : '');
    return '<span class="stat-label">' + label + '</span>' +
      '<span class="stat-bar-track"><span class="stat-bar-fill" style="width:' + clamp(value, 0, 100) + '%;' + barStyle + '"></span></span>' +
      '<span class="stat-value" style="' + valueColor + '">' + value + '</span>';
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

function setSquadView(view) {
  G.squadView = view;
  render();
}

// Vista de campo: coloca a la plantilla por posición real, delanteros
// arriba (ataque) y portero abajo (su propia portería), como una alineación.
// Solo se muestran las filas que tienen algún jugador (con MAX_SQUAD=4 casi
// siempre faltará alguna posición).
function renderSquadPitch(squad) {
  var order = ['Delantero', 'Centrocampista', 'Defensa', 'Portero'];
  var rowsHtml = order.map(function (pos) {
    var players = squad.filter(function (p) { return p.posicion === pos; });
    if (!players.length) return '';
    var itemsHtml = players.map(function (p) {
      return (
        '<div class="pitch-player' + (p.fatigado ? ' fatigued' : '') + '">' +
          avatarHtml(p) +
          '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span>' +
        '</div>'
      );
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
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
        '<p class="dim small">Nodos superados: ' + run.clearedCount + ' · Partidos ganados: ' + run.matchesWon + (run.hardMode ? ' · <strong style="color:var(--danger)">Modo Difícil</strong>' : '') + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="panel-title-row">' +
          '<h3>Tu plantilla</h3>' +
          '<div class="view-toggle">' +
            '<button class="btn-tiny' + (G.squadView !== 'lista' ? ' active' : '') + '" onclick="setSquadView(\'campo\')">Campo</button>' +
            '<button class="btn-tiny' + (G.squadView === 'lista' ? ' active' : '') + '" onclick="setSquadView(\'lista\')">Lista</button>' +
          '</div>' +
        '</div>' +
        (G.squadView === 'lista'
          ? '<div class="card-grid">' + run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>'
          : renderSquadPitch(run.squad)) +
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
  var traversed = run.traversedEdges || {};
  // Verde SOLO en el tramo que ya andaste de verdad (traversedEdges), nunca
  // en las opciones que podrías elegir a continuación -- eso se pinta en
  // cuanto entras en el nodo, no antes, para no insinuar una elección que
  // todavía no has hecho.
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
      var stroke = traversed[fromId + '>' + toId] ? '#2f9e6b' : '#2a3b4a';
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
  // Guarda el tramo concreto que se anda (de dónde vienes a dónde vas), no
  // solo que el nodo de origen quedó "superado" -- así el mapa puede pintar
  // el camino real recorrido en vez de adivinarlo por nodos sueltos.
  if (G.run.currentNodeId) {
    G.run.traversedEdges[G.run.currentNodeId + '>' + nodeId] = true;
  }
  G.run.currentNodeId = nodeId;
  switch (node.type) {
    case 'partido': startMatch(nodeId, false); break;
    case 'jefe': startMatch(nodeId, true); break;
    case 'entrenamiento': G.pendingTraining = generateTrainingOptions(); G.screen = 'entrenamiento'; render(); break;
    case 'fichaje': G.pendingRecruits = generateRecruitOptions(); G.screen = 'fichaje'; render(); break;
    case 'descanso': G.screen = 'descanso'; render(); break;
    case 'evento':
      // Solo en Modo Difícil: un evento puede ser en realidad una emboscada
      // de un equipo de jefe (probabilidad baja, no en todos los eventos).
      if (G.run.hardMode && Math.random() < 0.2) {
        startMatch(nodeId, true);
      } else {
        G.pendingEventResult = resolveEventoNode();
        G.screen = 'evento';
        render();
      }
      break;
  }
}

function clearCurrentNode() {
  var node = findNode(G.run.map, G.run.currentNodeId);
  if (node && !node.cleared) { node.cleared = true; G.run.clearedCount++; }
}

function returnToMap() {
  // Supervivencia, Diario y Torneo no usan mapa: cada etapa (entrenamiento,
  // evento) encadena directamente con la siguiente en vez de volver a un mapa.
  if (G.run.mode === 'supervivencia') { advanceSurvivalStage(); return; }
  if (G.run.mode === 'torneo' && G.tournament && G.tournament.pendingRoundAdvance) {
    advanceTournamentPostMatchSequence();
    return;
  }
  if (G.run.mode === 'diario') {
    if (G.run.dailyStep >= DAILY_SEQUENCE.length) {
      G.run.victory = true;
      finishRun();
    } else {
      advanceDailyStage();
    }
    return;
  }
  clearCurrentNode();
  G.screen = 'map';
  render();
}

/* ---------------------------------------------------------------------
   10. ENTRENAMIENTO
   --------------------------------------------------------------------- */

var STAT_KEYS = ['tiro', 'pase', 'defensa', 'especial'];
var STAT_LABELS = { tiro: 'Tiro', pase: 'Regate', defensa: 'Defensa', especial: 'Especial' };

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
  applyStatChange(player, opt.stat, opt.amount);
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
    var origHtml = cand.original ? '<span class="player-original">(' + escapeHtml(cand.original) + ')</span>' : '';
    return (
      '<div class="choice-card">' +
        '<div class="player-card-head">' +
          avatarHtml(cand) +
          '<div class="player-head-text"><span class="player-name">' + escapeHtml(cand.nombre) + '</span>' + origHtml + '</div>' +
          typeBadge(cand.tipo) +
        '</div>' +
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
  var roll = rand(1, 10);
  if (roll === 3) {
    var p3 = choice(squad);
    p3.fatigado = true;
    return { type: 'fatiga', text: escapeHtml(p3.nombre) + ' vuelve agotado del evento y queda fatigado (-10 a todo hasta el próximo descanso).' };
  }
  if (roll === 7) {
    squad.forEach(function (p) { applyStatChange(p, 'especial', 10); });
    return { type: 'bonus', text: 'Subís a la Torre Inazuma a entrenar en altura. Todo el equipo sube +10 a Especial (solo esta partida).' };
  }
  if (roll === 8) {
    var stats = ['tiro', 'pase', 'defensa', 'especial'];
    var pSab = choice(squad);
    var statKey = choice(stats);
    applyStatChange(pSab, statKey, -20);
    return { type: 'malus', text: 'Sabotaje del autobús: ' + escapeHtml(pSab.nombre) + ' llega dolorido por el viaje y pierde 20 puntos en ' + STAT_LABELS[statKey] + '.' };
  }
  if (roll === 9) {
    var squadIdsSecret = squad.map(function (x) { return x.id; });
    var secretPool = ROSTER.filter(function (x) { return x.cost === 99999 && squadIdsSecret.indexOf(x.id) === -1; });
    if (secretPool.length === 0) {
      return { type: 'fichaje', text: 'No hay ningún jugador secreto disponible para unirse ahora mismo.' };
    }
    var secretPlayer = rosterInstance(choice(secretPool));
    if (squad.length >= MAX_SQUAD) {
      return { type: 'fichaje-full', text: '¡' + escapeHtml(secretPlayer.nombre) + ' se ofrece a uniros! Un fichaje secreto muy especial, pero tu plantilla ya está completa.', candidate: secretPlayer };
    }
    squad.push(secretPlayer);
    return { type: 'fichaje', text: '¡' + escapeHtml(secretPlayer.nombre) + ' se une a tu plantilla! Un fichaje secreto muy especial.' };
  }
  if (roll === 10) {
    var anyFatigued = squad.some(function (p) { return p.fatigado; });
    if (!anyFatigued) {
      // Si nadie está fatigado, el hospital no aparece: cae a otro evento.
      return resolveEventoNode();
    }
    squad.forEach(function (p) { p.fatigado = false; });
    return { type: 'bonus', text: 'Visitáis el hospital del Raimon. Todo el equipo se cura de la fatiga.' };
  }
  if (roll === 6) {
    squad.forEach(function (p) {
      p.fatigado = false;
      applyStatChange(p, 'tiro', 10);
    });
    return { type: 'bonus', text: 'Un entrenador invitado os da una charla motivadora: se os quita toda la fatiga y todo el equipo sube +10 a Tiro (solo esta partida).' };
  }
  if (roll === 4) {
    squad.forEach(function (p) {
      applyStatChange(p, 'tiro', 5);
      applyStatChange(p, 'pase', 5);
      applyStatChange(p, 'defensa', 5);
      applyStatChange(p, 'especial', 5);
    });
    return { type: 'bonus', text: 'Silvia os ha preparado bolas de arroz. ¡Todo el equipo sube +5 en todos los atributos (solo esta partida)!' };
  }
  if (roll === 5) {
    squad.forEach(function (p) {
      applyStatChange(p, 'tiro', -5);
      applyStatChange(p, 'pase', -5);
      applyStatChange(p, 'defensa', -5);
      applyStatChange(p, 'especial', -5);
    });
    return { type: 'malus', text: 'Sector Quinto os ha cerrado la escuela. Todo el equipo pierde 5 puntos en todas las estadísticas.' };
  }
  if (roll === 1) {
    var p = choice(squad);
    var amount = rand(10, 18);
    applyStatChange(p, 'especial', amount);
    return { type: 'tecnica', text: escapeHtml(p.nombre) + ' aprende una nueva técnica en un entrenamiento especial: +' + amount + ' a Especial.' };
  }
  if (roll === 2) {
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
    if (squad.length >= MAX_SQUAD) {
      return { type: 'fichaje-full', text: 'Un jugador prometedor, ' + escapeHtml(newPlayer.nombre) + ', se ofrece a unirse al equipo, pero tu plantilla ya está completa.', candidate: newPlayer };
    }
    squad.push(newPlayer);
    return { type: 'fichaje', text: escapeHtml(newPlayer.nombre) + ' se une a tu plantilla gratis tras el evento.' };
  }
}

function renderEvento() {
  var result = G.pendingEventResult || { text: '' };
  // Si el evento ofrece un fichaje pero la plantilla ya está completa, se
  // deja elegir a quién sustituir (o rechazarlo), igual que en el nodo de
  // Fichaje normal, en vez de perder el jugador automáticamente.
  var actionsHtml = '<button class="btn btn-primary btn-block mt" onclick="applyEvento()">Continuar</button>';
  if (result.type === 'fichaje-full' && result.candidate) {
    actionsHtml =
      '<p class="dim small mt">¿Quieres que se una de todos modos? Elige a quién sustituir:</p>' +
      '<div class="btn-row">' + G.run.squad.map(function (p) {
        return '<button class="btn btn-danger" onclick="eventoRecruitDecide(\'' + p.instanceId + '\')">Sustituir a ' + escapeHtml(p.nombre) + '</button>';
      }).join('') + '</div>' +
      '<button class="btn btn-outline btn-block mt" onclick="eventoRecruitDecide(null)">No, gracias</button>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Evento Especial</h2>' +
        '<p>' + result.text + '</p>' +
        '<div class="card-grid">' + G.run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
        actionsHtml +
      '</div>' +
    '</div>'
  );
}

function eventoRecruitDecide(replaceInstanceId) {
  var result = G.pendingEventResult;
  if (replaceInstanceId && result && result.candidate) {
    var idx = G.run.squad.findIndex(function (p) { return p.instanceId === replaceInstanceId; });
    if (idx !== -1) G.run.squad[idx] = result.candidate;
  }
  applyEvento();
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
  var maxDepth = G.run.map.rows.length - 1;
  var isFinalBoss = isBoss && depth === maxDepth; // jefe en la última fila es el final (normal o difícil)
  // La progresión de dificultad está calibrada sobre el mapa normal (11 filas,
  // profundidad máxima 10). El Modo Difícil tiene un mapa más corto (8 filas),
  // así que aquí se normaliza la profundidad a esa misma escala 0-10 para que
  // sus jefes reciban un bonus comparable en vez de uno artificialmente bajo
  // solo por aparecer en una fila más temprana.
  var normDepth = maxDepth > 0 ? (depth / maxDepth) * 10 : depth;
  var oppSquad = generateOpponentSquad(normDepth, isBoss, isFinalBoss);
  var oppTeamName = randomTeamName(isBoss);
  var oppName = oppTeamName;
  G.match = {
    weather: rollWeather(),
    isBoss: isBoss,
    oppName: oppName,
    oppShield: teamShieldPath(oppTeamName),
    oppSquad: oppSquad,
    turn: 1,
    order: buildTurnOrder(),
    playerScore: 0,
    oppScore: 0,
    // La Especial ya no depende de un medidor de carga lenta: se rige por un
    // cooldown aleatorio de 2 o 3 ataques propios (ver specialStatus), que se
    // vuelve a sortear cada vez que se usa. El Pase adelanta la recarga un
    // ataque extra (su motivo de ser ahora que ya no existe el medidor).
    // Cada jugador (delantero/centrocampista) puede usar SU técnica de
    // ataque 1 sola vez por partido -- igual que la técnica defensiva de
    // portero/defensa, no solo "no repetir dos veces seguidas" como antes.
    playerAtkCount: 0,
    playerLastSpecialAt: 0,
    playerCooldownNeeded: rand(2, 3),
    playerCooldownBoost: 0,
    playerUsedSpecialByPlayer: {},
    oppAtkCount: 0,
    oppLastSpecialAt: 0,
    oppCooldownNeeded: rand(2, 3),
    oppCooldownBoost: 0,
    oppLastSpecialMove: null,
    pendingOpp: null,
    // Técnica defensiva: 1 vez por partido POR POSICIÓN -- si tienes portero
    // y defensa, cada uno tiene su propio uso independiente (antes era un
    // único flag global que bloqueaba ambas técnicas con solo usar una).
    defenseTechniqueUsedByPos: { Portero: false, Defensa: false },
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
  // .filter + choice() en vez de .find(): con .find() el primer defensa del
  // array salía SIEMPRE si había 2, y el segundo nunca aparecía. Ahora se
  // elige al azar entre todos los que cumplen la posición (máx. 1 portero,
  // máx. 2 defensas por equipo, así que normalmente son 1-2 candidatos).
  if (action === 'tiro' || action === 'especial') {
    var gks = squad.filter(function (p) { return p.posicion === 'Portero'; });
    if (gks.length) return choice(gks);
  } else if (action === 'regate') {
    var defs = squad.filter(function (p) { return p.posicion === 'Defensa'; });
    if (defs.length) return choice(defs);
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
  if (action === 'regate') {
    return squad.some(function (p) { return p.posicion === 'Defensa'; });
  }
  return true;
}

var FIELD_EVENT_ICONS = { goal: '⚽', save: '🧤', defense: '🛡️', block: '✋' };
function fieldIconHtml(eventClass) {
  if (!eventClass || !FIELD_EVENT_ICONS[eventClass]) return '';
  return '<div class="field-icon">' + FIELD_EVENT_ICONS[eventClass] + '</div>';
}

function renderMatch() {
  var m = G.match;
  if (!m) return '';
  var isPlayerTurn = currentAttacker() === 'jugador' && !m.finished;
  var fieldClass = 'field' + (m.lastEventClass ? ' ' + m.lastEventClass : '');
  var pStatus = specialStatus(m.playerAtkCount, m.playerLastSpecialAt, m.playerCooldownBoost, m.playerCooldownNeeded);

  var body = '';
  if (m.penalty) {
    body = renderPenalty();
  } else if (m.finished) {
    body = renderMatchEnd();
  } else if (isPlayerTurn) {
    body = renderPlayerTurn();
  } else {
    var pend = prepareOpponentTurn();
    var defender = pend.defenderRaw;
    if (pend.defHasSpecialist) {
      // 3 opciones reales: no hacer nada, defensa activa (genérica, se puede
      // repetir cada turno, retrasa 1 turno tu Especial), o la técnica
      // defensiva de verdad (hissatsu real del portero/defensa, solo 1 vez
      // por partido, mucho más fuerte -- casi garantiza que no te marquen).
      var defTechnique = defender.hissatsu ? defender.hissatsu[0] : 'técnica defensiva';
      var techUsed = m.defenseTechniqueUsedByPos[defender.posicion];
      body = '<div class="panel center-text">' +
        '<p>' + escapeHtml(pend.attackerRaw.nombre) + ' (rival) se prepara para atacar.</p>' +
        '<button class="btn btn-block" onclick="resolveOpponentTurn(\'normal\')">No hacer nada</button>' +
        '<button class="btn btn-primary btn-block mt" onclick="resolveOpponentTurn(\'activa\')">Defensa activa de ' + escapeHtml(defender.nombre) + ' (' + defender.posicion + ')<small>Baja la probabilidad de gol rival; retrasa tu Especial 1 turno. Se puede repetir.</small></button>' +
        '<button class="btn btn-block mt" ' + (techUsed ? 'disabled' : '') + ' onclick="resolveOpponentTurn(\'tecnica\')" style="' + (techUsed ? '' : 'background:#7a3b12;color:#fff;') + '">' + (techUsed ? 'Técnica defensiva ya usada esta partida' : ('Usar ' + escapeHtml(defTechnique) + ' de ' + escapeHtml(defender.nombre))) + '<small>' + (techUsed ? '' : 'Su técnica especial EN DEFENSA: casi garantiza que no te marquen. Solo 1 vez por partido.') + '</small></button>' +
      '</div>';
    } else {
      var neededPos = pend.action === 'regate' ? 'Defensa' : 'Portero';
      body = '<div class="panel center-text"><p>El rival está atacando… (no tienes un ' + neededPos + ' real en el campo, así que no puedes defender activamente esta jugada)</p><button class="btn btn-primary btn-block" onclick="resolveOpponentTurn(\'normal\')">Continuar</button></div>';
    }
  }

  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + PLAYER_SHIELD + '" alt=""><div class="score-name">Tu equipo</div><div class="score-num">' + m.playerScore + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(m.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(m.oppName) + '</div><div class="score-num">' + m.oppScore + '</div></div>' +
      '</div>' +
      '<div class="turn-indicator">' + (m.suddenDeath ? 'Muerte súbita — ronda ' + m.sdRound : 'Turno ' + Math.min(m.turn, MATCH_TURNS) + ' de ' + MATCH_TURNS) + (m.finished ? '' : (isPlayerTurn ? ' · Tu ataque' : ' · Ataque rival')) + '</div>' +
      (m.weather ? '<p class="dim small center-text">🌦️ ' + WEATHER_CONDITIONS[m.weather].label + ': ' + WEATHER_CONDITIONS[m.weather].desc + '</p>' : '') +
      (m.suddenDeath && !m.finished ? '<p class="dim small center-text">Gol de oro: gana quien marque primero. Si nadie marca esta ronda, continúa otra.</p>' : '') +
      '<div class="' + fieldClass + '">' + fieldIconHtml(m.lastEventClass) + '<div class="field-event">' + (m.lastEvent || (isPlayerTurn ? 'Elige a tu jugador y tu jugada' : '')) + '</div></div>' +
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
  // Cada jugador puede usar su técnica de ataque 1 sola vez por partido
  // (igual que la técnica defensiva de portero/defensa) -- antes solo se
  // bloqueaba repetirla dos veces SEGUIDAS, así que rotando entre jugadores
  // se podía volver a usar la misma técnica más adelante en el mismo partido.
  var alreadyUsed = selectedPlayer && !!m.playerUsedSpecialByPlayer[selectedPlayer.instanceId];
  // Las técnicas de Portero y Defensa son defensivas: solo sirven para la
  // "defensa activa" cuando ataca el rival (ver prepareOpponentTurn), NUNCA
  // para tirar a puerta. Solo Delantero y Centrocampista pueden usar su
  // Especial en su propio turno de ataque.
  var canAttackWithSpecial = selectedPlayer && (selectedPlayer.posicion === 'Delantero' || selectedPlayer.posicion === 'Centrocampista');
  var canSpecial = pStatus.ready && selected && !alreadyUsed && canAttackWithSpecial;
  var specialHint = (selectedPlayer && !canAttackWithSpecial) ? 'Su técnica es defensiva, no de ataque' :
    (alreadyUsed ? 'Ya usada esta partida' : (pStatus.ready ? '¡Lista!' : ('Disponible en ' + pStatus.turnsLeft + ' turno' + (pStatus.turnsLeft === 1 ? '' : 's'))));

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
      '<button class="btn action-btn" ' + (selected ? '' : 'disabled') + ' onclick="playAction(\'regate\')">Regate<small>Seguro, prepara la especial</small></button>' +
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
    tiro: Math.max(5, p.tiro - 10),
    pase: Math.max(5, p.pase - 10),
    defensa: Math.max(5, p.defensa - 10),
    especial: Math.max(5, p.especial - 10),
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

// Decide la jugada rival SIN resolverla todavía, para poder ofrecerle al
// jugador la opción de defensa activa antes de saber el resultado.
function prepareOpponentTurn() {
  var m = G.match;
  if (m.pendingOpp) return m.pendingOpp;
  // El portero rival nunca ataca (en fútbol real el guardameta no remata a
  // puerta): se elige siempre entre el resto del equipo.
  var attackers = m.oppSquad.filter(function (p) { return p.posicion !== 'Portero'; });
  var attackerRaw = choice(attackers.length ? attackers : m.oppSquad);
  // La ventaja elemental para decidir la jugada se calcula contra el rival
  // "probable" (el portero del jugador, ya que tiro/especial siempre lo
  // enfrentan) para que la IA decida con la misma info que se le mostraría al jugador.
  var likelyDefender = G.run.squad.find(function (p) { return p.posicion === 'Portero'; }) || choice(G.run.squad);
  var adv = typeAdvantage(attackerRaw.tipo, likelyDefender.tipo);
  var oppStatus = specialStatus(m.oppAtkCount, m.oppLastSpecialAt, m.oppCooldownBoost, m.oppCooldownNeeded);
  var oppMoveName = attackerRaw.hissatsu ? attackerRaw.hissatsu[0] : null;
  var oppIsRepeat = oppMoveName && oppMoveName === m.oppLastSpecialMove;
  // Mismo criterio que para el jugador: solo Delantero/Centrocampista pueden
  // rematar con su técnica; Defensa (Portero ya está excluido de atacar) solo
  // ataca con Tiro/Regate normales.
  var oppCanSpecial = attackerRaw.posicion === 'Delantero' || attackerRaw.posicion === 'Centrocampista';
  var action;
  if (oppCanSpecial && oppStatus.ready && !oppIsRepeat && (adv >= 0 || Math.random() < 0.6)) {
    action = 'especial';
  } else {
    action = Math.random() < 0.65 ? 'tiro' : 'regate';
  }
  var defenderRaw = pickDefender(G.run.squad, action);
  var defHasSpecialist = hasDefensiveSpecialist(G.run.squad, action);
  m.pendingOpp = { attackerRaw: attackerRaw, action: action, defenderRaw: defenderRaw, defHasSpecialist: defHasSpecialist };
  return m.pendingOpp;
}

// Resuelve la jugada rival ya decidida. Si el jugador tiene un especialista
// real (portero para tiro/especial, defensa para regate) puede activar una
// "defensa activa": baja bastante la probabilidad de que le marquen esta
// jugada, a cambio de retrasar un turno la recarga de su propia Especial.
// mode: 'normal' (sin hacer nada especial), 'activa' (defensa activa,
// repetible, retrasa la Especial 1 turno) o 'tecnica' (técnica defensiva del
// portero/defensa real, solo 1 vez por partido, mucho más fuerte que "activa").
function resolveOpponentTurn(mode) {
  var m = G.match;
  var p = m.pendingOpp || prepareOpponentTurn();
  m.pendingOpp = null;
  var useActiveDefense = mode === 'activa';
  var useTechnique = mode === 'tecnica';
  if (useActiveDefense) m.playerCooldownBoost -= 1;
  if (useTechnique) m.defenseTechniqueUsedByPos[p.defenderRaw.posicion] = true;
  resolveAttack(p.attackerRaw, p.defenderRaw, p.action, false, p.defHasSpecialist, useActiveDefense, useTechnique);
  advanceTurn();
}

function resolveAttack(attackerRaw, defenderRaw, action, isPlayerAttacking, defenderHasSpecialist, activeDefense, defenseTechnique) {
  var m = G.match;
  var attacker = effectiveStats(attackerRaw);
  var defender = effectiveStats(defenderRaw);
  var adv = typeAdvantage(attacker.tipo, defender.tipo);

  var atkStat, chance;
  if (action === 'tiro') { atkStat = attacker.tiro; chance = 50 + (atkStat - defender.defensa) * 0.5; }
  else if (action === 'regate') { atkStat = attacker.pase; chance = 30 + (atkStat - defender.defensa) * 0.5; }
  else if (isPlayerAttacking) {
    // Tu Especial es un gol casi garantizado: base muy alta y el estatus
    // defensivo del rival solo la penaliza levemente (peso 0.25 ahora: más
    // relevancia de tu Especial stat), así que ni un portero legendario la
    // baja de ~85% con un Especial medio-alto.
    atkStat = attacker.especial;
    chance = 94 + (atkStat - defender.defensa) * 0.25;
  } else {
    // La Especial rival es peligrosa pero NO casi-garantizada como la tuya:
    // si no fuera así, un equipo rival podía marcar en prácticamente todos
    // sus turnos contra un equipo sin portero/defensa reales (reportado:
    // 7 goles rivales en 7 turnos). Ahora con peso 0.45 (subido de 0.35).
    atkStat = attacker.especial;
    chance = 68 + (atkStat - defender.defensa) * 0.45;
  }

  chance += adv * (action === 'especial' ? 8 : 10);
  chance += weatherChanceDelta(m.weather, action, attacker.tipo);

  // El equipo rival marca muchos menos goles en general (bajado a petición
  // explícita tras varias partidas injustamente duras para el jugador).
  if (!isPlayerAttacking) chance -= 10;
  // Defensa activa: el jugador ha elegido defender con su portero/defensa
  // real (solo posible si tiene uno de verdad), a cambio de retrasar un
  // turno la recarga de su propia Especial (ver resolveOpponentTurn).
  if (!isPlayerAttacking && activeDefense) chance -= 20;

  // Modo Difícil: un ajuste pequeño y exclusivo de este modo (no toca el
  // modo normal, que ya está bien equilibrado). El rival mete algún gol
  // más y para algo más al jugador -- "un pelín", nada más.
  if (G.run && G.run.hardMode) chance += isPlayerAttacking ? -5 : 5;

  // Tu propio portero casi nunca mete gol de tiro (es su portero, no un
  // rematador) -- solo se aplica a TU equipo, el del rival da igual porque
  // ya está excluido de atacar por completo (ver prepareOpponentTurn).
  var isOwnGoalkeeperShot = isPlayerAttacking && action === 'tiro' && attackerRaw.posicion === 'Portero';

  // Técnica defensiva (1 sola vez por partido, ver resolveOpponentTurn): un
  // parón/entrada decisivo, mucho más fuerte que la "defensa activa" normal
  // -- por eso ignora incluso el suelo mínimo del rival (30).
  var maxChance = defenseTechnique ? 5 : (isOwnGoalkeeperShot ? 8 : ((action === 'especial' && isPlayerAttacking) ? 99 : (isPlayerAttacking ? 95 : 80)));
  // El suelo del rival sube de 5 a 18: con un portero muy fuerte (88-99 de
  // defensa) el cálculo podía dejarlo casi imbatible (~5% constante). Un
  // suelo más alto asegura que siempre tenga una posibilidad real de marcar.
  var minChance = defenseTechnique ? 1 : ((action === 'especial' && isPlayerAttacking) ? 85 : (isPlayerAttacking ? 5 : 30));
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
    if (action === 'regate') m.playerCooldownBoost++;
    if (action === 'especial') {
      m.playerLastSpecialAt = m.playerAtkCount;
      m.playerCooldownBoost = 0;
      m.playerCooldownNeeded = rand(2, 3);
      m.playerUsedSpecialByPlayer[attackerRaw.instanceId] = true;
    }
  } else {
    m.oppAtkCount++;
    if (action === 'regate') m.oppCooldownBoost++;
    if (action === 'especial') {
      m.oppLastSpecialAt = m.oppAtkCount;
      m.oppCooldownBoost = 0;
      m.oppCooldownNeeded = rand(2, 3);
      m.oppLastSpecialMove = moveName;
    }
  }

  // (Se probó a nombrar al defensor SIEMPRE aquí, pero el jugador pidió
  // quitarlo porque salía en cada jugada rival, no solo cuando importaba.)
  // Solo se nombra la TÉCNICA (el hissatsu real, 1 vez por partido) cuando el
  // jugador la usó de verdad. "Defensa activa" es una acción genérica y
  // repetible, no el hissatsu -- antes mostraba igualmente el nombre de la
  // técnica real (p.ej. "Muro Dimensional de Nero") aunque el jugador solo
  // hubiera elegido "Defensa activa", dando a entender que había gastado su
  // único uso de la técnica cuando no era así.
  var defenderTag = '';
  if (!isPlayerAttacking && defenseTechnique) {
    defenderTag = ' (' + escapeHtml(defender.hissatsu ? defender.hissatsu[0] : 'técnica defensiva') + ' de ' + escapeHtml(defender.nombre) + ')';
  } else if (!isPlayerAttacking && activeDefense) {
    defenderTag = ' (defensa activa de ' + escapeHtml(defender.nombre) + ')';
  }

  // La "ventaja/desventaja elemental" solo se muestra en el resumen pequeño
  // de abajo (el log), no en el mensaje grande de arriba bajo el turno.
  if (success) {
    m[scoreKey]++;
    recordRunGoalScorer(attackerRaw, isPlayerAttacking);
    var verb = action === 'especial' ? ('¡' + escapeHtml(moveName || 'jugada especial') + ' imparable!') : (action === 'tiro' ? '¡GOL!' : '¡Gol tras un gran pase!');
    m.lastEvent = actorLabel + ': ' + verb + defenderTag;
    m.lastEventClass = 'goal';
    m.log.push(m.lastEvent + advText);
  } else {
    var missVerb = action === 'regate' ? 'el regate es cortado.' : (action === 'especial' ? (escapeHtml(moveName || 'la jugada especial') + ' es bloqueada.') : 'el tiro es bloqueado.');
    m.lastEvent = actorLabel + ': ' + missVerb + defenderTag;
    // El icono/animación de la jugada fallida distingue quién la para: el
    // Portero (parada) del Defensa (entrada/defensa) -- así "tiro", "parada"
    // y "defensa" se ven y se sienten como tres eventos distintos, no un
    // único "bloqueo" genérico.
    m.lastEventClass = defenderRaw.posicion === 'Portero' ? 'save' : (defenderRaw.posicion === 'Defensa' ? 'defense' : 'block');
    m.log.push(m.lastEvent + advText);
  }
  m.selectedAttackerId = null;
}

// El partido sigue (no ha terminado en este mismo cambio de turno): antes de
// pintar la pantalla, se sortea si toca un penalti-bonus (ver
// maybeTriggerPenalty). Se hace aquí y no dentro de render() porque render()
// se puede volver a llamar sin que haya pasado turno de verdad (p.ej. al
// redimensionar), y un sorteo ahí lo repetiría cada vez.
function continueMatch() {
  maybeTriggerPenalty();
  render();
}

function advanceTurn() {
  var m = G.match;
  if (m.suddenDeath) {
    // Gol de oro real: el partido termina en cuanto CUALQUIERA de los dos
    // marca, sin esperar a que el otro responda (antes solo se comprobaba
    // tras el turno rival, así que un gol tuyo nunca acababa el partido en
    // el momento -- siempre le daba al rival una respuesta gratis antes de
    // poder ganar).
    if (m.playerScore !== m.oppScore) { finishMatch(); return; }
    if (m.sdStage === 'jugador') { m.sdStage = 'rival'; continueMatch(); return; }
    m.sdRound++;
    if (m.sdRound > 5) {
      if (Math.random() < 0.5) m.playerScore++; else m.oppScore++;
      finishMatch();
      return;
    }
    m.sdStage = 'jugador';
    continueMatch();
    return;
  }

  m.turn++;
  if (m.turn > MATCH_TURNS) {
    if (m.playerScore === m.oppScore) {
      m.suddenDeath = true;
      m.sdRound = 1;
      m.sdStage = 'jugador';
      m.log.push('Empate — ¡muerte súbita!');
      continueMatch();
      return;
    }
    finishMatch();
    return;
  }
  continueMatch();
}

// Penalti-bonus: evento aleatorio (2% cada vez que el partido sigue tras un
// cambio de turno) que interrumpe brevemente el flujo normal para un
// mini-juego de 3 zonas -- no consume el turno en curso, solo se resuelve
// antes de él y luego el partido sigue exactamente donde iba.
function maybeTriggerPenalty() {
  var m = G.match;
  if (!m || m.finished || m.penalty) return;
  if (Math.random() >= 0.02) return;
  var playerShoots = Math.random() < 0.5;
  var shooterSquad = playerShoots ? G.run.squad : m.oppSquad;
  var keeperSquad = playerShoots ? m.oppSquad : G.run.squad;
  var shooterPool = shooterSquad.filter(function (p) { return p.posicion !== 'Portero'; });
  var shooter = choice(shooterPool.length ? shooterPool : shooterSquad);
  var keeper = keeperSquad.find(function (p) { return p.posicion === 'Portero'; }) || choice(keeperSquad);
  m.penalty = { playerShoots: playerShoots, shooterName: shooter.nombre, keeperName: keeper.nombre };
}

function renderPenalty() {
  var m = G.match;
  var p = m.penalty;
  if (p.result) {
    var resultTitle = p.result === 'goal' ? '⚽ ¡Gol!' : '🧤 ¡Parada!';
    return (
      '<div class="panel center-text penalty-panel">' +
        '<h3>' + resultTitle + '</h3>' +
        '<p class="dim small">' + p.resultText + '</p>' +
        '<button class="btn btn-primary btn-block" onclick="continuePenalty()">Continuar</button>' +
      '</div>'
    );
  }
  var title = p.playerShoots ? '⚽ ¡Penalti a tu favor!' : '🧤 ¡Penalti en contra!';
  var subtitle = p.playerShoots
    ? escapeHtml(p.shooterName) + ' se planta ante ' + escapeHtml(p.keeperName) + ' (rival). Elige dónde tirar.'
    : escapeHtml(p.shooterName) + ' (rival) se planta ante ' + escapeHtml(p.keeperName) + '. Elige dónde tirarte a parar.';
  return (
    '<div class="panel center-text penalty-panel">' +
      '<h3>' + title + '</h3>' +
      '<p class="dim small">' + subtitle + '</p>' +
      '<div class="penalty-goal">' +
        '<img class="penalty-goal-img" src="assets/otros/penaltis.png" alt="">' +
        '<div class="penalty-zones">' +
          '<button class="penalty-zone" onclick="resolvePenalty(0)" aria-label="Izquierda"></button>' +
          '<button class="penalty-zone" onclick="resolvePenalty(1)" aria-label="Centro"></button>' +
          '<button class="penalty-zone" onclick="resolvePenalty(2)" aria-label="Derecha"></button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

window.resolvePenalty = function (zone) {
  var m = G.match;
  var p = m && m.penalty;
  if (!p || p.result) return;
  var otherZone = rand(0, 2);
  // "zone" es siempre la zona que cubre el portero (elegida por la CPU si
  // disparas tú, elegida por ti si defiendes) y "otherZone" la del disparo
  // (al azar si defiendes tú, elegida por la CPU si disparas tú). Si
  // coinciden, para; si no, gol -- la misma fórmula sirve para ambos casos.
  var saved = zone === otherZone;
  var scoringSide = p.playerShoots ? 'playerScore' : 'oppScore';
  var shooterLabel = p.playerShoots ? escapeHtml(p.shooterName) : escapeHtml(p.shooterName) + ' (rival)';

  if (!saved) {
    m[scoringSide]++;
    m.lastEvent = shooterLabel + ': ¡penalti anotado!';
    m.lastEventClass = 'goal';
    p.result = 'goal';
    p.resultText = shooterLabel + ' marca el penalti.';
  } else {
    m.lastEvent = shooterLabel + ': penalti detenido por ' + escapeHtml(p.keeperName) + '.';
    m.lastEventClass = 'save';
    p.result = 'save';
    p.resultText = escapeHtml(p.keeperName) + ' detiene el penalti de ' + shooterLabel + '.';
  }
  m.log.push(m.lastEvent);
  // El resultado se muestra en pantalla (ver renderPenalty) antes de volver
  // al partido -- eso ocurre al pulsar "Continuar" (ver continuePenalty).
  render();
};

window.continuePenalty = function () {
  var m = G.match;
  if (!m || !m.penalty) return;
  m.penalty = null;

  // Si esto pasa en muerte súbita y ya decide el partido, hay que cerrarlo
  // aquí mismo: no va a haber otra llamada a advanceTurn para este evento.
  if (m.suddenDeath && m.playerScore !== m.oppScore) {
    finishMatch();
    return;
  }
  render();
};

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
    // El bonus de +5 se calcula AQUÍ (antes de la primera renderización de la
    // pantalla de victoria), no en afterMatchWin: esa función solo se dispara
    // al pulsar "Continuar" y ya navega fuera de esta pantalla, así que si el
    // bonus se calculaba ahí el mensaje nunca llegaba a verse.
    var howMany = Math.random() < 0.6 ? 1 : 2;
    var shuffled = G.run.squad.slice().sort(function () { return Math.random() - 0.5; });
    m.bonusesApplied = [];
    shuffled.slice(0, howMany).forEach(function (p) {
      var stats = ['tiro', 'pase', 'defensa', 'especial'];
      var stat = choice(stats);
      var oldVal = p[stat];
      applyStatChange(p, stat, 5);
      m.bonusesApplied.push({ nombre: p.nombre, stat: stat, oldVal: oldVal, newVal: p[stat] });
    });
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
    if (m.bonusesApplied && m.bonusesApplied.length > 0) {
      html += '<div style="background:#1a3a1a;border-radius:8px;padding:8px;margin:8px 0;text-align:left;">';
      html += '<p style="margin:0 0 6px;color:#7cfc00;font-weight:bold;text-align:center;">Bonificación post-victoria:</p>';
      m.bonusesApplied.forEach(function (b) {
        var statLabel = b.stat === 'pase' ? 'Regate' : (b.stat.charAt(0).toUpperCase() + b.stat.slice(1));
        html += '<p style="margin:4px 0;color:#7cfc00;font-size:0.9em;">' + escapeHtml(b.nombre) + ': ' + statLabel + ' +5 (' + b.oldVal + '→' + b.newVal + ')</p>';
      });
      html += '</div>';
    }
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
  if (G.run.mode === 'torneo') { afterTournamentMatchEnd(true); return; }
  if (G.run.mode === 'supervivencia') {
    if (G.match.isBoss) G.run.squad.forEach(function (p) { p.fatigado = false; });
    G.match = null;
    // Cada SURVIVAL_CASHOUT_EVERY partidos ganados se ofrece la opción de
    // retirarse con los Puntos de Espíritu ya acumulados en esta partida,
    // en vez de forzar a seguir hasta perder para poder cobrarlos.
    if (G.run.matchesWon > 0 && G.run.matchesWon % SURVIVAL_CASHOUT_EVERY === 0) {
      G.screen = 'survivalCashout';
      render();
      return;
    }
    advanceSurvivalStage();
    return;
  }
  if (G.run.mode === 'diario') {
    if (G.match.isBoss) G.run.squad.forEach(function (p) { p.fatigado = false; });
    G.match = null;
    if (G.run.dailyStep >= DAILY_SEQUENCE.length) {
      G.run.victory = true;
      G.run.spiritEarned += SPIRIT_PER_BOSS;
      finishRun();
    } else {
      advanceDailyStage();
    }
    return;
  }
  // ---- Modo Normal / Difícil: mapa ramificado de siempre ----
  var wasFinalBoss = mapDepth(G.run.currentNodeId, G.run.map) === G.run.map.rows.length - 1;
  if (G.match.isBoss) {
    // Vencer a un jefe (cualquiera de los 3) quita la fatiga a todo el equipo.
    G.run.squad.forEach(function (p) { p.fatigado = false; });
  }
  // El bonus de +5 ya se calculó y aplicó en finishMatch(), para que el
  // mensaje se vea en la pantalla de victoria antes de pulsar "Continuar".
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

function afterMatchLoss() {
  if (G.run.mode === 'torneo') { afterTournamentMatchEnd(false); return; }
  G.run.victory = false;
  finishRun();
}

function finishRun() {
  var meta = G.meta;
  meta.points += G.run.spiritEarned;
  meta.runsPlayed++;
  // Solo el Modo Normal cuenta para desbloquear el Modo Difícil -- Torneo,
  // Supervivencia y Diario no deben contar como "victoria en normal".
  if (G.run.victory && G.run.mode === 'normal') meta.normalWins = (meta.normalWins || 0) + 1;
  if (G.run.victory && G.run.mode === 'torneo') meta.tournamentsWon = (meta.tournamentsWon || 0) + 1;
  if (G.run.mode === 'supervivencia' && (G.run.survivalWave || 0) > (meta.bestSurvivalWave || 0)) {
    meta.bestSurvivalWave = G.run.survivalWave;
  }
  if (G.run.mode === 'diario') {
    meta.dailyLastDate = todayKey();
    meta.dailyLastResult = { victory: G.run.victory, nodes: G.run.dailyStep };
  }
  var depthReached = G.run.clearedCount;
  if (depthReached > meta.bestNode) meta.bestNode = depthReached;
  if (G.run.matchesWon > meta.bestWins) meta.bestWins = G.run.matchesWon;
  saveMeta(meta);
  G.meta = meta;
  showEndAnimation(G.run.victory, G.run.mode, G.run.retired);
  G.screen = 'summary';
  render();
}

function showEndAnimation(victory, mode, retired) {
  var div = document.createElement('div');
  if (retired) {
    div.className = 'victory-animation';
    div.textContent = '💰';
  } else if (mode === 'torneo' && victory) {
    div.className = 'tournament-victory';
    div.innerHTML = '<div class="trophy-icon">🏆</div><div class="victory-text">¡CAMPEÓN!</div>';
  } else if (victory) {
    div.className = 'victory-animation';
    div.textContent = '✨';
  } else {
    div.className = 'defeat-animation';
    div.textContent = '💔';
  }
  document.body.appendChild(div);
  setTimeout(function() { div.remove(); }, mode === 'torneo' ? 2500 : 1500);
}

/* ---------------------------------------------------------------------
   14. RESUMEN
   --------------------------------------------------------------------- */

function renderSummary() {
  var run = G.run;
  var title = run.retired ? 'Te retiras con tus puntos a salvo' : (run.victory ? '¡Campeones de la temporada!' : 'Resumen de la temporada');
  var scorers = sortedStatsList((run.goalStats || { scorers: {} }).scorers).slice(0, 8);
  var scorersHtml = scorers.length
    ? '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Goleadores de la partida</h3>' +
        scorers.map(function (s, i) {
          return '<div class="futdraft-timeline-row"><span>' + (i + 1) + '.</span><span style="flex:1;text-align:left">' + escapeHtml(s.nombre) + '</span><span class="dim">' + s.count + '</span></div>';
        }).join('') +
      '</div>'
    : '';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">' + title + '</h2>' +
        (run.retired ? '<p class="dim">Te llevas todo lo ganado en esta partida sin arriesgarte a más.</p>' : (run.victory ? '<p class="dim">Has superado todo el bracket sin perder ni un partido. ¡Enhorabuena!</p>' : '')) +
        '<div class="stats-summary">' +
          '<div class="stat-tile"><div class="num">' + run.clearedCount + '</div><div class="label">Nodos superados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.matchesWon + '</div><div class="label">Partidos ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.spiritEarned + '</div><div class="label">Puntos de Espíritu ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + G.meta.points + '</div><div class="label">Total acumulado</div></div>' +
        '</div>' +
      '</div>' +
      scorersHtml +
      '<div class="panel center-text">' +
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
  var filter = G.vestuarioFilter || { tipo: null, posicion: null };
  var locked = ROSTER.filter(function (p) { return p.locked && p.cost !== 99999; });

  var filtered = locked.filter(function (c) {
    if (filter.tipo && c.tipo !== filter.tipo) return false;
    if (filter.posicion && c.posicion !== filter.posicion) return false;
    return true;
  });

  var items = filtered.map(function (c) {
    var unlocked = meta.unlocked.indexOf(c.id) !== -1;
    var right = unlocked
      ? '<span class="dim">Desbloqueado</span>'
      : '<button class="btn btn-primary" ' + (meta.points >= c.cost ? '' : 'disabled') + ' onclick="buyCaptain(\'' + c.id + '\')">Desbloquear</button>';
    return (
      '<div class="shop-item">' +
        '<div>' +
          avatarHtml(c) + ' <strong>' + escapeHtml(c.nombre) + '</strong> ' + typeBadge(c.tipo) + '<br>' +
          '<span class="dim small">' + escapeHtml(c.desc) + '</span>' +
        '</div>' +
        '<div class="cost">' + (unlocked ? '' : c.cost + ' pts. ') + right + '</div>' +
      '</div>'
    );
  }).join('');

  var filterBtns = '<div class="btn-row">' +
    (filter.tipo ? '<button class="btn btn-outline" onclick="vestuarioFilterChange(\'tipo\', null)">Tipo: ' + filter.tipo + ' ✕</button>' : TYPES.map(function (t) { return '<button class="btn" onclick="vestuarioFilterChange(\'tipo\', \'' + t + '\')">' + t + '</button>'; }).join('')) +
    '</div><div class="btn-row">' +
    (filter.posicion ? '<button class="btn btn-outline" onclick="vestuarioFilterChange(\'posicion\', null)">Pos: ' + filter.posicion + ' ✕</button>' : POSITIONS.map(function (p) { return '<button class="btn" onclick="vestuarioFilterChange(\'posicion\', \'' + p + '\')">' + p + '</button>'; }).join('')) +
    '</div>';

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Vestuario</h2>' +
        '<p class="currency-display">' + spiritIcon() + ' ' + meta.points + ' Puntos de Espíritu</p>' +
        '<p class="dim small">Mostrando ' + filtered.length + ' de ' + locked.length + ' jugadores desbloqueables.</p>' +
        filterBtns +
      '</div>' +
      items +
    '</div>'
  );
}

function vestuarioFilterChange(filterType, value) {
  G.vestuarioFilter = G.vestuarioFilter || { tipo: null, posicion: null };
  G.vestuarioFilter[filterType] = value;
  render();
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
   15b. FICHAJE DE BOLAS: máquina gachapon -- tirada al azar (no eliges a
   quién) que desbloquea un jugador real cualquiera que aún no tengas, a
   cambio de Puntos de Espíritu. Complementa al Vestuario (ahí SÍ eliges a
   quién desbloquear, pero jugador por jugador y a precios variables).
   --------------------------------------------------------------------- */

var GACHA_COST = 120;
var GACHA_SPIN_MS = 1600;

function actionGoGacha() {
  G.gacha = { spinning: false, resultId: null };
  G.screen = 'gacha';
  render();
}

function gachaLockedPool() {
  var meta = G.meta;
  return ROSTER.filter(function (p) { return p.locked && meta.unlocked.indexOf(p.id) === -1; });
}

function spinGacha() {
  var meta = G.meta;
  if (G.gacha.spinning) return;
  if (meta.points < GACHA_COST) return;
  var pool = gachaLockedPool();
  if (!pool.length) return;
  meta.points -= GACHA_COST;
  saveMeta(meta);
  G.gacha.spinning = true;
  G.gacha.resultId = null;
  render();
  setTimeout(function () {
    var won = choice(pool);
    meta.unlocked.push(won.id);
    saveMeta(meta);
    G.gacha.spinning = false;
    G.gacha.resultId = won.id;
    render();
  }, GACHA_SPIN_MS);
}

function gachaMachineHtml(spinning) {
  return (
    '<div class="gacha-machine' + (spinning ? ' spinning' : '') + '">' +
      '<div class="gacha-dome">' +
        '<span class="gacha-ball" style="--c1:#e94560;--c2:#ff8fa3;left:16%;top:52%;"></span>' +
        '<span class="gacha-ball" style="--c1:#4ecdc4;--c2:#a8f5ee;left:42%;top:30%;"></span>' +
        '<span class="gacha-ball" style="--c1:#44b78b;--c2:#a8f0cf;left:66%;top:55%;"></span>' +
        '<span class="gacha-ball" style="--c1:#ffd166;--c2:#fff0c2;left:28%;top:68%;"></span>' +
        '<span class="gacha-ball" style="--c1:#8c4fd1;--c2:#d6bdf5;left:54%;top:72%;"></span>' +
        '<span class="gacha-ball" style="--c1:#3a8fd9;--c2:#a9d4f5;left:78%;top:36%;"></span>' +
      '</div>' +
      '<div class="gacha-body">' +
        '<div class="gacha-slot"></div>' +
        '<div class="gacha-crank"><span class="gacha-crank-arm"></span><span class="gacha-crank-knob"></span></div>' +
      '</div>' +
    '</div>'
  );
}

function renderGacha() {
  var meta = G.meta;
  var pool = gachaLockedPool();
  var g = G.gacha || { spinning: false, resultId: null };
  var resultPlayer = g.resultId ? ROSTER.find(function (p) { return p.id === g.resultId; }) : null;

  var resultHtml = '';
  if (g.spinning) {
    resultHtml = '<p class="dim small center-text mt">Girando la máquina…</p>';
  } else if (resultPlayer) {
    resultHtml =
      '<div class="panel gacha-result mt">' +
        '<p class="center-text" style="color:var(--accent-2);font-weight:700;">¡Fichaje conseguido!</p>' +
        '<div class="player-card-head" style="justify-content:center;">' +
          avatarHtml(resultPlayer) +
          '<div class="player-head-text"><span class="player-name">' + escapeHtml(resultPlayer.nombre) + '</span>' +
          (resultPlayer.original ? '<span class="player-original">(' + escapeHtml(resultPlayer.original) + ')</span>' : '') + '</div>' +
          typeBadge(resultPlayer.tipo) +
        '</div>' +
        '<p class="dim small center-text">' + escapeHtml(resultPlayer.desc) + '</p>' +
      '</div>';
  } else if (!pool.length) {
    resultHtml = '<p class="dim small center-text mt">Ya tienes a todo el plantel disponible. ¡No queda nadie más por fichar!</p>';
  }

  var canSpin = !g.spinning && pool.length > 0 && meta.points >= GACHA_COST;
  var spinLabel = g.spinning ? 'Girando…' : ('Girar (' + GACHA_COST + ' pts.)');

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Fichaje de Bolas</h2>' +
        '<p class="dim small">Gira la máquina y ficha a un jugador real al azar entre los que aún no tienes. No se puede elegir a quién te toca.</p>' +
        '<p class="currency-display">' + spiritIcon() + ' ' + meta.points + ' Puntos de Espíritu</p>' +
      '</div>' +
      '<div class="panel center-text">' +
        gachaMachineHtml(g.spinning) +
        '<button class="btn btn-primary btn-block mt" ' + (canSpin ? '' : 'disabled') + ' onclick="spinGacha()">' + spinLabel + '</button>' +
        resultHtml +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   15c. MODO PENALTIS: tanda rápida e independiente (sin plantilla, sin
   mapa), a 5 lanzamientos por bando con muerte súbita si hay empate.
   Reutiliza la imagen de 3 zonas del penalti-bonus de los partidos.
   --------------------------------------------------------------------- */

var PENALTY_MODE_ROUNDS = 5;

function actionStartPenaltyMode() {
  var oppTeamName = randomTeamName(Math.random() < 0.4);
  G.penaltyRun = {
    playerGoals: 0,
    rivalGoals: 0,
    round: 1,
    stage: 'shoot', // 'shoot' = chutas tú, 'defend' = paras al rival
    suddenDeath: false,
    finished: false,
    winner: null,
    oppName: oppTeamName,
    oppShield: teamShieldPath(oppTeamName),
    log: []
  };
  G.screen = 'penaltyMode';
  render();
}

window.resolvePenaltyModeShot = function (zone) {
  var p = G.penaltyRun;
  if (!p || p.finished || p.result) return;
  var otherZone = rand(0, 2);
  var saved = zone === otherZone;

  if (p.stage === 'shoot') {
    if (!saved) { p.playerGoals++; p.log.push('Tú: ¡gol!'); p.result = { type: 'goal', text: '¡Marcas el penalti!' }; }
    else { p.log.push('Tú: penalti parado.'); p.result = { type: 'save', text: 'El portero rival ataja tu disparo.' }; }
  } else {
    if (!saved) { p.rivalGoals++; p.log.push(escapeHtml(p.oppName) + ': ¡gol!'); p.result = { type: 'goal', text: escapeHtml(p.oppName) + ' anota el penalti.' }; }
    else { p.log.push(escapeHtml(p.oppName) + ': penalti parado.'); p.result = { type: 'save', text: '¡Detienes el penalti rival!' }; }
  }
  // El resultado se muestra en pantalla (ver renderPenaltyMode) antes de
  // pasar al siguiente lanzamiento -- eso ocurre al pulsar "Continuar"
  // (ver continuePenaltyModeShot), que aplica el cambio de turno/ronda.
  render();
};

window.continuePenaltyModeShot = function () {
  var p = G.penaltyRun;
  if (!p || !p.result) return;
  p.result = null;

  if (p.stage === 'shoot') {
    p.stage = 'defend';
    render();
    return;
  }

  p.stage = 'shoot';
  if (p.suddenDeath) {
    if (p.playerGoals !== p.rivalGoals) { finishPenaltyMode(); return; }
  } else {
    p.round++;
    if (p.round > PENALTY_MODE_ROUNDS) {
      if (p.playerGoals === p.rivalGoals) { p.suddenDeath = true; }
      else { finishPenaltyMode(); return; }
    }
  }
  render();
};

function finishPenaltyMode() {
  var p = G.penaltyRun;
  p.finished = true;
  p.winner = p.playerGoals > p.rivalGoals ? 'jugador' : 'rival';
  render();
}

function renderPenaltyMode() {
  var p = G.penaltyRun;
  if (!p) { actionStartPenaltyMode(); return ''; }
  if (p.finished) return renderPenaltyModeEnd(p);

  var isShoot = p.stage === 'shoot';
  var title = isShoot ? '⚽ Tu turno de chutar' : '🧤 Para el penalti rival';
  var subtitle = isShoot ? 'Elige dónde tirar.' : 'Elige dónde tirarte a parar.';

  var actionHtml;
  if (p.result) {
    actionHtml =
      '<h3 style="margin-bottom:4px">' + (p.result.type === 'goal' ? '⚽ ¡Gol!' : '🧤 ¡Parada!') + '</h3>' +
      '<p class="dim small">' + p.result.text + '</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="continuePenaltyModeShot()">Continuar</button>';
  } else {
    actionHtml =
      '<h3 style="margin-bottom:4px">' + title + '</h3>' +
      '<p class="dim small">' + subtitle + '</p>' +
      '<div class="penalty-goal">' +
        '<img class="penalty-goal-img" src="assets/otros/penaltis.png" alt="">' +
        '<div class="penalty-zones">' +
          '<button class="penalty-zone" onclick="resolvePenaltyModeShot(0)" aria-label="Izquierda"></button>' +
          '<button class="penalty-zone" onclick="resolvePenaltyModeShot(1)" aria-label="Centro"></button>' +
          '<button class="penalty-zone" onclick="resolvePenaltyModeShot(2)" aria-label="Derecha"></button>' +
        '</div>' +
      '</div>';
  }

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Modo Penaltis</h2>' +
        '<p class="dim small">Tanda a ' + PENALTY_MODE_ROUNDS + ', con muerte súbita si hay empate.</p>' +
      '</div>' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + PLAYER_SHIELD + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + p.playerGoals + '</div></div>' +
        '<div class="score-vs">' + (p.suddenDeath ? 'Muerte súbita' : ('Ronda ' + p.round + '/' + PENALTY_MODE_ROUNDS)) + '</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(p.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(p.oppName) + '</div><div class="score-num">' + p.rivalGoals + '</div></div>' +
      '</div>' +
      '<div class="panel center-text">' + actionHtml + '</div>' +
      '<div class="log-panel">' + p.log.slice(-6).map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>' +
    '</div>'
  );
}

function renderPenaltyModeEnd(p) {
  var won = p.winner === 'jugador';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">' + (won ? '🏆 ¡Ganaste la tanda!' : 'Perdiste la tanda') + '</h2>' +
        '<p class="score-num">' + p.playerGoals + ' - ' + p.rivalGoals + '</p>' +
        '<p class="dim small">vs ' + escapeHtml(p.oppName) + '</p>' +
        '<button class="btn btn-primary btn-block mt" onclick="actionStartPenaltyMode()">Jugar otra tanda</button>' +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   15d. FUTDRAFT: modo independiente (sin plantilla persistente ni mapa).
   Draft de 11 jugadores de 1 en 1 eligiendo entre 3 opciones, con la
   formación que elijas se calcula el once titular y una puntuación de
   equipo, y se juegan 3 partidos con resultado aleatorio en base a esa
   puntuación, la formación y la fuerza real (TEAM_POWER) del rival de
   turno. No usa el plantel de espíritu del jugador ni da puntos al
   terminar, igual que Modo Penaltis.
   --------------------------------------------------------------------- */

var FUTDRAFT_SQUAD_SIZE = 11;
// Los 3 modos (Libre, Clásico, Afinidad) draftean siempre 4 suplentes
// además del once (15 picks en total). En la pantalla de equipo se pueden
// hacer cambios ILIMITADOS antes de empezar el torneo, tanto entre
// titular y suplente como entre dos titulares (para reubicarlos de línea).
var FUTDRAFT_LIBRE_TOTAL = 15;
// Topes por posición durante el draft (banquillo, o todo el draft en modo
// Libre): altos para no restringir de más, pero justos para que nunca sobren
// jugadores fuera de sitio (el máximo que pide cualquiera de las formaciones
// de abajo).
var FUTDRAFT_POS_CAPS = { Portero: 1, Defensa: 5, Centrocampista: 5, Delantero: 4 };

var FUTDRAFT_FORMATIONS = [
  { id: '442', name: '4-4-2', rows: [
      { pos: 'Delantero', count: 2 }, { pos: 'Centrocampista', count: 4 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 1.0, def: 1.12 },
  { id: '433', name: '4-3-3', rows: [
      { pos: 'Delantero', count: 3 }, { pos: 'Centrocampista', count: 3 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 1.2, def: 0.85 },
  { id: '352', name: '3-5-2', rows: [
      { pos: 'Delantero', count: 2 }, { pos: 'Centrocampista', count: 5 },
      { pos: 'Defensa', count: 3 }, { pos: 'Portero', count: 1 }
    ], atk: 1.08, def: 1.0 },
  { id: '334', name: '3-3-4', rows: [
      { pos: 'Delantero', count: 4 }, { pos: 'Centrocampista', count: 3 },
      { pos: 'Defensa', count: 3 }, { pos: 'Portero', count: 1 }
    ], atk: 1.35, def: 0.7 },
  { id: '343', name: '3-4-3', rows: [
      { pos: 'Delantero', count: 3 }, { pos: 'Centrocampista', count: 4 },
      { pos: 'Defensa', count: 3 }, { pos: 'Portero', count: 1 }
    ], atk: 1.28, def: 0.78 },
  { id: '532', name: '5-3-2', rows: [
      { pos: 'Delantero', count: 2 }, { pos: 'Centrocampista', count: 3 },
      { pos: 'Defensa', count: 5 }, { pos: 'Portero', count: 1 }
    ], atk: 0.85, def: 1.28 },
  { id: '541', name: '5-4-1', rows: [
      { pos: 'Delantero', count: 1 }, { pos: 'Centrocampista', count: 4 },
      { pos: 'Defensa', count: 5 }, { pos: 'Portero', count: 1 }
    ], atk: 0.8, def: 1.3 },
  { id: '424', name: '4-2-4', rows: [
      { pos: 'Delantero', count: 4 }, { pos: 'Centrocampista', count: 2 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 1.25, def: 1.05 }
];

// Cada draft ofrece solo unas pocas formaciones al azar, no las 7 de
// golpe -- se elige una vez al principio (antes de draftear, en los dos
// modos) y esas mismas son las que luego se pueden alternar en la
// pantalla de equipo. Clásico ofrece 4, Libre ofrece 3.
function pickFutDraftFormationChoices(n) {
  var shuffled = FUTDRAFT_FORMATIONS.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, n).map(function (f) { return f.id; });
}
function futDraftAvailableFormations() {
  var ids = G.futdraftFormationChoices || FUTDRAFT_FORMATIONS.map(function (f) { return f.id; });
  return FUTDRAFT_FORMATIONS.filter(function (f) { return ids.indexOf(f.id) !== -1; });
}

function actionGoFutDraftModeSelect() { G.screen = 'futdraftModeSelect'; render(); }

function renderFutDraftModeSelect() {
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">FutDraft</h2>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionGoFutDraftFormationSelect(\'libre\')">Libre<br><small class="dim">Eliges a quien quieras, sin restricción de posición.</small></button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoFutDraftFormationSelect(\'clasico\')">Clásico<br><small class="dim">El draft solo te ofrece jugadores para los huecos que falten en tu formación.</small></button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoFutDraftAffinitySelect()">Afinidad<br><small class="dim">Eliges un tipo elemental antes de nada: todo tu draft sale de ese tipo.</small></button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function actionGoFutDraftAffinitySelect() {
  G.futdraftPendingMode = 'afinidad';
  G.screen = 'futdraftAffinitySelect';
  render();
}

function renderFutDraftAffinitySelect() {
  var btns = TYPES.map(function (t) {
    return (
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-block" onclick="actionChooseFutDraftAffinity(\'' + t + '\')">' + typeBadge(t) + '</button>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoFutDraftModeSelect()">Volver</button>' +
        '<h2 class="panel-title mt">FutDraft Afinidad</h2>' +
        '<p class="dim small">Elige un tipo elemental: todo tu draft (portero incluido) saldrá de jugadores de ese tipo.</p>' +
        btns +
      '</div>' +
    '</div>'
  );
}

function actionChooseFutDraftAffinity(tipo) {
  G.futdraftAffinity = tipo;
  G.futdraftFormationChoices = pickFutDraftFormationChoices(FUTDRAFT_FORMATION_CHOICES_BY_MODE.afinidad);
  G.screen = 'futdraftFormationSelect';
  render();
}

// Los dos modos eligen formación ANTES de draftear: Clásico ofrece 4
// formaciones al azar, Libre 3. La formación no restringe el draft Libre
// (sigue siendo libre de verdad), pero fija la vista previa del campo
// durante el draft y la formación inicial de la pantalla de equipo.
var FUTDRAFT_FORMATION_CHOICES_BY_MODE = { libre: 3, clasico: 4, afinidad: 4 };

function actionGoFutDraftFormationSelect(mode) {
  G.futdraftPendingMode = mode;
  G.futdraftFormationChoices = pickFutDraftFormationChoices(FUTDRAFT_FORMATION_CHOICES_BY_MODE[mode]);
  G.screen = 'futdraftFormationSelect';
  render();
}

function renderFutDraftFormationSelect() {
  var mode = G.futdraftPendingMode;
  var btns = futDraftAvailableFormations().map(function (f) {
    return (
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-primary btn-block" onclick="actionChooseFutDraftFormation(\'' + f.id + '\')">' + f.name + '</button>' +
      '</div>'
    );
  }).join('');
  var hint = mode === 'clasico'
    ? 'Elige la formación antes de nada: el draft solo te ofrecerá jugadores para los huecos que aún falten en ella.'
    : mode === 'afinidad'
      ? 'Elige la formación: el draft irá cubriendo sus huecos, pero solo con jugadores de tipo ' + G.futdraftAffinity + '.'
      : mode === 'liga'
        ? 'Elige la formación antes de nada: el draft irá cubriendo sus huecos en orden, igual que en Clásico.'
        : 'Elige la formación con la que vas a empezar. En Libre puedes seguir cambiándola luego en la pantalla de equipo.';
  var modeTitle = mode === 'clasico' ? 'Clásico' : (mode === 'afinidad' ? 'Afinidad' : (mode === 'liga' ? ('Liga · ' + ligaTierName(G.ligaPendingTier)) : 'Libre'));
  var backAction = mode === 'liga' ? 'actionChooseLigaTier(\'' + G.ligaPendingTier + '\')' : 'actionGoFutDraftModeSelect()';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="' + backAction + '">Volver</button>' +
        '<h2 class="panel-title mt">FutDraft ' + modeTitle + '</h2>' +
        '<p class="dim small">' + hint + '</p>' +
        btns +
      '</div>' +
    '</div>'
  );
}

function actionChooseFutDraftFormation(id) {
  var mode = G.futdraftPendingMode || 'clasico';
  G.futdraft = {
    squad: [], formation: id, mode: mode,
    affinity: mode === 'afinidad' ? G.futdraftAffinity : null,
    ligaPool: mode === 'liga' ? G.ligaPendingPool : null,
    ligaTier: mode === 'liga' ? G.ligaPendingTier : null,
    captainId: null,
    matches: [], matchIndex: 0
  };
  G.futdraftOptions = generateFutDraftOptions();
  G.screen = 'futdraftPick';
  render();
}

function futDraftPosCounts(squad) {
  var c = { Portero: 0, Defensa: 0, Centrocampista: 0, Delantero: 0 };
  squad.forEach(function (p) { c[p.posicion]++; });
  return c;
}

// En modo clásico los huecos que aún faltan los marca la formación
// elegida al principio (no los topes fijos de FUTDRAFT_POS_CAPS): si ya
// están las 4 defensas de un 4-4-2, no vuelve a salir ningún defensa como
// opción, aunque en modo libre sí podría.
function futDraftNeededCounts(formation, squad) {
  var counts = futDraftPosCounts(squad);
  var needed = {};
  formation.rows.forEach(function (row) { needed[row.pos] = Math.max(0, row.count - (counts[row.pos] || 0)); });
  return needed;
}

// Orden fijo del draft en modo clásico: portero, luego defensas hasta
// cubrir los que pida la formación, luego centrocampistas, luego
// delanteros -- no se ofrece un delantero mientras aún falten defensas.
var FUTDRAFT_DRAFT_ORDER = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
function futDraftCurrentNeededPos(formation, squad) {
  var needed = futDraftNeededCounts(formation, squad);
  for (var i = 0; i < FUTDRAFT_DRAFT_ORDER.length; i++) {
    if (needed[FUTDRAFT_DRAFT_ORDER[i]] > 0) return FUTDRAFT_DRAFT_ORDER[i];
  }
  return null;
}

// Los 3 modos draftean siempre 11 titulares + 3 suplentes (14 en total).
// Clásico y Afinidad piden los 11 titulares en el orden fijo de la
// formación (ver futDraftCurrentNeededPos); una vez cubiertos, los 3
// últimos picks (banquillo) pasan al mismo criterio que Libre: cualquier
// posición dentro de los topes de FUTDRAFT_POS_CAPS -- en Afinidad, además,
// siempre del tipo elemental elegido, también en el banquillo.
// En modo Liga con el pool "desbloqueados", solo se puede draftear a
// quien ya tengas desbloqueado en el Vestuario -- igual que el plantel de
// Puntos de Espíritu en Normal/Torneo/Supervivencia. Con "todos" (o en
// cualquier otro modo de FutDraft) no hay restricción, como siempre.
function futDraftPassesLigaPool(f, p) {
  if (f.mode !== 'liga' || f.ligaPool !== 'desbloqueados') return true;
  return !p.locked || getUnlockedIds().indexOf(p.id) !== -1;
}

function generateFutDraftOptions() {
  var f = G.futdraft;
  var squad = f.squad;
  var squadIds = squad.map(function (p) { return p.id; });
  var pool;
  var draftingStarters = squad.length < FUTDRAFT_SQUAD_SIZE;
  if ((f.mode === 'clasico' || f.mode === 'afinidad' || f.mode === 'liga') && draftingStarters) {
    var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === f.formation; });
    var currentPos = futDraftCurrentNeededPos(formation, squad);
    pool = ROSTER.filter(function (p) {
      if (squadIds.indexOf(p.id) !== -1) return false;
      if (f.mode === 'afinidad' && p.tipo !== f.affinity) return false;
      if (!futDraftPassesLigaPool(f, p)) return false;
      return p.posicion === currentPos;
    });
  } else {
    var counts = futDraftPosCounts(squad);
    pool = ROSTER.filter(function (p) {
      if (squadIds.indexOf(p.id) !== -1) return false;
      if (f.mode === 'afinidad' && p.tipo !== f.affinity) return false;
      if (!futDraftPassesLigaPool(f, p)) return false;
      if (counts[p.posicion] >= FUTDRAFT_POS_CAPS[p.posicion]) return false;
      return true;
    });
  }
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}

function futDraftDraftTarget(mode) {
  return FUTDRAFT_LIBRE_TOTAL;
}

window.pickFutDraftPlayer = function (instanceId) {
  var f = G.futdraft;
  var picked = G.futdraftOptions.find(function (p) { return p.instanceId === instanceId; });
  if (!picked) return;
  f.squad.push(picked);
  if (f.squad.length >= futDraftDraftTarget(f.mode)) {
    var starters = f.squad.slice(0, FUTDRAFT_SQUAD_SIZE);
    f.bench = f.squad.slice(FUTDRAFT_SQUAD_SIZE);
    f.lineup = futDraftBuildLineup(starters, f.formation);
    f.swapSelectedId = null;
    G.screen = 'futdraftTeam';
    render();
  } else {
    G.futdraftOptions = generateFutDraftOptions();
    render();
  }
};

function renderFutDraftPick() {
  var f = G.futdraft;
  var squad = f.squad;
  var modeLabel = f.mode === 'clasico' ? 'Clásico' : (f.mode === 'afinidad' ? 'Afinidad · ' + f.affinity : (f.mode === 'liga' ? 'Liga · ' + ligaTierName(f.ligaTier) : 'Libre'));
  var target = futDraftDraftTarget(f.mode);
  var subtitle = 'Elige a tu jugador ' + (squad.length + 1) + ' de ' + target + '.';
  if ((f.mode === 'clasico' || f.mode === 'afinidad' || f.mode === 'liga') && squad.length < FUTDRAFT_SQUAD_SIZE) {
    var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === f.formation; });
    var currentPos = futDraftCurrentNeededPos(formation, squad);
    var needed = futDraftNeededCounts(formation, squad);
    var counts = futDraftPosCounts(squad);
    subtitle = 'Elige tu ' + currentPos + ' (' + ((counts[currentPos] || 0) + 1) + ' de ' + (needed[currentPos] + (counts[currentPos] || 0)) + ').';
  } else if (squad.length >= FUTDRAFT_SQUAD_SIZE) {
    subtitle = 'Elige a tu suplente ' + (squad.length - FUTDRAFT_SQUAD_SIZE + 1) + ' de ' + (target - FUTDRAFT_SQUAD_SIZE) + '.';
  }
  var benchPreview = futDraftComputeBench(squad);
  var optionsHtml = G.futdraftOptions.map(function (c) {
    return playerCardHtml(c, 'pickFutDraftPlayer(\'' + c.instanceId + '\')', false, false);
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">FutDraft &middot; ' + modeLabel + '</h2>' +
        '<p class="dim small">' + subtitle + '</p></div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Tu plantilla</h3>' +
        renderFutDraftPitch(squad, f.formation, true) +
      '</div>' +
      (benchPreview.length
        ? '<div class="panel"><h3 style="margin-bottom:8px">Suplentes</h3><div class="pitch-row" style="justify-content:center">' +
          benchPreview.map(function (p) { return '<div class="pitch-player">' + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>'; }).join('') +
          '</div></div>'
        : '') +
      '<div class="panel"><h3 style="margin-bottom:8px">Elige uno</h3><div class="card-grid">' + optionsHtml + '</div></div>' +
    '</div>'
  );
}

// Solo cuentan las estadísticas relevantes para el puesto de cada uno --
// promediar las 4 por igual diluía el tiro de un delantero con su defensa
// (floja a propósito) y al revés con los defensas, así que casi todos los
// jugadores acababan con una media parecida y la puntuación de equipo
// apenas se movía draftases a quien draftases.
var FUTDRAFT_SCORE_STATS = {
  Portero: ['defensa', 'especial'],
  Defensa: ['pase', 'defensa', 'especial'],
  Centrocampista: ['tiro', 'pase', 'defensa', 'especial'],
  Delantero: ['tiro', 'pase', 'especial']
};
function futDraftPlayerScore(p) {
  // Reserva por si algún jugador del roster tuviera una posición mal
  // escrita (p.ej. "Delantera" en vez de "Delantero"): mejor promediar
  // las 4 stats que romper toda la pantalla de equipo por un typo de dato.
  var stats = FUTDRAFT_SCORE_STATS[p.posicion] || ['tiro', 'pase', 'defensa', 'especial'];
  var sum = stats.reduce(function (s, key) { return s + p[key]; }, 0);
  return sum / stats.length;
}

// El capitán aporta un bonus (o penalización) directo a la puntuación de
// equipo según lo BUENO que sea comparado con la media del resto del once
// -- no un simple "cuenta doble en la media", que con 11 titulares diluía
// tanto el efecto que muchas veces no se notaba nada al elegir capitán.
// Se recorta a [-8, 8] para que ni un fichaje estrella dispare la nota ni
// un capitán flojo la hunda de golpe. La sinergia premia tener varios
// jugadores del mismo tipo elemental en el once (no hay dato de club real
// en el roster, así que el tipo hace de sustituto). La penalización
// castiga colocar a un titular en una línea que no es su posición real --
// el banquillo nunca cuenta aquí, solo quien sale de inicio.
var FUTDRAFT_CAPTAIN_BONUS_FACTOR = 0.4;
var FUTDRAFT_CAPTAIN_BONUS_CAP = 8;
var FUTDRAFT_SYNERGY_THRESHOLD = 4;
var FUTDRAFT_SYNERGY_BONUS = 3;
var FUTDRAFT_OUT_OF_POSITION_PENALTY = 3;

// lineup: array de { pos, player } (la línea de la formación y quien la
// ocupa -- ver f.lineup). captainId: id del jugador capitán, o null.
// Devuelve el desglose completo (para explicarlo en pantalla) en vez de
// solo el número final -- ver futDraftTeamScore para cuando solo hace
// falta el total (p.ej. al resolver un partido).
function futDraftScoreBreakdown(lineup, captainId) {
  if (!lineup.length) return { base: 0, captainBonus: 0, synergyBonus: 0, misplaced: 0, misplacedPenalty: 0, total: 0 };
  var sum = 0, misplaced = 0, captainScore = null;
  var typeCounts = {};
  lineup.forEach(function (slot) {
    var p = slot.player;
    var score = futDraftPlayerScore(p);
    sum += score;
    if (captainId && p.id === captainId) captainScore = score;
    if (slot.pos !== p.posicion) misplaced++;
    typeCounts[p.tipo] = (typeCounts[p.tipo] || 0) + 1;
  });
  var base = sum / lineup.length;
  var captainBonus = captainScore === null ? 0 : clamp(Math.round((captainScore - base) * FUTDRAFT_CAPTAIN_BONUS_FACTOR), -FUTDRAFT_CAPTAIN_BONUS_CAP, FUTDRAFT_CAPTAIN_BONUS_CAP);
  var synergyBonus = 0;
  Object.keys(typeCounts).forEach(function (t) {
    if (typeCounts[t] >= FUTDRAFT_SYNERGY_THRESHOLD) synergyBonus += FUTDRAFT_SYNERGY_BONUS;
  });
  var misplacedPenalty = misplaced * FUTDRAFT_OUT_OF_POSITION_PENALTY;
  var total = Math.round(clamp(base + captainBonus + synergyBonus - misplacedPenalty, 0, 100));
  return { base: Math.round(base), captainBonus: captainBonus, synergyBonus: synergyBonus, misplaced: misplaced, misplacedPenalty: misplacedPenalty, total: total };
}

function futDraftTeamScore(lineup, captainId) {
  return futDraftScoreBreakdown(lineup, captainId).total;
}

// Vista previa durante el draft Libre (picks 12-14, antes de llegar a la
// pantalla de equipo): los "cambios" van siempre al banquillo por
// defecto, son justo los que draftas DESPUÉS de completar el once, así
// que no tiene sentido recalcular con las stats quién se queda fuera.
function futDraftComputeBench(squad) {
  if (squad.length <= FUTDRAFT_SQUAD_SIZE) return [];
  return squad.slice(FUTDRAFT_SQUAD_SIZE);
}

// A partir de aquí: el once real de la pantalla de equipo (f.lineup) ya no
// se recalcula solo -- se construye una vez al acabar el draft (o al
// cambiar de formación) y luego el jugador lo edita a mano con cambios
// ilimitados (ver selectFutDraftPlayer). f.lineup es un array de 11
// { pos, player }: pos es la línea del hueco (fija), player es quien lo
// ocupa (cambia con cada cambio). f.bench (solo Libre) son los suplentes,
// sin línea asignada.
function futDraftBuildLineup(starters, formationId) {
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === formationId; });
  var rows = assignFutDraftFormation(starters, formation);
  var lineup = [];
  rows.forEach(function (row) {
    row.players.forEach(function (p) { lineup.push({ pos: row.pos, player: p }); });
  });
  return lineup;
}

// Reparte a los 11 del draft en los huecos de la formación elegida en DOS
// pasadas: la 1ª reserva para cada línea a los jugadores de esa posición
// real que haya (portero primero, que casi siempre hay solo 1 -- si se
// mezclara con el relleno de otra línea en una sola pasada, esa línea
// podía "robarse" al único portero real por tener buena defensa, dejando
// la portería vacía). La 2ª pasada rellena los huecos que aún falten con
// los mejores jugadores que queden, sin mirar su posición real.
function assignFutDraftFormation(squad, formation) {
  var remaining = squad.slice();
  var statFor = { Portero: 'defensa', Defensa: 'defensa', Centrocampista: 'pase', Delantero: 'tiro' };
  var processOrder = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
  function takeBest(list, stat, n) {
    var sorted = list.slice().sort(function (a, b) { return b[stat] - a[stat]; });
    var taken = sorted.slice(0, n);
    taken.forEach(function (p) {
      var idx = remaining.indexOf(p);
      if (idx !== -1) remaining.splice(idx, 1);
    });
    return taken;
  }
  var byPos = {};
  processOrder.forEach(function (pos) {
    var row = formation.rows.find(function (r) { return r.pos === pos; });
    if (!row) return;
    var ownPos = remaining.filter(function (p) { return p.posicion === pos; });
    byPos[pos] = takeBest(ownPos, statFor[pos], row.count);
  });
  processOrder.forEach(function (pos) {
    var row = formation.rows.find(function (r) { return r.pos === pos; });
    if (!row || byPos[pos].length >= row.count) return;
    byPos[pos] = byPos[pos].concat(takeBest(remaining, statFor[pos], row.count - byPos[pos].length));
  });
  return formation.rows.map(function (row) { return { pos: row.pos, count: row.count, players: byPos[row.pos] }; });
}

// showEmptySlots (draft en curso, plantilla aún incompleta) añade un hueco
// marcado por cada sitio de la formación que todavía no tiene jugador,
// para que se vea de un vistazo cuánto queda de cada línea. Se usa solo
// durante el draft (vista previa, aún sin cambios posibles) -- la
// pantalla de equipo usa renderFutDraftLineupPitch, que sí es editable.
function renderFutDraftPitch(squad, formationId, showEmptySlots) {
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === formationId; });
  var rows = assignFutDraftFormation(squad, formation);
  var rowsHtml = rows.map(function (row) {
    var itemsHtml = row.players.map(function (p) {
      return '<div class="pitch-player">' + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
    }).join('');
    if (showEmptySlots) {
      for (var k = row.players.length; k < row.count; k++) {
        itemsHtml += '<div class="pitch-player pitch-player-empty"><span class="pitch-empty-slot">+</span></div>';
      }
    }
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

// Campo de la pantalla de equipo: cada titular es clicable para hacer
// cambios ilimitados (con otro titular o con un suplente del banquillo).
function renderFutDraftLineupPitch(f) {
  var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === f.formation; });
  var rowsHtml = formation.rows.map(function (row) {
    var itemsHtml = f.lineup.filter(function (slot) { return slot.pos === row.pos; }).map(function (slot) {
      var p = slot.player;
      var outOfPosition = slot.pos !== p.posicion;
      var cls = 'pitch-player futdraft-swappable' +
        (f.swapSelectedId === p.id ? ' selected' : '') +
        (outOfPosition ? ' futdraft-out-of-position' : '');
      var badge = f.captainId === p.id ? '<span class="futdraft-captain-badge" title="Capitán">👑</span>' : '';
      var nameSuffix = outOfPosition ? ' <span class="dim">(' + p.posicion + ')</span>' : '';
      return '<div class="' + cls + '" onclick="selectFutDraftPlayer(\'' + p.id + '\')">' + badge + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + nameSuffix + '</span></div>';
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

window.setFutDraftFormation = function (id) {
  var f = G.futdraft;
  f.formation = id;
  var starters = f.lineup.map(function (slot) { return slot.player; });
  f.lineup = futDraftBuildLineup(starters, id);
  f.swapSelectedId = null;
  render();
};

// Cambios ilimitados entre dos jugadores cualquiera -- dos titulares (se
// reubican de línea) o un titular y un suplente (el suplente entra al
// once, el titular pasa al banquillo). Toca a uno, luego al otro. Si el
// modo "elegir capitán" está activo, el toque se interpreta como elección
// de capitán en vez de cambio (ver toggleFutDraftCaptainMode).
window.selectFutDraftPlayer = function (id) {
  var f = G.futdraft;
  if (f.pickingCaptain) { pickFutDraftCaptainInternal(id); return; }
  if (f.swapSelectedId === id) { f.swapSelectedId = null; render(); return; }
  if (!f.swapSelectedId) { f.swapSelectedId = id; render(); return; }
  var otherId = f.swapSelectedId;
  var lineupIdxA = f.lineup.findIndex(function (s) { return s.player.id === otherId; });
  var lineupIdxB = f.lineup.findIndex(function (s) { return s.player.id === id; });
  if (lineupIdxA !== -1 && lineupIdxB !== -1) {
    var tmp = f.lineup[lineupIdxA].player;
    f.lineup[lineupIdxA].player = f.lineup[lineupIdxB].player;
    f.lineup[lineupIdxB].player = tmp;
  } else {
    var benchIdxA = f.bench.findIndex(function (p) { return p.id === otherId; });
    var benchIdxB = f.bench.findIndex(function (p) { return p.id === id; });
    if (lineupIdxA !== -1 && benchIdxB !== -1) {
      var starterOut = f.lineup[lineupIdxA].player;
      f.lineup[lineupIdxA].player = f.bench[benchIdxB];
      f.bench[benchIdxB] = starterOut;
      if (f.captainId === starterOut.id) f.captainId = null;
    } else if (lineupIdxB !== -1 && benchIdxA !== -1) {
      var starterOut2 = f.lineup[lineupIdxB].player;
      f.lineup[lineupIdxB].player = f.bench[benchIdxA];
      f.bench[benchIdxA] = starterOut2;
      if (f.captainId === starterOut2.id) f.captainId = null;
    }
  }
  f.swapSelectedId = null;
  render();
};

// Capitán: cuenta x2 en la media del equipo (ver futDraftTeamScore). Solo
// puede ser un titular -- tocar un suplente en modo "elegir capitán" no
// hace nada. Tocar al capitán actual otra vez le quita el brazalete.
window.toggleFutDraftCaptainMode = function () {
  var f = G.futdraft;
  f.pickingCaptain = !f.pickingCaptain;
  f.swapSelectedId = null;
  render();
};
function pickFutDraftCaptainInternal(id) {
  var f = G.futdraft;
  var isStarter = f.lineup.some(function (s) { return s.player.id === id; });
  if (!isStarter) { render(); return; }
  f.captainId = (f.captainId === id) ? null : id;
  f.pickingCaptain = false;
  render();
}

// Cuenta cuántos titulares hay de cada tipo elemental -- SOLO el once
// titular (f.lineup), el banquillo no cuenta para nada aquí, igual que en
// futDraftScoreBreakdown. Cambia en cuanto se hace un cambio en el once.
function futDraftElementCounts(f) {
  var counts = {};
  TYPES.forEach(function (t) { counts[t] = 0; });
  f.lineup.forEach(function (slot) { counts[slot.player.tipo] = (counts[slot.player.tipo] || 0) + 1; });
  return counts;
}

function renderFutDraftTeam() {
  var f = G.futdraft;
  var hasBench = f.bench.length > 0;
  var breakdown = futDraftScoreBreakdown(f.lineup, f.captainId);
  var captain = f.captainId ? f.lineup.find(function (s) { return s.player.id === f.captainId; }) : null;
  var formationBtns = futDraftAvailableFormations().map(function (ft) {
    return '<button class="btn-tiny' + (f.formation === ft.id ? ' active' : '') + '" onclick="setFutDraftFormation(\'' + ft.id + '\')">' + ft.name + '</button>';
  }).join('');
  var swapHint = 'Cambios ilimitados: toca a dos jugadores (titulares o suplente) para cambiarlos.';
  var captainHint;
  if (!captain) {
    captainHint = 'Sin capitán elegido.';
  } else if (breakdown.captainBonus > 0) {
    captainHint = 'Capitán: <strong>' + escapeHtml(captain.player.nombre) + '</strong> (<span style="color:var(--accent-2)">+' + breakdown.captainBonus + '</span> a la puntuación, por encima de la media del equipo).';
  } else if (breakdown.captainBonus < 0) {
    captainHint = 'Capitán: <strong>' + escapeHtml(captain.player.nombre) + '</strong> (<span style="color:var(--danger)">' + breakdown.captainBonus + '</span> a la puntuación, por debajo de la media del equipo).';
  } else {
    captainHint = 'Capitán: <strong>' + escapeHtml(captain.player.nombre) + '</strong> (a la altura de la media del equipo, no suma ni resta).';
  }
  var elementCounts = futDraftElementCounts(f);
  var elementCountsHtml = TYPES.map(function (t) {
    return '<span class="type-badge type-' + t.toLowerCase().replace('ñ', 'n') + '" style="margin:2px">' +
      'Bonificación atributo ' + getTypeSymbol(t) + ' ' + elementCounts[t] + '/' + FUTDRAFT_SYNERGY_THRESHOLD +
    '</span>';
  }).join(' ');
  var benchHtml = '';
  if (hasBench) {
    var benchItemsHtml = f.bench.map(function (p) {
      var cls = 'pitch-player futdraft-swappable' + (f.swapSelectedId === p.id ? ' selected' : '');
      return '<div class="' + cls + '" onclick="selectFutDraftPlayer(\'' + p.id + '\')">' + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
    }).join('');
    benchHtml =
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Banquillo</h3>' +
        '<div class="pitch-row" style="justify-content:center">' + benchItemsHtml + '</div>' +
      '</div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Tu once inicial</h2>' +
        '<p class="dim small">Puntuación de equipo: <strong style="color:var(--accent-2)">' + breakdown.total + '</strong> / 100</p>' +
        '<p class="dim small">' + swapHint + '</p>' +
        '<p class="dim small">' + captainHint + '</p>' +
        '<button class="btn btn-tiny' + (f.pickingCaptain ? ' active' : '') + '" onclick="toggleFutDraftCaptainMode()">' + (f.pickingCaptain ? 'Toca a un titular para hacerlo capitán…' : 'Elegir capitán 👑') + '</button>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Formación</h3>' +
        '<div class="view-toggle view-toggle-wrap">' + formationBtns + '</div>' +
        renderFutDraftLineupPitch(f) +
        '<p class="dim small" style="margin-top:8px">Un jugador fuera de su posición real baja la puntuación del equipo. Tener 4 o más titulares del mismo tipo elemental la sube.</p>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:8px">Bonificación de atributo (once titular)</h3>' +
        '<div>' + elementCountsHtml + '</div>' +
      '</div>' +
      benchHtml +
      (f.mode === 'liga'
        ? '<button class="btn btn-primary btn-block" onclick="startLigaRun()">Empezar Liga (18 equipos)</button>'
        : '<button class="btn btn-primary btn-block" onclick="startFutDraftMatches()">Jugar torneo (8 equipos)</button>') +
    '</div>'
  );
}

// El torneo de FutDraft reutiliza exactamente el mismo cuadro y la misma
// simulación CPU-vs-CPU que el Modo Torneo normal (generateTournamentBracket,
// simulateCpuMatch, TEAM_POWER) -- lo único distinto es cómo se resuelve el
// partido del jugador: en vez de jugarse a golpes, se simula igual que los
// de la CPU pero usando la puntuación de equipo y el multiplicador de la
// formación elegida en vez de TEAM_POWER.
// Recompensa en Puntos de Espíritu: 40 fijos por jugar el torneo (ganes o
// pierdas) + 10 más por cada partido propio ganado en el bracket.
var FUTDRAFT_BASE_REWARD = 40;
var FUTDRAFT_WIN_REWARD = 10;

window.startFutDraftMatches = function () {
  var bracket = generateTournamentBracket(8);
  var round1 = [];
  for (var i = 0; i < bracket.slots.length; i += 2) round1.push({ a: bracket.slots[i], b: bracket.slots[i + 1], winner: null });
  G.futdraft.tournament = { rounds: [round1], size: 8 };
  G.futdraft.champion = null;
  G.futdraft.eliminated = false;
  G.futdraft.winsCount = 0;
  G.futdraft.stats = { scorers: {}, assists: {} };
  G.screen = 'futdraftBracket';
  render();
};

function futDraftExpectedGoals(myAtk, oppDef) {
  return clamp(1.3 + (myAtk - oppDef) / 22, 0.2, 5);
}
function futDraftRandomGoals(expected) {
  return clamp(Math.round(expected + rand(-1.2, 1.2)), 0, 8);
}
// Prórroga (30 min, minutos 91-120): un tercio de la duración de un
// partido completo, así que se prorratea la expectativa de gol a un
// tercio -- y con un rango más contenido, porque las prórrogas rara vez
// son goleadas.
function futDraftExtraTimeGoals(myAtk, oppDef) {
  var expected = futDraftExpectedGoals(myAtk, oppDef) / 3;
  return clamp(Math.round(expected + rand(-0.6, 0.6)), 0, 4);
}

// Los partidos de FutDraft no se juegan a golpes, pero se simula igualmente
// quién marca y quién da la asistencia en cada gol, tanto propio (tu
// plantel real) como rival (el pool de no drafteados, ver
// futDraftUndraftedPool) -- ponderado por puesto: un delantero marca mucho
// más que un defensa, un centrocampista asiste mucho más que nadie. El
// portero puede, rarísima vez, aparecer en cualquiera de los dos papeles
// (un gol o un pase muy largo y afortunado).
var FUTDRAFT_GOAL_WEIGHT = { Delantero: 6, Centrocampista: 3, Defensa: 1, Portero: 0.2 };
var FUTDRAFT_ASSIST_WEIGHT = { Centrocampista: 5, Delantero: 3, Defensa: 2, Portero: 0.3 };
function futDraftWeightedPick(players, weightMap) {
  var total = players.reduce(function (s, p) { return s + (weightMap[p.posicion] || 1); }, 0);
  var roll = Math.random() * total;
  for (var i = 0; i < players.length; i++) {
    roll -= (weightMap[players[i].posicion] || 1);
    if (roll <= 0) return players[i];
  }
  return players[players.length - 1];
}
function futDraftGoalEvent(myPlayers) {
  var scorer = futDraftWeightedPick(myPlayers, FUTDRAFT_GOAL_WEIGHT);
  var rest = myPlayers.filter(function (p) { return p.id !== scorer.id; });
  var assist = (rest.length && Math.random() < 0.75) ? futDraftWeightedPick(rest, FUTDRAFT_ASSIST_WEIGHT) : null;
  return { scorer: scorer, assist: assist };
}

// Jugadores reales del roster que NO se han drafteado en esta partida de
// FutDraft/Liga: sirven de plantel "fantasma" para el rival, que no tiene
// datos propios -- así sus goles y asistencias también se pueden atribuir
// a alguien con nombre real, en vez de quedar en blanco.
function futDraftUndraftedPool() {
  var f = G.futdraft;
  var squadIds = (f && f.squad ? f.squad : []).map(function (p) { return p.id; });
  return ROSTER.filter(function (p) { return squadIds.indexOf(p.id) === -1; });
}

// Construye la línea temporal entre minMinute y maxMinute (por defecto 1 a
// 90; la prórroga reutiliza esto mismo para 91-120): reparte tantos
// minutos distintos (sin repetir) como goles totales haya, los ordena, y
// decide al azar (barajando qué bando marca cada uno) quién anota en cada
// uno. Los goles propios usan tu plantel real; los del rival usan el pool
// de jugadores no drafteados (ver futDraftUndraftedPool) como plantel
// "fantasma", ya que el rival no tiene datos propios.
function futDraftBuildTimeline(myGoals, oppGoals, myPlayers, oppPlayers, minMinute, maxMinute) {
  minMinute = minMinute || 1;
  maxMinute = maxMinute || 90;
  var minutePool = [];
  for (var m = minMinute; m <= maxMinute; m++) minutePool.push(m);
  var shuffledMinutes = minutePool.sort(function () { return Math.random() - 0.5; }).slice(0, myGoals + oppGoals).sort(function (a, b) { return a - b; });
  var sides = [];
  for (var i = 0; i < myGoals; i++) sides.push('me');
  for (var j = 0; j < oppGoals; j++) sides.push('opp');
  sides = sides.sort(function () { return Math.random() - 0.5; });
  return shuffledMinutes.map(function (minute, idx) {
    var side = sides[idx];
    var ev = futDraftGoalEvent(side === 'me' ? myPlayers : oppPlayers);
    return { minute: minute, side: side, scorer: ev.scorer, assist: ev.assist };
  });
}

// Suma los goles/asistencias de una lista de eventos {scorer, assist} a un
// diccionario de estadísticas { scorers: {}, assists: {} }, etiquetados
// con el nombre del equipo al que pertenecían en ese partido concreto
// (informativo -- un jugador fantasma puede "jugar" para equipos
// distintos en partidos distintos, no se le fija ninguno).
function futDraftRecordGoalEvents(stats, events, teamLabel) {
  events.forEach(function (ev) {
    if (!ev.scorer) return;
    var sBucket = stats.scorers[ev.scorer.id] || { nombre: ev.scorer.nombre, team: teamLabel, count: 0 };
    sBucket.count++;
    sBucket.team = teamLabel;
    stats.scorers[ev.scorer.id] = sBucket;
    if (ev.assist) {
      var aBucket = stats.assists[ev.assist.id] || { nombre: ev.assist.nombre, team: teamLabel, count: 0 };
      aBucket.count++;
      aBucket.team = teamLabel;
      stats.assists[ev.assist.id] = aBucket;
    }
  });
}

// El resultado (goles, timeline, clima) se calcula entero de golpe, pero
// se REVELA poco a poco -- ver renderFutDraftLive/futDraftLiveTick -- para
// que se sienta como un partido en marcha en vez de un número que aparece
// de la nada. Si acaba en empate, no se decide aquí: se pasa a una tanda
// de penaltis real al terminar los 90 minutos simulados.
// Núcleo de simulación compartido por el bracket de FutDraft y la Liga:
// calcula clima, ataque/defensa propios (con formación + capitán +
// sinergia ya incluidos vía futDraftTeamScore) y goles de los 90 minutos
// reglamentarios, con su línea temporal. No decide nada sobre el destino
// del partido (bracket vs liga, empate permitido o no) -- eso lo hace
// quien lo llama.
function futDraftSimulateMatchCore(oppPower) {
  var f = G.futdraft;
  var formation = FUTDRAFT_FORMATIONS.find(function (ft) { return ft.id === f.formation; });
  var score = futDraftTeamScore(f.lineup, f.captainId);
  var weather = rollWeather();
  var weatherMult = weatherFutDraftMultiplier(weather);
  var myAtk = score * formation.atk * weatherMult;
  var myDef = score * formation.def * weatherMult;
  var effectiveOppPower = oppPower * weatherMult;
  var myGoals = futDraftRandomGoals(futDraftExpectedGoals(myAtk, effectiveOppPower));
  var oppGoals = futDraftRandomGoals(futDraftExpectedGoals(effectiveOppPower, myDef));
  var myPlayers = f.lineup.map(function (s) { return s.player; });
  var oppPlayers = futDraftUndraftedPool();
  var timeline = futDraftBuildTimeline(myGoals, oppGoals, myPlayers, oppPlayers);
  return { myGoals: myGoals, oppGoals: oppGoals, weather: weather, timeline: timeline, myAtk: myAtk, myDef: myDef, effectiveOppPower: effectiveOppPower };
}

window.playFutDraftMatch = function () {
  var f = G.futdraft;
  var round = f.tournament.rounds[f.tournament.rounds.length - 1];
  var match = round.filter(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; })[0];
  var oppSide = match.a.isPlayer ? match.b : match.a;
  var sim = futDraftSimulateMatchCore(teamPower(oppSide));

  f.live = {
    match: match, oppSide: oppSide, weather: sim.weather,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    // Se guardan para poder generar la prórroga más tarde sin recalcular
    // nada (mismo ataque/defensa/clima que ya se usaron en el 1-90).
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    inExtraTime: false, allowDraw: false, onFinish: finishFutDraftRegularTime,
    done: false
  };
  G.screen = 'futdraftLive';
  render();
  futDraftLiveTick();
};

// Se llama una sola vez, justo cuando el marcador sigue empatado al llegar
// al 90': genera los goles y la mini-timeline de la prórroga (91-120) y
// los añade a la simulación en curso para que el mismo ciclo de
// futDraftLiveTick los revele igual que los del tiempo reglamentario.
function futDraftAddExtraTime(live, myPlayers) {
  var etMyGoals = futDraftExtraTimeGoals(live.myAtk, live.effectiveOppPower);
  var etOppGoals = futDraftExtraTimeGoals(live.effectiveOppPower, live.myDef);
  var etTimeline = futDraftBuildTimeline(etMyGoals, etOppGoals, myPlayers, futDraftUndraftedPool(), 91, 120);
  live.pending = live.pending.concat(etTimeline);
  live.finalMyGoals += etMyGoals;
  live.finalOppGoals += etOppGoals;
  live.inExtraTime = true;
}

// Resuelve lo que pasa una vez terminados los 90 minutos simulados (llega
// aquí tanto si se ha visto la simulación entera como si se ha saltado):
// empate real -> tanda de penaltis; si no, guarda el resultado y va a la
// pantalla de resultado de siempre.
function finishFutDraftRegularTime() {
  var f = G.futdraft;
  var live = f.live;
  var match = live.match, oppSide = live.oppSide;
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  var oppPower = teamPower(oppSide);
  var timeline = live.revealed;
  var weather = live.weather;
  f.live = null;
  futDraftRecordGoalEvents(f.stats, timeline.filter(function (e) { return e.side === 'me'; }), 'Tu equipo');
  futDraftRecordGoalEvents(f.stats, timeline.filter(function (e) { return e.side === 'opp'; }), oppSide.name);
  if (myGoals === oppGoals) {
    f.pendingMatch = match;
    f.pendingOppSide = oppSide;
    f.pendingRegularResult = { myGoals: myGoals, oppGoals: oppGoals, oppPower: oppPower, timeline: timeline, weather: weather };
    startFutDraftPenaltyShootout(oppSide);
    return;
  }
  var playerWon = myGoals > oppGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);
  if (playerWon) f.winsCount++;
  f.lastMatchResult = { oppName: oppSide.name, oppShield: teamShieldPath(oppSide.name), oppPower: oppPower, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, timeline: timeline, weather: weather };
  G.screen = 'futdraftMatchResult';
  render();
}

// Avanza la simulación un puñado de minutos (3 a 7) cada 150ms y va
// revelando los goles cuyo minuto ya se ha alcanzado. Se reprograma solo
// mientras sigamos en la pantalla 'futdraftLive' con esta misma
// simulación activa -- así, si el jugador navega a otro sitio (o salta la
// simulación), la cadena se para sola en vez de seguir mutando estado en
// segundo plano.
function futDraftLiveTick() {
  if (G.screen !== 'futdraftLive' || !G.futdraft || !G.futdraft.live || G.futdraft.live.done) return;
  var live = G.futdraft.live;
  var cap = live.inExtraTime ? 120 : 90;
  live.minute = Math.min(cap, live.minute + rand(3, 7));
  while (live.pending.length && live.pending[0].minute <= live.minute) {
    var ev = live.pending.shift();
    if (ev.side === 'me') live.myGoals++; else live.oppGoals++;
    live.revealed.push(ev);
  }
  render();
  if (live.minute >= cap) {
    // En la Liga el empate es un resultado válido (allowDraw): no hay
    // prórroga ni penaltis, se queda como está y suma su punto a cada uno.
    if (!live.inExtraTime && !live.allowDraw && live.myGoals === live.oppGoals) {
      // Empate al 90' en el bracket: se juega una prórroga de verdad antes
      // de pensar en penaltis, en vez de ir directos a la tanda.
      var myPlayers = G.futdraft.lineup.map(function (s) { return s.player; });
      futDraftAddExtraTime(live, myPlayers);
      setTimeout(futDraftLiveTick, 400);
      return;
    }
    live.done = true;
    setTimeout(live.onFinish, 500);
  } else {
    setTimeout(futDraftLiveTick, 150);
  }
}

// Salta directamente al final: revela todos los goles pendientes de golpe
// (generando también la prórroga si sigue habiendo empate al 90' y no se
// permite empate, ver allowDraw) y resuelve el partido sin esperar a que
// el temporizador llegue solo.
window.futDraftSkipLive = function () {
  var live = G.futdraft.live;
  if (!live || live.done) return;
  function dumpPending() {
    live.pending.forEach(function (ev) {
      if (ev.side === 'me') live.myGoals++; else live.oppGoals++;
      live.revealed.push(ev);
    });
    live.pending = [];
  }
  dumpPending();
  live.minute = 90;
  if (!live.inExtraTime && !live.allowDraw && live.myGoals === live.oppGoals) {
    var myPlayers = G.futdraft.lineup.map(function (s) { return s.player; });
    futDraftAddExtraTime(live, myPlayers);
    dumpPending();
    live.minute = 120;
  }
  live.done = true;
  live.onFinish();
};

// Fila de la línea temporal para un gol: el nombre real de quien marca
// (tuyo o del pool fantasma del rival) y su asistencia si la hubo. En los
// goles rivales se añade el nombre del equipo entre paréntesis, porque el
// nombre del jugador fantasma no dice por sí solo para quién "juega".
function futDraftTimelineRowHtml(ev, oppName) {
  var text = '<strong>' + escapeHtml(ev.scorer.nombre) + '</strong>' +
    (ev.assist ? ' <span class="dim">(asist. ' + escapeHtml(ev.assist.nombre) + ')</span>' : ' <span class="dim">(gol en solitario)</span>');
  if (ev.side !== 'me') text += ' <span class="dim">· ' + escapeHtml(oppName) + '</span>';
  return '<div class="futdraft-timeline-row"><span class="futdraft-timeline-minute">' + ev.minute + '\'</span><span>⚽</span><span>' + text + '</span></div>';
}

function renderFutDraftLive() {
  var live = G.futdraft.live;
  var oppName = live.oppSide.name;
  var logHtml = live.revealed.slice().reverse().map(function (ev) {
    return futDraftTimelineRowHtml(ev, oppName);
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + PLAYER_SHIELD + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + live.myGoals + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(teamShieldPath(oppName)) + '" alt=""><div class="score-name">' + escapeHtml(oppName) + '</div><div class="score-num">' + live.oppGoals + '</div></div>' +
      '</div>' +
      '<div class="turn-indicator">' + (live.inExtraTime ? 'Prórroga — minuto ' + live.minute + '\' de 120\'' : 'Minuto ' + live.minute + '\' de 90\'') + '</div>' +
      (live.inExtraTime && live.minute <= 91 ? '<p class="dim small center-text">Empate al término del tiempo reglamentario: se juega la prórroga.</p>' : '') +
      (live.weather ? '<p class="dim small center-text">🌦️ ' + WEATHER_CONDITIONS[live.weather].label + ': ' + WEATHER_CONDITIONS[live.weather].desc + '</p>' : '') +
      '<div class="panel">' +
        '<div class="futdraft-timeline">' + (logHtml || '<p class="dim small center-text">Aún no ha pasado nada…</p>') + '</div>' +
      '</div>' +
      '<button class="btn btn-outline btn-block" onclick="futDraftSkipLive()">Saltar simulación</button>' +
    '</div>'
  );
}

// Tanda de penaltis de FutDraft: mismo motor (zonas 0-2, portero al azar,
// 5 lanzamientos + muerte súbita) que el Modo Penaltis independiente, pero
// con su propio estado (G.futdraft.penalty) para no interferir con él, y
// que al acabar retoma el bracket de FutDraft en vez de terminar la tanda.
function startFutDraftPenaltyShootout(oppSide) {
  G.futdraft.penalty = {
    playerGoals: 0, rivalGoals: 0, round: 1, stage: 'shoot', suddenDeath: false, result: null,
    oppName: oppSide.name, oppShield: teamShieldPath(oppSide.name)
  };
  G.screen = 'futdraftPenalty';
  render();
}

window.resolveFutDraftPenaltyShot = function (zone) {
  var p = G.futdraft.penalty;
  if (!p || p.result) return;
  var otherZone = rand(0, 2);
  var saved = zone === otherZone;
  if (p.stage === 'shoot') {
    if (!saved) { p.playerGoals++; p.result = { type: 'goal', text: '¡Marcas el penalti!' }; }
    else { p.result = { type: 'save', text: 'El portero rival ataja tu disparo.' }; }
  } else {
    if (!saved) { p.rivalGoals++; p.result = { type: 'goal', text: escapeHtml(p.oppName) + ' anota el penalti.' }; }
    else { p.result = { type: 'save', text: '¡Detienes el penalti rival!' }; }
  }
  render();
};

window.continueFutDraftPenaltyShot = function () {
  var p = G.futdraft.penalty;
  if (!p || !p.result) return;
  p.result = null;
  if (p.stage === 'shoot') { p.stage = 'defend'; render(); return; }
  p.stage = 'shoot';
  if (p.suddenDeath) {
    if (p.playerGoals !== p.rivalGoals) { finishFutDraftPenaltyShootout(); return; }
  } else {
    p.round++;
    if (p.round > PENALTY_MODE_ROUNDS) {
      if (p.playerGoals === p.rivalGoals) { p.suddenDeath = true; }
      else { finishFutDraftPenaltyShootout(); return; }
    }
  }
  render();
};

function finishFutDraftPenaltyShootout() {
  var f = G.futdraft;
  var p = f.penalty;
  var match = f.pendingMatch;
  var oppSide = f.pendingOppSide;
  var regular = f.pendingRegularResult;
  var playerWon = p.playerGoals > p.rivalGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);
  if (playerWon) f.winsCount++;
  f.lastMatchResult = {
    oppName: oppSide.name, oppShield: teamShieldPath(oppSide.name), oppPower: regular.oppPower,
    myGoals: regular.myGoals, oppGoals: regular.oppGoals, playerWon: playerWon,
    timeline: regular.timeline, weather: regular.weather,
    penalty: { myGoals: p.playerGoals, oppGoals: p.rivalGoals }
  };
  f.penalty = null; f.pendingMatch = null; f.pendingOppSide = null; f.pendingRegularResult = null;
  G.screen = 'futdraftMatchResult';
  render();
}

function renderFutDraftPenalty() {
  var p = G.futdraft.penalty;
  if (!p) return '';
  var isShoot = p.stage === 'shoot';
  var title = isShoot ? '⚽ Tu turno de chutar' : '🧤 Para el penalti rival';
  var subtitle = isShoot ? 'Elige dónde tirar.' : 'Elige dónde tirarte a parar.';
  var actionHtml;
  if (p.result) {
    actionHtml =
      '<h3 style="margin-bottom:4px">' + (p.result.type === 'goal' ? '⚽ ¡Gol!' : '🧤 ¡Parada!') + '</h3>' +
      '<p class="dim small">' + p.result.text + '</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="continueFutDraftPenaltyShot()">Continuar</button>';
  } else {
    actionHtml =
      '<h3 style="margin-bottom:4px">' + title + '</h3>' +
      '<p class="dim small">' + subtitle + '</p>' +
      '<div class="penalty-goal">' +
        '<img class="penalty-goal-img" src="assets/otros/penaltis.png" alt="">' +
        '<div class="penalty-zones">' +
          '<button class="penalty-zone" onclick="resolveFutDraftPenaltyShot(0)" aria-label="Izquierda"></button>' +
          '<button class="penalty-zone" onclick="resolveFutDraftPenaltyShot(1)" aria-label="Centro"></button>' +
          '<button class="penalty-zone" onclick="resolveFutDraftPenaltyShot(2)" aria-label="Derecha"></button>' +
        '</div>' +
      '</div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mt mb0">Penaltis</h2>' +
        '<p class="dim small">Empate en el tiempo reglamentario contra ' + escapeHtml(p.oppName) + '. Tanda a ' + PENALTY_MODE_ROUNDS + ', con muerte súbita si hay empate.</p>' +
      '</div>' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + PLAYER_SHIELD + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + p.playerGoals + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(p.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(p.oppName) + '</div><div class="score-num">' + p.rivalGoals + '</div></div>' +
      '</div>' +
      '<div class="panel center-text">' + actionHtml + '</div>' +
    '</div>'
  );
}

function finishFutDraftRun() {
  var f = G.futdraft;
  var meta = G.meta;
  f.reward = FUTDRAFT_BASE_REWARD + FUTDRAFT_WIN_REWARD * f.winsCount;
  meta.points += f.reward;
  saveMeta(meta);
  G.screen = 'futdraftSummary';
  render();
}

window.continueFutDraftMatch = function () {
  var f = G.futdraft;
  var round = f.tournament.rounds[f.tournament.rounds.length - 1];
  if (!f.lastMatchResult.playerWon) {
    f.eliminated = true;
    finishFutDraftRun();
    return;
  }
  // El jugador ganó su partido: se resuelve el resto de la ronda sola,
  // igual que en el Modo Torneo normal. De paso se reparten goles
  // (fantasma, del pool de no drafteados) entre esos partidos que nunca se
  // juegan de verdad, solo para que la tabla de goleadores/asistentes del
  // torneo entero tenga en cuenta también esos partidos -- no cambia en
  // nada quién gana cada uno, eso lo sigue decidiendo simulateCpuMatch
  // con su propia tirada independiente.
  var undraftedPool = futDraftUndraftedPool();
  round.forEach(function (m) {
    if (m.winner === null) {
      var goles = simulateCpuMatchGoals(m.a, m.b);
      var eventsA = [], eventsB = [];
      for (var gi = 0; gi < goles[0]; gi++) eventsA.push(futDraftGoalEvent(undraftedPool));
      for (var gj = 0; gj < goles[1]; gj++) eventsB.push(futDraftGoalEvent(undraftedPool));
      futDraftRecordGoalEvents(f.stats, eventsA, m.a.name);
      futDraftRecordGoalEvents(f.stats, eventsB, m.b.name);
      m.winner = simulateCpuMatch(m.a, m.b);
    }
  });
  if (round.length === 1) {
    f.champion = round[0].winner;
    finishFutDraftRun();
    return;
  }
  var winners = round.map(function (m) { return m.winner; });
  var nextRound = [];
  for (var i = 0; i < winners.length; i += 2) nextRound.push({ a: winners[i], b: winners[i + 1], winner: null });
  f.tournament.rounds.push(nextRound);
  G.screen = 'futdraftBracket';
  render();
};

function renderFutDraftBracket() {
  var t = G.futdraft.tournament;
  var totalRounds = Math.log2(t.size);
  var html = '<div class="screen"><div class="panel center-text"><h2 class="panel-title mb0">🏆 Torneo FutDraft</h2><p class="dim small">Tu once y ' + (t.size - 1) + ' rivales, eliminación directa.</p></div>';
  html += '<div class="panel bracket-panel"><div class="bracket-tree">';
  t.rounds.forEach(function (round, ri) {
    var isFinal = round.length === 1;
    html += '<div class="bracket-round-col"><div class="bracket-round-title">' + roundNameForIndex(ri, totalRounds) + '</div>';
    if (isFinal) {
      html += '<div class="bracket-final-wrap">' + bracketMatchHtml(round[0]) + '</div>';
    } else {
      html += '<div class="bracket-pairs">';
      for (var i = 0; i < round.length; i += 2) {
        html += '<div class="bracket-pair">' + bracketMatchHtml(round[i]) + bracketMatchHtml(round[i + 1]) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  });
  var lastRound = t.rounds[t.rounds.length - 1];
  var champion = lastRound.length === 1 ? lastRound[0].winner : null;
  html += '<div class="bracket-round-col bracket-trophy-col"><div class="bracket-round-title">Campeón</div>' +
    '<div class="bracket-trophy-wrap">' +
      '<div class="bracket-trophy' + (champion ? '' : ' is-pending') + '">🏆</div>' +
      '<div class="bracket-champion-name">' + (champion ? (champion.isPlayer ? 'Tú' : escapeHtml(champion.name)) : '?') + '</div>' +
    '</div></div>';
  html += '</div></div>';
  var pendingPlayerMatch = lastRound.filter(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; })[0];
  if (pendingPlayerMatch) {
    html += '<button class="btn btn-primary btn-block" onclick="playFutDraftMatch()">Jugar mi partido</button>';
  }
  html += '</div>';
  return html;
}

function renderFutDraftMatchResult() {
  var r = G.futdraft.lastMatchResult;
  var resultLabel = r.myGoals === r.oppGoals && !r.penalty ? 'Empate' : (r.playerWon ? '🏆 ¡Victoria!' : 'Derrota');
  var weatherHtml = r.weather
    ? '<p class="dim small">🌦️ ' + WEATHER_CONDITIONS[r.weather].label + ': ' + WEATHER_CONDITIONS[r.weather].desc + '</p>'
    : '';
  var penaltyHtml = r.penalty
    ? '<p class="dim small">Empate a ' + r.myGoals + ' en el tiempo reglamentario. Penaltis: <strong>' + r.penalty.myGoals + ' - ' + r.penalty.oppGoals + '</strong></p>'
    : '';
  var timelineHtml = (r.timeline && r.timeline.length)
    ? '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Resumen del partido</h3>' +
        '<div class="futdraft-timeline">' +
          r.timeline.map(function (ev) { return futDraftTimelineRowHtml(ev, r.oppName); }).join('') +
        '</div>' +
      '</div>'
    : '<p class="dim small center-text">Partido sin goles en el tiempo reglamentario.</p>';
  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + PLAYER_SHIELD + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + r.myGoals + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(r.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(r.oppName) + '</div><div class="score-num">' + r.oppGoals + '</div></div>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:4px">' + resultLabel + '</h3>' +
        '<p class="dim small">Fuerza de ' + escapeHtml(r.oppName) + ': ' + r.oppPower + ' / 100</p>' +
        weatherHtml + penaltyHtml +
      '</div>' +
      timelineHtml +
      (r.isLiga
        ? '<button class="btn btn-primary btn-block mt" onclick="continueLigaMatchday()">Ver jornada</button>'
        : '<button class="btn btn-primary btn-block mt" onclick="continueFutDraftMatch()">' + (r.playerWon ? 'Continuar' : 'Ver resultado') + '</button>') +
    '</div>'
  );
}

// Panel de "Máximo goleador y asistente" + top 8 de cada uno, compartido
// por el resumen del torneo de FutDraft y el de Liga -- stats es
// { scorers: {}, assists: {} } (ver futDraftRecordGoalEvents).
function renderTopScorersAssistsPanel(stats) {
  stats = stats || { scorers: {}, assists: {} };
  var scorers = sortedStatsList(stats.scorers).slice(0, 8);
  var assists = sortedStatsList(stats.assists).slice(0, 8);
  if (!scorers.length && !assists.length) return '';
  var topScorer = scorers[0], topAssist = assists[0];
  function listHtml(list) {
    return list.map(function (s, i) {
      return '<div class="futdraft-timeline-row"><span>' + (i + 1) + '.</span><span style="flex:1;text-align:left">' + escapeHtml(s.nombre) + ' <span class="dim">(' + escapeHtml(s.team) + ')</span></span><span class="dim">' + s.count + '</span></div>';
    }).join('');
  }
  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Goleadores y asistentes del torneo</h3>' +
      (topScorer ? '<p class="dim small">⚽ Máximo goleador: <strong>' + escapeHtml(topScorer.nombre) + '</strong> (' + escapeHtml(topScorer.team) + ') — ' + topScorer.count + ' gol' + (topScorer.count === 1 ? '' : 'es') + '</p>' : '') +
      (topAssist ? '<p class="dim small">🅰️ Máximo asistente: <strong>' + escapeHtml(topAssist.nombre) + '</strong> (' + escapeHtml(topAssist.team) + ') — ' + topAssist.count + ' asistencia' + (topAssist.count === 1 ? '' : 's') + '</p>' : '') +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">' +
        '<div style="flex:1;min-width:140px"><h4 style="margin-bottom:4px">Goleadores</h4>' + listHtml(scorers) + '</div>' +
        '<div style="flex:1;min-width:140px"><h4 style="margin-bottom:4px">Asistentes</h4>' + listHtml(assists) + '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderFutDraftSummary() {
  var f = G.futdraft;
  var won = f.champion && f.champion.isPlayer;
  var title = won ? '🏆 ¡Campeón del torneo!' : 'Eliminado';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">' + title + '</h2>' +
        (won ? '<div class="bracket-trophy" style="margin:0 auto">🏆</div>' : '<p class="dim small">Tu once no llegó hasta el final esta vez.</p>') +
        '<p class="dim small">' + f.winsCount + ' partido' + (f.winsCount === 1 ? '' : 's') + ' ganado' + (f.winsCount === 1 ? '' : 's') + '</p>' +
        '<p class="currency-display">' + spiritIcon() + ' +' + f.reward + ' Puntos de Espíritu</p>' +
      '</div>' +
      renderTopScorersAssistsPanel(f.stats) +
      '<div class="panel center-text">' +
        '<button class="btn btn-primary btn-block" onclick="actionGoFutDraftModeSelect()">Nuevo draft</button>' +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   15f. LIGA: reutiliza por completo el motor de FutDraft (draft de 15,
   formación, capitán, sinergia, simulación en vivo con clima y prórroga)
   pero en vez de un bracket de 8 con eliminación directa, es una liga de
   18 equipos a una vuelta (17 jornadas, todos contra todos una vez). Los
   empates cuentan como empates de verdad (no hay penaltis en Liga: 1
   punto para cada uno). 2 ejes independientes al empezar:
   - Personajes: "desbloqueados" (solo tu plantel real) o "todos".
   - Nivel: Normal / Difícil / Extremo, con desbloqueo secuencial (hay
     que ser CAMPEÓN de un nivel para desbloquear el siguiente).
   --------------------------------------------------------------------- */

var LIGA_TEAM_COUNT = 18; // tú + 17 rivales
var LIGA_BASE_REWARD = 60;
var LIGA_TIERS = ['normal', 'dificil', 'extremo'];
var LIGA_TIER_NAMES = { normal: 'Normal', dificil: 'Difícil', extremo: 'Extremo' };
function ligaTierName(tier) { return LIGA_TIER_NAMES[tier] || tier; }

function ligaTierUnlocked(meta, tier) {
  if (tier === 'normal') return true;
  var unlocked = meta.ligaTierUnlocked || {};
  return !!unlocked[tier];
}

// Cuanto más alto el nivel, más se tira de RIVAL_TEAM_BOSSES (equipos de
// nivel jefe, con TEAM_POWER más alto) en vez de RIVAL_TEAM_NAMES
// (equipos normales) para elegir los 17 rivales de la liga.
var LIGA_TIER_BOSS_CHANCE = { normal: 0.15, dificil: 0.5, extremo: 0.85 };
function ligaPickRivalNames(tier) {
  var bossChance = LIGA_TIER_BOSS_CHANCE[tier] || 0.15;
  var used = {};
  var names = [];
  var guard = 0;
  while (names.length < LIGA_TEAM_COUNT - 1 && guard < 2000) {
    guard++;
    var pool = Math.random() < bossChance ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES;
    var name = choice(pool);
    if (!used[name]) { used[name] = true; names.push(name); }
  }
  return names;
}

// Método del círculo: liga a una vuelta con N equipos (par). Devuelve
// N-1 jornadas, cada una con N/2 partidos, cada partido [idxLocal, idxVisitante].
function generateRoundRobin(n) {
  var arr = [];
  for (var i = 0; i < n; i++) arr.push(i);
  var rounds = [];
  for (var r = 0; r < n - 1; r++) {
    var round = [];
    for (var i2 = 0; i2 < n / 2; i2++) round.push([arr[i2], arr[n - 1 - i2]]);
    rounds.push(round);
    var fixed = arr[0];
    var rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed].concat(rest);
  }
  return rounds;
}

function ligaEmptyStanding() { return { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }; }
function ligaApplyResult(table, homeIdx, awayIdx, homeGoals, awayGoals) {
  var h = table[homeIdx], a = table[awayIdx];
  h.pj++; a.pj++;
  h.gf += homeGoals; h.gc += awayGoals;
  a.gf += awayGoals; a.gc += homeGoals;
  if (homeGoals > awayGoals) { h.pg++; h.pts += 3; a.pp++; }
  else if (homeGoals < awayGoals) { a.pg++; a.pts += 3; h.pp++; }
  else { h.pe++; a.pe++; h.pts++; a.pts++; }
}
function ligaSortedTable(table) {
  return table.map(function (t, i) { return Object.assign({ idx: i }, t); }).sort(function (a, b) {
    if (b.pts !== a.pts) return b.pts - a.pts;
    var gdA = a.gf - a.gc, gdB = b.gf - b.gc;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
}
// Resuelve un partido CPU-vs-CPU de la liga con las mismas fórmulas que
// usa FutDraft para sus propios partidos, pero con TEAM_POWER en los dos
// bandos (ninguno de los dos es "tu" equipo). Delega en simulateCpuMatchGoals.
function ligaSimulateCpuVsCpu(nameA, nameB) {
  return simulateCpuMatchGoals({ name: nameA }, { name: nameB });
}

function actionGoLigaTierSelect() { G.screen = 'ligaTierSelect'; render(); }

function renderLigaTierSelect() {
  var meta = G.meta;
  var btns = LIGA_TIERS.map(function (tier) {
    var unlocked = ligaTierUnlocked(meta, tier);
    return (
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-block" ' + (unlocked ? '' : 'disabled style="opacity:0.5;cursor:not-allowed;"') + ' onclick="actionChooseLigaTier(\'' + tier + '\')">' +
          ligaTierName(tier) + (unlocked ? '' : ' 🔒') +
        '</button>' +
      '</div>' +
      (unlocked ? '' : '<p class="dim small center-text">Sé campeón del nivel anterior para desbloquearlo.</p>')
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Liga</h2>' +
        '<p class="dim small">Liga de ' + LIGA_TEAM_COUNT + ' equipos a una vuelta (' + (LIGA_TEAM_COUNT - 1) + ' jornadas, todos contra todos una vez). Los empates cuentan como empates: no hay prórroga ni penaltis en Liga.</p>' +
        btns +
      '</div>' +
    '</div>'
  );
}

function actionChooseLigaTier(tier) {
  if (!ligaTierUnlocked(G.meta, tier)) return;
  G.ligaPendingTier = tier;
  G.screen = 'ligaPoolSelect';
  render();
}

function renderLigaPoolSelect() {
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoLigaTierSelect()">Volver</button>' +
        '<h2 class="panel-title mt">Liga · ' + ligaTierName(G.ligaPendingTier) + '</h2>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionChooseLigaPool(\'desbloqueados\')">Personajes desbloqueados<br><small class="dim">Solo puedes draftear a quien ya tengas desbloqueado en el Vestuario.</small></button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionChooseLigaPool(\'todos\')">Todos los personajes<br><small class="dim">Draftea a cualquiera del roster, estén desbloqueados o no.</small></button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function actionChooseLigaPool(pool) {
  G.ligaPendingPool = pool;
  G.futdraftPendingMode = 'liga';
  G.futdraftFormationChoices = pickFutDraftFormationChoices(FUTDRAFT_FORMATION_CHOICES_BY_MODE.clasico);
  G.screen = 'futdraftFormationSelect';
  render();
}

function startLigaRun() {
  var f = G.futdraft;
  var rivalNames = ligaPickRivalNames(f.ligaTier);
  var teamNames = [null].concat(rivalNames); // índice 0 = tú (null porque se muestra aparte, "Tú")
  var table = teamNames.map(function () { return ligaEmptyStanding(); });
  var schedule = generateRoundRobin(LIGA_TEAM_COUNT);
  f.liga = { tier: f.ligaTier, pool: f.ligaPool, teamNames: teamNames, table: table, schedule: schedule, matchdayIndex: 0, finished: false, stats: { scorers: {}, assists: {} } };
  G.screen = 'ligaTable';
  render();
}

function ligaTeamLabel(liga, idx) { return idx === 0 ? 'Tú' : liga.teamNames[idx]; }

function renderLigaTable() {
  var liga = G.futdraft.liga;
  var sorted = ligaSortedTable(liga.table);
  var rows = sorted.map(function (t, pos) {
    var isYou = t.idx === 0;
    return '<tr class="' + (isYou ? 'liga-you' : '') + '">' +
      '<td>' + (pos + 1) + '</td>' +
      '<td>' + escapeHtml(ligaTeamLabel(liga, t.idx)) + '</td>' +
      '<td>' + t.pj + '</td><td>' + t.pg + '</td><td>' + t.pe + '</td><td>' + t.pp + '</td>' +
      '<td>' + t.gf + '</td><td>' + t.gc + '</td><td>' + (t.gf - t.gc) + '</td>' +
      '<td><strong>' + t.pts + '</strong></td>' +
    '</tr>';
  }).join('');
  var seasonOver = liga.matchdayIndex >= liga.schedule.length;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Liga · ' + ligaTierName(liga.tier) + '</h2>' +
        '<p class="dim small">Jornada ' + Math.min(liga.matchdayIndex + 1, liga.schedule.length) + ' de ' + liga.schedule.length + '</p>' +
      '</div>' +
      '<div class="panel" style="overflow-x:auto">' +
        '<table class="liga-table"><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
      '</div>' +
      (seasonOver
        ? '<button class="btn btn-primary btn-block" onclick="finishLigaRun()">Ver resultado final</button>'
        : '<button class="btn btn-primary btn-block" onclick="playLigaMatch()">Jugar mi partido</button>') +
    '</div>'
  );
}

window.playLigaMatch = function () {
  var f = G.futdraft;
  var liga = f.liga;
  var fixtures = liga.schedule[liga.matchdayIndex];
  var fixture = fixtures.find(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var youAreHome = fixture[0] === 0;
  var oppIdx = youAreHome ? fixture[1] : fixture[0];
  var oppName = liga.teamNames[oppIdx];
  var sim = futDraftSimulateMatchCore(teamPower({ name: oppName }));

  f.live = {
    oppSide: { name: oppName }, weather: sim.weather,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    inExtraTime: false, allowDraw: true, onFinish: finishLigaMatch,
    fixtureOppIdx: oppIdx, youAreHome: youAreHome,
    done: false
  };
  G.screen = 'futdraftLive';
  render();
  futDraftLiveTick();
};

function finishLigaMatch() {
  var f = G.futdraft;
  var live = f.live;
  var liga = f.liga;
  var oppIdx = live.fixtureOppIdx;
  var oppName = liga.teamNames[oppIdx];
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  var homeIdx = live.youAreHome ? 0 : oppIdx;
  var awayIdx = live.youAreHome ? oppIdx : 0;
  var homeGoals = live.youAreHome ? myGoals : oppGoals;
  var awayGoals = live.youAreHome ? oppGoals : myGoals;
  ligaApplyResult(liga.table, homeIdx, awayIdx, homeGoals, awayGoals);
  futDraftRecordGoalEvents(liga.stats, live.revealed.filter(function (e) { return e.side === 'me'; }), 'Tu equipo');
  futDraftRecordGoalEvents(liga.stats, live.revealed.filter(function (e) { return e.side === 'opp'; }), oppName);
  f.lastMatchResult = {
    oppName: oppName, oppShield: teamShieldPath(oppName), oppPower: teamPower({ name: oppName }),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals,
    timeline: live.revealed, weather: live.weather, isLiga: true
  };
  f.live = null;
  G.screen = 'futdraftMatchResult';
  render();
}

// Al continuar desde el resultado de TU partido, se resuelven de golpe
// (simulados, sin verlos) los demás partidos de la misma jornada, y se
// avanza a la siguiente -- o al resumen final si era la última.
window.continueLigaMatchday = function () {
  var f = G.futdraft;
  var liga = f.liga;
  var undraftedPool = futDraftUndraftedPool();
  liga.schedule[liga.matchdayIndex].forEach(function (fx) {
    if (fx[0] === 0 || fx[1] === 0) return;
    var nameA = liga.teamNames[fx[0]], nameB = liga.teamNames[fx[1]];
    var goles = ligaSimulateCpuVsCpu(nameA, nameB);
    ligaApplyResult(liga.table, fx[0], fx[1], goles[0], goles[1]);
    // Igual que en el bracket de FutDraft: goles fantasma (del pool de no
    // drafteados) solo para la tabla de goleadores/asistentes de la Liga,
    // no afectan al resultado ya decidido arriba.
    var eventsA = [], eventsB = [];
    for (var gi = 0; gi < goles[0]; gi++) eventsA.push(futDraftGoalEvent(undraftedPool));
    for (var gj = 0; gj < goles[1]; gj++) eventsB.push(futDraftGoalEvent(undraftedPool));
    futDraftRecordGoalEvents(liga.stats, eventsA, nameA);
    futDraftRecordGoalEvents(liga.stats, eventsB, nameB);
  });
  liga.matchdayIndex++;
  G.screen = 'ligaTable';
  render();
};

function finishLigaRun() {
  var f = G.futdraft;
  var liga = f.liga;
  var meta = G.meta;
  var sorted = ligaSortedTable(liga.table);
  var myPosition = sorted.findIndex(function (t) { return t.idx === 0; }) + 1;
  var champion = myPosition === 1;
  if (champion) {
    meta.ligaTierUnlocked = meta.ligaTierUnlocked || { normal: true, dificil: false, extremo: false };
    if (liga.tier === 'normal') meta.ligaTierUnlocked.dificil = true;
    else if (liga.tier === 'dificil') meta.ligaTierUnlocked.extremo = true;
  }
  var reward = LIGA_BASE_REWARD + Math.max(0, LIGA_TEAM_COUNT - myPosition) * 5;
  meta.points += reward;
  saveMeta(meta);
  liga.finished = true;
  liga.finalPosition = myPosition;
  liga.champion = champion;
  liga.reward = reward;
  G.screen = 'ligaSummary';
  render();
}

function renderLigaSummary() {
  var liga = G.futdraft.liga;
  var title = liga.champion ? '🏆 ¡Campeón de la Liga ' + ligaTierName(liga.tier) + '!' : 'Liga terminada';
  var nextTierIdx = LIGA_TIERS.indexOf(liga.tier) + 1;
  var unlockedNext = liga.champion && nextTierIdx < LIGA_TIERS.length;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">' + title + '</h2>' +
        (liga.champion ? '<div class="bracket-trophy" style="margin:0 auto">🏆</div>' : '') +
        '<p class="dim small">Terminaste ' + liga.finalPosition + 'º de ' + LIGA_TEAM_COUNT + '.</p>' +
        (unlockedNext ? '<p class="dim small">¡Nivel ' + ligaTierName(LIGA_TIERS[nextTierIdx]) + ' desbloqueado!</p>' : '') +
        '<p class="currency-display">' + spiritIcon() + ' +' + liga.reward + ' Puntos de Espíritu</p>' +
      '</div>' +
      renderTopScorersAssistsPanel(liga.stats) +
      '<div class="panel center-text">' +
        '<button class="btn btn-primary btn-block" onclick="actionGoLigaTierSelect()">Volver a Liga</button>' +
      '</div>' +
    '</div>'
  );
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
