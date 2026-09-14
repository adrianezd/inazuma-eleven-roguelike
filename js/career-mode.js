/* ---------------------------------------------------------------------
   MODO CARRERA: todavía en construcción (liga + Champions + copa,
   fichajes, cesiones y ventas con 16 equipos -- ver ideas sueltas). Esta
   es solo la BASE, a petición explícita: 6 pestañas dentro de la misma
   pantalla (G.career.tab), reutilizando al máximo el motor ya existente
   de FutDraft/Liga en vez de duplicar lógica:
   - Mi equipo: lo que ya había -- alineación, formación libre (cualquiera
     de las 8 de FUTDRAFT_FORMATIONS), cambios ilimitados y capitán.
   - Gestionar plantilla: valor de mercado de cada jugador (fórmula sobre
     futDraftPlayerScore, no hay datos reales de mercado en el roster).
   - Mercado: todavía sin fichajes/ventas de verdad -- placeholder.
   - Calendario: liga de 16 equipos a una vuelta real (generateRoundRobin,
     igual que Liga), con 15 rivales de nombre real sacados de las mismas
     listas que usa FutDraft/Liga.
   - Liga: la clasificación de esa misma liga (mismas funciones genéricas
     que renderLigaTable: ligaEmptyStanding/ligaApplyResult/ligaSortedTable/
     ligaFormHtml).
   - Jornada: botón para jugar la jornada actual -- simula TODOS los
     partidos (el tuyo incluido, con tu puntuación de equipo como
     potencia) de golpe, sin ver el partido, y avanza la tabla.
   Todo esto vive en su propio estado (G.career), independiente de
   G.futdraft/G.futdraft.liga, para no interferir con una partida de
   FutDraft/Liga en curso.
   --------------------------------------------------------------------- */

var CAREER_TABS = [
  { id: 'equipo', name: 'Mi equipo' },
  { id: 'plantilla', name: 'Gestionar plantilla' },
  { id: 'mercado', name: 'Mercado' },
  { id: 'calendario', name: 'Calendario' },
  { id: 'liga', name: 'Liga' },
  { id: 'jornada', name: 'Jornada' }
];

// 11 titulares + 5 suplentes elegidos por el usuario. La distribución de
// posiciones de los 11 titulares (4 Delantero, 2 Centrocampista, 4
// Defensa, 1 Portero) coincide exactamente con la formación '424' de
// FUTDRAFT_FORMATIONS, así que arranca con ella -- luego se puede
// cambiar a cualquier otra desde el desplegable.
var CAREER_MODE_STARTER_IDS = ['r41', 'r170', 'r67', 'r264', 'r267', 'r263', 'r268', 'r269', 'r265', 'r266', 'r57'];
// Deck/Cardson/Binder (r270-r272) son Tarjeteros nuevos, añadidos junto
// con Larry Pogue (r43) en vez de Boar/Franky/Chameleon/Wolf -- Jimmy
// Mach (r66) es el único suplente original que se queda.
var CAREER_MODE_BENCH_IDS = ['r270', 'r271', 'r272', 'r66', 'r43'];
var CAREER_MODE_DEFAULT_FORMATION = '424';
var CAREER_LEAGUE_TEAM_COUNT = 20; // tú + 19 rivales, a petición explícita

function careerModeRoster(ids) {
  return ids.map(function (id) { return ROSTER.find(function (p) { return p.id === id; }); }).filter(Boolean);
}

