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
  // Modo Carrera puede fijar f.oppGhostPool (careerTeamGhostPool) para
  // que el rival de Liga anote siempre con su MISMA plantilla fantasma
  // durante toda la temporada, en vez de un sorteo distinto entre todo
  // el roster cada vez -- así ese rival puede tener un máximo goleador
  // propio de verdad que le haga competencia al tuyo.
  if (f && f.oppGhostPool) return f.oppGhostPool;
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
  // Modo Carrera pasa su propia puntuación (con la progresión de los jugadores)
  // en teamScoreOverride; el resto de modos usan las stats del roster de siempre.
  var score = typeof f.teamScoreOverride === 'number' ? f.teamScoreOverride : futDraftTeamScore(f.lineup, f.captainId);
  var modifier = futDraftRollMatchModifier(f.condition);
  var mods = futDraftModifierMultipliers(modifier, f.lineup);
  // f.styleAtkMult/f.styleDefMult: solo Modo Carrera los pone (estilo de
  // juego de Gestionar plantilla, ver careerPlayStyleModifiers) --
  // undefined en cualquier otro modo, así que por defecto no cambian nada.
  var styleAtkMult = typeof f.styleAtkMult === 'number' ? f.styleAtkMult : 1;
  var styleDefMult = typeof f.styleDefMult === 'number' ? f.styleDefMult : 1;
  var myAtk = score * formation.atk * mods.bothMult * mods.myAtkMult * styleAtkMult;
  var myDef = score * formation.def * mods.bothMult * mods.myDefMult * styleDefMult;
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
  if (typeof playKickoffSound === 'function') playKickoffSound();
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
// Simulación visual de posesión/pases para el modo "Jugar" (puntitos):
// un paseo aleatorio entre las 4 líneas de un equipo (0=portero...
// 3=delantera) que a veces pierde el balón hacia el otro equipo -- solo
// estético (no cambia el resultado, que ya sale de futDraftBuildTimeline),
// pero da tiempo a ver "pases" antes del siguiente gol, a petición
// explícita ("el partido tiene que ir más lento, para que dé tiempo a
// verse pases y ocasiones").
var FUTDRAFT_LINE_POS = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
// Jugador "dueño" del balón ahora mismo -- de tu once real si es tu
// posesión, o un nombre genérico del rival (no hay plantilla rival real
// fuera de World Tour) si es la suya. Usado para las tarjetas/lesiones.
function futDraftBallCarrierPlayer(live, poss) {
  if (poss.side !== 'me') return { nombre: 'Un jugador del ' + (live.oppSide ? live.oppSide.name : 'rival') };
  var lineup = (G.career && live.isCareer) ? G.career.lineup : G.futdraft.lineup;
  if (!lineup) return null;
  var pos = FUTDRAFT_LINE_POS[poss.line];
  var candidates = lineup.filter(function (s) { return s.pos === pos; });
  var pick = (candidates.length ? candidates : lineup)[Math.floor(Math.random() * (candidates.length ? candidates.length : lineup.length))];
  return pick ? pick.player : null;
}
function futDraftAdvancePossession(live) {
  if (!live.poss) live.poss = { side: 'me', line: 1 };
  var p = live.poss;
  // Sincronía de verdad entre quién tiene el balón y quién marca -- a
  // petición explícita ("a veces tiene el balón el rival y de repente
  // pone que hay gol mío"): si el próximo gol pendiente está a 2 minutos
  // o menos, la posesión pasa a ser DE VERDAD de ese equipo (no solo más
  // probable), así el gol siempre llega con el balón ya en su sitio. Más
  // lejos (hasta 6 minutos) solo se inclina la probabilidad, para que la
  // racha de presión se note venir.
  var nextGoal = live.pending[0];
  var minutesToGoal = nextGoal ? nextGoal.minute - live.minute : 99;
  // Justo antes del gol, el balón pasa al DELANTERO del equipo que va a
  // marcar (línea 3), no solo al centro del campo -- a petición explícita
  // ("cuando vaya a haber un gol... que tengan más probabilidades de
  // tener el balón los delanteros"). Ventana un poco más amplia (3
  // minutos) para que dé tiempo a verse la jugada de ataque antes del gol
  // en vez de un salto brusco de última hora.
  var inGoalWindow = nextGoal && minutesToGoal <= 3;
  if (inGoalWindow && (p.side !== nextGoal.side || p.line < 3)) { p.side = nextGoal.side; p.line = 3; }
  // Cuanto más cerca esté el gol, más se nota la presión: la probabilidad
  // de seguir avanzando hacia esa portería crece de forma gradual (en vez
  // de un empujón fijo a partir de los 6 minutos) -- a petición explícita
  // ("haz que los pases y movimientos parezcan más un partido real").
  var pressure = nextGoal ? clamp(1 - minutesToGoal / 8, 0, 1) : 0;
  var biasSide = pressure > 0 ? nextGoal.side : null;
  var attacking = p.side === biasSide;
  var towardsGoal = Math.random() < (attacking ? (0.65 + pressure * 0.25) : 0.6);
  if (towardsGoal) p.line = clamp(p.line + (Math.random() < 0.5 ? -1 : 1), 0, 3);
  // Al perder el balón, pasa a la defensa (línea 1), nunca directo al
  // portero contrario -- a petición explícita ("el balón no puede ir de
  // portero a portero rival"): con línea 0 en las dos posesiones
  // seguidas (justo antes de perderlo y justo al ganarlo) el balón
  // saltaba de una portería a la otra de golpe en el mismo tick.
  // Dentro de la ventana del gol casi no se pierde el balón -- que la
  // jugada de ataque llegue a puerta en vez de cortarse a medias.
  var turnoverChance = inGoalWindow ? 0.02 : (p.line === 3 ? (attacking ? 0.06 : 0.22) : 0.09);
  if (Math.random() < turnoverChance) { p.side = p.side === 'me' ? 'opp' : 'me'; p.line = 1; }

  // Posesión real (a petición explícita, "mete posesión"): un tanto por
  // cada tick para el equipo que tiene el balón ahora mismo.
  if (!live.poss_ticks) live.poss_ticks = { me: 0, opp: 0 };
  live.poss_ticks[p.side]++;

  // Tarjetas y lesiones durante el partido (a petición explícita, "más
  // tarjetas, lesiones"): sucesos cosméticos poco frecuentes, con el
  // jugador que tiene el balón como protagonista (tiene sentido: quien
  // más toca el balón es quien más entradas recibe o sufre). Se guardan
  // en live.cards para enseñarlos en el resumen de debajo del marcador.
  if (!live.cards) live.cards = [];
  var scoreboardPlayer = futDraftBallCarrierPlayer(live, p);
  if (scoreboardPlayer && Math.random() < 0.012) {
    var isRed = Math.random() < 0.15;
    live.cards.push({ side: p.side, minute: Math.round(live.minute), type: isRed ? 'red' : 'yellow', name: scoreboardPlayer.nombre });
  } else if (scoreboardPlayer && Math.random() < 0.006) {
    live.cards.push({ side: p.side, minute: Math.round(live.minute), type: 'injury', name: scoreboardPlayer.nombre });
  }
}
function futDraftApplyGoalEvent(live, ev, isDots) {
  if (ev.side === 'me') live.myGoals++; else live.oppGoals++;
  live.revealed.push(ev);
  live.lastGoalSide = ev.side;
  live.goalFlashUntil = Date.now() + 1600;
  if (isDots) {
    live.poss = { side: ev.side, line: 3 };
    // El balón "entra" en la portería justo cuando se marca el gol, en
    // vez de quedarse a medio camino en la línea de delanteros -- a
    // petición explícita ("que coincida el gol con justo cuando tira
    // alguien a puerta").
    live.goalBall = { x: ev.side === 'me' ? 95 : 5, y: 50, until: Date.now() + 1400 };
    // Pausa de celebración: unos segundos sin avanzar el marcador antes
    // de seguir, para que dé tiempo a verlo -- también evita que, con
    // varios goles muy seguidos, uno se coma la celebración del otro
    // (antes se procesaban todos los pendientes del mismo tick de golpe
    // y solo se veía el último), a petición explícita.
    live.celebrateUntil = Date.now() + 1500;
  }
  if (typeof playGoalSound === 'function') playGoalSound();
}
function futDraftLiveTick() {
  if (G.screen !== 'futdraftLive' || !G.futdraft || !G.futdraft.live || G.futdraft.live.done) return;
  var live = G.futdraft.live;
  var isDots = live.visualMode === 'dots';
  var cap = live.inExtraTime ? 120 : 90;
  if (isDots && live.celebrateUntil && Date.now() < live.celebrateUntil) {
    futDraftLiveRefresh(live);
    setTimeout(futDraftLiveTick, 250);
    return;
  }
  live.minute = Math.min(cap, live.minute + (isDots ? rand(1, 2.4) : rand(3, 7)));
  if (isDots) futDraftAdvancePossession(live);
  if (isDots) {
    // Como mucho UN gol por tick, para que cada uno tenga su propia
    // celebración -- si hay más pendientes en el mismo minuto, se
    // revelan uno a uno en los siguientes ticks (la pausa de celebración
    // de arriba ya se encarga de espaciarlos).
    if (live.pending.length && live.pending[0].minute <= live.minute) {
      futDraftApplyGoalEvent(live, live.pending.shift(), true);
    }
  } else {
    while (live.pending.length && live.pending[0].minute <= live.minute) {
      futDraftApplyGoalEvent(live, live.pending.shift(), false);
    }
  }
  futDraftLiveRefresh(live);
  // En puntitos, no se da por acabado mientras queden goles sin revelar
  // (procesados de uno en uno) aunque ya se haya llegado al 90' -- para
  // no dejarse celebraciones sin mostrar.
  if (isDots && live.pending.length) { setTimeout(futDraftLiveTick, 420); return; }
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
    // Posesión y tarjetas/lesiones para el resumen de la pantalla de
    // resultado (renderFutDraftMatchResult) -- guardado aparte en vez de
    // en cada lastMatchResult (que se construye en 6 sitios distintos
    // según el modo) para no tener que tocarlos todos uno a uno.
    G.futdraft.lastLiveStats = isDots ? { cards: live.cards || [], poss_ticks: live.poss_ticks || { me: 0, opp: 0 } } : null;
    setTimeout(live.onFinish, 500);
  } else {
    setTimeout(futDraftLiveTick, isDots ? 420 : 150);
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
  G.futdraft.lastLiveStats = live.visualMode === 'dots' ? { cards: live.cards || [], poss_ticks: live.poss_ticks || { me: 0, opp: 0 } } : null;
  live.onFinish();
};

