/* ---------------------------------------------------------------------
   18. MODO MUNDIAL: recorres los equipos de Inazuma Eleven 1 empezando
   por el Occult, con TU equipo (el Raimon base de la temporada 1, o uno
   aleatorio, siempre con media por debajo de 75) -- a petición explícita
   ("recorrieras el mundo de Inazuma... primero juegas contra el Occult...
   una vez les ganes, tus jugadores subirán un poquito de media, y además
   puedes fichar uno de los tres/cinco. Eso tiene que ser como un draft").
   Cada victoria: +1 de media para todo tu equipo y un draft de 1 entre 3
   jugadores reales del equipo que acabas de ganar, que se suma a tu
   plantilla. Usa el mismo motor de partido que el resto de la app
   (futDraftSimulateMatchCore/futDraftLiveTick), con los 3 mismos botones
   que en Jornada de Modo Carrera: Jugar (puntitos), Simular, Saltar.
   Los jugadores de este modo son SIEMPRE clones de personajes reales del
   ROSTER (mismo id/nombre/tipo/posicion/sprite, así que avatarHtml enseña
   su cara real) con las 4 stats aplanadas a un "ovr" propio de este modo
   (independiente de sus stats reales, para mantener el tope de 75 al
   empezar) -- a petición explícita ("tienen que salir con caras y
   basarse en los personajes ya existentes del roster").
   --------------------------------------------------------------------- */

function wtFromRoster(id, ovr) {
  var src = ROSTER.find(function (p) { return p.id === id; });
  if (!src) return null;
  return { id: src.id, nombre: src.nombre, posicion: src.posicion, tipo: src.tipo, sprite: src.sprite || null, hissatsu: src.hissatsu || [], tiro: ovr, pase: ovr, defensa: ovr, especial: ovr };
}
function wtSquad(defs) {
  return defs.map(function (d) { return wtFromRoster(d[0], d[1]); }).filter(Boolean);
}

// Once base del Raimon en Inazuma Eleven 1 (temporada 1, antes de que el
// equipo se hiciera fuerte de verdad): jugadores reales del roster, todos
// por debajo de 75 de media, a petición explícita.
// Once real de la temporada 1 (Saga de Mark) según la wiki de Inazuma
// (https://inazuma.fandom.com/es/wiki/Instituto_Raimon, dorsales 1-11):
// Mark, Nathan, Jack, Jim, Tod, Steve, Timmy, Sam, Max, Axel y Kevin.
// Jude Sharp (dorsal 14) es un fichaje real de la Royal Academy y Erik
// Eagle (16) y Bobby Shearer (13) se unen más tarde, contra el Kirkwood
// -- a petición explícita, empiezan en el banquillo, no en el once
// inicial. Todos personajes reales y "normales" (nunca versiones "Osc."
// ni de otra línea temporal).
var WORLD_TOUR_RAIMON_BASE = wtSquad([
  ['r01', 52],                                                          // Mark Evans (portero)
  ['r03', 50], ['r06', 48], ['r49', 47], ['r12', 46],                   // Nathan, Jack, Jim, Tod
  ['r46', 51], ['r47', 49], ['r178', 50], ['r48', 49],                  // Steve, Timmy, Sam, Max
  ['r02', 58], ['r05', 53],                                             // Axel, Kevin
  // banquillo: se unen más adelante o son reservas de la época
  ['r04', 54], ['r16', 45], ['r10', 48],                                // Jude, Bobby, Erik
  ['r40', 46]                                                           // Willy
]);
// Personajes "especiales" (secundarios/de refuerzo, no del once fijo de
// la temporada 1): Austin Hobbs, Shadow Cimmerian y Paul Peabody -- a
// petición explícita, con un botón propio para incluirlos o no en el
// banquillo del Raimon.
var WORLD_TOUR_RAIMON_SPECIALS = wtSquad([['r09', 46], ['r39', 45], ['r41', 44]]);