// Valor de mercado: no hay dato real de mercado en el roster, así que se
// deriva de la misma puntuación por posición que ya usa toda la UI
// (futDraftPlayerScore), escalado para que parezca un fichaje real de
// fútbol (en millones de €) en vez de un número entre 0 y 100 pelado.
// Tampoco es un único ritmo de subida -- un mercado real tampoco lo es,
// a petición explícita ("esto tiene que ser incremental, como en la vida
// real"): por DEBAJO del anclaje (75 → 1M€) el valor sube suave, se
// duplica cada 10 puntos (65 → 0.5M€); por ENCIMA se dispara mucho más
// rápido, se duplica cada ~2.6 puntos, para que un crack de verdad
// (90-95 de media) valga un dineral de verdad y no cuatro perras más que
// uno normal -- referencia dada: 65→0.5M€, 75→1M€, 80→~6M€, 95→~200M€
// (con esto: 80→~3.8M€, 95→~207M€, mismo orden de magnitud).
var CAREER_VALUE_ANCHOR_SCORE = 75;
var CAREER_VALUE_ANCHOR_MILLIONS = 1;
var CAREER_VALUE_DOUBLING_BELOW_ANCHOR = 10;
var CAREER_VALUE_DOUBLING_ABOVE_ANCHOR = 2.6;
function careerPlayerValue(p) {
  var score = futDraftPlayerScore(p);
  var excess = score - CAREER_VALUE_ANCHOR_SCORE;
  var doubling = excess >= 0 ? CAREER_VALUE_DOUBLING_ABOVE_ANCHOR : CAREER_VALUE_DOUBLING_BELOW_ANCHOR;
  var millions = CAREER_VALUE_ANCHOR_MILLIONS * Math.pow(2, excess / doubling);
  return Math.max(0.1, Math.round(millions * 10) / 10);
}

// Mismo criterio que ligaPickRivalNames (más equipos "jefe" cuanto más
// alto el bossChance), pero con el tamaño de liga como parámetro en vez
// de fijo a LIGA_TEAM_COUNT, porque el Modo Carrera es de 16 equipos, no
// de los 18 de Liga.
function careerPickRivalNames(count) {
  var used = {};
  var names = [];
  var guard = 0;
  while (names.length < count && guard < 2000) {
    guard++;
    var pool = Math.random() < 0.4 ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES;
    var name = choice(pool);
    if (!used[name]) { used[name] = true; names.push(name); }
  }
  return names;
}

// Calendario + tabla, construidos una sola vez: mismo método del círculo
// (generateRoundRobin) y misma forma de standing vacío (ligaEmptyStanding)
// que ya usa Liga, solo que con 16 equipos en vez de 18.
function careerBuildLeague() {
  var rivalNames = careerPickRivalNames(CAREER_LEAGUE_TEAM_COUNT - 1);
  var teamNames = [null].concat(rivalNames); // índice 0 = tú
  var schedule = generateRoundRobin(CAREER_LEAGUE_TEAM_COUNT);
  return {
    teamNames: teamNames,
    table: teamNames.map(function () { return ligaEmptyStanding(); }),
    schedule: schedule,
    // Un array de resultados en paralelo a schedule (misma forma: una
    // entrada por jornada, una por partido dentro de esa jornada), null
    // hasta que se juega -- así el Calendario puede ir mostrando el
    // marcador real de cada partido, no solo "jugada sí/no" (ver
    // actionPlayCareerMatchday, que rellena esto mismo partido a
    // partido según se resuelve cada jornada).
    results: schedule.map(function (fixtures) { return fixtures.map(function () { return null; }); }),
    matchdayIndex: 0
  };
}

// El estado (G.career) se crea solo la primera vez que se entra en esta
// partida/sesión -- si ya existe (has vuelto tras cambiar de pantalla),
// se conserva tal cual, con los cambios de formación/titulares/jornadas
// que ya hubieras hecho.
function actionGoCareerMode() {
  if (!G.career) {
    var starters = careerModeRoster(CAREER_MODE_STARTER_IDS);
    G.career = {
      tab: 'equipo',
      formation: CAREER_MODE_DEFAULT_FORMATION,
      lineup: futDraftBuildLineup(starters, CAREER_MODE_DEFAULT_FORMATION),
      bench: careerModeRoster(CAREER_MODE_BENCH_IDS),
      captainId: null,
      pickingCaptain: false,
      swapSelectedId: null,
      league: careerBuildLeague(),
      lastMatchdayResult: null
    };
  }
  G.screen = 'careerMode';
  render();
}