// Fila de la línea temporal para un gol: el nombre real de quien marca
// (tuyo o del pool fantasma del rival) y su asistencia si la hubo. En los
// goles rivales se añade el nombre del equipo entre paréntesis, porque el
// nombre del jugador fantasma no dice por sí solo para quién "juega".
function futDraftTimelineRowHtml(ev, oppName, youShield) {
  var isOpp = ev.side !== 'me';
  var shieldSrc = isOpp ? teamShieldPath(oppName) : (youShield || getPlayerShieldPath());
  var text = '<strong>' + escapeHtml(ev.scorer.nombre) + '</strong>' +
    (ev.assist ? ' <span class="dim">(asist. ' + escapeHtml(ev.assist.nombre) + ')</span>' : ' <span class="dim">(gol en solitario)</span>');
  if (isOpp) text += ' <span class="dim">· ' + escapeHtml(oppName) + '</span>';
  // Los goles del rival se pintan en espejo (pegados a la derecha de la
  // fila) para distinguirlos de un vistazo de los tuyos, que se quedan
  // pegados a la izquierda como siempre -- a petición explícita.
  var rowClass = 'futdraft-timeline-row' + (isOpp ? ' futdraft-timeline-row-opp' : '');
  return '<div class="' + rowClass + '"><span class="futdraft-timeline-minute">' + ev.minute + '\'</span><img class="futdraft-timeline-shield" src="' + escapeHtml(shieldSrc) + '" alt="">' + avatarHtml(ev.scorer) + '<span>' + text + '</span></div>';
}

