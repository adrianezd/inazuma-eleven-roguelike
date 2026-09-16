/* ---------------------------------------------------------------------
   16. MODO JUGADOR: carrera de UN SOLO futbolista (a diferencia de Modo
   Carrera, donde gestionas un equipo entero) por los clubes de Inazuma
   Eleven, a petición explícita ("genera un modo como este pero con los
   clubes de inazuma" -- con capturas de referencia de un simulador de
   carrera real). Estructura acordada con el usuario tras varias
   preguntas: NO es una única temporada (se descartó esa idea a medio
   camino) -- es una carrera larga en saltos de 2 EN 2 años, de los 16 a
   el retiro (~36), donde cada salto resuelve 2 temporadas de golpe
   (partidos/goles/asistencias, la media sube o baja según edad y
   rendimiento, títulos individuales/colectivos posibles) y termina con
   una decisión de qué club toca a continuación, hasta el retiro.
   --------------------------------------------------------------------- */

var PLAYER_MODE_START_AGE = 16;
var PLAYER_MODE_RETIRE_AGE = 36;
var PLAYER_MODE_SEASON_MATCHES = 20;
// Media inicial por posición -- un debutante de 16 años, todavía lejos
// de su techo, arranca bajo en cualquier posición.
var PLAYER_MODE_START_OVR = { Portero: 52, Defensa: 54, Centrocampista: 55, Delantero: 56 };
// Probabilidad de gol/asistencia POR PARTIDO según posición -- un
// delantero marca mucho y asiste poco, un centrocampista al revés, un
// defensa/portero de los dos muy poco.
var PLAYER_MODE_GOAL_CHANCE = { Portero: 0.01, Defensa: 0.07, Centrocampista: 0.18, Delantero: 0.42 };
var PLAYER_MODE_ASSIST_CHANCE = { Portero: 0.02, Defensa: 0.13, Centrocampista: 0.35, Delantero: 0.17 };

function playerModeShieldClub(name) { return name ? teamShieldPath(name) : PLAYER_SHIELD; }

// Rango de crecimiento de MEDIA por salto de 2 años según la edad al
// EMPEZAR el salto -- curva de carrera real: fuerte en la juventud
// (16-20), más suave en la madurez (21-28), y declive a partir de los 29
// (con más margen de bajada cuanto más veterano).
function playerModeAgeGrowthRange(edad) {
  if (edad < 20) return [3, 9];
  if (edad < 24) return [1, 6];
  if (edad < 29) return [-1, 4];
  if (edad < 33) return [-4, 2];
  return [-8, -2];
}

function playerModeFreshState(choices) {
  var posicion = choices.posicion;
  var startOvr = PLAYER_MODE_START_OVR[posicion] || 55;
  return {
    apellido: choices.apellido,
    dorsal: choices.dorsal,
    pierna: choices.pierna,
    posicion: posicion,
    club: choices.club,
    // homeClub = el club al que perteneces de verdad; club = donde juegas
    // ahora mismo -- solo se separan mientras hay una cesión activa
    // (onLoan), ver playerModeRollDecision/actionPickPlayerClub.
    homeClub: choices.club,
    onLoan: false,
    crisisPenaltyPending: false,
    edad: PLAYER_MODE_START_AGE,
    ovr: startOvr,
    pj: 0, gls: 0, ast: 0,
    titulosIndividuales: [],
    titulosColectivos: [],
    history: [],
    pendingDecision: null,
    retired: false
  };
}