window.actionSetCareerTab = function (tab) {
  G.career.tab = tab;
  G.career.swapSelectedId = null;
  G.career.pickingCaptain = false;
  render();
};

window.setCareerFormation = function (id) {
  var c = G.career;
  c.formation = id;
  var starters = c.lineup.map(function (slot) { return slot.player; });
  c.lineup = futDraftBuildLineup(starters, id);
  c.swapSelectedId = null;
  render();
};

// Mismo mecanismo de cambios ilimitados que selectFutDraftPlayer (toca a
// uno, luego al otro: dos titulares se reubican de línea, titular+
// suplente intercambian sitio). Si el modo "elegir capitán" está activo,
// el toque se interpreta como elección de capitán en vez de cambio.
window.selectCareerPlayer = function (id) {
  var c = G.career;
  if (c.pickingCaptain) { pickCareerCaptainInternal(id); return; }
  if (c.swapSelectedId === id) { c.swapSelectedId = null; render(); return; }
  if (!c.swapSelectedId) { c.swapSelectedId = id; render(); return; }
  var otherId = c.swapSelectedId;
  var lineupIdxA = c.lineup.findIndex(function (s) { return s.player.id === otherId; });
  var lineupIdxB = c.lineup.findIndex(function (s) { return s.player.id === id; });
  if (lineupIdxA !== -1 && lineupIdxB !== -1) {
    var tmp = c.lineup[lineupIdxA].player;
    c.lineup[lineupIdxA].player = c.lineup[lineupIdxB].player;
    c.lineup[lineupIdxB].player = tmp;
  } else {
    var benchIdxA = c.bench.findIndex(function (p) { return p.id === otherId; });
    var benchIdxB = c.bench.findIndex(function (p) { return p.id === id; });
    if (lineupIdxA !== -1 && benchIdxB !== -1) {
      var starterOut = c.lineup[lineupIdxA].player;
      c.lineup[lineupIdxA].player = c.bench[benchIdxB];
      c.bench[benchIdxB] = starterOut;
      if (c.captainId === starterOut.id) c.captainId = null;
    } else if (lineupIdxB !== -1 && benchIdxA !== -1) {
      var starterOut2 = c.lineup[lineupIdxB].player;
      c.lineup[lineupIdxB].player = c.bench[benchIdxA];
      c.bench[benchIdxA] = starterOut2;
      if (c.captainId === starterOut2.id) c.captainId = null;
    }
  }
  c.swapSelectedId = null;
  render();
};

// Capitán: cuenta x2 en la puntuación de equipo (ver futDraftScoreBreakdown,
// reutilizada tal cual). Solo puede ser un titular -- tocar a un suplente
// en modo "elegir capitán" no hace nada. Tocar al capitán actual otra vez
// le quita el brazalete.
window.toggleCareerCaptainMode = function () {
  var c = G.career;
  c.pickingCaptain = !c.pickingCaptain;
  c.swapSelectedId = null;
  render();
};
function pickCareerCaptainInternal(id) {
  var c = G.career;
  var isStarter = c.lineup.some(function (s) { return s.player.id === id; });
  if (!isStarter) { render(); return; }
  c.captainId = (c.captainId === id) ? null : id;
  c.pickingCaptain = false;
  render();
}

