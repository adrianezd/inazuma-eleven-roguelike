window.startFutDraftMatches = function () {
  var size = futDraftBracketSize();
  var bracket = generateTournamentBracket(size);
  var round1 = [];
  for (var i = 0; i < bracket.slots.length; i += 2) round1.push({ a: bracket.slots[i], b: bracket.slots[i + 1], winner: null });
  G.futdraft.tournament = { rounds: [round1], size: size };
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
    var sBucket = stats.scorers[ev.scorer.id] || { nombre: ev.scorer.nombre, team: teamLabel, count: 0, player: ev.scorer };
    sBucket.count++;
    sBucket.team = teamLabel;
    stats.scorers[ev.scorer.id] = sBucket;
    if (ev.assist) {
      var aBucket = stats.assists[ev.assist.id] || { nombre: ev.assist.nombre, team: teamLabel, count: 0, player: ev.assist };
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
function futDraftModifierTypeFraction(lineup, tipo) {
  if (!lineup || !lineup.length) return 0;
  var n = 0;
  lineup.forEach(function (s) { if (s.player && s.player.tipo === tipo) n++; });
  return n / lineup.length;
}

// Multiplicadores del modificador que le haya tocado a ESTE partido
// (sorteado en futDraftRollMatchModifier a partir de f.condition -- ver
// FUTDRAFT_CONDITION_OPTIONS). bothMult toca ataque y defensa propios Y
// la fuerza del rival por igual (lluvia, cerrojo); los que favorecen un
// tipo elemental solo tocan a tu equipo, escalados por la fracción de tu
// once que sea de ese tipo (un once 100% de ese tipo llega a +50%,
// ninguno no da nada).
function futDraftModifierMultipliers(modifierId, lineup) {
  var mod = FUTDRAFT_MODIFIERS_BY_ID[modifierId] || FUTDRAFT_MODIFIERS_BY_ID.ninguno;
  var bothMult = mod.bothMult || 1;
  var myAtkMult = mod.myAtkMult || 1;
  var myDefMult = mod.myDefMult || 1;
  if (mod.favorType) {
    var bonus = 1 + futDraftModifierTypeFraction(lineup, mod.favorType) * 0.5;
    myAtkMult *= bonus;
    myDefMult *= bonus;
  }
  return { bothMult: bothMult, myAtkMult: myAtkMult, myDefMult: myDefMult };
}

function futDraftSimulateMatchCore(oppPower) {
  var f = G.futdraft;
  var formation = FUTDRAFT_FORMATIONS.find(function (ft) { return ft.id === f.formation; });
  var score = futDraftTeamScore(f.lineup, f.captainId);
  var modifier = futDraftRollMatchModifier(f.condition);
  var mods = futDraftModifierMultipliers(modifier, f.lineup);
  var myAtk = score * formation.atk * mods.bothMult * mods.myAtkMult;
  var myDef = score * formation.def * mods.bothMult * mods.myDefMult;
  var effectiveOppPower = oppPower * mods.bothMult;
  var myGoals = futDraftRandomGoals(futDraftExpectedGoals(myAtk, effectiveOppPower));
  var oppGoals = futDraftRandomGoals(futDraftExpectedGoals(effectiveOppPower, myDef));
  var myPlayers = f.lineup.map(function (s) { return s.player; });
  var oppPlayers = futDraftUndraftedPool();
  var timeline = futDraftBuildTimeline(myGoals, oppGoals, myPlayers, oppPlayers);
  return { myGoals: myGoals, oppGoals: oppGoals, modifier: modifier, timeline: timeline, myAtk: myAtk, myDef: myDef, effectiveOppPower: effectiveOppPower };
}

window.playFutDraftMatch = function () {
  var f = G.futdraft;
  var round = f.tournament.rounds[f.tournament.rounds.length - 1];
  var match = round.filter(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; })[0];
  var oppSide = match.a.isPlayer ? match.b : match.a;
  var sim = futDraftSimulateMatchCore(teamPower(oppSide));

  f.live = {
    match: match, oppSide: oppSide, modifier: sim.modifier,
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
  var modifier = live.modifier;
  f.live = null;
  futDraftRecordGoalEvents(f.stats, timeline.filter(function (e) { return e.side === 'me'; }), 'Tu equipo');
  futDraftRecordGoalEvents(f.stats, timeline.filter(function (e) { return e.side === 'opp'; }), oppSide.name);
  if (myGoals === oppGoals) {
    f.pendingMatch = match;
    f.pendingOppSide = oppSide;
    f.pendingRegularResult = { myGoals: myGoals, oppGoals: oppGoals, oppPower: oppPower, timeline: timeline, modifier: modifier };
    startFutDraftPenaltyShootout(oppSide);
    return;
  }
  var playerWon = myGoals > oppGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);
  if (playerWon) f.winsCount++;
  f.lastMatchResult = { oppName: oppSide.name, oppShield: teamShieldPath(oppSide.name), oppPower: oppPower, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, timeline: timeline, modifier: modifier };
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
  var isOpp = ev.side !== 'me';
  var shieldSrc = isOpp ? teamShieldPath(oppName) : getPlayerShieldPath();
  var text = '<strong>' + escapeHtml(ev.scorer.nombre) + '</strong>' +
    (ev.assist ? ' <span class="dim">(asist. ' + escapeHtml(ev.assist.nombre) + ')</span>' : ' <span class="dim">(gol en solitario)</span>');
  if (isOpp) text += ' <span class="dim">· ' + escapeHtml(oppName) + '</span>';
  // Los goles del rival se pintan en espejo (pegados a la derecha de la
  // fila) para distinguirlos de un vistazo de los tuyos, que se quedan
  // pegados a la izquierda como siempre -- a petición explícita.
  var rowClass = 'futdraft-timeline-row' + (isOpp ? ' futdraft-timeline-row-opp' : '');
  return '<div class="' + rowClass + '"><span class="futdraft-timeline-minute">' + ev.minute + '\'</span><img class="futdraft-timeline-shield" src="' + escapeHtml(shieldSrc) + '" alt="">' + avatarHtml(ev.scorer) + '<span>' + text + '</span></div>';
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
        '<div class="score-side"><img class="team-shield" src="' + getPlayerShieldPath() + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + live.myGoals + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(teamShieldPath(oppName)) + '" alt=""><div class="score-name">' + escapeHtml(oppName) + '</div><div class="score-num">' + live.oppGoals + '</div></div>' +
      '</div>' +
      '<div class="turn-indicator">' + (live.inExtraTime ? 'Prórroga — minuto ' + live.minute + '\' de 120\'' : 'Minuto ' + live.minute + '\' de 90\'') + '</div>' +
      (live.inExtraTime && live.minute <= 91 ? '<p class="dim small center-text">Empate al término del tiempo reglamentario: se juega la prórroga.</p>' : '') +
      (live.modifier && live.modifier !== 'ninguno' ? '<p class="dim small center-text">🌦️ ' + FUTDRAFT_MODIFIERS_BY_ID[live.modifier].name + ': ' + FUTDRAFT_MODIFIERS_BY_ID[live.modifier].desc + '</p>' : '') +
      '<div class="panel">' +
        '<div class="futdraft-timeline">' + (logHtml || '<p class="dim small center-text">Aún no ha pasado nada…</p>') + '</div>' +
      '</div>' +
      '<button class="btn btn-outline btn-block" onclick="futDraftSkipLive()">Saltar simulación</button>' +
    '</div>'
  );
}

