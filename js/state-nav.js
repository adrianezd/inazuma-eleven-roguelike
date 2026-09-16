/* ---------------------------------------------------------------------
   7. ESTADO GLOBAL
   --------------------------------------------------------------------- */

var G = {
  screen: 'menu',
  meta: (typeof localStorage !== 'undefined') ? loadMeta() : { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0, normalWins: 0, bestSurvivalWave: 0, tournamentsWon: 0, dailyLastDate: null, dailyLastResult: null, ligaTierUnlocked: { normal: true, dificil: false, extremo: false }, unlockedShields: [], equippedShield: null },
  run: null,
  match: null,
  pendingCaptainOffers: null,
  pendingRecruits: null,
  pendingTraining: null,
  pendingRunMode: 'normal',
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
  // Solo se registran los goles del propio jugador: en un partido por turnos
  // el rival "no tiene identidad real" (se regenera de cero cada partido, ver
  // generateRivalPlayer) y no tiene sentido mostrar en el resumen quién te ha
  // metido gol -- eso solo se sabe (y se muestra) en FutDraft/Liga, que sí
  // simulan un partido real con jugadores reales.
  if (!isPlayerAttacking) return;
  var key = 'p:' + attackerRaw.id;
  var scorers = G.run.goalStats.scorers;
  var bucket = scorers[key] || { nombre: attackerRaw.nombre, count: 0 };
  bucket.count++;
  scorers[key] = bucket;
}

/* ---------------------------------------------------------------------
   8. RENDER: NAVEGACIÓN PRINCIPAL
   --------------------------------------------------------------------- */

var appEl = null;

