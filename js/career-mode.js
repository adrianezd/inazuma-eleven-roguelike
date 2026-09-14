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
var CAREER_LEAGUE_TEAM_COUNT = 16; // tú + 15 rivales

function careerModeRoster(ids) {
  return ids.map(function (id) { return ROSTER.find(function (p) { return p.id === id; }); }).filter(Boolean);
}

// Valor de mercado: no hay dato real de mercado en el roster, así que se
// deriva de la misma puntuación por posición que ya usa toda la UI
// (futDraftPlayerScore), escalado para que parezca un fichaje real de
// fútbol (en millones de €) en vez de un número entre 0 y 100 pelado.
function careerPlayerValue(p) {
  return Math.max(1, Math.round(futDraftPlayerScore(p) * 0.4));
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
  return {
    teamNames: teamNames,
    table: teamNames.map(function () { return ligaEmptyStanding(); }),
    schedule: generateRoundRobin(CAREER_LEAGUE_TEAM_COUNT),
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

function renderCareerPlantilla(c) {
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var total = all.reduce(function (sum, p) { return sum + careerPlayerValue(p); }, 0);
  var rowsHtml = all.map(function (p) {
    return '<div class="futdraft-timeline-row">' + avatarHtml(p) +
      '<span>' + escapeHtml(p.nombre) + ' <span class="dim">· ' + p.posicion + '</span></span>' +
      '<strong style="margin-left:auto;white-space:nowrap;color:var(--accent-2)">' + careerPlayerValue(p) + ' M€</strong>' +
    '</div>';
  }).join('');
  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Gestionar plantilla</h3>' +
      '<p class="dim small">Valor total de la plantilla: <strong style="color:var(--accent-2)">' + total + ' M€</strong>. Valor de mercado orientativo, calculado a partir del rendimiento de cada jugador -- todavía no se puede fichar ni vender (ver pestaña Mercado).</p>' +
      '<div class="futdraft-timeline">' + rowsHtml + '</div>' +
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

function renderCareerCalendario(c) {
  var league = c.league;
  var panelsHtml = league.schedule.map(function (fixtures, idx) {
    var isCurrent = idx === league.matchdayIndex;
    var isPast = idx < league.matchdayIndex;
    var matchesHtml = fixtures.map(function (fx) {
      var isYours = fx[0] === 0 || fx[1] === 0;
      var homeLabel = fx[0] === 0 ? 'Tú' : league.teamNames[fx[0]];
      var awayLabel = fx[1] === 0 ? 'Tú' : league.teamNames[fx[1]];
      return '<p class="' + (isYours ? '' : 'dim') + ' small" style="' + (isYours ? 'font-weight:700' : '') + '">' + escapeHtml(homeLabel) + ' vs ' + escapeHtml(awayLabel) + '</p>';
    }).join('');
    return '<div class="panel">' +
      '<h3 style="margin-bottom:6px">Jornada ' + (idx + 1) + (isCurrent ? ' · actual' : (isPast ? ' · jugada' : '')) + '</h3>' +
      matchesHtml +
    '</div>';
  }).join('');
  return panelsHtml;
}

function renderCareerLiga(c) {
  var league = c.league;
  var sorted = ligaSortedTable(league.table);
  var rows = sorted.map(function (t, pos) {
    var isYou = t.idx === 0;
    var label = isYou ? 'Tú' : league.teamNames[t.idx];
    var shield = isYou ? getPlayerShieldPath() : teamShieldPath(league.teamNames[t.idx]);
    return '<tr class="' + (isYou ? 'liga-you' : '') + '">' +
      '<td>' + (pos + 1) + '</td>' +
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

// Juega TODA la jornada actual de golpe (simulada, sin verla, como el
// resto de la jornada en Liga -- ver continueLigaMatchday): cada partido,
// el tuyo incluido, sale de comparar dos potencias 0-100. No hay
// prórroga ni penaltis (empates cuentan como empates, igual que Liga).
window.actionPlayCareerMatchday = function () {
  var c = G.career;
  var league = c.league;
  if (league.matchdayIndex >= league.schedule.length) return;
  var myPower = futDraftScoreBreakdown(c.lineup, c.captainId).total;
  var fixtures = league.schedule[league.matchdayIndex];
  var myResult = null;
  fixtures.forEach(function (fx) {
    var homeIdx = fx[0], awayIdx = fx[1];
    var powerHome = homeIdx === 0 ? myPower : teamPower({ name: league.teamNames[homeIdx] });
    var powerAway = awayIdx === 0 ? myPower : teamPower({ name: league.teamNames[awayIdx] });
    var goles = careerSimulateMatchGoals(powerHome, powerAway);
    ligaApplyResult(league.table, homeIdx, awayIdx, goles[0], goles[1]);
    if (homeIdx === 0 || awayIdx === 0) {
      var youAreHome = homeIdx === 0;
      myResult = {
        matchday: league.matchdayIndex + 1,
        oppName: league.teamNames[youAreHome ? awayIdx : homeIdx],
        myGoals: youAreHome ? goles[0] : goles[1],
        oppGoals: youAreHome ? goles[1] : goles[0]
      };
    }
  });
  league.matchdayIndex++;
  c.lastMatchdayResult = myResult;
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
        : '<button class="btn btn-primary btn-block mt" onclick="actionPlayCareerMatchday()">Jugar jornada</button>') +
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