// 7 equipos de Inazuma Eleven 1, en el orden real del torneo Fútbol
// Frontier (Occult primero, Kirkwood el más fuerte al final). Todos los
// jugadores son reales del roster (Occult y Wild tienen su once completo
// ya cargado -- ver roster-data.js ids r80-r101 y r83-r93; Brain, Royal
// Academy, Zeus y Kirkwood tienen los que aparecen con su nombre real en
// el roster, menos de 11 en algunos casos). El Otaku es la única
// excepción: no tiene ningún personaje con nombre propio en el roster,
// así que sus 5 jugadores son genéricos (estimados, como el resto de
// rellenos de esta app) y sin cara.
var WORLD_TOUR_STAGES = [
  {
    id: 'occult', name: 'Occult', power: 48,
    players: wtSquad([['r82', 60], ['r81', 58], ['r80', 57], ['r94', 54], ['r98', 53], ['r95', 52]])
  },
  {
    id: 'wild', name: 'Wild', power: 53,
    players: wtSquad([['r83', 59], ['r84', 60], ['r93', 61], ['r91', 58], ['r89', 56], ['r85', 55]])
  },
  {
    id: 'brain', name: 'Brain', power: 58,
    players: wtSquad([['r151', 61], ['r154', 62], ['r155', 63], ['r152', 58], ['r156', 60], ['r157', 59]])
  },
  {
    id: 'otaku', name: 'Otaku', power: 45,
    players: [
      wtPlayerGeneric('wt_otaku_1', 'Capitán Pixel', 'Portero', 'Viento', 50),
      wtPlayerGeneric('wt_otaku_2', 'Byte', 'Centrocampista', 'Bosque', 52),
      wtPlayerGeneric('wt_otaku_3', 'Cursor', 'Delantero', 'Fuego', 53),
      wtPlayerGeneric('wt_otaku_4', 'Comodín', 'Defensa', 'Montaña', 49),
      wtPlayerGeneric('wt_otaku_5', 'Renderman', 'Defensa', 'Viento', 48)
    ]
  },
  {
    id: 'royal', name: 'Royal Academy', power: 65,
    players: wtSquad([['r134', 67], ['r186', 66], ['r231', 63], ['r232', 65], ['r185', 64]])
  },
  {
    id: 'zeus', name: 'Zeus', power: 69,
    players: wtSquad([['r20', 70], ['r109', 68], ['r102', 66], ['r105', 65], ['r51', 64], ['r243', 67]])
  },
  {
    id: 'kirkwood', name: 'Kirkwood', power: 73,
    players: wtSquad([['r236', 74], ['r237', 72], ['r238', 71]])
  }
];
// Jugador genérico (solo el Otaku, que no tiene personajes con nombre
// propio en el roster) -- sin sprite, avatarHtml cae en sus iniciales.
function wtPlayerGeneric(id, nombre, posicion, tipo, ovr) {
  return { id: id, nombre: nombre, posicion: posicion, tipo: tipo, sprite: null, hissatsu: [], tiro: ovr, pase: ovr, defensa: ovr, especial: ovr };
}

// Cuánto sube la media de TODO tu equipo tras cada victoria (aparte del
// jugador nuevo que fichas por el draft) -- a petición explícita ("tus
// jugadores subirán un poquito de media").
var WORLD_TOUR_WIN_BOOST = 1.2;
var WORLD_TOUR_DEFAULT_FORMATION = '442';

function worldTourRandomSquad() {
  // Equipo aleatorio: 11 jugadores reales del ROSTER (cualquier equipo,
  // cualquier época) pero con su media rebajada a menos de 75 para este
  // modo, a petición explícita ("también podrías tener un equipo
  // aleatorio, todos con media de menos de 75").
  var byPos = { Portero: [], Defensa: [], Centrocampista: [], Delantero: [] };
  ROSTER.forEach(function (p) { if (byPos[p.posicion]) byPos[p.posicion].push(p); });
  var need = { Portero: 1, Defensa: 4, Centrocampista: 4, Delantero: 2 };
  var squad = [];
  Object.keys(need).forEach(function (pos) {
    var pool = byPos[pos].slice().sort(function () { return Math.random() - 0.5; });
    for (var i = 0; i < need[pos] && i < pool.length; i++) {
      var src = pool[i];
      var realOvr = (src.tiro + src.pase + src.defensa + src.especial) / 4;
      var ovr = Math.round(clamp(realOvr * 0.68, 42, 74));
      var clone = wtFromRoster(src.id, ovr);
      if (clone) squad.push(clone);
    }
  });
  return squad;
}