// Tanda de penaltis de FutDraft: a diferencia del Modo Penaltis
// independiente (que se sigue jugando a mano, zona a zona), aquí se
// SIMULA entera de golpe -- a petición explícita, para no interrumpir el
// ritmo de un torneo/temporada con una tanda manual cada vez que hay
// empate -- pero se REVELA lanzamiento a lanzamiento, rápido (ver
// futDraftPenaltyTick), igual que el minuto a minuto de un partido
// normal, en vez de aparecer el resultado final de golpe. La probabilidad
// de acierto de cada lanzamiento sale de comparar la puntuación de tu
// equipo (futDraftTeamScore) con la fuerza del rival (teamPower): con
// equipos parejos ronda el 72% típico de un penalti real, y se desplaza
// unos puntos a tu favor o en tu contra según quién sea mejor.
function futDraftPenaltyShotChance(favor) {
  return clamp(0.72 + favor / 250, 0.45, 0.92);
}

// Quién tira cada lanzamiento: de tu once real para tu equipo, del pool
// de no drafteados (mismo "plantel fantasma" que ya usan los goles del
// rival en el partido normal, ver futDraftUndraftedPool) para el rival.
// Reutiliza futDraftGoalEvent (mismo peso por posición que un gol de
// verdad, sin asistencia porque un penalti no la tiene) tanto si se
// marca como si se falla, para poder decir siempre quién tiró.
function simulateFutDraftPenaltyShootout(oppSide) {
  var f = G.futdraft;
  var myScore = futDraftTeamScore(f.lineup, f.captainId);
  var oppPower = teamPower(oppSide);
  var diff = myScore - oppPower;
  var myChance = futDraftPenaltyShotChance(diff);
  var rivalChance = futDraftPenaltyShotChance(-diff);
  var myPlayers = f.lineup.map(function (s) { return s.player; });
  var oppPlayers = futDraftUndraftedPool();
  var attempts = [];
  var playerGoals = 0, rivalGoals = 0;
  var round = 1;
  while (true) {
    var myScored = Math.random() < myChance;
    if (myScored) playerGoals++;
    attempts.push({ side: 'me', round: round, player: futDraftGoalEvent(myPlayers).scorer, scored: myScored });
    var rivalScored = Math.random() < rivalChance;
    if (rivalScored) rivalGoals++;
    attempts.push({ side: 'opp', round: round, player: futDraftGoalEvent(oppPlayers).scorer, scored: rivalScored });
    if (round >= PENALTY_MODE_ROUNDS && playerGoals !== rivalGoals) break;
    round++;
  }
  return { playerGoals: playerGoals, rivalGoals: rivalGoals, attempts: attempts };
}