// Texto del indicador de minuto y filas del resumen, compartidos entre el
// pintado completo y la actualización en sitio (futDraftLiveRefresh).
function futDraftLiveIndicatorText(live) {
  return live.inExtraTime ? 'Prórroga — minuto ' + live.minute + '\' de 120\'' : 'Minuto ' + live.minute + '\' de 90\'';
}
function futDraftLiveLogHtml(live) {
  var oppName = live.oppSide.name;
  return live.revealed.slice().reverse().map(function (ev) {
    return futDraftTimelineRowHtml(ev, oppName);
  }).join('');
}
// Cada tick del partido en vivo (cada ~150 ms) antes repintaba TODA la
// pantalla con render(), y al recrear todos los escudos y avatares se veía
// un parpadeo constante ("que no parpadee al simular partido"). Ahora solo
// se cambian in situ el marcador, el minuto y la lista de goles; render()
// completo solo si cambia la estructura (empieza la prórroga) o si la
// pantalla aún no está pintada.
// Mini campo con puntitos numerados por su posición en el once (no hay
// dorsal real en los datos, así que se numeran 1-11 por equipo en el
// orden de la formación) más un balón que se desplaza hacia la portería
// que acaba de recibir el gol -- a petición explícita ("no quiero que
// enseñes los personajes, quiero que enseñes puntitos con los dorsales...
// y también el balón"). Solo para live.visualMode === 'dots'.
// Un color sólido por EQUIPO (no por posición): a petición explícita
// ("que haya un equipo de un color los 11 puntos y el otro de otro
// color"), para distinguir de un vistazo quién es quién sin tener que
// fijarse en el número.
var PITCH_DOT_TEAM_COLORS = { me: ['#4ecdc4', '#1f8f86'], opp: ['#ff6b7a', '#c92c48'] };
function pitchDotHtml(d, side) {
  var pal = PITCH_DOT_TEAM_COLORS[side];
  var posStyle = 'left:' + d.x.toFixed(1) + '%;top:' + d.y.toFixed(1) + '%';
  // Tu equipo se ve con la cara real del jugador (avatarHtml, con sus
  // iniciales de respaldo si no tiene sprite, igual que en el resto de
  // pantallas) -- a petición explícita. El rival no tiene jugadores
  // individuales asignados (solo cuenta por línea), así que se queda
  // como puntito de color liso.
  if (side === 'me' && d.player) {
    return '<div class="pitch-dot pitch-dot-face pitch-dot-' + side + (d.active ? ' pitch-dot-active' : '') + '" data-dot="' + side + d.num + '" style="' + posStyle + '">' + avatarHtml(d.player) + '</div>';
  }
  var style = posStyle + ';background:radial-gradient(circle at 35% 28%,' + pal[0] + ',' + pal[1] + ')';
  return '<div class="pitch-dot pitch-dot-' + side + (d.active ? ' pitch-dot-active' : '') + '" data-dot="' + side + d.num + '" style="' + style + '"><span>' + d.num + '</span></div>';
}
// Columna (posición horizontal, 0-100%) de cada línea -- "me" defiende la
// portería izquierda y ataca hacia la derecha, "opp" al revés, como en la
// vista de partido de referencia (campo horizontal con las dos plantillas
// desplegadas de punta a punta). lineIdx: 0=portero,1=defensa,
// 2=centrocampista,3=delantero.
var WT_LINE_X_ME = [7, 25, 44, 66];
var WT_LINE_X_OPP = [93, 75, 56, 34];