// Modo al perder (a petición explícita, "haz dos modos... que se
// reintente desde cero, o que empiezas desde cero pero conservando las
// mejoras de las medias"): 'libre' te deja reintentar el mismo rival sin
// más; 'duro' te manda otra vez al primer rival (Occult) al perder, pero
// tu plantilla conserva todo lo ganado hasta entonces (media y fichajes).
function worldTourSetupMode() { return G.worldTourSetupMode === 'duro' ? 'duro' : 'libre'; }
window.actionSetWorldTourSetupMode = function (mode) { G.worldTourSetupMode = mode; render(); };
function worldTourSetupSpecials() { return G.worldTourSetupSpecials !== false; }
window.actionSetWorldTourSpecials = function (on) { G.worldTourSetupSpecials = !!on; render(); };
function renderWorldTourSetup() {
  var mode = worldTourSetupMode();
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Modo Mundial</h2>' +
        '<p class="dim small">Recorre los equipos de Inazuma Eleven 1, empezando por el Occult. Cada victoria sube un poco tu media y te deja fichar a un jugador real del equipo derrotado (como un draft).</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Al perder</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (mode === 'libre' ? ' active' : '') + '" onclick="actionSetWorldTourSetupMode(\'libre\')">Reintentar</button>' +
          '<button class="btn btn-tiny' + (mode === 'duro' ? ' active' : '') + '" onclick="actionSetWorldTourSetupMode(\'duro\')">Racha</button>' +
        '</div>' +
        '<p class="dim small center-text mt">' + (mode === 'libre' ? 'Si pierdes, te quedas en el mismo rival y lo repites.' : 'Si pierdes, vuelves al Occult, pero tu plantilla conserva la media y los fichajes ganados.') + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Especiales</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (worldTourSetupSpecials() ? ' active' : '') + '" onclick="actionSetWorldTourSpecials(true)">Sí</button>' +
          '<button class="btn btn-tiny' + (!worldTourSetupSpecials() ? ' active' : '') + '" onclick="actionSetWorldTourSpecials(false)">No</button>' +
        '</div>' +
        '<p class="dim small center-text mt">Austin Hobbs, Shadow Cimmerian y Paul Peabody en el banquillo del Raimon (personajes secundarios de refuerzo).</p>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<button class="btn btn-primary btn-block" onclick="actionStartWorldTour(false)">Raimon</button>' +
        '<p class="dim small">El once base de Inazuma Eleven 1, todos por debajo de 75 de media.</p>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionStartWorldTour(true)">Aleatorio</button>' +
        '<p class="dim small">11 jugadores al azar de toda la franquicia, también por debajo de 75.</p>' +
      '</div>' +
    '</div>'
  );
}
window.actionGoWorldTour = function () {
  G.screen = 'worldTourSetup';
  render();
};
window.actionStartWorldTour = function (useRandom) {
  var squad = useRandom ? worldTourRandomSquad() : WORLD_TOUR_RAIMON_BASE.map(function (p) { return Object.assign({}, p); });
  if (!useRandom && worldTourSetupSpecials()) squad = squad.concat(WORLD_TOUR_RAIMON_SPECIALS.map(function (p) { return Object.assign({}, p); }));
  G.worldTour = {
    squad: squad,
    formationId: WORLD_TOUR_DEFAULT_FORMATION,
    captainId: null,
    stageIndex: 0,
    cleared: [],
    pendingDraft: null,
    won: false,
    mode: worldTourSetupMode(),
    lastLossMessage: null,
    lastEventMessage: null
  };
  G.screen = 'worldTourHome';
  render();
};