// Igual que renderFutDraftLineupPitch, pero leyendo de G.career en vez
// de G.futdraft.
function renderCareerLineupPitch(c) {
  var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === c.formation; });
  var rowsHtml = formation.rows.map(function (row) {
    var itemsHtml = c.lineup.filter(function (slot) { return slot.pos === row.pos; }).map(function (slot) {
      var p = slot.player;
      var outOfPosition = slot.pos !== p.posicion;
      var cls = 'pitch-player futdraft-swappable' +
        (c.swapSelectedId === p.id ? ' selected' : '') +
        (outOfPosition ? ' futdraft-out-of-position' : '');
      var badge = c.captainId === p.id ? '<span class="futdraft-captain-badge" title="Capitán">👑</span>' : '';
      var nameSuffix = outOfPosition ? ' <span class="dim">(' + p.posicion + ')</span>' : '';
      return '<div class="' + cls + '" onclick="selectCareerPlayer(\'' + p.id + '\')">' + badge + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + nameSuffix + '</span></div>';
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

function renderCareerEquipo(c) {
  var breakdown = futDraftScoreBreakdown(c.lineup, c.captainId);
  var captain = c.captainId ? c.lineup.find(function (s) { return s.player.id === c.captainId; }) : null;
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
  var benchHtml = c.bench.map(function (p) {
    var cls = 'pitch-player futdraft-swappable' + (c.swapSelectedId === p.id ? ' selected' : '');
    return '<div class="' + cls + '" onclick="selectCareerPlayer(\'' + p.id + '\')">' + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
  }).join('');
  var formationOptionsHtml = FUTDRAFT_FORMATIONS.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === c.formation ? ' selected' : '') + '>' + f.name + '</option>';
  }).join('');
  return (
    '<div class="panel center-text">' +
      '<p class="dim small">Puntuación de equipo: <strong style="color:var(--accent-2)">' + breakdown.total + '</strong> / 100</p>' +
      '<p class="dim small">Cambios ilimitados: toca a dos jugadores (titulares o suplente) para cambiarlos.</p>' +
      '<p class="dim small">' + captainHint + '</p>' +
      '<button class="btn btn-tiny' + (c.pickingCaptain ? ' active' : '') + '" onclick="toggleCareerCaptainMode()">' + (c.pickingCaptain ? 'Toca a un titular para hacerlo capitán…' : 'Elegir capitán 👑') + '</button>' +
    '</div>' +
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Formación</h3>' +
      '<select class="select-field" onchange="setCareerFormation(this.value)">' + formationOptionsHtml + '</select>' +
    '</div>' +
    '<div class="panel">' + renderCareerLineupPitch(c) + '</div>' +
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Banquillo</h3>' +
      '<div class="pitch-row" style="justify-content:center">' + benchHtml + '</div>' +
    '</div>'
  );
}

// Misma insignia redonda de media que las tarjetas de Colección/Draft
// (ver playerCardHtml), con el mismo color por rango (mediaBadgeColor) --
// aquí sirve para ver de un vistazo quién rinde mejor sin tener que
// entrar a cada jugador.
function careerMediaBadgeHtml(p) {
  var score = Math.round(futDraftPlayerScore(p));
  return '<span class="media-badge" style="background:' + mediaBadgeColor(score) + '" title="Media según su posición">' + score + '</span>';
}

window.actionSetCareerPlantillaFilter = function (pos) {
  G.career.plantillaFilter = pos;
  render();
};

function renderCareerPlantilla(c) {
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var rawTotal = all.reduce(function (sum, p) { return sum + careerPlayerValue(p); }, 0);
  var total = Math.round(rawTotal * 10) / 10;
  var filter = c.plantillaFilter || null;
  var filtered = filter ? all.filter(function (p) { return p.posicion === filter; }) : all;
  var filterBtnsHtml = [null].concat(POSITIONS).map(function (pos) {
    var active = filter === pos;
    var arg = pos ? "'" + pos + "'" : 'null';
    return '<button class="btn btn-tiny' + (active ? ' active' : '') + '" onclick="actionSetCareerPlantillaFilter(' + arg + ')">' + (pos || 'Todos') + '</button>';
  }).join('');
  var rowsHtml = filtered.map(function (p) {
    return '<div class="futdraft-timeline-row">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
      '<span>' + escapeHtml(p.nombre) + ' <span class="dim">· ' + p.posicion + '</span></span>' +
      '<strong style="margin-left:auto;white-space:nowrap;color:var(--accent-2)">' + careerPlayerValue(p) + ' M€</strong>' +
    '</div>';
  }).join('');
  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Gestionar plantilla</h3>' +
      '<p class="dim small">Valor total de la plantilla: <strong style="color:var(--accent-2)">' + total + ' M€</strong>. Valor de mercado orientativo, calculado a partir del rendimiento de cada jugador -- todavía no se puede fichar ni vender (ver pestaña Mercado).</p>' +
      '<div class="btn-row">' + filterBtnsHtml + '</div>' +
      '<div class="futdraft-timeline mt">' + (rowsHtml || '<p class="dim small center-text">Nadie en esa posición.</p>') + '</div>' +
    '</div>'
  );
}

