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
   Los jugadores de este modo son objetos ligeros propios (no vienen del
   ROSTER principal, ids con prefijo "wt_") pero con los mismos campos
   que necesita el motor de partido (tiro/pase/defensa/especial/tipo/
   posicion/nombre), así que avatarHtml y el resto de piezas reutilizadas
   funcionan igual, solo que sin sprite (caen en las iniciales).
   --------------------------------------------------------------------- */

function wtPlayer(id, nombre, posicion, tipo, ovr) {
  return { id: id, nombre: nombre, posicion: posicion, tipo: tipo, tiro: ovr, pase: ovr, defensa: ovr, especial: ovr, hissatsu: [], sprite: null };
}

// Once base del Raimon en Inazuma Eleven 1 (temporada 1, antes de que el
// equipo se hiciera fuerte de verdad): todos por debajo de 75 de media,
// a petición explícita.
var WORLD_TOUR_RAIMON_BASE = [
  wtPlayer('wt_r_gk', 'Mark Evans', 'Portero', 'Bosque', 52),
  wtPlayer('wt_r_df1', 'Nathan Swift', 'Defensa', 'Montaña', 50),
  wtPlayer('wt_r_df2', 'Jack Wallside', 'Defensa', 'Montaña', 48),
  wtPlayer('wt_r_df3', 'Shawn Froste', 'Defensa', 'Viento', 49),
  wtPlayer('wt_r_df4', 'Bobby Shearer', 'Defensa', 'Viento', 46),
  wtPlayer('wt_r_mf1', 'Jude Sharp', 'Centrocampista', 'Viento', 56),
  wtPlayer('wt_r_mf2', 'Caleb Stonewall', 'Centrocampista', 'Montaña', 51),
  wtPlayer('wt_r_mf3', 'Erik Eagle', 'Centrocampista', 'Viento', 50),
  wtPlayer('wt_r_mf4', 'Jordan Greenway', 'Centrocampista', 'Bosque', 49),
  wtPlayer('wt_r_fw1', 'Axel Blaze', 'Delantero', 'Fuego', 58),
  wtPlayer('wt_r_fw2', 'Kevin Dragonfly', 'Delantero', 'Fuego', 53)
];

// 7 equipos de Inazuma Eleven 1, en el orden real del torneo Fútbol
// Frontier (Occult primero, Kirkwood el más fuerte al final) -- nombres
// reales de la franquicia (ver roster-data.js: Talisman/Wolf/Mask del
// Occult, Boar/Chicken del Wild, Feldt del Brain, etc.); el Otaku no
// tiene jugadores con nombre propio en el roster, así que los suyos son
// genéricos ("estimados", como el resto de rellenos de esta app). Todos
// los equipos rivales también están por debajo de 75 de fuerza.
var WORLD_TOUR_STAGES = [
  {
    id: 'occult', name: 'Occult', power: 48,
    players: [
      wtPlayer('wt_occult_1', 'Talisman', 'Delantero', 'Bosque', 60),
      wtPlayer('wt_occult_2', 'Wolf', 'Centrocampista', 'Montaña', 58),
      wtPlayer('wt_occult_3', 'Mask', 'Portero', 'Viento', 57),
      wtPlayer('wt_occult_4', 'Styx', 'Defensa', 'Montaña', 54),
      wtPlayer('wt_occult_5', 'Caronte', 'Defensa', 'Montaña', 51)
    ]
  },
  {
    id: 'wild', name: 'Wild', power: 53,
    players: [
      wtPlayer('wt_wild_1', 'Boar', 'Portero', 'Fuego', 59),
      wtPlayer('wt_wild_2', 'Chicken', 'Centrocampista', 'Viento', 60),
      wtPlayer('wt_wild_3', 'Cheetah', 'Delantero', 'Fuego', 61),
      wtPlayer('wt_wild_4', 'Rhino', 'Defensa', 'Montaña', 55),
      wtPlayer('wt_wild_5', 'Panther', 'Defensa', 'Bosque', 53)
    ]
  },
  {
    id: 'brain', name: 'Brain', power: 58,
    players: [
      wtPlayer('wt_brain_1', 'Feldt', 'Portero', 'Viento', 61),
      wtPlayer('wt_brain_2', 'Francis Tell', 'Centrocampista', 'Bosque', 62),
      wtPlayer('wt_brain_3', 'Samuel Buster', 'Centrocampista', 'Fuego', 63),
      wtPlayer('wt_brain_4', 'Philip Marvel', 'Defensa', 'Montaña', 58),
      wtPlayer('wt_brain_5', 'Jonathan Seller', 'Defensa', 'Montaña', 56)
    ]
  },
  {
    id: 'otaku', name: 'Otaku', power: 45,
    players: [
      wtPlayer('wt_otaku_1', 'Capitán Pixel', 'Portero', 'Viento', 50),
      wtPlayer('wt_otaku_2', 'Byte', 'Centrocampista', 'Bosque', 52),
      wtPlayer('wt_otaku_3', 'Cursor', 'Delantero', 'Fuego', 53),
      wtPlayer('wt_otaku_4', 'Comodín', 'Defensa', 'Montaña', 49),
      wtPlayer('wt_otaku_5', 'Renderman', 'Defensa', 'Viento', 48)
    ]
  },
  {
    id: 'royal', name: 'Royal Academy', power: 65,
    players: [
      wtPlayer('wt_royal_1', 'Ray Dark', 'Centrocampista', 'Viento', 67),
      wtPlayer('wt_royal_2', 'Derek Swing', 'Centrocampista', 'Bosque', 66),
      wtPlayer('wt_royal_3', 'Daniel Hatch', 'Defensa', 'Montaña', 63),
      wtPlayer('wt_royal_4', 'Dracon Yale', 'Defensa', 'Montaña', 62),
      wtPlayer('wt_royal_5', 'Rex Remington', 'Defensa', 'Fuego', 61)
    ]
  },
  {
    id: 'zeus', name: 'Zeus', power: 69,
    players: [
      wtPlayer('wt_zeus_1', 'Byron Love', 'Centrocampista', 'Fuego', 70),
      wtPlayer('wt_zeus_2', 'Hera', 'Centrocampista', 'Viento', 68),
      wtPlayer('wt_zeus_3', 'Apollo', 'Defensa', 'Fuego', 66),
      wtPlayer('wt_zeus_4', 'Perseo', 'Defensa', 'Montaña', 65),
      wtPlayer('wt_zeus_5', 'Paul Siddon', 'Portero', 'Bosque', 64)
    ]
  },
  {
    id: 'kirkwood', name: 'Kirkwood', power: 73,
    players: [
      wtPlayer('wt_kirk_1', 'Bay Laurel', 'Centrocampista', 'Montaña', 74),
      wtPlayer('wt_kirk_2', 'Langford Ash', 'Centrocampista', 'Bosque', 72),
      wtPlayer('wt_kirk_3', 'Malcolm Night', 'Defensa', 'Montaña', 69),
      wtPlayer('wt_kirk_4', 'Bram Ndefinido', 'Defensa', 'Viento', 68),
      wtPlayer('wt_kirk_5', 'Ozrock Stonewall', 'Delantero', 'Fuego', 71)
    ]
  }
];

