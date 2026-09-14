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
// Multiplicado x3 sobre el original (60 base, +5 por posición) a petición
// explícita: la Liga es la inversión más larga del juego (17 jornadas) y
// debía compensar bastante más en Puntos de Espíritu que hasta ahora.
var LIGA_BASE_REWARD = 180;
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

function ligaEmptyStanding() { return { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, form: [] }; }
function ligaApplyResult(table, homeIdx, awayIdx, homeGoals, awayGoals) {
  var h = table[homeIdx], a = table[awayIdx];
  h.pj++; a.pj++;
  h.gf += homeGoals; h.gc += awayGoals;
  a.gf += awayGoals; a.gc += homeGoals;
  if (homeGoals > awayGoals) { h.pg++; h.pts += 3; a.pp++; h.form.push('V'); a.form.push('D'); }
  else if (homeGoals < awayGoals) { a.pg++; a.pts += 3; h.pp++; h.form.push('D'); a.form.push('V'); }
  else { h.pe++; a.pe++; h.pts++; a.pts++; h.form.push('E'); a.form.push('E'); }
}
// Escudo del equipo de una fila de la tabla (el tuyo, o el real del rival).
function ligaTeamShield(liga, idx) { return idx === 0 ? getPlayerShieldPath() : teamShieldPath(liga.teamNames[idx]); }
// Colorea el número de posición según la zona -- 4 primeros en verde
// oscuro, los 2 siguientes en naranja, los 2 últimos en rojo -- a
// petición explícita, con una foto de referencia de una clasificación
// real. totalTeams hace falta para saber cuáles son "los 2 últimos" en
// ligas de tamaño distinto (18 en Liga, 16 en Modo Carrera). Compartida
// por renderLigaTable y renderCareerLiga para que las dos tablas se vean
// igual.
function ligaPosBadgeHtml(rank, totalTeams) {
  var zoneCls = rank <= 4 ? 'liga-pos-top' : (rank <= 6 ? 'liga-pos-mid' : (rank > totalTeams - 2 ? 'liga-pos-bottom' : ''));
  return '<span class="liga-pos-badge' + (zoneCls ? ' ' + zoneCls : '') + '">' + rank + '</span>';
}
// Últimos 5 resultados como en una tabla de liga real: un círculo por
// partido (V verde, E gris, D rojo), rellenando por la izquierda con
// círculos vacíos mientras el equipo no lleve 5 partidos jugados todavía.
function ligaFormHtml(form) {
  var last5 = form.slice(-5);
  var html = '';
  for (var i = 0; i < 5 - last5.length; i++) html += '<span class="liga-form-dot liga-form-empty"></span>';
  last5.forEach(function (r) {
    var cls = r === 'V' ? 'liga-form-win' : (r === 'D' ? 'liga-form-loss' : 'liga-form-draw');
    var symbol = r === 'V' ? '✓' : (r === 'D' ? '✕' : '–');
    html += '<span class="liga-form-dot ' + cls + '">' + symbol + '</span>';
  });
  return '<span class="liga-form">' + html + '</span>';
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

// Liga no tiene pantalla propia de "Condiciones del partido" (no pasa por
// renderFutDraftModeSelect): se resetea aquí para que siempre juegue "Sin
// condiciones", en vez de arrastrar por accidente lo elegido en un
// FutDraft anterior de la misma sesión.
function actionGoLigaTierSelect() { G.futdraftConditionChoiceIdx = 0; G.screen = 'ligaTierSelect'; render(); }

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
      '<td>' + ligaPosBadgeHtml(pos + 1, sorted.length) + '</td>' +
      '<td><img class="liga-row-shield" src="' + escapeHtml(ligaTeamShield(liga, t.idx)) + '" alt=""></td>' +
      '<td>' + escapeHtml(ligaTeamLabel(liga, t.idx)) + '</td>' +
      '<td>' + t.pj + '</td><td>' + t.pg + '</td><td>' + t.pe + '</td><td>' + t.pp + '</td>' +
      '<td>' + t.gf + '</td><td>' + t.gc + '</td><td>' + (t.gf - t.gc) + '</td>' +
      '<td><strong>' + t.pts + '</strong></td>' +
      '<td>' + ligaFormHtml(t.form) + '</td>' +
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
        '<table class="liga-table"><thead><tr><th>#</th><th></th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th><th>Últimos</th></tr></thead>' +
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
    oppSide: { name: oppName }, modifier: sim.modifier,
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
    timeline: live.revealed, modifier: live.modifier, isLiga: true
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
  var reward = LIGA_BASE_REWARD + Math.max(0, LIGA_TEAM_COUNT - myPosition) * 15;
  meta.points += reward;
  saveMeta(meta);
  liga.finished = true;
  liga.finalPosition = myPosition;
  liga.champion = champion;
  liga.reward = reward;
  if (champion) {
    triggerRewardMachine('ligaSummary');
    return;
  }
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
        '<div class="reward-highlight">' + spiritIcon() + ' +' + liga.reward + ' Puntos de Espíritu</div>' +
        '<p class="dim small">Terminaste ' + liga.finalPosition + 'º de ' + LIGA_TEAM_COUNT + '.</p>' +
        (unlockedNext ? '<p class="dim small">¡Nivel ' + ligaTierName(LIGA_TIERS[nextTierIdx]) + ' desbloqueado!</p>' : '') +
      '</div>' +
      renderTopScorersAssistsPanel(liga.stats) +
      '<div class="panel center-text">' +
        '<button class="btn btn-primary btn-block" onclick="actionGoLigaTierSelect()">Volver a Liga</button>' +
      '</div>' +
    '</div>'
  );
}