function renderCareerMercado() {
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Mercado</h3>' +
      '<p class="dim small">Próximamente: fichar y vender jugadores de otros equipos, con el valor de mercado de la pestaña Gestionar plantilla.</p>' +
    '</div>'
  );
}

// Escudo real si el nombre coincide con alguno conocido (mismo criterio
// que toda la app, ver teamShieldPath), tu propio escudo si el hueco es
// "Tú" -- igual que las filas de la tabla de Liga.
function calendarTeamShield(league, idx) { return idx === 0 ? getPlayerShieldPath() : teamShieldPath(league.teamNames[idx]); }
function calendarTeamLabel(league, idx) { return idx === 0 ? 'Tú' : league.teamNames[idx]; }

// result: [golesLocal, golesVisitante] si ya se jugó (ver
// actionPlayCareerMatchday, que rellena league.results partido a
// partido), o null si todavía no -- en ese caso se muestra "vs" en vez
// del marcador.
function calendarFixtureRowHtml(league, fx, result) {
  var isYours = fx[0] === 0 || fx[1] === 0;
  var middleHtml = result
    ? '<span class="calendar-fixture-score">' + result[0] + ' - ' + result[1] + '</span>'
    : '<span class="calendar-fixture-vs">vs</span>';
  return '<div class="calendar-fixture' + (isYours ? ' calendar-fixture-you' : '') + '">' +
    '<span class="calendar-fixture-team">' +
      '<img class="liga-row-shield" src="' + escapeHtml(calendarTeamShield(league, fx[0])) + '" alt="">' +
      '<span>' + escapeHtml(calendarTeamLabel(league, fx[0])) + '</span>' +
    '</span>' +
    middleHtml +
    '<span class="calendar-fixture-team calendar-fixture-team-away">' +
      '<img class="liga-row-shield" src="' + escapeHtml(calendarTeamShield(league, fx[1])) + '" alt="">' +
      '<span>' + escapeHtml(calendarTeamLabel(league, fx[1])) + '</span>' +
    '</span>' +
  '</div>';
}

// Se navega jornada a jornada con el mismo widget de flechas que el
// resto de la app (ver .stepper-row), en vez de volcar las 15 jornadas
// (120 partidos) en una lista larguísima -- a petición explícita, "tiene
// que quedar más bonito". c.calendarView es solo para MIRAR el
// calendario, independiente de league.matchdayIndex (el progreso real):
// arranca en la jornada actual, pero se puede pasear libremente por
// todo el calendario sin que eso juegue nada.
window.actionCareerCalendarStep = function (delta) {
  var c = G.career;
  var cur = (c.calendarView === undefined || c.calendarView === null) ? c.league.matchdayIndex : c.calendarView;
  c.calendarView = clamp(cur + delta, 0, c.league.schedule.length - 1);
  render();
};

function renderCareerCalendario(c) {
  var league = c.league;
  var lastIdx = league.schedule.length - 1;
  var view = clamp((c.calendarView === undefined || c.calendarView === null) ? league.matchdayIndex : c.calendarView, 0, lastIdx);
  c.calendarView = view;
  var isCurrent = view === league.matchdayIndex;
  var isPast = view < league.matchdayIndex;
  var statusHtml = isCurrent
    ? '<p class="dim small mt">Jornada actual.</p>'
    : (isPast ? '<p class="dim small mt">Jugada.</p>' : '<p class="dim small mt">Todavía no se ha jugado.</p>');
  var fixturesHtml = league.schedule[view].map(function (fx, fi) { return calendarFixtureRowHtml(league, fx, league.results[view][fi]); }).join('');
  return (
    '<div class="panel center-text">' +
      '<div class="stepper-row">' +
        '<button class="btn stepper-arrow" onclick="actionCareerCalendarStep(-1)" aria-label="Jornada anterior"' + (view === 0 ? ' disabled' : '') + '>◀</button>' +
        '<span class="stepper-value">Jornada ' + (view + 1) + ' / ' + league.schedule.length + '</span>' +
        '<button class="btn stepper-arrow" onclick="actionCareerCalendarStep(1)" aria-label="Jornada siguiente"' + (view === lastIdx ? ' disabled' : '') + '>▶</button>' +
      '</div>' +
      statusHtml +
    '</div>' +
    '<div class="panel">' + fixturesHtml + '</div>'
  );
}