// Estado persistente de los puntitos: se calcula UNA vez al empezar el
// partido (futDraftBuildDotsState) y luego solo se les da un empujoncito
// pequeño y correlacionado en cada tick (futDraftNudgeDotsState), nunca
// se recolocan desde cero -- antes se recalculaba tod0 al azar en cada
// refresco (cada ~400ms), lo que además de no tener ninguna relación
// entre un fotograma y el siguiente, obligaba a repintar toda la pantalla
// de golpe y se veía como un parpadeo constante, a petición explícita
// ("que haya correlación entre las jugadas, y que no haya parpadeos").
function futDraftLineSlots(count) {
  var ys = [];
  for (var i = 0; i < count; i++) {
    var base = count === 1 ? 50 : 12 + (i * (76 / (count - 1)));
    ys.push(clamp(base + rand(-5, 5), 5, 95));
  }
  return ys;
}
function futDraftBuildDotsState(live) {
  var lineup = (G.career && live.isCareer) ? G.career.lineup : G.futdraft.lineup;
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === (G.career && live.isCareer ? G.career.formation : G.futdraft.formation); });
  var order = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
  // Dorsales con sentido: 1 para el portero, luego defensas,
  // centrocampistas y delanteros -- a petición explícita ("mi portero no
  // puede ser el dorsal 12").
  var meDots = [], oppDots = [], num = 1;
  order.forEach(function (pos, lineIdx) {
    var slots = lineup.filter(function (s) { return s.pos === pos; });
    var ys = futDraftLineSlots(slots.length);
    slots.forEach(function (s, i) {
      meDots.push({ x: clamp(WT_LINE_X_ME[lineIdx] + rand(-4, 4), 3, 50), y: ys[i], num: num++, line: lineIdx, player: s.player });
    });
  });
  var oppNum = 1;
  order.forEach(function (pos, lineIdx) {
    var row = formation.rows.find(function (r) { return r.pos === pos; });
    var count = row ? row.count : 0;
    var ys = futDraftLineSlots(count);
    for (var i = 0; i < count; i++) {
      oppDots.push({ x: clamp(WT_LINE_X_OPP[lineIdx] + rand(-4, 4), 50, 97), y: ys[i], num: oppNum++, line: lineIdx });
    }
  });
  return { me: meDots, opp: oppDots };
}
// Empujoncito pequeño (±1.5% por tick) hacia la columna de su línea, con
// algo de deriva vertical -- movimiento continuo y suave en vez de saltos.
// Portería fija: el portero (línea 0) se queda pegado a su portería,
// solo se desliza un poco en vertical para tapar palos -- a petición
// explícita ("el portero no puede moverse de la portería, aunque el
// resto de jugadores sí se muevan"). El resto de líneas sigue con
// bastante recorrido (±5% por empujón).
var WT_KEEPER_X = { me: 4, opp: 96 };
// Forma de equipo según quién tiene el balón, a petición explícita ("haz
// que los pases y movimientos parezcan más un partido real"): antes cada
// puntito se movía con un empujón aleatorio independiente del resto, sin
// relación con la jugada -- ahora, mientras un equipo tiene el balón, sus
// líneas se adelantan en bloque hacia la portería rival (como un ataque de
// verdad), y el equipo sin balón se repliega hacia la suya (bloque
// defensivo); el temblor aleatorio de cada uno baja para que se note el
// movimiento de conjunto en vez de puro ruido.
var WT_SHAPE_SHIFT_ATTACK = 7;
var WT_SHAPE_SHIFT_DEFEND = -4;
function futDraftNudgeDotsState(state, poss) {
  ['me', 'opp'].forEach(function (side) {
    var colX = side === 'me' ? WT_LINE_X_ME : WT_LINE_X_OPP;
    var attackDir = side === 'me' ? 1 : -1;
    var hasBall = poss && poss.side === side;
    var shapeShift = (hasBall ? WT_SHAPE_SHIFT_ATTACK : WT_SHAPE_SHIFT_DEFEND) * attackDir;
    state[side].forEach(function (d) {
      if (d.line === 0) {
        // Portero: prácticamente clavado en la línea de gol, solo un
        // pequeño vaivén vertical dentro del área pequeña.
        d.x = clamp(d.x + (WT_KEEPER_X[side] - d.x) * 0.4, 2, 98);
        d.y = clamp(d.y + rand(-8, 8) / 10, 38, 62);
        return;
      }
      var targetX = clamp(colX[d.line] + shapeShift, 2, 98);
      d.x = clamp(d.x + (targetX - d.x) * 0.16 + rand(-50, 50) / 10, 3, 97);
      d.y = clamp(d.y + rand(-60, 60) / 10, 5, 95);
    });
  });
}
// Resumen debajo del campo: posesión (real, según qué equipo ha tenido
// el balón más ticks) y tarjetas/lesiones ocurridas -- a petición
// explícita ("haz que en el resumen de partido abajo, haya tarjetas, y
// posesión, mete eso").
function futDraftMatchStatsHtml(live) {
  if (!live) return '';
  var t = live.poss_ticks || { me: 0, opp: 0 };
  var total = t.me + t.opp;
  var myPct = total ? Math.round((t.me / total) * 100) : 50;
  var cardsHtml = (live.cards || []).slice().reverse().map(function (c) {
    var icon = c.type === 'red' ? '🟥' : c.type === 'yellow' ? '🟨' : '🩹';
    var label = c.type === 'red' ? 'roja' : c.type === 'yellow' ? 'amarilla' : 'se resiente';
    return '<div class="futdraft-timeline-row' + (c.side === 'opp' ? ' futdraft-timeline-row-opp' : '') + '"><span class="futdraft-timeline-minute">' + c.minute + '\'</span><span>' + icon + ' ' + escapeHtml(c.name) + ' — ' + label + '</span></div>';
  }).join('');
  return '<div class="panel">' +
    '<h3 style="margin-bottom:8px">Posesión</h3>' +
    '<div class="poss-bar">' +
      '<div class="poss-bar-fill poss-bar-fill-me" style="width:' + myPct + '%">' + (myPct >= 14 ? myPct + '%' : '') + '</div>' +
      '<div class="poss-bar-fill poss-bar-fill-opp" style="width:' + (100 - myPct) + '%">' + (100 - myPct >= 14 ? (100 - myPct) + '%' : '') + '</div>' +
    '</div>' +
    (cardsHtml ? '<h3 style="margin:12px 0 6px">Incidencias</h3><div class="futdraft-timeline">' + cardsHtml + '</div>' : '') +
  '</div>';
}
// El balón se queda con el mismo portador mientras siga en la misma línea
// y equipo (en vez de saltar a otro puntito activo al azar en cada
// refresco), y solo "pasa" a otro cuando la posesión cambia de línea -- a
// petición explícita ("que los pases y movimientos parezcan más un
// partido real"): antes el balón temblaba entre compañeros sin venir de
// ningún sitio, ahora se nota que va de uno a otro solo cuando avanza.
function futDraftBallCarrierDot(live, poss, activeList) {
  if (!activeList.length) return null;
  if (live.ballCarrier && live.ballCarrier.side === poss.side && live.ballCarrier.line === poss.line) {
    var kept = activeList.find(function (d) { return d.num === live.ballCarrier.num; });
    if (kept) return kept;
  }
  var pick = activeList[Math.floor(Math.random() * activeList.length)];
  live.ballCarrier = { side: poss.side, line: poss.line, num: pick.num };
  return pick;
}
function futDraftPitchDotsHtml(live) {
  if (!live.dotsState) live.dotsState = futDraftBuildDotsState(live);
  var poss = live.poss || { side: live.lastGoalSide === 'opp' ? 'opp' : 'me', line: 1 };
  // Nombre y escudo de verdad en vez de "Tu equipo"/"Rival" fijos -- a
  // petición explícita ("pon Raimon si has elegido raimon... y pon el
  // del rival, si estoy jugando contra el occult, pon occult").
  var isCareerDots = live.isCareer && G.career;
  var isWorldTourDots = live.isWorldTour && G.worldTour;
  var oppName = live.oppSide.name;
  var youName = isCareerDots ? careerClubDisplayName(G.career) : isWorldTourDots ? G.worldTour.teamName : 'Tú';
  var youShield = isCareerDots ? careerClubShieldPath(G.career) : isWorldTourDots ? worldTourShieldPath() : getPlayerShieldPath();
  var oppShield = teamShieldPath(oppName);
  var meDots = live.dotsState.me, oppDots = live.dotsState.opp;
  meDots.forEach(function (d) { d.active = poss.side === 'me' && poss.line === d.line; });
  oppDots.forEach(function (d) { d.active = poss.side === 'opp' && poss.line === d.line; });

  // El balón sigue a un jugador activo al azar de la línea con posesión
  // (si hay varios, se elige uno cada refresco, dando sensación de pase
  // entre compañeros de la misma línea).
  var activeList = (poss.side === 'me' ? meDots : oppDots).filter(function (d) { return d.active; });
  var ballDot = futDraftBallCarrierDot(live, poss, activeList);
  var inGoal = live.goalBall && Date.now() < live.goalBall.until;
  var ballX = inGoal ? live.goalBall.x : (ballDot ? ballDot.x + (poss.side === 'me' ? 4 : -4) : 50);
  var ballY = inGoal ? live.goalBall.y : (ballDot ? ballDot.y : 50);
  live.dotsBall = { x: ballX, y: ballY };

  var dotsHtml = meDots.map(function (d) { return pitchDotHtml(d, 'me'); }).join('') + oppDots.map(function (d) { return pitchDotHtml(d, 'opp'); }).join('');
  // Solo se avisa en pantalla de los goles, no de cada tiro -- a
  // petición explícita ("que no salga tiro en pantalla, solo los goles").
  var flashHtml = (live.lastGoalSide && live.goalFlashUntil && Date.now() < live.goalFlashUntil) ? '<div class="pitch-goal-flash pitch-goal-flash-' + live.lastGoalSide + '">' + (live.lastGoalSide === 'me' ? '¡GOOOL! ⚽' : 'Gol rival ⚽') + '</div>' : '';
  return '<div class="pitch pitch-dots-field pitch-dots-field-h">' +
    '<div class="pitch-dots-field-stripes pitch-dots-field-stripes-h"></div>' +
    '<div class="pitch-crowd pitch-crowd-left"></div><div class="pitch-crowd pitch-crowd-right"></div>' +
    '<div class="pitch-goal pitch-goal-left"><div class="pitch-net"></div></div><div class="pitch-goal pitch-goal-right"><div class="pitch-net"></div></div>' +
    '<div class="pitch-side-label pitch-side-label-left"><img src="' + escapeHtml(youShield) + '" alt=""><span>' + escapeHtml(youName) + '</span></div>' +
    '<div class="pitch-side-label pitch-side-label-right"><span>' + escapeHtml(oppName) + '</span><img src="' + escapeHtml(oppShield) + '" alt=""></div>' +
    '<div class="pitch-center-line pitch-center-line-h"></div><div class="pitch-center-circle"></div><div class="pitch-center-dot"></div>' +
    dotsHtml +
    '<div class="pitch-ball" style="left:' + ballX.toFixed(1) + '%;top:' + ballY.toFixed(1) + '%"><span class="pitch-ball-shadow"></span>⚽</div>' +
    flashHtml +
  '</div>';
}
// Refresco in situ del campo de puntitos: mueve cada puntito y el balón
// tocando solo su left/top (la transición CSS del propio elemento hace
// el resto), sin volver a pintar nada -- antes se llamaba a render()
// completo en cada tick (~400ms), lo que además de parpadear impedía
// que la transición de posición se animara (un elemento nuevo no puede
// "venir desde" donde estaba el viejo). Solo cae a render() completo si
// la pantalla aún no existe o cambia el número de puntitos.
function futDraftDotsRefresh(live) {
  var field = document.querySelector('.pitch-dots-field');
  var state = live.dotsState;
  if (!field || !state) { render(); return; }
  var total = state.me.length + state.opp.length;
  if (field.querySelectorAll('.pitch-dot').length !== total) { render(); return; }
  var poss = live.poss || { side: 'me', line: 1 };
  futDraftNudgeDotsState(state, poss);
  state.me.forEach(function (d) { d.active = poss.side === 'me' && poss.line === d.line; });
  state.opp.forEach(function (d) { d.active = poss.side === 'opp' && poss.line === d.line; });
  function place(d, side) {
    var el = field.querySelector('[data-dot="' + side + d.num + '"]');
    if (!el) return;
    el.style.left = d.x.toFixed(1) + '%';
    el.style.top = d.y.toFixed(1) + '%';
    el.classList.toggle('pitch-dot-active', !!d.active);
  }
  state.me.forEach(function (d) { place(d, 'me'); });
  state.opp.forEach(function (d) { place(d, 'opp'); });
  var activeList = (poss.side === 'me' ? state.me : state.opp).filter(function (d) { return d.active; });
  var ballDot = futDraftBallCarrierDot(live, poss, activeList);
  var inGoal = live.goalBall && Date.now() < live.goalBall.until;
  var ball = field.querySelector('.pitch-ball');
  if (ball) {
    if (inGoal) {
      ball.style.left = live.goalBall.x.toFixed(1) + '%';
      ball.style.top = live.goalBall.y.toFixed(1) + '%';
    } else if (ballDot) {
      ball.style.left = (ballDot.x + (poss.side === 'me' ? 4 : -4)).toFixed(1) + '%';
      ball.style.top = ballDot.y.toFixed(1) + '%';
    }
  }
  var flashWanted = !!(live.lastGoalSide && live.goalFlashUntil && Date.now() < live.goalFlashUntil);
  var flashEl = field.querySelector('.pitch-goal-flash');
  if (flashWanted && !flashEl) { render(); return; }
  if (!flashWanted && flashEl) flashEl.remove();
  var indicator = document.querySelector('.turn-indicator');
  if (indicator) indicator.textContent = futDraftLiveIndicatorText(live);
  var nums = document.querySelectorAll('.score-num');
  if (nums.length >= 2) {
    var youAreHome = live.youAreHome !== false;
    nums[0].textContent = youAreHome ? live.myGoals : live.oppGoals;
    nums[1].textContent = youAreHome ? live.oppGoals : live.myGoals;
  }
}
function futDraftLiveRefresh(live) {
  if (live.visualMode === 'dots') { futDraftDotsRefresh(live); return; }
  var root = document.querySelector('.screen[data-live]');
  var nums = root ? root.querySelectorAll('.score-num') : [];
  var indicator = root ? root.querySelector('.turn-indicator') : null;
  var timeline = root ? root.querySelector('.futdraft-timeline') : null;
  var note = String(!!(live.inExtraTime && live.minute <= 91));
  if (!root || nums.length < 2 || !indicator || !timeline || root.getAttribute('data-extra') !== String(!!live.inExtraTime) || root.getAttribute('data-note') !== note) { render(); return; }
  var youAreHome = live.youAreHome !== false;
  nums[0].textContent = youAreHome ? live.myGoals : live.oppGoals;
  nums[1].textContent = youAreHome ? live.oppGoals : live.myGoals;
  indicator.textContent = futDraftLiveIndicatorText(live);
  if (timeline.getAttribute('data-count') !== String(live.revealed.length)) {
    timeline.innerHTML = futDraftLiveLogHtml(live) || '<p class="dim small center-text">Aún no ha pasado nada…</p>';
    timeline.setAttribute('data-count', String(live.revealed.length));
  }
}
function renderFutDraftLive() {
  var live = G.futdraft.live;
  var oppName = live.oppSide.name;
  var logHtml = futDraftLiveLogHtml(live);
  // En Modo Carrera, "tu" escudo/nombre son los que hayas elegido al
  // crear la partida (careerClubShieldPath/careerClubDisplayName), no el
  // escudo equipado en la web -- antes se usaba SIEMPRE getPlayerShieldPath()
  // aquí sin más, un bug real ("elijo un escudo... cuando le doy a
  // simular partido, me pone otro... el de la web, no el del modo
  // carrera"). Y el orden de los lados sigue si juegas en casa o fuera
  // (live.youAreHome, puesto por los 4 puentes de career-mode.js) --
  // antes siempre salías a la izquierda aunque fueras visitante ("mientras
  // se está simulando el partido siempre soy local"), otro bug real,
  // corregidos los dos a la vez.
  var isCareer = live.isCareer && G.career;
  var isWorldTour = live.isWorldTour && G.worldTour;
  var youShield = isCareer ? careerClubShieldPath(G.career) : isWorldTour ? worldTourShieldPath() : getPlayerShieldPath();
  var youName = isCareer ? careerClubDisplayName(G.career) : isWorldTour ? G.worldTour.teamName : 'Tú';
  var youAreHome = live.youAreHome !== false;
  var youSideHtml = '<div class="score-side"><img class="team-shield" src="' + escapeHtml(youShield) + '" alt=""><div class="score-name">' + escapeHtml(youName) + '</div><div class="score-num">' + live.myGoals + '</div></div>';
  var oppSideHtml = '<div class="score-side"><img class="team-shield" src="' + escapeHtml(teamShieldPath(oppName)) + '" alt=""><div class="score-name">' + escapeHtml(oppName) + '</div><div class="score-num">' + live.oppGoals + '</div></div>';
  return (
    '<div class="screen" data-live="1" data-extra="' + String(!!live.inExtraTime) + '" data-note="' + String(!!(live.inExtraTime && live.minute <= 91)) + '">' +
      '<div class="match-scoreboard">' +
        (youAreHome ? youSideHtml : oppSideHtml) +
        '<div class="score-vs">VS</div>' +
        (youAreHome ? oppSideHtml : youSideHtml) +
      '</div>' +
      '<div class="turn-indicator">' + futDraftLiveIndicatorText(live) + '</div>' +
      (live.inExtraTime && live.minute <= 91 ? '<p class="dim small center-text">Empate al término del tiempo reglamentario: se juega la prórroga.</p>' : '') +
      (live.modifier && live.modifier !== 'ninguno' ? '<p class="dim small center-text">🌦️ ' + FUTDRAFT_MODIFIERS_BY_ID[live.modifier].name + ': ' + FUTDRAFT_MODIFIERS_BY_ID[live.modifier].desc + '</p>' : '') +
      (live.visualMode === 'dots' ? '<div class="panel">' + futDraftPitchDotsHtml(live) + '</div>' + futDraftMatchStatsHtml(live) : '') +
      '<div class="panel">' +
        '<div class="futdraft-timeline" data-count="' + live.revealed.length + '">' + (logHtml || '<p class="dim small center-text">Aún no ha pasado nada…</p>') + '</div>' +
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
  futDraftPenaltyRefresh(p);
  if (!p.done) setTimeout(futDraftPenaltyTick, 450);
}
// Igual que futDraftLiveRefresh: solo se cambian marcador y lista de
// lanzamientos en sitio (antes render() completo en cada lanzamiento hacía
// parpadear escudos y avatares); repintado completo al terminar la tanda
// (aparece el botón Continuar) o si la pantalla aún no está pintada.
function futDraftPenaltyRefresh(p) {
  var root = document.querySelector('.screen[data-pen]');
  var nums = root ? root.querySelectorAll('.score-num') : [];
  var timeline = root ? root.querySelector('.futdraft-timeline') : null;
  if (!root || nums.length < 2 || !timeline || p.done || root.getAttribute('data-done') === 'true') { render(); return; }
  nums[0].textContent = p.playerGoals;
  nums[1].textContent = p.rivalGoals;
  timeline.innerHTML = p.revealed.slice().reverse().map(function (ev) { return futDraftPenaltyRowHtml(ev, p.oppShield); }).join('');
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
    '<div class="screen" data-pen="1" data-done="' + String(!!p.done) + '">' +
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