// Con su propio estado (G.futdraft.penalty) para no interferir con el
// Modo Penaltis independiente, y que al acabar retoma el bracket de
// FutDraft en vez de terminar la tanda. Todo el resultado se calcula de
// golpe (simulateFutDraftPenaltyShootout) pero se revela lanzamiento a
// lanzamiento (futDraftPenaltyTick), no de golpe.
function startFutDraftPenaltyShootout(oppSide) {
  var sim = simulateFutDraftPenaltyShootout(oppSide);
  G.futdraft.penalty = {
    playerGoals: 0, rivalGoals: 0,
    pending: sim.attempts, revealed: [],
    oppName: oppSide.name, oppShield: teamShieldPath(oppSide.name),
    done: false
  };
  G.screen = 'futdraftPenalty';
  render();
  futDraftPenaltyTick();
}

// Revela un lanzamiento cada 450ms (más rápido que el minuto a minuto de
// un partido normal, a petición explícita, porque aquí no hay "minutos"
// de por medio que rellenar). Se para sola si se navega a otra pantalla,
// igual que futDraftLiveTick.
function futDraftPenaltyTick() {
  var p = G.futdraft && G.futdraft.penalty;
  if (G.screen !== 'futdraftPenalty' || !p || p.done) return;
  var ev = p.pending.shift();
  if (ev.scored) { if (ev.side === 'me') p.playerGoals++; else p.rivalGoals++; }
  p.revealed.push(ev);
  if (!p.pending.length) p.done = true;
  render();
  if (!p.done) setTimeout(futDraftPenaltyTick, 450);
}

window.futDraftSkipPenalty = function () {
  var p = G.futdraft.penalty;
  if (!p || p.done) return;
  p.pending.forEach(function (ev) {
    if (ev.scored) { if (ev.side === 'me') p.playerGoals++; else p.rivalGoals++; }
    p.revealed.push(ev);
  });
  p.pending = [];
  p.done = true;
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
    timeline: regular.timeline, modifier: regular.modifier,
    penalty: { myGoals: p.playerGoals, oppGoals: p.rivalGoals }
  };
  f.penalty = null; f.pendingMatch = null; f.pendingOppSide = null; f.pendingRegularResult = null;
  G.screen = 'futdraftMatchResult';
  render();
}

// Fila de un lanzamiento revelado: mismo formato que una fila de gol del
// partido normal (futDraftTimelineRowHtml) -- escudo, avatar, nombre, y
// en espejo a la derecha si es del rival -- pero con la ronda en vez del
// minuto, y sin asistencia (un penalti no la tiene). Deliberadamente NO
// se llama a futDraftRecordGoalEvents con estos lanzamientos en ningún
// sitio: los goles de penaltis no cuentan para la tabla de goleadores del
// torneo, a petición explícita.
function futDraftPenaltyRowHtml(ev, oppShield) {
  var isOpp = ev.side === 'opp';
  var shieldSrc = isOpp ? oppShield : getPlayerShieldPath();
  var text = (ev.scored ? '⚽ ' : '🧤 ') + '<strong>' + escapeHtml(ev.player.nombre) + '</strong>' + (ev.scored ? ' ¡gol!' : ' — parada.');
  var rowClass = 'futdraft-timeline-row' + (isOpp ? ' futdraft-timeline-row-opp' : '');
  return '<div class="' + rowClass + '"><span class="futdraft-timeline-minute">R' + ev.round + '</span><img class="futdraft-timeline-shield" src="' + escapeHtml(shieldSrc) + '" alt="">' + avatarHtml(ev.player) + '<span>' + text + '</span></div>';
}

function renderFutDraftPenalty() {
  var p = G.futdraft.penalty;
  if (!p) return '';
  var logHtml = p.revealed.slice().reverse().map(function (ev) {
    return futDraftPenaltyRowHtml(ev, p.oppShield);
  }).join('');
  var playerWon = p.done && p.playerGoals > p.rivalGoals;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mt mb0">Penaltis</h2>' +
        '<p class="dim small">Empate en el tiempo reglamentario contra ' + escapeHtml(p.oppName) + '. Tanda simulada a ' + PENALTY_MODE_ROUNDS + ', con muerte súbita si hay empate.</p>' +
      '</div>' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + getPlayerShieldPath() + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + p.playerGoals + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(p.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(p.oppName) + '</div><div class="score-num">' + p.rivalGoals + '</div></div>' +
      '</div>' +
      '<div class="panel"><div class="futdraft-timeline">' + (logHtml || '<p class="dim small center-text">Empieza la tanda…</p>') + '</div></div>' +
      (p.done
        ? '<div class="panel center-text"><h3 style="margin-bottom:4px">' + (playerWon ? '🏆 ¡Ganas la tanda!' : '💔 Pierdes la tanda.') + '</h3>' +
          '<button class="btn btn-primary btn-block mt" onclick="finishFutDraftPenaltyShootout()">Continuar</button></div>'
        : '<button class="btn btn-outline btn-block" onclick="futDraftSkipPenalty()">Saltar</button>') +
    '</div>'
  );
}