// Simula UN bloque de 2 años (2 temporadas de PLAYER_MODE_SEASON_MATCHES
// partidos cada una) de golpe -- sin ver partido a partido, a petición
// explícita de que la carrera avance en saltos de 2 años, no jornada a
// jornada como Modo Carrera. Devuelve el desglose para poder enseñarlo
// en el resumen del salto.
function playerModeSimulateBlock(p) {
  var matches = PLAYER_MODE_SEASON_MATCHES * 2;
  var goalChance = (PLAYER_MODE_GOAL_CHANCE[p.posicion] || 0.1) * (0.6 + p.ovr / 99);
  var assistChance = (PLAYER_MODE_ASSIST_CHANCE[p.posicion] || 0.1) * (0.6 + p.ovr / 99);
  var gls = 0, ast = 0;
  for (var i = 0; i < matches; i++) {
    if (Math.random() < goalChance) gls++;
    if (Math.random() < assistChance) ast++;
  }
  var range = playerModeAgeGrowthRange(p.edad);
  // Rendimiento por encima/debajo de lo esperado empuja un poco más la
  // media, además de la curva de edad -- así una carrera brillante de
  // verdad se nota, no solo la edad.
  var expectedProduction = matches * (goalChance + assistChance);
  var actualProduction = gls + ast;
  var perfBonus = clamp(Math.round((actualProduction - expectedProduction) / 3), -2, 4);
  var growth = clamp(rand(range[0], range[1]) + perfBonus, -10, 12);
  var ovrBefore = p.ovr;
  var ovrAfter = clamp(ovrBefore + growth, 35, 99);

  // Título colectivo: depende de lo fuerte que sea tu club (TEAM_POWER) --
  // un club "jefe" pelea títulos de verdad, uno normal solo de vez en
  // cuando. Si el bloque anterior te avisó de una crisis y decidiste
  // quedarte de todas formas, la chance se parte por la mitad de verdad
  // (no solo el aviso de texto) -- ver playerModeRollDecision/
  // actionPickPlayerClub.
  var clubPower = teamPower({ name: p.club });
  var titleChance = clamp(clubPower / 260, 0.05, 0.4);
  if (p.crisisPenaltyPending) titleChance *= 0.5;
  var colectivo = [];
  if (Math.random() < titleChance) {
    colectivo.push(choice(['Campeón de Liga', 'Campeón de Copa', 'Campeón continental']) + ' con ' + p.club);
  }
  p.crisisPenaltyPending = false;
  // Título individual: solo si el rendimiento de verdad ha sido bueno
  // (por encima de lo esperado para tu posición) -- no es automático solo
  // por tener buena media.
  var individual = [];
  if (actualProduction > expectedProduction * 1.4 && Math.random() < 0.5) {
    individual.push(p.edad < 21
      ? 'Mejor jugador joven de la categoría'
      : choice(['Bota de Oro de la categoría', 'Mejor jugador de la temporada']));
  }

  return { matches: matches, gls: gls, ast: ast, ovrBefore: ovrBefore, ovrAfter: ovrAfter, growth: growth, colectivo: colectivo, individual: individual };
}