function renderCareerLiga(c) {
  var league = c.league;
  var sorted = ligaSortedTable(league.table);
  var rows = sorted.map(function (t, pos) {
    var isYou = t.idx === 0;
    var label = isYou ? 'Tú' : league.teamNames[t.idx];
    var shield = isYou ? getPlayerShieldPath() : teamShieldPath(league.teamNames[t.idx]);
    return '<tr class="' + (isYou ? 'liga-you' : '') + '">' +
      '<td>' + ligaPosBadgeHtml(pos + 1, sorted.length) + '</td>' +
      '<td><img class="liga-row-shield" src="' + escapeHtml(shield) + '" alt=""></td>' +
      '<td>' + escapeHtml(label) + '</td>' +
      '<td>' + t.pj + '</td><td>' + t.pg + '</td><td>' + t.pe + '</td><td>' + t.pp + '</td>' +
      '<td>' + t.gf + '</td><td>' + t.gc + '</td><td>' + (t.gf - t.gc) + '</td>' +
      '<td><strong>' + t.pts + '</strong></td>' +
      '<td>' + ligaFormHtml(t.form) + '</td>' +
    '</tr>';
  }).join('');
  return (
    '<div class="panel center-text">' +
      '<p class="dim small">Jornada ' + Math.min(league.matchdayIndex + 1, league.schedule.length) + ' de ' + league.schedule.length + '</p>' +
    '</div>' +
    '<div class="panel" style="overflow-x:auto">' +
      '<table class="liga-table"><thead><tr><th>#</th><th></th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th><th>Últimos</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
    '</div>'
  );
}

// Marcador entre dos potencias ya calculadas (0-100): a diferencia de
// simulateCpuMatchGoals (que saca la potencia buscando el NOMBRE del
// equipo en TEAM_POWER, así que no sirve para "Tú"), aquí la potencia ya
// viene resuelta -- la tuya sale de futDraftScoreBreakdown, la del rival
// de teamPower como siempre.
function careerSimulateMatchGoals(powerA, powerB) {
  var golA = futDraftRandomGoals(futDraftExpectedGoals(powerA, powerB));
  var golB = futDraftRandomGoals(futDraftExpectedGoals(powerB, powerA));
  return [golA, golB];
}

// Resuelve todos los partidos de la jornada actual que NO sean el tuyo
// (o todos, si fromIdx se omite): comparando potencias 0-100, igual que
// el resto de la jornada en Liga (continueLigaMatchday). Se usa tanto
// desde "Saltar" (todos, tu partido incluido) como al terminar de VER tu
// partido con "Simular" (todos menos el tuyo, que ya se resolvió aparte).
function careerResolveOtherFixtures(league, skipFixtureIdx) {
  var fixtures = league.schedule[league.matchdayIndex];
  fixtures.forEach(function (fx, fi) {
    if (fi === skipFixtureIdx) return;
    var powerHome = teamPower({ name: league.teamNames[fx[0]] });
    var powerAway = teamPower({ name: league.teamNames[fx[1]] });
    var goles = careerSimulateMatchGoals(powerHome, powerAway);
    ligaApplyResult(league.table, fx[0], fx[1], goles[0], goles[1]);
    league.results[league.matchdayIndex][fi] = goles;
  });
}