// Todo render() reemplaza #app.innerHTML entero, así que cualquier
// <input> pierde el foco (y el cursor) en cada tecla -- a petición
// explícita ("en cuanto escribo una letra, tengo que volver a darle al
// cuadrado para escribir la siguiente, como que me quita el cursor").
// Arreglado de raíz aquí (no solo en el campo que se reportó): si el
// elemento con el foco lleva un atributo data-focus-key, se guarda antes
// de tirar el HTML viejo y se restaura (foco + posición del cursor) tras
// montar el nuevo -- los inputs que se re-renderizan en cada tecla
// (búsquedas de Mercado/Plantilla, apellido/dorsal de Modo Jugador) lo
// llevan puesto.
function captureFocusForRerender() {
  var active = document.activeElement;
  if (!active || !appEl || !appEl.contains(active) || !active.dataset || !active.dataset.focusKey) return null;
  return { key: active.dataset.focusKey, start: active.selectionStart, end: active.selectionEnd };
}
function restoreFocusAfterRerender(info) {
  if (!info) return;
  var el = appEl.querySelector('[data-focus-key="' + info.key + '"]');
  if (!el) return;
  el.focus();
  if (typeof el.setSelectionRange === 'function' && typeof info.start === 'number') {
    try { el.setSelectionRange(info.start, info.end); } catch (e) {}
  }
}
function render() {
  if (!appEl) appEl = document.getElementById('app');
  var focusInfo = captureFocusForRerender();
  var html = '';
  switch (G.screen) {
    case 'menu': html = renderMenu(); break;
    case 'careerSlots': html = renderCareerSlots(); break;
    case 'careerSetup': html = renderCareerSetup(); break;
    case 'careerMode': html = renderCareerMode(); break;
    case 'jugadorSetup': html = renderJugadorSetup(); break;
    case 'jugadorMode': html = renderJugadorMode(); break;
    case 'modeSelect': html = renderModeSelect(); break;
    case 'captainSelect': html = renderCaptainSelect(); break;
    case 'map': html = renderMap(); break;
    case 'match': html = renderMatch(); break;
    case 'entrenamiento': html = renderTraining(); break;
    case 'fichaje': html = renderRecruit(); break;
    case 'descanso': html = renderRest(); break;
    case 'evento': html = renderEvento(); break;
    case 'summary': html = renderSummary(); break;
    case 'gacha': html = renderGacha(); break;
    case 'penaltyMode': html = renderPenaltyMode(); break;
    case 'coleccion': html = renderColeccion(); break;
    case 'coleccionEquipos': html = renderColeccionEquipos(); break;
    case 'miColeccion': html = renderMiColeccion(); break;
    case 'rewardMachine': html = renderRewardMachine(); break;
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
  if (G.confirmLeaveOpen) html += renderConfirmLeaveModal();
  appEl.innerHTML = html;
  restoreFocusAfterRerender(focusInfo);
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
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionStartRun()">Jugar</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionGoFutDraftModeSelect()">FutDraft</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionGoCareerMode()">Modo Carrera</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionGoModoJugador()">Modo Jugador</button>' +
        '</div>' +
        '<p class="dim small center-text">Los modos más jugados, a un toque.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoLigaTierSelect()">Liga</button>' +
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
          '<button class="btn btn-block" onclick="actionGoGacha()">Fichajes</button>' +
        '</div>' +
        '<p class="dim small center-text">Comprar personajes/escudos, o probar suerte con una tirada al azar.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" onclick="actionGoColeccion()">Colección de personajes</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" onclick="actionGoColeccionEquipos()">Colección de equipos</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline btn-block" onclick="actionGoMiColeccion()">Mi Colección</button>' +
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
        '<img src="assets/otros/Afinidades.webp" alt="Rueda de afinidades elementales" style="max-width:100%;margin-top:12px;border-radius:8px;">' +
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

// Menú principal aplanado: antes "Jugar" pasaba por un hub intermedio
// (Modos clásicos / Otros modos, este último con Torneo/Supervivencia/
// Diario/Penaltis/FutDraft/Liga/Carrera escondidos detrás de un botón
// más) -- a petición explícita, ahora que FutDraft y Modo Carrera son
// los modos más jugados de largo, todo vive directo en el menú
// principal (renderMenu) sin ningún paso intermedio: "Jugar" salta
// derecho a elegir Normal/Difícil (actionStartRun), y el resto de modos
// son botones de primer nivel, con FutDraft/Carrera destacados arriba
// del todo por ser los más jugados.

function actionStartRun() { G.screen = 'modeSelect'; render(); }
function actionStartRunWithMode(mode) {
  if (mode === 'hard' && !hardModeUnlocked()) return;
  G.pendingRunMode = mode;
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
          '<button class="btn btn-primary btn-block" onclick="actionStartRunWithMode(\'normal\')">Modo Normal</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" style="' + (unlocked ? 'background:#7a1212;color:#fff;' : '') + '" ' +
            (unlocked ? 'onclick="actionStartRunWithMode(\'hard\')"' : 'disabled') + '>' +
            'Modo Difícil' + (unlocked ? '' : ' 🔒') +
          '</button>' +
        '</div>' +
        (unlocked
          ? '<p class="dim small">Los rivales meten algún gol más y paran algo más. El mapa tiene 4 jefes en vez de 3 (el último, muy difícil), y en los eventos especiales puede aparecer un jefe por sorpresa.</p>'
          : '<p class="dim small">Se desbloquea ganando el Modo Normal 3 veces y teniendo más de 10 personajes desbloqueados. Progreso: ' + (meta.normalWins || 0) + '/3 victorias, ' + totalUnlocked + '/11 personajes.</p>') +
        '<p class="dim small">Tiro y Regate: puedes encadenar regates en el mismo turno -- cada uno sube tu probabilidad de gol (cada vez menos, según tu Regate) y la de perder el balón (cada vez más), hasta que decides tirar o te lo roban. Defensa y Especial funcionan igual que siempre.</p>' +
      '</div>' +
    '</div>'
  );
}
function actionGoColeccion() { G.screen = 'coleccion'; render(); }
function actionGoColeccionEquipos() { G.screen = 'coleccionEquipos'; render(); }
function actionGoMiColeccion() { G.screen = 'miColeccion'; render(); }

function actionEquipShield(name) {
  var meta = G.meta;
  if ((meta.unlockedShields || []).indexOf(name) === -1) return;
  meta.equippedShield = name;
  saveMeta(meta);
  render();
}
function actionUnequipShield() {
  var meta = G.meta;
  meta.equippedShield = null;
  saveMeta(meta);
  render();
}

// "Mi Colección": los personajes ya se ven completos en "Colección de
// personajes" (que además permite comprarlos directamente ahí, ver
// renderColeccion), así que meterlos aquí también era pura redundancia --
// esta pantalla se queda solo con lo que no vive en ningún otro sitio: el
// acceso a Vestuario y los escudos ganados en la Máquina de Premios (ver
// 15b-bis), con opción de equipar uno como tu escudo en partidos/marcadores.
function renderMiColeccion() {
  var meta = G.meta;
  var myShields = meta.unlockedShields || [];

  var defaultEquipped = !meta.equippedShield;
  var shieldsHtml =
    '<div class="shop-item" style="' + (defaultEquipped ? 'background:rgba(255,255,255,.06);' : '') + '">' +
      '<img class="team-shield-inline" src="' + PLAYER_SHIELD + '" alt="">' +
      '<div style="flex:1"><strong>Escudo por defecto</strong></div>' +
      '<div class="cost">' + (defaultEquipped ? '<span class="pill">Equipado</span>' : '<button class="btn btn-outline" onclick="actionUnequipShield()">Equipar</button>') + '</div>' +
    '</div>' +
    myShields.map(function (name) {
      var equipped = meta.equippedShield === name;
      return (
        '<div class="shop-item" style="' + (equipped ? 'background:rgba(255,255,255,.06);' : '') + '">' +
          '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(name)) + '" alt="">' +
          '<div style="flex:1"><strong>' + escapeHtml(name) + '</strong></div>' +
          '<div class="cost">' + (equipped ? '<span class="pill">Equipado</span>' : '<button class="btn btn-outline" onclick="actionEquipShield(\'' + escapeHtml(name).replace(/'/g, "\\'") + '\')">Equipar</button>') + '</div>' +
        '</div>'
      );
    }).join('');

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Mi Colección</h2>' +
        '<p class="dim small">Tus personajes desbloqueados se ven en Colección de personajes. Para conseguir más (comprar uno concreto o al azar), ve a Fichajes. Aquí está el resto: tus escudos.</p>' +
        '<button class="btn btn-block" onclick="actionGoGacha()">Fichajes</button>' +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Mis escudos (' + myShields.length + ')</h3><p class="dim small">Elige el que se muestra como el tuyo en partidos y marcadores.</p></div>' +
      shieldsHtml +
    '</div>'
  );
}

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
  var myPlayers = ROSTER.filter(isUnlocked);

  // Colección de personajes es solo TUYA -- lo que ya tienes desbloqueado.
  // Comprar (concreto o al azar en Fichajes) vive aparte, en una única
  // pantalla unificada (ver 15b), para no duplicar la misma lista en dos
  // sitios a la vez.
  var filtered = myPlayers.filter(function (c) {
    if (filter.tipo && c.tipo !== filter.tipo) return false;
    if (filter.posicion && c.posicion !== filter.posicion) return false;
    return true;
  });

  var items = filtered.map(function (c) {
    return (
      '<div class="shop-item">' +
        '<div>' +
          avatarHtml(c) + ' <strong>' + escapeHtml(c.nombre) + '</strong> ' + typeBadge(c.tipo) + '<br>' +
          '<span class="dim small">' + escapeHtml(c.desc) + '</span>' +
        '</div>' +
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
        '<p class="dim small">' + myPlayers.length + ' de ' + ROSTER.length + ' desbloqueados. Mostrando ' + filtered.length + '.</p>' +
        '<p class="dim small">¿Quieres desbloquear más? Ve a Fichajes.</p>' +
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
// Confirmación genérica antes de salir de un modo con progreso en curso,
// a petición explícita ("el volver siempre con confirmación en
// cualquier modo... preguntar si has guardado"). Antes era un
// window.confirm() nativo -- imposible de dar estilo, así que ahora es
// un modal propio (renderConfirmLeaveModal, pintado encima de lo que
// sea que haya en pantalla, ver el final de render()), a petición
// explícita ("tratamiento tipo tarjeta/insignia... se leería más rápido
// que texto corrido"). Como el modal es asíncrono (hay que esperar a que
// el usuario pulse un botón), requestConfirmLeave no puede devolver
// true/false al momento como el confirm() de antes -- en vez de eso
// guarda el NOMBRE de la función a llamar si confirman (G.pendingLeaveFn,
// buscada luego en window[...]) y solo pinta el modal. Solo se usa en
// botones que de verdad abandonan el modo (no en "Cancelar" de un
// diálogo suelto, que no pierde nada).
function requestConfirmLeave(fnName) {
  G.pendingLeaveFn = fnName;
  G.confirmLeaveOpen = true;
  render();
}
function actionConfirmLeaveYes() {
  var fn = G.pendingLeaveFn;
  G.pendingLeaveFn = null;
  G.confirmLeaveOpen = false;
  if (fn && typeof window[fn] === 'function') window[fn]();
  else render();
}
function actionConfirmLeaveNo() {
  G.pendingLeaveFn = null;
  G.confirmLeaveOpen = false;
  render();
}
function renderConfirmLeaveModal() {
  return (
    '<div class="modal-overlay">' +
      '<div class="modal-card center-text">' +
        '<div class="modal-icon">🚪</div>' +
        '<h3 style="margin-bottom:4px">¿Seguro que quieres salir?</h3>' +
        '<p class="dim small">Si no has guardado, perderás el progreso.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-outline" onclick="actionConfirmLeaveNo()">Cancelar</button>' +
          '<button class="btn btn-danger" onclick="actionConfirmLeaveYes()">Salir sin guardar</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
// actionBackToMenu es el punto de entrada de ~18 botones "Volver" por
// toda la app -- se queda con el mismo nombre para no tocar ninguno de
// esos onclick, solo que ahora PIDE confirmación en vez de navegar al
// momento; doBackToMenuNow es la navegación real, llamada por
// actionConfirmLeaveYes tras confirmar.
function actionBackToMenu() {
  requestConfirmLeave('doBackToMenuNow');
}
function doBackToMenuNow() {
  G.screen = 'menu';
  render();
}

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
  newRun(G.pendingRunMode);
  G.run.squad.push(captain);
  G.screen = 'map';
  render();
}

// Color de la "media" (ver playerCardHtml): por debajo de 70 en naranja
// (floja), 70-75 amarillo, 75-80 verde clarito, y por encima de 80 sube de
// tono PROGRESIVAMENTE (verde cada vez más intenso/azulado) para que una
// plantilla de estrellas destaque de un vistazo frente a una simplemente
// "buena" -- no es un salto brusco más, es un degradado continuo.
function mediaBadgeColor(score) {
  if (score < 70) return 'hsl(28, 88%, 50%)';
  if (score < 75) return 'hsl(48, 88%, 50%)';
  if (score < 80) return 'hsl(95, 55%, 55%)';
  var t = clamp((score - 80) / 19, 0, 1);
  var hue = 100 + t * 60;   // 100 (verde) -> 160 (verde azulado)
  var sat = 60 + t * 25;    // 60% -> 85%
  var light = 45 - t * 10;  // 45% -> 35% (mas intenso/oscuro = mas "premium")
  return 'hsl(' + Math.round(hue) + ', ' + Math.round(sat) + '%, ' + Math.round(light) + '%)';
}

// showMedia: solo se pide en las tarjetas de un PICK de draft (FutDraft y
// Liga, que reutiliza el mismo motor de draft -- ver generateFutDraftOptions/
// pickFutDraftPlayer) para ayudar a decidir de un vistazo sin tener que leer
// las 4 barras de stats una a una. Es la misma media ponderada por posición
// que ya se usa para la puntuación de equipo (ver futDraftPlayerScore), así
// que el número no es nuevo, solo se hace visible en la tarjeta. El resto de
// tarjetas (plantel, capitán, ataque...) se quedan igual que siempre.
function playerCardHtml(p, onclickAttr, selected, disabled, showMedia) {
  var cls = 'player-card' + (selected ? ' selected' : '') + (disabled ? ' disabled' : '') + (p.fatigado ? ' fatigued' : '');
  var attr = disabled ? '' : ' onclick="' + onclickAttr + '"';
  var hissatsuHtml = p.hissatsu ? '<div class="hissatsu-tag">' + p.hissatsu.map(escapeHtml).join(' · ') + '</div>' : '';
  var origHtml = p.original ? '<span class="player-original">(' + escapeHtml(p.original) + ')</span>' : '';
  var mediaScore = showMedia ? Math.round(futDraftPlayerScore(p)) : null;
  var mediaHtml = showMedia
    ? '<span class="media-badge" style="background:' + mediaBadgeColor(mediaScore) + '" title="Media según su posición">' + mediaScore + '</span>'
    : '';
  return (
    '<div class="' + cls + '"' + attr + '>' +
      '<div class="player-card-head">' +
        avatarHtml(p) +
        '<div class="player-head-text">' +
          '<span class="player-name">' + escapeHtml(p.nombre) + '</span>' + origHtml +
        '</div>' +
        typeBadge(p.tipo) +
        mediaHtml +
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

