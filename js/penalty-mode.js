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
  if (p.winner === 'jugador') {
    // 'penaltyMode' vuelve a la pantalla de siempre: como p.finished ya
    // está a true, renderPenaltyMode() muestra directamente el resultado.
    triggerRewardMachine('penaltyMode');
    return;
  }
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
        '<div class="score-side"><img class="team-shield" src="' + getPlayerShieldPath() + '" alt=""><div class="score-name">Tú</div><div class="score-num">' + p.playerGoals + '</div></div>' +
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

