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
  function drawFrom(pool) {
    for (var i = 0; i < pool.length; i++) {
      var key = normalizeTeamKey(pool[i]);
      if (!usedTeamNames[key]) { usedTeamNames[key] = true; return pool[i]; }
    }
    return null;
  }
  // Mazo propio (jefes o normales) primero; si ya está agotado (torneos
  // grandes, 64 equipos) se prueba el otro mazo antes de repetir de
  // verdad -- entre los dos suman 69 nombres únicos, de sobra para
  // cualquier FUTDRAFT_BRACKET_SIZES sin que se repita ningún equipo.
  function drawUniqueTeamName(pool, otherPool) {
    return drawFrom(pool) || drawFrom(otherPool) || pool[rand(0, pool.length - 1)];
  }
  var rivals = tiers.map(function (tier) {
    var pool = tier === 'jefe' ? bossPool : normalPool;
    var otherPool = tier === 'jefe' ? normalPool : bossPool;
    return { isPlayer: false, name: drawUniqueTeamName(pool, otherPool), tier: tier };
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
  if (fromEnd === 5) return 'Treintaidosavos de Final';
  return 'Ronda ' + (idx + 1);
}

function bracketShieldHtml(side) {
  var path = side.isPlayer ? getPlayerShieldPath() : teamShieldPath(side.name);
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