// Evento aleatorio entre partido y partido (a petición explícita: "que
// alguno suba 5 puntos, alguno pierda 4, algún jugador se lesione y no
// pueda jugar"). Se resuelve después de CADA partido (ganado o perdido).
// Las lesiones se cuentan en partidos, no en tiempo -- cada partido que
// juegas les resta 1 (worldTourTickInjuries); mientras dura, el jugador
// se manda al fondo de la plantilla para que slice(0, 11) no lo escoja
// solo en las pantallas que ya construyen el once así (Alineación, la
// vista previa y el propio partido).
function worldTourTickInjuries(wt) {
  wt.squad.forEach(function (p) { if (p.injuredMatches > 0) p.injuredMatches--; });
}
function worldTourRandomEvent(wt) {
  worldTourTickInjuries(wt);
  if (Math.random() > 0.5 || !wt.squad.length) { wt.lastEventMessage = null; return; }
  var pool = wt.squad.filter(function (p) { return !(p.injuredMatches > 0); });
  if (!pool.length) { wt.lastEventMessage = null; return; }
  var p = pool[Math.floor(Math.random() * pool.length)];
  var roll = Math.random();
  if (roll < 0.4) {
    p.tiro += 5; p.pase += 5; p.defensa += 5; p.especial += 5;
    wt.lastEventMessage = '📈 ' + p.nombre + ' está en racha: +5 de media.';
  } else if (roll < 0.75) {
    p.tiro = Math.max(20, p.tiro - 4); p.pase = Math.max(20, p.pase - 4); p.defensa = Math.max(20, p.defensa - 4); p.especial = Math.max(20, p.especial - 4);
    wt.lastEventMessage = '📉 ' + p.nombre + ' flojea: -4 de media.';
  } else {
    var matches = rand(1, 2);
    p.injuredMatches = matches;
    var idx = wt.squad.indexOf(p);
    if (idx !== -1) { wt.squad.splice(idx, 1); wt.squad.push(p); }
    wt.lastEventMessage = '🤕 ' + p.nombre + ' se lesiona: no puede jugar ' + matches + ' partido' + (matches > 1 ? 's' : '') + '.';
  }
}

function worldTourLineup() {
  return futDraftBuildLineup(G.worldTour.squad.slice(0, 11), G.worldTour.formationId || WORLD_TOUR_DEFAULT_FORMATION);
}
function worldTourTeamScore() {
  return futDraftTeamScore(worldTourLineup(), G.worldTour.captainId || null);
}
function worldTourStage() {
  return WORLD_TOUR_STAGES[G.worldTour.stageIndex];
}