// Cuánto sube la media de TODO tu equipo tras cada victoria (aparte del
// jugador nuevo que fichas por el draft) -- a petición explícita ("tus
// jugadores subirán un poquito de media").
var WORLD_TOUR_WIN_BOOST = 1.2;
var WORLD_TOUR_FORMATION = '442';

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
      squad.push(wtPlayer('wt_rand_' + src.id, src.nombre, pos, src.tipo, ovr));
    }
  });
  return squad;
}

window.actionGoWorldTour = function () {
  G.screen = 'worldTourSetup';
  render();
};
window.actionStartWorldTour = function (useRandom) {
  G.worldTour = {
    squad: useRandom ? worldTourRandomSquad() : WORLD_TOUR_RAIMON_BASE.map(function (p) { return Object.assign({}, p); }),
    stageIndex: 0,
    cleared: [],
    pendingDraft: null,
    won: false
  };
  G.screen = 'worldTourHome';
  render();
};

function worldTourLineup() {
  return futDraftBuildLineup(G.worldTour.squad.slice(0, 11), WORLD_TOUR_FORMATION);
}
function worldTourTeamScore() {
  return futDraftTeamScore(worldTourLineup(), null);
}
function worldTourStage() {
  return WORLD_TOUR_STAGES[G.worldTour.stageIndex];
}

function renderWorldTourSetup() {
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Modo Mundial</h2>' +
        '<p class="dim small">Recorre los equipos de Inazuma Eleven 1, empezando por el Occult. Cada victoria sube un poco tu media y te deja fichar a un jugador del equipo derrotado, elegido al azar entre varios (como un draft).</p>' +
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

function renderWorldTourHome() {
  var wt = G.worldTour;
  if (wt.won) {
    return '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mb0">🏆 ¡Recorrido completo!</h2>' +
        '<p class="dim small">Has ganado a los 7 equipos de Inazuma Eleven 1. Media final del equipo: <strong style="color:var(--accent-2)">' + worldTourTeamScore() + '</strong> / 100.</p>' +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Tu plantilla final (' + wt.squad.length + ')</h3>' +
        '<div class="pitch-row" style="justify-content:center;flex-wrap:wrap">' + wt.squad.map(function (p) { return '<div class="pitch-player" style="width:60px"><span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>'; }).join('') + '</div>' +
      '</div>' +
      '<div class="panel center-text"><button class="btn btn-primary btn-block" onclick="actionGoWorldTour()">Volver a jugar</button><button class="btn btn-outline btn-block mt" onclick="actionBackToMenu()">Menú</button></div>' +
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
      careerMatchupCardHtml(stage.name, 'Rival ' + (wt.stageIndex + 1)) +
      '<div class="panel">' +
        '<div class="match-mode-picker">' +
          '<button class="match-mode-card" onclick="actionPlayWorldTourMatch()"><span class="match-mode-icon">⚽</span><strong>Jugar</strong><span class="dim small">Puntitos en directo</span></button>' +
          '<button class="match-mode-card" onclick="actionSimulateWorldTourMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
          '<button class="match-mode-card" onclick="actionSkipWorldTourMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Tu plantilla</h3>' +
        '<div class="pitch-row" style="justify-content:center;flex-wrap:wrap">' + wt.squad.map(function (p) { return '<div class="pitch-player" style="width:56px">' + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>'; }).join('') + '</div>' +
      '</div>' +
    '</div>'
  );
}

// Las 3 formas de vivir el partido (mismo patrón que Jornada de Modo
// Carrera): puentea G.futdraft con la plantilla del Modo Mundial y
// reutiliza el motor de FutDraft/Liga tal cual.
function worldTourBridgeFutdraft() {
  var lineup = worldTourLineup();
  G.futdraft = { lineup: lineup, squad: G.worldTour.squad.slice(), captainId: null, formation: WORLD_TOUR_FORMATION, condition: 'ninguna', teamScoreOverride: futDraftTeamScore(lineup, null) };
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
    if (wt.stageIndex >= WORLD_TOUR_STAGES.length) wt.won = true;
  }

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
        '<p class="dim small">Tu equipo sube +' + WORLD_TOUR_WIN_BOOST + ' de media. Elige a uno de estos 3 jugadores para fichar:</p>' +
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