// Prepara la decisión de qué club toca a continuación -- no siempre son
// buenas noticias, a petición explícita ("también pueden ocurrir cosas
// malas"), con la misma referencia visual que dio el usuario ("Crisis en
// el club... El equipo atraviesa una mala etapa y otro club viene a
// buscarte... Menos chances de salir campeón"): 20% de las veces es una
// CRISIS (quedarte tiene una pega real, no solo de texto -- ver
// p.crisisPenaltyPending/playerModeSimulateBlock), 25% es una OFERTA
// buena (tu rendimiento llama la atención), el resto es una decisión
// neutra de toda la vida. Las 2 alternativas están ligeramente sesgadas
// hacia clubes "jefe" cuanto más alta sea tu media. Nunca repite el club
// actual entre las alternativas.
function playerModeRollAltClub(p, bossChance, exclude) {
  var source = Math.random() < bossChance ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES;
  var name;
  var guard = 0;
  do { name = choice(source); guard++; } while (exclude.indexOf(name) !== -1 && guard < 30);
  return name;
}
// Si vuelves de una cesión (p.onLoan), la decisión SIEMPRE es "regreso a
// tu club" -- quedarte de verdad en tu club de origen, o aceptar una de
// 2 ofertas nuevas -- a petición explícita, con la misma referencia
// visual que dio el usuario ("Regreso a tu club... Volvés a tu club y
// vas a ser tenido en cuenta. Si igual querés salir, tenés dos ofertas").
function playerModeRollReturnDecision(p) {
  var bossChance = clamp(p.ovr / 130, 0.15, 0.75);
  var alts = [];
  alts.push(playerModeRollAltClub(p, bossChance, [p.homeClub]));
  alts.push(playerModeRollAltClub(p, bossChance, [p.homeClub, alts[0]]));
  return {
    type: 'regreso',
    options: [
      { club: p.homeClub, stay: true, hint: 'Volver a tu club' },
      { club: alts[0], stay: false, hint: 'Fichar' },
      { club: alts[1], stay: false, hint: 'Fichar' }
    ]
  };
}
// Decisión normal (sin cesión activa): 15% de las veces tu club te
// manda cedido a sumar minutos fuera (3 clubes de nivel bajo, sin poder
// "quedarte" -- la decisión es del club, no tuya), a petición explícita
// ("también puedo irme cedido"). El resto es fichaje/permanencia de
// siempre: 20% CRISIS (quedarte tiene una pega real, ver
// p.crisisPenaltyPending en playerModeSimulateBlock), 25% OFERTA buena,
// el resto neutro -- "también pueden ocurrir cosas malas".
function playerModeRollDecision(p) {
  if (p.onLoan) return playerModeRollReturnDecision(p);
  var bossChance = clamp(p.ovr / 130, 0.15, 0.75);
  if (Math.random() < 0.15) {
    var loanClubs = [];
    for (var i = 0; i < 3; i++) loanClubs.push(playerModeRollAltClub(p, 0, [p.club].concat(loanClubs)));
    return { type: 'prestamo', options: loanClubs.map(function (name) { return { club: name, stay: false, hint: 'Préstamo' }; }) };
  }
  var alts = [];
  alts.push(playerModeRollAltClub(p, bossChance, [p.club]));
  alts.push(playerModeRollAltClub(p, bossChance, [p.club, alts[0]]));
  var roll = Math.random();
  var type = roll < 0.2 ? 'crisis' : (roll < 0.45 ? 'oferta' : 'normal');
  return {
    type: type,
    options: [
      { club: p.club, stay: true, hint: type === 'crisis' ? 'Menos chances de salir campeón' : 'Quedarte en tu club' },
      { club: alts[0], stay: false, hint: 'Nuevo club' },
      { club: alts[1], stay: false, hint: 'Nuevo club' }
    ]
  };
}
function playerModeDecisionCopy(decision, p) {
  if (decision.type === 'crisis') return { title: 'Crisis en el club', text: 'El equipo atraviesa una mala etapa y otro club viene a buscarte.' };
  if (decision.type === 'oferta') return { title: 'Buenas noticias', text: 'Tu rendimiento ha llamado la atención de otros clubes. Elige dónde sigues tu carrera:' };
  if (decision.type === 'prestamo') return { title: 'Salida a préstamo', text: 'Tu club quiere que sumes minutos en otro equipo. Elige dónde seguir tu desarrollo.' };
  if (decision.type === 'regreso') return { title: 'Regreso a tu club', text: 'Vuelves a ' + p.homeClub + ' y vas a ser tenido en cuenta. Si aun así quieres salir, tienes dos ofertas.' };
  return { title: p.edad + ' años', text: 'Toca decidir dónde sigues tu carrera los próximos 2 años:' };
}