// ===== Alineación ("Prepartido"): misma pantalla y mecánica que "Tu
// once inicial" de FutDraft (renderFutDraftTeam/selectFutDraftPlayer/
// setFutDraftFormation), puenteando G.futdraft con la plantilla del
// Modo Mundial -- a petición explícita ("que tenga el formato que hay
// en mi plantilla... poner alineación, prepartido, elegir bien a los
// jugadores"). Al salir se guarda de vuelta en G.worldTour.
window.actionGoWorldTourLineup = function () {
  var wt = G.worldTour;
  G.futdraft = {
    lineup: futDraftBuildLineup(wt.squad.slice(0, 11), wt.formationId || WORLD_TOUR_DEFAULT_FORMATION),
    bench: wt.squad.slice(11),
    captainId: wt.captainId || null,
    formation: wt.formationId || WORLD_TOUR_DEFAULT_FORMATION,
    mode: 'worldTour',
    swapSelectedId: null, pickingCaptain: false
  };
  G.screen = 'worldTourLineup';
  render();
};
window.actionWorldTourLineupDone = function () {
  var wt = G.worldTour, f = G.futdraft;
  wt.squad = f.lineup.map(function (s) { return s.player; }).concat(f.bench);
  wt.formationId = f.formation;
  wt.captainId = f.captainId;
  G.screen = 'worldTourHome';
  render();
};
// Misma pantalla que renderFutDraftTeam (js/futdraft-draft.js), pero con
// el botón de salida propio del Modo Mundial en vez de "Volver al menú"
// y sin el pie de compartir/empezar torneo (no aplica aquí).
function renderWorldTourLineup() {
  var f = G.futdraft;
  var hasBench = f.bench.length > 0;
  var breakdown = futDraftScoreBreakdown(f.lineup, f.captainId);
  var captain = f.captainId ? f.lineup.find(function (s) { return s.player.id === f.captainId; }) : null;
  var formationBtns = futDraftAvailableFormations().map(function (ft) {
    return '<button class="btn-tiny' + (f.formation === ft.id ? ' active' : '') + '" onclick="setFutDraftFormation(\'' + ft.id + '\')">' + ft.name + '</button>';
  }).join('');
  var captainHint = !captain
    ? 'Sin capitán elegido.'
    : 'Capitán: <strong>' + escapeHtml(captain.player.nombre) + '</strong> (' + (breakdown.captainBonus > 0 ? '+' : '') + breakdown.captainBonus + ' a la puntuación).';
  var elementCounts = futDraftElementCounts(f);
  var elementCountsHtml = TYPES.map(function (t) {
    return '<span class="type-badge type-' + t.toLowerCase().replace('ñ', 'n') + '" style="margin:2px">' + getTypeSymbol(t) + ' ' + elementCounts[t] + '/' + FUTDRAFT_SYNERGY_THRESHOLD + '</span>';
  }).join(' ');
  var benchHtml = '';
  if (hasBench) {
    var benchItemsHtml = f.bench.map(function (p) {
      var cls = 'pitch-player futdraft-swappable' + (f.swapSelectedId === p.id ? ' selected' : '');
      var injured = p.injuredMatches > 0;
      return '<div class="' + cls + '" onclick="selectFutDraftPlayer(\'' + p.id + '\')">' + (f.captainId === p.id ? '<span class="futdraft-captain-badge" title="Capitán">👑</span>' : '') + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + (injured ? ' 🤕' : '') + '</span><span class="dim small">' + Math.round(futDraftPlayerScore(p)) + '</span></div>';
    }).join('');
    benchHtml = '<div class="panel"><h3 style="margin-bottom:4px">Banquillo</h3><div class="pitch-row" style="justify-content:center;flex-wrap:wrap">' + benchItemsHtml + '</div></div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionWorldTourLineupDone()">Listo</button>' +
        '<h2 class="panel-title mt mb0">Alineación</h2>' +
        '<p class="dim small">Puntuación de equipo: <strong style="color:var(--accent-2)">' + breakdown.total + '</strong> / 100</p>' +
        '<p class="dim small">Toca a dos jugadores para cambiarlos.</p>' +
        '<p class="dim small">' + captainHint + '</p>' +
        '<button class="btn btn-tiny' + (f.pickingCaptain ? ' active' : '') + '" onclick="toggleFutDraftCaptainMode()">' + (f.pickingCaptain ? 'Toca un titular…' : 'Elegir capitán 👑') + '</button>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Formación</h3>' +
        '<div class="view-toggle view-toggle-wrap">' + formationBtns + '</div>' +
        renderFutDraftLineupPitch(f) +
      '</div>' +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:8px">Bonificación de atributo</h3>' +
        '<div>' + elementCountsHtml + '</div>' +
      '</div>' +
      benchHtml +
    '</div>'
  );
}