// "Saltar": la jornada entera se resuelve de golpe sin ver nada, tu
// partido incluido -- lo que ya había.
window.actionSkipCareerMatchday = function () {
  var c = G.career;
  var league = c.league;
  if (league.matchdayIndex >= league.schedule.length) return;
  var myPower = futDraftScoreBreakdown(c.lineup, c.captainId).total;
  var myFixtureIdx = league.schedule[league.matchdayIndex].findIndex(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var myFixture = league.schedule[league.matchdayIndex][myFixtureIdx];
  var youAreHome = myFixture[0] === 0;
  var oppIdx = youAreHome ? myFixture[1] : myFixture[0];
  var powerHome = youAreHome ? myPower : teamPower({ name: league.teamNames[myFixture[0]] });
  var powerAway = youAreHome ? teamPower({ name: league.teamNames[myFixture[1]] }) : myPower;
  var goles = careerSimulateMatchGoals(powerHome, powerAway);
  ligaApplyResult(league.table, myFixture[0], myFixture[1], goles[0], goles[1]);
  league.results[league.matchdayIndex][myFixtureIdx] = goles;
  careerResolveOtherFixtures(league, myFixtureIdx);
  c.lastMatchdayResult = {
    matchday: league.matchdayIndex + 1,
    oppName: league.teamNames[oppIdx],
    myGoals: youAreHome ? goles[0] : goles[1],
    oppGoals: youAreHome ? goles[1] : goles[0]
  };
  league.matchdayIndex++;
  render();
};

// "Simular partido": TU partido se ve de verdad, minuto a minuto, con el
// mismo motor en vivo que ya usan FutDraft y Liga (renderFutDraftLive/
// futDraftLiveTick) -- no se duplica esa pantalla, se reutiliza tal
// cual, puenteando brevemente G.futdraft con los datos del Modo Carrera
// (lineup/formación/capitán) y restaurando lo que hubiera antes al
// terminar (ver finishCareerMatchdayMatch), para no pisar una partida de
// FutDraft/Liga que pudiera seguir en curso en la misma sesión. El resto
// de la jornada se resuelve de golpe al terminar, igual que "Saltar".
window.actionSimulateCareerMatchday = function () {
  var c = G.career;
  var league = c.league;
  if (league.matchdayIndex >= league.schedule.length) return;
  var fixtures = league.schedule[league.matchdayIndex];
  var myFixtureIdx = fixtures.findIndex(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var myFixture = fixtures[myFixtureIdx];
  var youAreHome = myFixture[0] === 0;
  var oppIdx = youAreHome ? myFixture[1] : myFixture[0];
  var oppName = league.teamNames[oppIdx];

  c.savedFutdraft = G.futdraft;
  G.futdraft = { lineup: c.lineup, captainId: c.captainId, formation: c.formation, condition: 'ninguna' };
  var sim = futDraftSimulateMatchCore(teamPower({ name: oppName }));
  G.futdraft.live = {
    oppSide: { name: oppName }, modifier: sim.modifier,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    inExtraTime: false, allowDraw: true, onFinish: finishCareerMatchdayMatch,
    careerFixture: { idx: myFixtureIdx, youAreHome: youAreHome, oppIdx: oppIdx },
    done: false
  };
  G.screen = 'futdraftLive';
  render();
  futDraftLiveTick();
};

// Se llama cuando termina de revelarse tu partido (live.onFinish): aplica
// el resultado, resuelve el resto de la jornada de golpe, y enseña la
// misma pantalla de resultado que FutDraft/Liga (renderFutDraftMatchResult,
// reutilizada tal cual -- ver el branch r.isCareer que se le añadió) antes
// de volver a la pestaña Jornada. G.futdraft NO se restaura todavía aquí
// -- esa pantalla lee G.futdraft.lastMatchResult, así que se restaura al
// pulsar "Volver a Jornada" (ver continueCareerMatchday).
function finishCareerMatchdayMatch() {
  var c = G.career;
  var league = c.league;
  var live = G.futdraft.live;
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  var fi = live.careerFixture.idx, youAreHome = live.careerFixture.youAreHome, oppIdx = live.careerFixture.oppIdx;
  var oppName = league.teamNames[oppIdx];
  var homeGoals = youAreHome ? myGoals : oppGoals;
  var awayGoals = youAreHome ? oppGoals : myGoals;
  var myFixture = league.schedule[league.matchdayIndex][fi];
  ligaApplyResult(league.table, myFixture[0], myFixture[1], homeGoals, awayGoals);
  league.results[league.matchdayIndex][fi] = [homeGoals, awayGoals];
  careerResolveOtherFixtures(league, fi);
  c.lastMatchdayResult = { matchday: league.matchdayIndex + 1, oppName: oppName, myGoals: myGoals, oppGoals: oppGoals };
  league.matchdayIndex++;

  G.futdraft.lastMatchResult = {
    oppName: oppName, oppShield: teamShieldPath(oppName), oppPower: teamPower({ name: oppName }),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals,
    timeline: live.revealed, modifier: live.modifier, isCareer: true
  };
  G.futdraft.live = null;
  G.screen = 'futdraftMatchResult';
  render();
}

window.continueCareerMatchday = function () {
  var c = G.career;
  G.futdraft = c.savedFutdraft;
  c.savedFutdraft = null;
  G.screen = 'careerMode';
  c.tab = 'jornada';
  render();
};

function renderCareerJornada(c) {
  var league = c.league;
  var seasonOver = league.matchdayIndex >= league.schedule.length;
  var r = c.lastMatchdayResult;
  var resultHtml = r
    ? '<div class="panel center-text">' +
        '<h3 style="margin-bottom:4px">Resultado de la jornada ' + r.matchday + '</h3>' +
        '<p class="dim small">Tú <strong>' + r.myGoals + ' - ' + r.oppGoals + '</strong> ' + escapeHtml(r.oppName) + '</p>' +
        '<p class="dim small">El resto de partidos de la jornada también se han resuelto -- mira la pestaña Liga.</p>' +
      '</div>'
    : '';
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">' + (seasonOver ? 'Temporada terminada' : ('Jornada ' + (league.matchdayIndex + 1) + ' de ' + league.schedule.length)) + '</h3>' +
      (seasonOver
        ? '<p class="dim small">Ya se han jugado las ' + league.schedule.length + ' jornadas.</p>'
        : '<div class="btn-row" style="justify-content:center">' +
            '<button class="btn btn-primary" onclick="actionSimulateCareerMatchday()">▶ Simular partido</button>' +
            '<button class="btn btn-outline" onclick="actionSkipCareerMatchday()">⏭ Saltar</button>' +
          '</div>') +
    '</div>' +
    resultHtml
  );
}

function renderCareerMode() {
  var c = G.career;
  var tabsHtml = CAREER_TABS.map(function (t) {
    return '<button class="btn btn-tiny' + (c.tab === t.id ? ' active' : '') + '" onclick="actionSetCareerTab(\'' + t.id + '\')">' + t.name + '</button>';
  }).join('');
  var bodyHtml;
  if (c.tab === 'plantilla') bodyHtml = renderCareerPlantilla(c);
  else if (c.tab === 'mercado') bodyHtml = renderCareerMercado();
  else if (c.tab === 'calendario') bodyHtml = renderCareerCalendario(c);
  else if (c.tab === 'liga') bodyHtml = renderCareerLiga(c);
  else if (c.tab === 'jornada') bodyHtml = renderCareerJornada(c);
  else bodyHtml = renderCareerEquipo(c);
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoOtrosModos()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Modo Carrera</h2>' +
        '<p class="dim small">Todavía en construcción -- esta es la base: equipo, plantilla, mercado, calendario, liga y jornada de una liga de ' + CAREER_LEAGUE_TEAM_COUNT + ' equipos.</p>' +
      '</div>' +
      '<div class="btn-row" style="justify-content:center">' + tabsHtml + '</div>' +
      bodyHtml +
    '</div>'
  );
}
