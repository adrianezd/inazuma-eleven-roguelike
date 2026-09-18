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

  // Si todavía no tienes portero, cada nodo de Fichaje tiene un 70% de
  // posibilidades de incluir uno entre las 3 opciones -- antes dependía
  // del azar puro del pool entero y una partida podía pasar entera sin que
  // saliera ninguno. Si ya tienes uno, sin trato especial (de todas formas
  // ya está excluido del pool más arriba).
  var porteroPool = pool.filter(function (p) { return p.posicion === 'Portero'; });
  var forcePortero = !alreadyHasPortero && porteroPool.length > 0 && Math.random() < 0.7;
  var picks = [];
  var rest;
  if (forcePortero) {
    var forcedPortero = choice(porteroPool);
    picks.push(forcedPortero);
    rest = pool.filter(function (p) { return p.id !== forcedPortero.id; });
  } else {
    // Si no toca forzarlo, se excluyen los porteros del resto del pool --
    // si no, podían colarse igualmente por puro azar y la tasa real de
    // aparición acababa por encima del 70% pedido.
    rest = pool.filter(function (p) { return p.posicion !== 'Portero'; });
  }
  var shuffledRest = rest.slice().sort(function () { return Math.random() - 0.5; });
  while (picks.length < 3 && shuffledRest.length) picks.push(shuffledRest.shift());
  // Se vuelve a barajar el orden final para que el portero forzado no
  // aparezca siempre en la misma posición de la tarjeta.
  picks = picks.sort(function () { return Math.random() - 0.5; });
  return picks.map(rosterInstance);
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
        '<p class="dim small">Llevas ' + run.matchesWon + ' partidos ganados y <strong style="color:var(--accent-2)">' + run.spiritEarned + '</strong> Puntos de Espíritu acumulados en esta partida. Si sigues y acabas perdiendo, te los quedas igual, esto es solo para poder parar cuando quieras sin arriesgarte a nada más.</p>' +
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