function renderWorldTourHome() {
  var wt = G.worldTour;
  if (wt.won) {
    return '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mb0">🏆 ¡Recorrido completo!</h2>' +
        '<p class="dim small">Has ganado a los 7 equipos de Inazuma Eleven 1. Media final del equipo: <strong style="color:var(--accent-2)">' + worldTourTeamScore() + '</strong> / 100.</p>' +
      '</div>' +
      '<div class="panel">' + renderFutDraftPitch(wt.squad.slice(0, 11), wt.formationId || WORLD_TOUR_DEFAULT_FORMATION, false) + '</div>' +
      '<div class="panel center-text"><button class="btn btn-primary btn-block" onclick="actionGoWorldTour()">Repetir</button><button class="btn btn-outline btn-block mt" onclick="actionBackToMenu()">Menú</button></div>' +
    '</div>';
  }
  var stage = worldTourStage();
  var score = worldTourTeamScore();
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Modo Mundial</h2>' +
        '<p class="dim small">Equipo ' + (wt.stageIndex + 1) + ' de ' + WORLD_TOUR_STAGES.length + ' · Tu media: <strong style="color:var(--accent-2)">' + score + '</strong> / 100 · Plantilla: ' + wt.squad.length + '</p>' +
      '</div>' +
      (wt.lastLossMessage ? '<div class="panel center-text"><p class="dim small">' + escapeHtml(wt.lastLossMessage) + '</p></div>' : '') +
      (wt.lastEventMessage ? '<div class="panel center-text"><p class="dim small">' + escapeHtml(wt.lastEventMessage) + '</p></div>' : '') +
      careerMatchupCardHtml(stage.name, 'Rival ' + (wt.stageIndex + 1)) +
      '<div class="panel">' +
        '<div class="match-mode-picker">' +
          '<button class="match-mode-card" onclick="actionPlayWorldTourMatch()"><span class="match-mode-icon">⚽</span><strong>Jugar</strong><span class="dim small">Puntitos en directo</span></button>' +
          '<button class="match-mode-card" onclick="actionSimulateWorldTourMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
          '<button class="match-mode-card" onclick="actionSkipWorldTourMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
        '</div>' +
        '<button class="btn btn-outline btn-block mt" onclick="actionGoWorldTourLineup()">Alineación</button>' +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Tu once</h3>' + renderFutDraftPitch(wt.squad.slice(0, 11), wt.formationId || WORLD_TOUR_DEFAULT_FORMATION, false) + '</div>' +
    '</div>'
  );
}