// 3 clubes de nivel bajo al azar para el creador de identidad (nunca
// "jefe" -- un debutante de 16 años no arranca en un grande), a petición
// explícita ("al empezar, elijo entre 3 clubes aleatorios (de los de
// poco nivel), no entre 16") -- antes se enseñaba la lista entera de
// RIVAL_TEAM_NAMES de golpe.
function playerModeRollStartingClubOptions() {
  var pool = RIVAL_TEAM_NAMES.slice();
  var options = [];
  for (var i = 0; i < 3 && pool.length; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    options.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return options;
}
function playerModeFreshSetupChoices() {
  return { apellido: '', dorsal: 10, pierna: 'derecha', posicion: 'Delantero', club: null, clubOptions: playerModeRollStartingClubOptions() };
}
// Punto de entrada desde el menú principal: si ya hay una carrera en
// marcha (o retirada, para poder repasar el resumen final), continúa
// donde se quedó en vez de forzar a crear un jugador nuevo cada vez.
window.actionGoModoJugador = function () {
  G.screen = G.playerCareer ? 'jugadorMode' : 'jugadorSetup';
  if (!G.playerCareer) G.jugadorSetupChoices = playerModeFreshSetupChoices();
  render();
};
window.actionGoJugadorSetup = function () {
  G.jugadorSetupChoices = playerModeFreshSetupChoices();
  G.screen = 'jugadorSetup';
  render();
};
window.actionSetJugadorField = function (field, value) {
  if (!G.jugadorSetupChoices) return;
  G.jugadorSetupChoices[field] = field === 'dorsal' ? clamp(parseInt(value, 10) || 1, 1, 99) : value;
  render();
};
window.actionConfirmJugadorSetup = function () {
  var ch = G.jugadorSetupChoices;
  if (!ch || !ch.apellido.trim() || !ch.club) return;
  G.playerCareer = playerModeFreshState(ch);
  G.jugadorSetupChoices = null;
  G.screen = 'jugadorMode';
  render();
};

// Resuelve el salto de 2 años pendiente y arma la decisión de qué club
// toca después -- si ya se llega o se pasa de la edad de retiro, la
// carrera termina ahí (sin decisión, sin más saltos), a petición
// explícita ("vas eligiendo decisiones cada 2 años... hasta el retiro").
window.actionAdvancePlayerCareer = function () {
  var p = G.playerCareer;
  if (!p || p.retired || p.pendingDecision) return;
  var block = playerModeSimulateBlock(p);
  p.pj += block.matches;
  p.gls += block.gls;
  p.ast += block.ast;
  p.ovr = block.ovrAfter;
  block.colectivo.forEach(function (t) { p.titulosColectivos.push(t); });
  block.individual.forEach(function (t) { p.titulosIndividuales.push(t); });
  p.history.push({
    edadDesde: p.edad, edadHasta: p.edad + 1, club: p.club,
    ovrBefore: block.ovrBefore, ovrAfter: block.ovrAfter,
    matches: block.matches, gls: block.gls, ast: block.ast,
    colectivo: block.colectivo, individual: block.individual
  });
  p.edad += 2;
  if (p.edad >= PLAYER_MODE_RETIRE_AGE) {
    p.retired = true;
  } else {
    p.pendingDecision = playerModeRollDecision(p);
  }
  render();
};
// idx = índice de la opción elegida dentro de p.pendingDecision.options
// (no el nombre del club: dos opciones podrían coincidir de nombre por
// azar, y así no hay ambigüedad). Cesión de salida ("también puedo irme
// cedido", a petición explícita): p.club es donde juegas de verdad,
// p.homeClub es el club al que perteneces -- mientras hay cesión activa
// (p.onLoan) los dos son distintos, y el siguiente salto de 2 años
// siempre es un "regreso" (playerModeRollReturnDecision) en vez de una
// decisión normal.
window.actionPickPlayerClub = function (idx) {
  var p = G.playerCareer;
  var decision = p && p.pendingDecision;
  if (!decision) return;
  var option = decision.options[idx];
  if (!option) return;
  if (decision.type === 'prestamo') {
    p.club = option.club;
    p.onLoan = true;
  } else if (decision.type === 'regreso') {
    p.club = option.club;
    p.homeClub = option.club;
    p.onLoan = false;
  } else {
    p.crisisPenaltyPending = decision.type === 'crisis' && option.stay;
    p.club = option.club;
    p.homeClub = option.club;
    p.onLoan = false;
  }
  p.pendingDecision = null;
  render();
};

function playerModeCardHtml(p) {
  return '<div class="panel matchup-card">' +
    '<div class="matchup-row">' +
      '<div class="matchup-side">' +
        '<img class="matchup-shield" src="' + escapeHtml(playerModeShieldClub(p.club)) + '" alt="">' +
        '<div class="matchup-name">' + escapeHtml(p.club) + (p.onLoan ? ' <span class="player-tag player-tag-loan" title="Cedido -- perteneces a otro club">Cedido</span>' : '') + '</div>' +
      '</div>' +
    '</div>' +
    (p.onLoan ? '<p class="dim small center-text">Perteneces a <strong>' + escapeHtml(p.homeClub) + '</strong>.</p>' : '') +
    '<p class="center-text" style="margin-top:10px">' +
      '<strong style="font-family:\'Oswald\',sans-serif;font-size:1.3rem">' + escapeHtml(p.apellido) + '</strong> ' +
      '<span class="dim small">#' + p.dorsal + ' -- ' + escapeHtml(p.posicion) + ' -- ' + p.edad + ' años</span>' +
    '</p>' +
    '<div class="stats-summary" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat-tile"><div class="num">' + p.ovr + '</div><div class="label">Media</div></div>' +
      '<div class="stat-tile"><div class="num">' + p.pj + '</div><div class="label">PJ</div></div>' +
      '<div class="stat-tile"><div class="num">' + p.gls + '</div><div class="label">Goles</div></div>' +
      '<div class="stat-tile"><div class="num">' + p.ast + '</div><div class="label">Asist.</div></div>' +
    '</div>' +
  '</div>';
}

function playerModeTrophyCaseHtml(p) {
  var all = p.titulosColectivos.concat(p.titulosIndividuales);
  if (!all.length) return '<div class="panel center-text"><p class="dim small">Vitrina vacía -- todavía sin títulos.</p></div>';
  var rows = all.map(function (t) {
    return '<div class="season-badge season-badge-gold"><div class="season-badge-icon">🏆</div><div class="season-badge-text">' + escapeHtml(t) + '</div></div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Vitrina de trofeos (' + all.length + ')</h3><div class="season-summary-badges">' + rows + '</div></div>';
}

function playerModeHistoryHtml(p) {
  if (!p.history.length) return '';
  var rows = p.history.slice().reverse().map(function (h) {
    var deltaHtml = careerDeltaHtml(h.ovrAfter - h.ovrBefore);
    var titles = h.colectivo.concat(h.individual);
    return '<div class="season-badge">' +
      '<img class="matchup-shield" style="width:36px;height:36px" src="' + escapeHtml(playerModeShieldClub(h.club)) + '" alt="">' +
      '<div>' +
        '<div class="season-badge-label">' + h.edadDesde + '-' + h.edadHasta + ' años -- ' + escapeHtml(h.club) + '</div>' +
        '<div class="season-badge-text">Media ' + h.ovrAfter + ' (' + deltaHtml + ') -- ' + h.matches + ' PJ, ' + h.gls + ' G, ' + h.ast + ' A</div>' +
        (titles.length ? '<div class="dim small">🏆 ' + titles.map(escapeHtml).join(' · ') + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Trayectoria</h3><div class="season-summary-badges">' + rows + '</div></div>';
}

function renderJugadorSetup() {
  var ch = G.jugadorSetupChoices;
  var posBtns = POSITIONS.map(function (pos) {
    return '<button class="btn btn-tiny' + (ch.posicion === pos ? ' active' : '') + '" onclick="actionSetJugadorField(\'posicion\',\'' + pos + '\')">' + pos + '</button>';
  }).join('');
  var clubItems = ch.clubOptions.map(function (name) {
    var selected = ch.club === name;
    return '<button class="shop-item" style="width:100%;text-align:left;border-color:' + (selected ? 'var(--accent-2)' : 'var(--border)') + '" onclick="actionSetJugadorField(\'club\',\'' + escapeHtml(name).replace(/'/g, "\\'") + '\')">' +
      '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(name)) + '" alt="">' +
      '<div style="flex:1"><strong>' + escapeHtml(name) + '</strong></div>' +
      (selected ? '<span class="pill">Elegido</span>' : '') +
    '</button>';
  }).join('');
  var canConfirm = ch.apellido.trim() && ch.club;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="doBackToMenuNow()">Volver</button>' +
        '<h2 class="panel-title mt">Define tu identidad</h2>' +
        '<p class="dim small">Vas a jugar tu carrera como un único futbolista por los clubes de Inazuma Eleven, de los 16 años al retiro.</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Identidad</h3>' +
        '<label class="dim small">Apellido en la camiseta</label>' +
        '<input class="select-field" type="text" maxlength="16" data-focus-key="jugador-apellido" value="' + escapeHtml(ch.apellido) + '" oninput="actionSetJugadorField(\'apellido\', this.value)" placeholder="APELLIDO">' +
        '<div class="btn-row mt" style="align-items:center">' +
          '<label class="dim small">Dorsal</label>' +
          '<input class="select-field" style="width:80px" type="number" min="1" max="99" data-focus-key="jugador-dorsal" value="' + ch.dorsal + '" oninput="actionSetJugadorField(\'dorsal\', this.value)">' +
        '</div>' +
        '<p class="dim small mt">Pierna hábil</p>' +
        '<div class="btn-row">' +
          '<button class="btn btn-tiny' + (ch.pierna === 'izquierda' ? ' active' : '') + '" onclick="actionSetJugadorField(\'pierna\',\'izquierda\')">Izquierda</button>' +
          '<button class="btn btn-tiny' + (ch.pierna === 'derecha' ? ' active' : '') + '" onclick="actionSetJugadorField(\'pierna\',\'derecha\')">Derecha</button>' +
        '</div>' +
        '<p class="dim small mt">Posición</p>' +
        '<div class="btn-row">' + posBtns + '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Primer club</h3>' +
        '<p class="dim small">Debutas con 16 años en la cantera de uno de estos clubes.</p>' +
        clubItems +
      '</div>' +
      '<div class="panel">' +
        '<button class="btn btn-primary btn-block" ' + (canConfirm ? '' : 'disabled') + ' onclick="actionConfirmJugadorSetup()">Confirmar identidad</button>' +
      '</div>' +
    '</div>'
  );
}

function renderJugadorDecision(p) {
  var decision = p.pendingDecision;
  var copy = playerModeDecisionCopy(decision, p);
  var itemsHtml = decision.options.map(function (opt, idx) {
    return '<button class="shop-item" style="width:100%;text-align:left" onclick="actionPickPlayerClub(' + idx + ')">' +
      '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(opt.club)) + '" alt="">' +
      '<div style="flex:1"><strong>' + escapeHtml(opt.club) + '</strong><div class="dim small">' + escapeHtml(opt.hint) + '</div></div>' +
    '</button>';
  }).join('');
  return (
    '<div class="panel center-text"><h3 style="margin-bottom:4px">' + escapeHtml(copy.title) + '</h3><p class="dim small">' + escapeHtml(copy.text) + '</p></div>' +
    '<div class="panel">' + itemsHtml + '</div>'
  );
}

function renderJugadorRetired(p) {
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Retirada a los ' + p.edad + ' años</h3>' +
      '<p class="dim small">Termina la carrera de ' + escapeHtml(p.apellido) + ' -- gracias por jugar.</p>' +
    '</div>' +
    playerModeCardHtml(p) +
    playerModeTrophyCaseHtml(p) +
    playerModeHistoryHtml(p) +
    '<div class="panel"><button class="btn btn-outline btn-block" onclick="doBackToMenuNow()">Volver al menú</button></div>'
  );
}

function renderJugadorMode() {
  var p = G.playerCareer;
  if (!p) { return '<div class="panel center-text"><p class="dim small">Todavía no has creado a tu jugador.</p><button class="btn btn-primary btn-block mt" onclick="actionGoJugadorSetup()">Crear jugador</button></div>'; }
  if (p.retired) return '<div class="screen">' + renderJugadorRetired(p) + '</div>';
  var bodyHtml = p.pendingDecision
    ? renderJugadorDecision(p)
    : '<div class="panel center-text"><button class="btn btn-primary btn-block" onclick="actionAdvancePlayerCareer()">Avanzar 2 años ▶</button></div>';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="requestConfirmLeave(\'doBackToMenuNow\')">Volver</button>' +
      '</div>' +
      playerModeCardHtml(p) +
      bodyHtml +
      playerModeTrophyCaseHtml(p) +
      playerModeHistoryHtml(p) +
    '</div>'
  );
}
