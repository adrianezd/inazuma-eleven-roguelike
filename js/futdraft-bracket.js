function finishFutDraftRun() {
  var f = G.futdraft;
  var meta = G.meta;
  f.reward = FUTDRAFT_BASE_REWARD + FUTDRAFT_WIN_REWARD * f.winsCount;
  meta.points += f.reward;
  saveMeta(meta);
  // Tirada gratis en la Máquina de Premios solo si te proclamas campeón del
  // FutDraft (f.champion solo existe al completar la última ronda, ver
  // continueFutDraftMatch) -- quedar eliminado antes no cuenta como "ganar".
  if (f.champion && f.champion.isPlayer) {
    triggerRewardMachine('futdraftSummary');
    return;
  }
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

// Cuerpo de una columna de ronda: una única casilla centrada si ya se ha
// llegado a un cruce de 1 solo partido (semifinal de un lado, o la
// final), o parejas conectadas con una línea (mirror=true la dibuja
// apuntando hacia el centro, para el lado derecho) si todavía hay más de
// un partido en esa mitad.
function bracketColumnBodyHtml(matches, mirror) {
  if (matches.length === 1) return '<div class="bracket-final-wrap">' + bracketMatchHtml(matches[0]) + '</div>';
  var pairClass = 'bracket-pair' + (mirror ? ' bracket-pair-mirror' : '');
  var html = '<div class="bracket-pairs">';
  for (var i = 0; i < matches.length; i += 2) {
    html += '<div class="' + pairClass + '">' + bracketMatchHtml(matches[i]) + bracketMatchHtml(matches[i + 1]) + '</div>';
  }
  html += '</div>';
  return html;
}

// Cuadro a doble cara, a petición explícita: en vez de una fila de
// columnas (ronda 1, ronda 2... final) de izquierda a derecha, cada ronda
// (salvo la final) se reparte en dos mitades iguales -- la primera mitad
// del array a la izquierda, la segunda a la derecha -- y se van apilando
// hacia fuera desde el centro (ronda más temprana = columna más externa a
// cada lado), con la Final y el Campeón en la columna central. Funciona
// para cualquier tamaño de cuadro (8/16/32/64): en un cuadro de 32 la
// ronda inicial tiene 16 partidos (32 equipos), así que quedan 8 partidos
// (16 equipos) a cada lado; en uno de 64, 16 partidos (32 equipos) a cada
// lado. La partición es correcta en cualquier ronda posterior porque el
// emparejamiento de siguiente ronda siempre combina partidos consecutivos
// (ver continueFutDraftMatch/nextRound), así que "primera mitad del
// array" y "mitad izquierda del árbol" coinciden en todas las rondas.
function renderFutDraftBracket() {
  var t = G.futdraft.tournament;
  var totalRounds = Math.log2(t.size);
  var html = '<div class="screen"><div class="panel center-text"><h2 class="panel-title mb0">🏆 Torneo FutDraft</h2><p class="dim small">Tu once y ' + (t.size - 1) + ' rivales, eliminación directa.</p></div>';
  html += '<div class="panel bracket-panel"><div class="bracket-tree">';

  var leftCols = '', rightCols = '', finalMatch = null;
  t.rounds.forEach(function (round, ri) {
    var title = roundNameForIndex(ri, totalRounds);
    if (round.length === 1) { finalMatch = round[0]; return; }
    var half = round.length / 2;
    leftCols += '<div class="bracket-round-col"><div class="bracket-round-title">' + title + '</div>' +
      bracketColumnBodyHtml(round.slice(0, half), false) + '</div>';
    // El lado derecho se antepone (en vez de concatenar) para que, al
    // final, quede en orden inverso: la ronda más cercana al centro
    // primero, la más externa (ronda 1) en el borde derecho del todo.
    rightCols = '<div class="bracket-round-col"><div class="bracket-round-title">' + title + '</div>' +
      bracketColumnBodyHtml(round.slice(half), true) + '</div>' + rightCols;
  });

  var champion = finalMatch ? finalMatch.winner : null;
  var centerCol = '<div class="bracket-round-col bracket-final-col">' +
    (finalMatch ? '<div class="bracket-round-title">Final</div>' + bracketColumnBodyHtml([finalMatch], false) : '') +
    '<div class="bracket-round-title' + (finalMatch ? ' mt' : '') + '">Campeón</div>' +
    '<div class="bracket-trophy-wrap">' +
      '<div class="bracket-trophy' + (champion ? '' : ' is-pending') + '">🏆</div>' +
      '<div class="bracket-champion-name">' + (champion ? (champion.isPlayer ? 'Tú' : escapeHtml(champion.name)) : '?') + '</div>' +
    '</div></div>';

  html += leftCols + centerCol + rightCols;
  html += '</div></div>';
  var lastRound = t.rounds[t.rounds.length - 1];
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
  var weatherHtml = (r.modifier && r.modifier !== 'ninguno')
    ? '<p class="dim small">🌦️ ' + FUTDRAFT_MODIFIERS_BY_ID[r.modifier].name + ': ' + FUTDRAFT_MODIFIERS_BY_ID[r.modifier].desc + '</p>'
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
        '<div class="score-side"><img class="team-shield" src="' + getPlayerShieldPath() + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + r.myGoals + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(r.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(r.oppName) + '</div><div class="score-num">' + r.oppGoals + '</div></div>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:4px">' + resultLabel + '</h3>' +
        '<p class="dim small">Fuerza de ' + escapeHtml(r.oppName) + ': ' + r.oppPower + ' / 100</p>' +
        weatherHtml + penaltyHtml +
      '</div>' +
      timelineHtml +
      (r.isCareer
        ? (r.isChampions
            ? '<button class="btn btn-primary btn-block mt" onclick="continueCareerChampionsMatch()">Volver a la Champions</button>'
            : r.isCup
              ? '<button class="btn btn-primary btn-block mt" onclick="continueCareerCupMatch()">Volver a la Copa</button>'
              : '<button class="btn btn-primary btn-block mt" onclick="continueCareerMatchday()">Volver a Jornada</button>')
        : r.isLiga
          ? '<button class="btn btn-primary btn-block mt" onclick="continueLigaMatchday()">Ver jornada</button>'
          : '<button class="btn btn-primary btn-block mt" onclick="continueFutDraftMatch()">' + (r.playerWon ? 'Continuar' : 'Ver resultado') + '</button>') +
    '</div>'
  );
}

// Panel de "Máximo goleador y asistente" + top 8 de cada uno, compartido
// por el resumen del torneo de FutDraft, el de Liga y (con título propio,
// ver segundo parámetro) las dos tablas de Modo Carrera (temporada actual
// e histórico del club) -- stats es { scorers: {}, assists: {} } (ver
// futDraftRecordGoalEvents).
function renderTopScorersAssistsPanel(stats, title) {
  stats = stats || { scorers: {}, assists: {} };
  var scorers = sortedStatsList(stats.scorers).slice(0, 3);
  var assists = sortedStatsList(stats.assists).slice(0, 3);
  if (!scorers.length && !assists.length) return '';
  var topScorer = scorers[0], topAssist = assists[0];
  function listHtml(list) {
    return list.map(function (s, i) {
      var shieldSrc = s.team === 'Tu equipo' ? getPlayerShieldPath() : teamShieldPath(s.team);
      return '<div class="futdraft-timeline-row"><span>' + (i + 1) + '.</span>' + avatarHtml(s.player) +
        '<img class="futdraft-timeline-shield" src="' + escapeHtml(shieldSrc) + '" alt="" title="' + escapeHtml(s.team) + '">' +
        '<span style="flex:1;text-align:left">' + escapeHtml(s.nombre) + '</span><span class="dim">' + s.count + '</span></div>';
    }).join('');
  }
  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">' + escapeHtml(title || 'Goleadores y asistentes del torneo') + '</h3>' +
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