// Las 3 formas de vivir el partido (mismo patrón que Jornada de Modo
// Carrera): puentea G.futdraft con la plantilla del Modo Mundial y
// reutiliza el motor de FutDraft/Liga tal cual.
function worldTourBridgeFutdraft() {
  var wt = G.worldTour;
  var lineup = worldTourLineup();
  G.futdraft = { lineup: lineup, squad: wt.squad.slice(), captainId: wt.captainId || null, formation: wt.formationId || WORLD_TOUR_DEFAULT_FORMATION, condition: 'ninguna', teamScoreOverride: futDraftTeamScore(lineup, wt.captainId || null) };
}
window.actionSimulateWorldTourMatch = function (visualMode) {
  var stage = worldTourStage();
  worldTourBridgeFutdraft();
  var sim = futDraftSimulateMatchCore(stage.power);
  G.futdraft.live = {
    oppSide: { name: stage.name }, modifier: sim.modifier,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    inExtraTime: false, allowDraw: false, onFinish: finishWorldTourMatch,
    isCareer: false, isWorldTour: true, youAreHome: true,
    visualMode: visualMode || 'avatars',
    done: false
  };
  G.screen = 'futdraftLive';
  playKickoffSound();
  render();
  futDraftLiveTick();
};
window.actionPlayWorldTourMatch = function () { actionSimulateWorldTourMatch('dots'); };
window.actionSkipWorldTourMatch = function () {
  var stage = worldTourStage();
  worldTourBridgeFutdraft();
  var sim = futDraftSimulateMatchCore(stage.power);
  G.futdraft.live = { oppSide: { name: stage.name }, modifier: sim.modifier, myGoals: sim.myGoals, oppGoals: sim.oppGoals, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals, revealed: sim.timeline, myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower, isWorldTour: true, youAreHome: true };
  finishWorldTourMatch();
};
// Empate: se decide con una tanda de penaltis resumida (mismo criterio
// que la Copa del Rey de Modo Carrera, careerCupPenaltyShootout), sin
// pantalla de tanda completa, para no salirse del flujo de 3 botones.
function worldTourPenaltyShootout(oppPower) {
  var myScore = worldTourTeamScore();
  var diff = myScore - oppPower;
  var myChance = futDraftPenaltyShotChance(diff);
  var rivalChance = futDraftPenaltyShotChance(-diff);
  var myGoals = 0, rivalGoals = 0, round = 1;
  while (true) {
    if (Math.random() < myChance) myGoals++;
    if (Math.random() < rivalChance) rivalGoals++;
    if (round >= PENALTY_MODE_ROUNDS && myGoals !== rivalGoals) break;
    round++;
  }
  return { myGoals: myGoals, oppGoals: rivalGoals };
}
function finishWorldTourMatch() {
  var wt = G.worldTour;
  var stage = worldTourStage();
  var live = G.futdraft.live;
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  var penalty = myGoals === oppGoals ? worldTourPenaltyShootout(stage.power) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : myGoals > oppGoals;

  if (playerWon) {
    wt.squad.forEach(function (p) { p.tiro += WORLD_TOUR_WIN_BOOST; p.pase += WORLD_TOUR_WIN_BOOST; p.defensa += WORLD_TOUR_WIN_BOOST; p.especial += WORLD_TOUR_WIN_BOOST; });
    wt.cleared.push(stage.id);
    var options = stage.players.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    wt.pendingDraft = { stageId: stage.id, options: options };
    wt.stageIndex++;
    wt.lastLossMessage = null;
    if (wt.stageIndex >= WORLD_TOUR_STAGES.length) wt.won = true;
  } else if (wt.mode === 'duro' && wt.stageIndex > 0) {
    // Racha: pierdes, vuelves al Occult -- pero la plantilla conserva
    // todo lo ganado (media y fichajes), a petición explícita.
    wt.stageIndex = 0;
    wt.cleared = [];
    wt.lastLossMessage = 'Racha rota: vuelves al Occult, pero tu plantilla conserva lo ganado.';
  }
  worldTourRandomEvent(wt);

  G.futdraft.lastMatchResult = {
    oppName: stage.name, oppShield: teamShieldPath(stage.name), oppPower: stage.power,
    myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon,
    timeline: live.revealed, modifier: live.modifier, isWorldTour: true, youAreHome: true, penalty: penalty
  };
  G.futdraft.live = null;
  G.screen = 'futdraftMatchResult';
  render();
}
window.continueWorldTourMatch = function () {
  var wt = G.worldTour;
  G.screen = wt.pendingDraft ? 'worldTourDraft' : 'worldTourHome';
  render();
};

function renderWorldTourDraft() {
  var wt = G.worldTour;
  var draft = wt.pendingDraft;
  if (!draft) { G.screen = 'worldTourHome'; return renderWorldTourHome(); }
  var itemsHtml = draft.options.map(function (p, idx) {
    return '<button class="shop-item" style="width:100%;text-align:left" onclick="actionPickWorldTourDraft(' + idx + ')">' +
      avatarHtml(p) +
      '<div style="flex:1"><strong>' + escapeHtml(p.nombre) + '</strong><div class="dim small">' + escapeHtml(p.posicion) + ' · ' + Math.round(p.tiro) + ' de media</div></div>' +
    '</button>';
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mb0">🎉 ¡Has ganado!</h2>' +
        '<p class="dim small">Tu equipo sube +' + WORLD_TOUR_WIN_BOOST + ' de media. Elige a uno de estos jugadores para fichar:</p>' +
      '</div>' +
      '<div class="panel">' + itemsHtml + '</div>' +
    '</div>'
  );
}
window.actionPickWorldTourDraft = function (idx) {
  var wt = G.worldTour;
  var draft = wt.pendingDraft;
  if (!draft) return;
  var picked = draft.options[idx];
  if (!picked) return;
  wt.squad.push(Object.assign({}, picked));
  wt.pendingDraft = null;
  G.screen = 'worldTourHome';
  render();
};
