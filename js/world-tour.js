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
  // banquillo: reservas de la época (Jude, Erik y Bobby NO están aquí --
  // se unen más adelante como en la historia real, ver
  // WORLD_TOUR_STORY_JOINS).
  ['r40', 46]                                                           // Willy
]);
// Fichajes que se unen solos durante el recorrido, como en la historia
// real (a petición explícita): Jude Sharp llega al ganar a la Royal
// Academy, Erik Eagle y Bobby Shearer al ganar al Kirkwood -- solo si
// empezaste con el Raimon (con un equipo aleatorio no aplica). El número
// ya NO es su media fija: es un extra sobre la media actual de tu equipo
// (worldTourTeamScore) en ese momento, a petición explícita ("jude tiene
// que salir con más media cuando se una") -- así siempre llega siendo una
// mejora de verdad, no un fichaje flojo si ya vas muy por encima del
// número fijo de antes. Jude (fichaje "estrella") sube más que Erik/Bobby.
var WORLD_TOUR_STORY_JOINS = {
  royal: [['r04', 8, 'Jude Sharp']],
  kirkwood: [['r10', 4, 'Erik Eagle'], ['r16', 3, 'Bobby Shearer']]
};
// Personajes "especiales" (secundarios/de refuerzo, no del once fijo de
// la temporada 1): Austin Hobbs, Shadow Cimmerian y Paul Peabody -- a
// petición explícita, con un botón propio para incluirlos o no en el
// banquillo del Raimon.
var WORLD_TOUR_RAIMON_SPECIALS = wtSquad([['r09', 46], ['r39', 45], ['r41', 44]]);

// Equipos de Inazuma Eleven 1, en el orden real del torneo Fútbol
// Frontier (Occult primero) más el Equipo Ogro como rival final tras el
// Zeus, a petición explícita. Todos los jugadores son reales del roster
// (Occult y Wild tienen su once completo ya cargado -- ver roster-data.js
// ids r80-r101 y r83-r93; Umbrella y el Equipo Ogro tienen su once real
// completo, ids r370-r380 y r400-r410; Brain, Otaku, Royal Academy, Zeus
// y Kirkwood tienen los que aparecen con su nombre real en el roster,
// menos de 11 en algunos casos, rellenados con jugadores genéricos sin
// cara para completar el once).
// Orden corregido a petición explícita, con los amistosos y equipos que
// faltaban: Occult, Inazuma Kids (amistoso), Wild, Umbrella (amistoso),
// Brain, Otaku, Royal Academy, Shuriken, Farm, Kirkwood, Zeus y el Equipo
// Ogro al final. SIEMPRE se juega el recorrido entero (sin elección de
// corto/completo, a petición explícita: "no pongas dos modos... son
// iguales").
var WORLD_TOUR_STAGES = [
  {
    id: 'occult', name: 'Occult', power: 48,
    players: wtSquad([['r82', 60], ['r81', 58], ['r80', 57], ['r94', 54], ['r98', 53], ['r95', 52]])
  },
  {
    // Ya no es genérico del todo: 7 personajes reales del Inazuma Kids FC
    // (ids r387-r393, sin sprite -- caen en iniciales como el resto del
    // roster sin foto), a petición explícita tras subirlos.
    id: 'inazuma-kids', name: 'Inazuma Kids', power: 40,
    players: wtSquad([['r387', 42], ['r393', 45], ['r392', 44], ['r390', 41], ['r388', 40], ['r389', 40]])
  },
  {
    id: 'wild', name: 'Wild', power: 53,
    players: wtSquad([['r83', 59], ['r84', 60], ['r93', 61], ['r91', 58], ['r89', 56], ['r85', 55]])
  },
  {
    // Ahora con su once real del Instituto Umbrella (ids r370-r380, con
    // sprite propio), en vez de los 5 genéricos de antes -- a petición
    // explícita, tras subir esos jugadores nuevos al roster.
    id: 'umbrella', name: 'Umbrella', power: 44,
    players: wtSquad([['r370', 47], ['r378', 49], ['r379', 48], ['r371', 45], ['r372', 45], ['r375', 44]])
  },
  {
    id: 'brain', name: 'Brain', power: 58,
    players: wtSquad([['r151', 61], ['r154', 62], ['r155', 63], ['r152', 58], ['r156', 60], ['r157', 59]])
  },
  {
    // Ya no es la única excepción sin nombre real: Sam Idol, Light Nobel,
    // Walter Valiant (r381-r383) y Gus Gamer, Mark Gambling (capitán) y
    // Theodore Master (r384-r386), todos con sprite propio, cubren
    // portero/defensa/centro/delantero; Comodín se queda genérico para
    // una segunda defensa, a petición explícita.
    id: 'otaku', name: 'Otaku', power: 45,
    players: wtSquad([['r381', 50], ['r383', 52], ['r382', 48], ['r385', 53], ['r384', 51], ['r386', 50]]).concat([
      wtPlayerGeneric('wt_otaku_4', 'Comodín', 'Defensa', 'Montaña', 49)
    ])
  },
  {
    id: 'royal', name: 'Royal Academy', power: 65,
    players: wtSquad([['r134', 67], ['r186', 66], ['r231', 63], ['r232', 65], ['r185', 64]])
  },
  {
    id: 'shuriken', name: 'Shuriken', power: 68,
    players: wtSquad([['r163', 69], ['r160', 68], ['r161', 67], ['r158', 65], ['r159', 64], ['r162', 66]])
  },
  {
    id: 'farm', name: 'Farm', power: 70,
    players: wtSquad([['r167', 71], ['r168', 70], ['r169', 69], ['r165', 67], ['r166', 66], ['r164', 65]])
  },
  {
    // Los hermanos Ash (r236-238, la plantilla fuerte de una saga
    // posterior) más 6 jugadores reales del Kirkwood del primer anime
    // (r394-399, sin sprite -- no se han subido fotos), a petición
    // explícita tras subirlos al roster.
    id: 'kirkwood', name: 'Kirkwood', power: 73,
    players: wtSquad([['r236', 74], ['r237', 72], ['r238', 71], ['r397', 65], ['r398', 62], ['r399', 61], ['r394', 60], ['r395', 60], ['r396', 59]])
  },
  {
    id: 'zeus', name: 'Zeus', power: 76,
    players: wtSquad([['r20', 77], ['r109', 75], ['r102', 73], ['r105', 72], ['r51', 71], ['r243', 74]])
  },
  {
    // Rival final, tras el Zeus, a petición explícita -- el Equipo Ogro,
    // el más fuerte de todos (ids r400-r407 nuevos + r45/r73/r74, que ya
    // estaban en el roster con esos ids para Bash Lancer/Escavan Malice/
    // Mystral Callous -- no se duplican). Sin recorrido corto/completo
    // por separado: SIEMPRE se llega hasta aquí.
    id: 'ogro', name: 'Equipo Ogro', power: 82,
    players: wtSquad([['r45', 83], ['r73', 81], ['r74', 80], ['r407', 78], ['r406', 77], ['r405', 76]])
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
// Subida de media por victoria: antes un fijo +1.2, ahora un rango de 2 a
// 4 puntos por partido (sorteado cada vez), a petición explícita ("haz
// que los jugadores suban de 2 a 4 puntos por partido"). wt.lastBoost
// guarda el valor exacto de la última victoria para poder enseñarlo en
// la pantalla del draft (antes era el mismo número siempre, ahora toca
// recordarlo).
// ===== Temporada 2 (Alius Academy): rivales con su once real del roster =====
// Orden de los partidos según la serie (de memoria, ajustable aquí): cada
// equipo usa a sus jugadores del roster y, si le faltan, se completa con
// otros jugadores de la Academia Alius para poder ofrecer draft al ganar.
var WT_T2_ALIUS_POOL = ['Alius Masters', 'Genesis', 'Caos', 'Épsilon', 'Tormenta de Géminis', 'Diamond Dust', 'Polvo de Diamante', 'Prominence'];
function wtTeamStage(id, name, ownTeams, power, fillPool) {
  fillPool = fillPool || WT_T2_ALIUS_POOL;
  var own = ROSTER.filter(function (p) { return ownTeams.indexOf(p.equipo) !== -1 && p.posicion !== 'Portero'; });
  var fill = ROSTER.filter(function (p) { return fillPool.indexOf(p.equipo) !== -1 && ownTeams.indexOf(p.equipo) === -1 && p.posicion !== 'Portero'; });
  var picked = own.slice(0, 6);
  for (var i = 0; picked.length < 6 && i < fill.length; i++) picked.push(fill[i]);
  return { id: id, name: name, power: power, players: wtSquad(picked.map(function (p, k) { return [p.id, Math.round(power + 8 - k * 1.5)]; })) };
}
// Recorrido real de Inazuma Eleven 2 (dado por el usuario). Extras por etapa:
// forcedLoss (derrota de guion), injures (lesionados, con el Raimon), leaves (se va),
// joins ([id, delta de media, nombre], se une siempre con el Raimon).
function wtStageExtra(stage, extra) { return Object.assign(stage, extra); }
function wtUmbrellaStage(id, power) {
  var base = WORLD_TOUR_STAGES.find(function (st) { return st.id === 'umbrella'; });
  return { id: id, name: 'Umbrella', power: power, players: base.players };
}
var WORLD_TOUR_STAGES_T2 = [
  wtStageExtra(wtTeamStage('t2-geminis1', 'Tormenta de Géminis', ['Tormenta de Géminis'], 70), { forcedLoss: true, injures: ['r47', 'r46', 'r49'], lossMessage: 'Derrota inevitable ante Tormenta de Géminis: Timmy, Steve y Jim se lesionan y dejan el equipo.' }),
  wtUmbrellaStage('t2-umbrella', 46),
  wtStageExtra(wtTeamStage('t2-servicio', 'Servicio Secreto', ['Servicio Secreto'], 55), { joins: [['r57', -3, 'Conwell']] }),
  wtStageExtra(wtTeamStage('t2-geminis2', 'Tormenta de Géminis', ['Tormenta de Géminis'], 66), { leaves: ['r02'], leaveMessage: 'Axel se marcha del equipo.' }),
  wtStageExtra(wtTeamStage('t2-alpino', 'Alpino', ['Alpino'], 50), { joins: [['r08', -3, 'Shawn']] }),
  wtTeamStage('t2-geminis3', 'Tormenta de Géminis', ['Tormenta de Géminis'], 68),
  wtStageExtra(wtTeamStage('t2-claustro', 'Claustro Sagrado', ['Claustro Sagrado'], 60), { joins: [['r244', -3, 'Scotty']] }),
  wtTeamStage('t2-epsilon1', 'Épsilon', ['Épsilon'], 70),
  wtTeamStage('t2-redux', 'Royal Academy Redux', ['Royal Academy'], 70),
  wtStageExtra(wtTeamStage('t2-triplec', 'Triple C', ['Triple C'], 50), { joins: [['r56', -3, 'Suzette']] }),
  wtTeamStage('t2-epsilon2', 'Épsilon', ['Épsilon'], 72),
  wtStageExtra(wtTeamStage('t2-fauxshore', 'Fauxshore', ['Fauxshore'], 42), { joins: [['r11', -3, 'Darren']] }),
  wtStageExtra(wtTeamStage('t2-genesis1', 'Genesis', ['Genesis'], 91), { forcedLoss: true, injures: ['r03', 'r12', 'r05'], lossMessage: 'Derrota inevitable ante Genesis: Nathan, Tod y Kevin se lesionan y dejan el equipo.' }),
  wtStageExtra(wtTeamStage('t2-marytimes', 'Mary Times', ['Mary Times'], 40), { joins: [['r18', -3, 'Hurley']] }),
  wtStageExtra(wtTeamStage('t2-epsilonplus', 'Épsilon Plus', ['Épsilon'], 78), { joins: [['r42', -2, 'Thor'], ['r02', -2, 'Axel']] }),
  wtStageExtra(wtTeamStage('t2-zeus', 'Zeus', ['Zeus'], 75), { joins: [['r20', -2, 'Byron']] }),
  wtTeamStage('t2-genesis2', 'Genesis', ['Genesis'], 88),
  wtTeamStage('t2-emperadores', 'Emperadores Oscuros', ['Emperadores Oscuros'], 90),
  wtTeamStage('t2-mararboles', 'Mar de Árboles', ['Mar de Árboles'], 52),
  wtTeamStage('t2-caos', 'Caos', ['Caos'], 94)
];
// ===== Temporada 3 (FFI): rivales de los mundiales, Inazuma Japón =====
// Orden de memoria (ajustable aquí). Reserva de jugadores: equipos de la temporada 3.
var WT_T3_POOL = ['Neo Japón', 'Tarjeteros', 'Ángeles Oscuros', 'FFI Estrellas', 'Orfeo', 'Unicorn', 'Pequeños Gigantes', 'Academia Ogre'];
var WORLD_TOUR_STAGES_T3 = [
  wtTeamStage('t3-leones', 'Leones del desierto', ['Leones del desierto'], 58, WT_T3_POOL),
  wtTeamStage('t3-waves', 'Big Waves', ['Big Waves'], 62, WT_T3_POOL),
  wtTeamStage('t3-neo', 'Neo Japón', ['Neo Japón'], 64, WT_T3_POOL),
  wtTeamStage('t3-dragones', 'Dragones de Fuego', ['Dragones de Fuego'], 68, WT_T3_POOL),
  wtTeamStage('t3-osreis', 'Os Reis', ['Os Reis'], 72, WT_T3_POOL),
  wtTeamStage('t3-knights', 'Knights', ['Knights'], 76, WT_T3_POOL),
  wtTeamStage('t3-orfeo', 'Orfeo', ['Orfeo'], 80, WT_T3_POOL),
  wtTeamStage('t3-angeles', 'Ángeles Oscuros', ['Ángeles Oscuros'], 85, WT_T3_POOL),
  wtTeamStage('t3-gigantes', 'Pequeños Gigantes', ['Pequeños Gigantes'], 90, WT_T3_POOL)
];
// Plantilla por defecto de Inazuma Japón (Temporada 3), con los jugadores reales del roster.
var WORLD_TOUR_IJ_BASE_IDS = [['r01', 72], ['r02', 74], ['r03', 71], ['r04', 73], ['r05', 72], ['r08', 70], ['r11', 69], ['r12', 68], ['r15', 69], ['r18', 68], ['r20', 72], ['r23', 69], ['r42', 70], ['r50', 68], ['r46', 64], ['r47', 64]];
function worldTourSetupSeason() { return G.worldTourSetupSeason === 3 ? 3 : (G.worldTourSetupSeason === 2 ? 2 : 1); }
window.actionSetWorldTourSeason = function (s) { G.worldTourSetupSeason = s === 3 ? 3 : (s === 2 ? 2 : 1); render(); };
var WORLD_TOUR_WIN_BOOST_MIN = 2;
var WORLD_TOUR_WIN_BOOST_MAX = 4;
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
function worldTourSetupMode() { return (G.worldTourSetupMode === 'duro' || G.worldTourSetupMode === 'dificil') ? G.worldTourSetupMode : 'libre'; }
window.actionSetWorldTourSetupMode = function (mode) { G.worldTourSetupMode = mode; render(); };
function worldTourSetupSpecials() { return G.worldTourSetupSpecials !== false; }
window.actionSetWorldTourSpecials = function (on) { G.worldTourSetupSpecials = !!on; render(); };
// 2 opciones más al empezar, a petición explícita: tamaño del draft (1 de
// 3, más control, o 1 de 5, más variedad) y modo Leyenda (los rivales
// suben de fuerza cada vez que completas el recorrido -- se cuenta en
// localStorage, independiente de cada partida). Antes también se podía
// elegir un recorrido corto (hasta el Brain) o completo (hasta el Zeus),
// pero a petición explícita ("no pongas dos modos... son iguales") ya no
// hay elección: SIEMPRE se juega el recorrido completo, con el Ogro
// (equipo final) al terminar el Zeus.
var WORLD_TOUR_LEGEND_KEY = 'worldTourRogue_legendWins';
function worldTourLegendWins() { try { return parseInt(localStorage.getItem(WORLD_TOUR_LEGEND_KEY), 10) || 0; } catch (e) { return 0; } }
function worldTourSetupDraftSize() { return G.worldTourSetupDraftSize === 5 ? 5 : 3; }
window.actionSetWorldTourDraftSize = function (n) { G.worldTourSetupDraftSize = n; render(); };
function worldTourSetupLegend() { return !!G.worldTourSetupLegend; }
window.actionSetWorldTourLegend = function (on) { G.worldTourSetupLegend = !!on; render(); };
function worldTourSetupSquadType() { return G.worldTourSetupSquadType === 'random' ? 'random' : 'raimon'; }
window.actionSetWorldTourSquadType = function (type) { G.worldTourSetupSquadType = type; render(); };
// Escudo por defecto del Raimon (no está en TEAM_SHIELD_FILES porque ese
// registro es de equipos RIVALES, pero el archivo sí existe).
var WORLD_TOUR_RAIMON_SHIELD = 'assets/escudos/raimon.webp';
window.actionSetWorldTourName = function (value) { G.worldTourSetupName = value; };
window.actionSetWorldTourShield = function (name) { G.worldTourSetupShield = name || null; render(); };
function renderWorldTourSetup() {
  var mode = worldTourSetupMode();
  var squadType = worldTourSetupSquadType();
  var customNameHtml = '';
  if (squadType === 'random') {
    var shieldNames = Object.keys(TEAM_SHIELD_FILES).sort(function (a, b) { return a.localeCompare(b); });
    var options = '<option value="">Escudo por defecto</option>' + shieldNames.map(function (n) {
      return '<option value="' + escapeHtml(n) + '"' + (G.worldTourSetupShield === n ? ' selected' : '') + '>' + escapeHtml(n) + '</option>';
    }).join('');
    var shieldPreview = G.worldTourSetupShield ? teamShieldPath(G.worldTourSetupShield) : PLAYER_SHIELD;
    // Mismo patrón que FutDraft 2 jugadores: nombre + escudo elegibles.
    customNameHtml =
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Nombre y escudo</h3>' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<img class="team-shield" style="width:56px;height:56px;margin:0" src="' + escapeHtml(shieldPreview) + '" alt="">' +
          '<div style="flex:1;min-width:0">' +
            '<label class="dim small">Nombre del equipo</label>' +
            '<input class="select-field" type="text" maxlength="24" data-focus-key="wt-name" placeholder="Tu Equipo" value="' + escapeHtml(G.worldTourSetupName || '') + '" oninput="actionSetWorldTourName(this.value)">' +
          '</div>' +
        '</div>' +
        '<label class="dim small mt">Escudo</label>' +
        '<select class="select-field" onchange="actionSetWorldTourShield(this.value)">' + options + '</select>' +
      '</div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">Modo Mundial</h2>' +
        '<p class="dim small">Recorre los equipos de Inazuma Eleven 1, empezando por el Occult. Cada victoria sube un poco tu media y te deja fichar a un jugador real del equipo derrotado (como un draft).</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Temporada</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (worldTourSetupSeason() === 1 ? ' active' : '') + '" onclick="actionSetWorldTourSeason(1)">Temporada 1</button>' +
          '<button class="btn btn-tiny' + (worldTourSetupSeason() === 2 ? ' active' : '') + '" onclick="actionSetWorldTourSeason(2)">Temporada 2</button>' +
          '<button class="btn btn-tiny' + (worldTourSetupSeason() === 3 ? ' active' : '') + '" onclick="actionSetWorldTourSeason(3)">Temporada 3</button>' +
        '</div>' +
        '<p class="dim small center-text mt">' + (worldTourSetupSeason() === 1 ? 'Los equipos de Inazuma Eleven 1, del Occult al Equipo Ogro.' : worldTourSetupSeason() === 2 ? 'Los partidos de la Academia Alius de Inazuma Eleven 2, de Tormenta de Géminis a los Alius Masters.' : 'El torneo mundial de Inazuma Eleven 3, con Inazuma Japón, de los Leones del desierto a los Pequeños Gigantes.') + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Tu equipo</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (squadType === 'raimon' ? ' active' : '') + '" onclick="actionSetWorldTourSquadType(\'raimon\')">Raimon</button>' +
          '<button class="btn btn-tiny' + (squadType === 'random' ? ' active' : '') + '" onclick="actionSetWorldTourSquadType(\'random\')">Aleatorio</button>' +
        '</div>' +
        '<p class="dim small center-text mt">' + (squadType === 'raimon' ? 'El once base de Inazuma Eleven 1, todos por debajo de 75 de media.' : '11 jugadores al azar de toda la franquicia, también por debajo de 75.') + '</p>' +
      '</div>' +
      customNameHtml +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Al perder</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (mode === 'libre' ? ' active' : '') + '" onclick="actionSetWorldTourSetupMode(\'libre\')">Reintentar</button>' +
          '<button class="btn btn-tiny' + (mode === 'duro' ? ' active' : '') + '" onclick="actionSetWorldTourSetupMode(\'duro\')">Racha</button>' +
          '<button class="btn btn-tiny' + (mode === 'dificil' ? ' active' : '') + '" onclick="actionSetWorldTourSetupMode(\'dificil\')">Difícil</button>' +
        '</div>' +
        '<p class="dim small center-text mt">' + (mode === 'libre' ? 'Si pierdes, te quedas en el mismo rival y lo repites.' : mode === 'duro' ? 'Si pierdes, vuelves al Occult, pero tu plantilla conserva la media y los fichajes ganados.' : 'Si pierdes, vuelves al Occult con la plantilla inicial de cero, sin ninguna mejora ni fichaje ganado.') + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Draft</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (worldTourSetupDraftSize() === 3 ? ' active' : '') + '" onclick="actionSetWorldTourDraftSize(3)">1 de 3</button>' +
          '<button class="btn btn-tiny' + (worldTourSetupDraftSize() === 5 ? ' active' : '') + '" onclick="actionSetWorldTourDraftSize(5)">1 de 5</button>' +
        '</div>' +
        '<p class="dim small center-text mt">' + (worldTourSetupDraftSize() === 3 ? 'Menos opciones, más control sobre quién sale.' : 'Más variedad, menos control.') + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Modo Leyenda</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (worldTourSetupLegend() ? ' active' : '') + '" onclick="actionSetWorldTourLegend(true)">Sí</button>' +
          '<button class="btn btn-tiny' + (!worldTourSetupLegend() ? ' active' : '') + '" onclick="actionSetWorldTourLegend(false)">No</button>' +
        '</div>' +
        '<p class="dim small center-text mt">Los rivales suben de fuerza con cada recorrido completo que ya hayas terminado (llevas ' + worldTourLegendWins() + ').</p>' +
      '</div>' +
      (squadType === 'raimon' ? (
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px" class="center-text">Especiales</h3>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny' + (worldTourSetupSpecials() ? ' active' : '') + '" onclick="actionSetWorldTourSpecials(true)">Sí</button>' +
          '<button class="btn btn-tiny' + (!worldTourSetupSpecials() ? ' active' : '') + '" onclick="actionSetWorldTourSpecials(false)">No</button>' +
        '</div>' +
        '<p class="dim small center-text mt">Austin Hobbs, Shadow Cimmerian y Paul Peabody en el banquillo del Raimon (personajes secundarios de refuerzo).</p>' +
      '</div>') : '') +
      '<div class="panel center-text">' +
        '<button class="btn btn-primary btn-block" onclick="actionStartWorldTour()">Listo</button>' +
      '</div>' +
    '</div>'
  );
}
window.actionGoWorldTour = function () {
  G.screen = 'worldTourSetup';
  render();
};
window.actionStartWorldTour = function () {
  var useRandom = worldTourSetupSquadType() === 'random';
  var squad = useRandom ? worldTourRandomSquad() : (worldTourSetupSeason() === 3 ? wtSquad(WORLD_TOUR_IJ_BASE_IDS) : WORLD_TOUR_RAIMON_BASE.map(function (p) { return Object.assign({}, p); }));
  if (!useRandom && worldTourSetupSpecials()) squad = squad.concat(WORLD_TOUR_RAIMON_SPECIALS.map(function (p) { return Object.assign({}, p); }));
  var legend = worldTourSetupLegend();
  var legendBoost = legend ? worldTourLegendWins() * 3 : 0;
  // Modo Leyenda: los rivales suben de fuerza según cuántos recorridos
  // completos llevas ya terminados (contador en localStorage, no en esta
  // partida) -- clonado aparte para no tocar nunca la potencia base.
  // Siempre el recorrido completo (ver comentario de arriba).
  var season = worldTourSetupSeason();
  var seasonBoost = season === 2 ? 10 : 0;
  if (seasonBoost && !useRandom) squad.forEach(function (p) { p.tiro += seasonBoost; p.pase += seasonBoost; p.defensa += seasonBoost; p.especial += seasonBoost; });
  var stages = (season === 3 ? WORLD_TOUR_STAGES_T3 : season === 2 ? WORLD_TOUR_STAGES_T2 : WORLD_TOUR_STAGES).slice().map(function (st) {
    return legendBoost ? Object.assign({}, st, { power: Math.min(99, st.power + legendBoost) }) : st;
  });
  G.worldTour = {
    squad: squad,
    // Plantilla inicial guardada tal cual (clones aparte, no referencias)
    // para el modo Difícil: al perder, se vuelve a ESTA plantilla exacta,
    // sin ninguna de las mejoras ni fichajes ganados -- a petición
    // explícita ("un modo donde cuando pierdes, vuelves a empezar desde
    // el Occult y sin las mejoras ni nada, como un modo difícil").
    startingSquad: squad.map(function (p) { return Object.assign({}, p); }),
    isRaimon: !useRandom,
    season: season,
    teamName: useRandom ? ((G.worldTourSetupName || '').trim() || 'Tu Equipo') : (season === 3 ? 'Inazuma Japón' : 'Raimon'),
    teamShieldName: useRandom ? (G.worldTourSetupShield || null) : null,
    formationId: WORLD_TOUR_DEFAULT_FORMATION,
    captainId: null,
    stages: stages,
    draftSize: worldTourSetupDraftSize(),
    legend: legend,
    stageIndex: 0,
    cleared: [],
    pendingDraft: null,
    pendingEvent: null,
    won: false,
    mode: worldTourSetupMode(),
    // Entrenador por defecto: Hillman con el Raimon, uno al azar con un
    // equipo aleatorio (se puede cambiar en Alineación).
    coachId: !useRandom ? 'c01' : COACHES[Math.floor(Math.random() * COACHES.length)].id,
    lastLossMessage: null,
    lastJoinMessage: null
  };
  G.screen = 'worldTourHome';
  render();
};
// Misma tarjeta de "Tú vs rival" que Modo Carrera, pero con tu nombre y
// escudo del Modo Mundial (antes salía "Tú" con el escudo de la web,
// otro sitio donde se coló el mismo bug).
function worldTourMatchupCardHtml(oppName, contextLabel) {
  var wt = G.worldTour;
  var youSideHtml =
    '<div class="matchup-side">' +
      '<img class="matchup-shield" src="' + escapeHtml(worldTourShieldPath()) + '" alt="">' +
      '<div class="matchup-name">' + escapeHtml(wt.teamName) + '</div>' +
    '</div>';
  var oppSideHtml =
    '<div class="matchup-side">' +
      '<img class="matchup-shield" src="' + escapeHtml(teamShieldPath(oppName)) + '" alt="">' +
      '<div class="matchup-name">' + escapeHtml(oppName) + '</div>' +
    '</div>';
  return '<div class="panel matchup-card">' +
    (contextLabel ? '<p class="dim small center-text">' + contextLabel + '</p>' : '') +
    '<div class="matchup-row">' + youSideHtml + '<div class="matchup-vs">VS</div>' + oppSideHtml + '</div>' +
  '</div>';
}
function worldTourShieldPath() {
  var wt = G.worldTour;
  if (!wt) return WORLD_TOUR_RAIMON_SHIELD;
  if (wt.isRaimon) return wt.season === 3 ? teamShieldPath('Inazuma Japon') : WORLD_TOUR_RAIMON_SHIELD;
  return wt.teamShieldName ? teamShieldPath(wt.teamShieldName) : PLAYER_SHIELD;
}

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
// Solo tras GANAR (nunca al perder) -- a petición explícita. Se guarda
// como wt.pendingEvent (no un simple texto) para poder enseñarlo en su
// propia pantalla con dibujo, en vez de una línea suelta en Jornada.
function worldTourRandomEvent(wt) {
  worldTourTickInjuries(wt);
  wt.pendingEvent = null;
  if (Math.random() > 0.5 || !wt.squad.length) return;
  var pool = wt.squad.filter(function (p) { return !(p.injuredMatches > 0); });
  if (!pool.length) return;
  var p = pool[Math.floor(Math.random() * pool.length)];
  var roll = Math.random();
  if (roll < 0.4) {
    p.tiro += 5; p.pase += 5; p.defensa += 5; p.especial += 5;
    wt.pendingEvent = { kind: 'boost', player: p, title: '¡Racha de forma!', text: p.nombre + ' sube +5 de media.' };
  } else if (roll < 0.75) {
    p.tiro = Math.max(20, p.tiro - 4); p.pase = Math.max(20, p.pase - 4); p.defensa = Math.max(20, p.defensa - 4); p.especial = Math.max(20, p.especial - 4);
    wt.pendingEvent = { kind: 'drop', player: p, title: 'Bajón de forma', text: p.nombre + ' baja -4 de media.' };
  } else {
    var matches = rand(1, 2);
    p.injuredMatches = matches;
    var idx = wt.squad.indexOf(p);
    if (idx !== -1) { wt.squad.splice(idx, 1); wt.squad.push(p); }
    wt.pendingEvent = { kind: 'injury', player: p, title: 'Lesión', text: p.nombre + ' no podrá jugar ' + matches + ' partido' + (matches > 1 ? 's' : '') + '.' };
  }
}

function worldTourLineup() {
  return futDraftBuildLineup(G.worldTour.squad.slice(0, 11), G.worldTour.formationId || WORLD_TOUR_DEFAULT_FORMATION);
}
function worldTourTeamScore() {
  return futDraftTeamScore(worldTourLineup(), G.worldTour.captainId || null);
}
function worldTourStage() {
  return (G.worldTour.stages || WORLD_TOUR_STAGES)[G.worldTour.stageIndex];
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
  var styleOptionsHtml = CAREER_PLAY_STYLES.map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === worldTourPlayStyle(G.worldTour).id ? ' selected' : '') + '>' + s.name + '</option>';
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
      return '<div class="' + cls + '" onclick="selectFutDraftPlayer(\'' + p.id + '\')">' + (f.captainId === p.id ? '<span class="futdraft-captain-badge" title="Capitán">👑</span>' : '') + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + (injured ? ' 🤕' : '') + '</span></div>';
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
      tacTabsHtml() +
      (G.tacTab === 'tactica'
        ? '<div class="panel">' +
            '<h3 style="margin-bottom:8px">Estilo de juego</h3>' +
            '<select class="select-field" onchange="actionSetWorldTourPlayStyle(this.value)">' + styleOptionsHtml + '</select>' +
          '</div>' +
          '<div class="panel">' +
            '<h3 style="margin-bottom:4px">Entrenador</h3>' +
            '<p class="dim small">Suma ataque y defensa, y con su intensidad.</p>' +
            (coachById(G.worldTour.coachId) ? coachCardHtml(coachById(G.worldTour.coachId), true, '') : '') +
          '</div>' +
          tacticsPanelHtml({ foul: G.worldTour.foulStyle || 'medio', intensity: G.worldTour.intensity || 'media' }, 'actionSetWorldTourTactic', false)
        : '<div class="panel">' +
            '<h3 style="margin-bottom:8px">Formación</h3>' +
            '<div class="view-toggle view-toggle-wrap">' + formationBtns + '</div>' +
            renderFutDraftLineupPitch(f) +
          '</div>' +
          benchHtml +
          '<div class="panel center-text">' +
            '<h3 style="margin-bottom:8px">Bonificación de atributo</h3>' +
            '<div>' + elementCountsHtml + '</div>' +
          '</div>') +
    '</div>'
  );
}

function renderWorldTourHome() {
  var wt = G.worldTour;
  if (wt.won) {
    return '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mb0">🏆 ¡Recorrido completo!</h2>' +
        '<p class="dim small">Has ganado a todos los equipos, incluido el ' + escapeHtml(wt.stages[wt.stages.length - 1].name) + '. Media final del equipo: <strong style="color:var(--accent-2)">' + worldTourTeamScore() + '</strong> / 100.</p>' +
      '</div>' +
      '<div class="panel">' + renderFutDraftPitch(wt.squad.slice(0, 11), wt.formationId || WORLD_TOUR_DEFAULT_FORMATION, false, coachById(wt.coachId) || null) + '</div>' +
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
        '<p class="dim small">Equipo ' + (wt.stageIndex + 1) + ' de ' + wt.stages.length + ' · Tu media: <strong style="color:var(--accent-2)">' + score + '</strong> / 100 · Plantilla: ' + wt.squad.length + '</p>' +
      '</div>' +
      (wt.lastLossMessage ? '<div class="panel center-text"><p class="dim small">' + escapeHtml(wt.lastLossMessage) + '</p></div>' : '') +
      (wt.lastJoinMessage ? '<div class="panel center-text"><p class="dim small">' + escapeHtml(wt.lastJoinMessage) + '</p></div>' : '') +
      worldTourMatchupCardHtml(stage.name, 'Rival ' + (wt.stageIndex + 1)) +
      '<div class="panel">' +
        '<div class="match-mode-picker">' +
          '<button class="match-mode-card" onclick="actionPlayWorldTourMatch()"><span class="match-mode-icon">⚽</span><strong>Ver partido</strong><span class="dim small">Partido en vivo</span></button>' +
          '<button class="match-mode-card" onclick="actionSimulateWorldTourMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
          '<button class="match-mode-card" onclick="actionSkipWorldTourMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
        '</div>' +
        '<button class="btn btn-outline btn-block mt" onclick="actionGoWorldTourLineup()">Alineación</button>' +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Tu once</h3>' + renderFutDraftPitch(wt.squad.slice(0, 11), wt.formationId || WORLD_TOUR_DEFAULT_FORMATION, false, coachById(wt.coachId) || null) + '</div>' +
    '</div>'
  );
}

// Las 3 formas de vivir el partido (mismo patrón que Jornada de Modo
// Carrera): puentea G.futdraft con la plantilla del Modo Mundial y
// reutiliza el motor de FutDraft/Liga tal cual.
// Estilo de juego (muy defensiva/defensiva/equilibrado/ofensiva/muy
// ofensiva), igual que Gestionar plantilla de Modo Carrera -- a petición
// explícita ("haz que en modo mundial puedas configurar formación y
// defensivo, muy defensivo, equilibrado, ofensivo... como en modo
// carrera"). Reutiliza CAREER_PLAY_STYLES/CAREER_PLAY_STYLE_CONTRADICTION_DAMPEN
// tal cual (misma escala, mismo criterio de sinergia con la formación).
function worldTourPlayStyle(wt) {
  return CAREER_PLAY_STYLES.find(function (s) { return s.id === wt.playStyle; }) || CAREER_PLAY_STYLES[2];
}
function worldTourPlayStyleModifiers(wt) {
  var style = worldTourPlayStyle(wt);
  var formation = FUTDRAFT_FORMATIONS.find(function (ft) { return ft.id === (wt.formationId || WORLD_TOUR_DEFAULT_FORMATION); }) || FUTDRAFT_FORMATIONS[0];
  var styleLean = style.atk - style.def;
  var formationLean = formation.atk - formation.def;
  var aligned = styleLean === 0 || formationLean === 0 || (styleLean > 0) === (formationLean > 0);
  var blend = aligned ? 1 : CAREER_PLAY_STYLE_CONTRADICTION_DAMPEN;
  return { atk: 1 + (style.atk - 1) * blend, def: 1 + (style.def - 1) * blend };
}
window.actionSetWorldTourCoach = function (id) {
  if (!coachById(id)) return;
  G.worldTour.coachId = id;
  render();
};
window.actionSetWorldTourTactic = function (key, val) {
  var wt = G.worldTour;
  if (key === 'foul') wt.foulStyle = val; else if (key === 'intensity') wt.intensity = val;
  render();
};
window.actionSetWorldTourPlayStyle = function (id) {
  if (!CAREER_PLAY_STYLES.some(function (s) { return s.id === id; })) return;
  G.worldTour.playStyle = id;
  render();
};
function worldTourBridgeFutdraft(stage) {
  var wt = G.worldTour;
  // El aviso de "fulano se une al equipo" solo tiene sentido justo tras
  // la victoria que lo trae -- antes se quedaba pegado en pantalla en
  // TODOS los partidos siguientes hasta el próximo fichaje, a petición
  // explícita ("el mensaje de jude sharp se une al equipo no tiene que
  // quedarse para todos los partidos"). Se borra en cuanto empiezas el
  // partido siguiente (Jugar/Simular/Saltar), que es cuando ya lo has visto.
  wt.lastJoinMessage = null;
  var lineup = worldTourLineup();
  // Goleadores rivales reales del equipo de la etapa (no del pool
  // genérico de "no drafteados"), sin porteros -- a petición explícita
  // ("los jugadores que te puedan meter gol en cada equipo, sean los de
  // su propio equipo... menos los porteros"). Los rellenos genéricos
  // (wtPlayerGeneric, sin sprite) cuentan igual: tienen nombre propio de
  // ese equipo aunque no tengan cara.
  var oppPlayersOverride = stage ? stage.players.filter(function (p) { return p.posicion !== 'Portero'; }) : null;
  var styleMods = worldTourPlayStyleModifiers(wt);
  G.futdraft = { coach: coachById(wt.coachId), coachChosenStyle: wt.playStyle || 'equilibrado', lineup: lineup, squad: wt.squad.slice(), captainId: wt.captainId || null, formation: wt.formationId || WORLD_TOUR_DEFAULT_FORMATION, condition: 'ninguna', tactics: { foul: wt.foulStyle || 'medio', intensity: wt.intensity || 'media' }, teamScoreOverride: futDraftTeamScore(lineup, wt.captainId || null), oppPlayersOverride: oppPlayersOverride && oppPlayersOverride.length ? oppPlayersOverride : null, styleAtkMult: styleMods.atk, styleDefMult: styleMods.def };
}
window.actionSimulateWorldTourMatch = function (visualMode) {
  var stage = worldTourStage();
  if (!stage || G.worldTour.won) return;
  worldTourBridgeFutdraft(stage);
  var sim = worldTourRigSim(stage, futDraftSimulateMatchCore(stage.power));
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
  if (!stage || G.worldTour.won) return;
  worldTourBridgeFutdraft(stage);
  var sim = worldTourRigSim(stage, futDraftSimulateMatchCore(stage.power));
  G.futdraft.live = { oppSide: { name: stage.name }, modifier: sim.modifier, myGoals: sim.myGoals, oppGoals: sim.oppGoals, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals, revealed: sim.timeline, myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower, isWorldTour: true, youAreHome: true };
  finishWorldTourMatch();
};
// Empate: se decide con una tanda de penaltis resumida (mismo criterio
// que la Copa del Rey de Modo Carrera, careerCupPenaltyShootout), sin
// pantalla de tanda completa, para no salirse del flujo de 3 botones.
function worldTourRigSim(stage, sim) {
  if (!stage.forcedLoss || sim.myGoals < sim.oppGoals) return sim;
  var f = G.futdraft;
  var myPlayers = f.lineup.map(function (s) { return s.player; });
  var oppPlayers = (f.oppPlayersOverride && f.oppPlayersOverride.length) ? f.oppPlayersOverride : stage.players;
  sim.oppGoals = sim.myGoals + 1 + (Math.random() < 0.5 ? 1 : 0);
  sim.timeline = futDraftBuildTimeline(sim.myGoals, sim.oppGoals, myPlayers, oppPlayers);
  return sim;
}
function worldTourPenaltyShootout(oppPower) {
  if (G.futdraft && G.futdraft.live && G.futdraft.live.penaltyResult) return G.futdraft.live.penaltyResult;
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
  if (futDraftLivePenaltyGate(live, stage.name || (G.futdraft.oppName) || 'Rival', worldTourTeamScore() - stage.power, myGoals === oppGoals, finishWorldTourMatch)) return;
  var penalty = myGoals === oppGoals ? worldTourPenaltyShootout(stage.power) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : myGoals > oppGoals;
  if (stage.forcedLoss) playerWon = false;

  if (stage.forcedLoss) {
    // Derrota de guion (como en la serie): la historia sigue sin repetir el partido.
    wt.stageIndex++;
    wt.lastLossMessage = wt.isRaimon ? stage.lossMessage : 'Derrota inevitable: la historia sigue.';
    if (wt.isRaimon && stage.injures) {
      var hurt = [];
      stage.injures.forEach(function (id) {
        var i = wt.squad.findIndex(function (p) { return p.id === id; });
        if (i === -1) return;
        var pl = wt.squad.splice(i, 1)[0];
        hurt.push(pl.nombre);
      });
    }
  } else if (playerWon) {
    var boost = Math.round(rand(WORLD_TOUR_WIN_BOOST_MIN, WORLD_TOUR_WIN_BOOST_MAX) * 10) / 10;
    wt.lastBoost = boost;
    wt.squad.forEach(function (p) { p.tiro += boost; p.pase += boost; p.defensa += boost; p.especial += boost; });
    wt.cleared.push(stage.id);
    // No ofrecer en el draft a jugadores que ya tienes en la plantilla --
    // a petición explícita.
    var squadIds = wt.squad.map(function (p) { return p.id; });
    var joinIds = (stage.joins || []).map(function (j) { return j[0]; });
    var available = stage.players.filter(function (p) { return squadIds.indexOf(p.id) === -1 && joinIds.indexOf(p.id) === -1; });
    var options = available.slice().sort(function () { return Math.random() - 0.5; }).slice(0, wt.draftSize || 3);
    // Los fichajes del draft ya no salen con la media fija de la etapa
    // (quedaban flojísimos a mitad de recorrido, cuando tu equipo ya ha
    // subido mucho más) -- ahora se reescalan a la media ACTUAL de tu
    // equipo, como mucho +2 por encima y como mínimo -4 por debajo, a
    // petición explícita. Clones aparte (no se toca stage.players, que se
    // reutiliza cada vez que se enseña esta etapa).
    var myScore = worldTourTeamScore();
    options = options.map(function (p) {
      var ovr = Math.round(clamp(myScore + rand(-4, 2), 30, 99));
      return wtFromRoster(p.id, ovr) || p;
    });
    if (options.length) wt.pendingDraft = { stageId: stage.id, options: options };
    wt.stageIndex++;
    wt.lastLossMessage = null;
    // Fichajes que se unen solos, como en la historia real (solo con el
    // Raimon) -- a petición explícita. Su media ya no es fija (ver
    // WORLD_TOUR_STORY_JOINS): se calcula sobre tu media actual, tras
    // aplicar ya la subida por la victoria de esta etapa.
    if (wt.isRaimon && stage.leaves) {
      wt.squad = wt.squad.filter(function (p) { return stage.leaves.indexOf(p.id) === -1; });
    }
    if (wt.isRaimon && (stage.joins || WORLD_TOUR_STORY_JOINS[stage.id])) {
      var joinedNames = [];
      var teamScoreForJoins = worldTourTeamScore();
      (stage.joins || WORLD_TOUR_STORY_JOINS[stage.id]).forEach(function (j) {
        var already = wt.squad.some(function (p) { return p.id === j[0]; });
        if (already) return;
        var joinOvr = Math.round(clamp(teamScoreForJoins + j[1], 30, 99));
        var clone = wtFromRoster(j[0], joinOvr);
        if (clone) { wt.squad.push(clone); joinedNames.push(j[2]); }
      });
      if (joinedNames.length) wt.lastJoinMessage = '🆕 ' + joinedNames.join(' y ') + ' se une' + (joinedNames.length > 1 ? 'n' : '') + ' al equipo.';
    }
    if (wt.stageIndex >= wt.stages.length) {
      wt.won = true;
      profileTitle('mundial');
      // Modo Leyenda: se cuenta cada vez que se termina el recorrido
      // entero (siempre completo ahora, ver comentario de arriba).
      try { localStorage.setItem(WORLD_TOUR_LEGEND_KEY, String(worldTourLegendWins() + 1)); } catch (e) {}
    }
    // El evento aleatorio solo pasa al GANAR, nunca al perder -- a
    // petición explícita.
    worldTourRandomEvent(wt);
  } else if (wt.mode === 'dificil') {
    // Difícil: pierdes, vuelves al Occult con la plantilla inicial EXACTA
    // (startingSquad, clonada de nuevo para no compartir referencias),
    // perdiendo toda la media ganada y los fichajes del draft -- a
    // petición explícita ("vuelves a empezar desde el Occult y sin las
    // mejoras ni nada, como un modo difícil").
    wt.stageIndex = 0;
    wt.cleared = [];
    wt.squad = wt.startingSquad.map(function (p) { return Object.assign({}, p); });
    wt.pendingDraft = null;
    wt.lastLossMessage = 'Derrota en modo Difícil: vuelves al Occult con la plantilla inicial, sin mejoras ni fichajes.';
  } else if (wt.mode === 'duro' && wt.stageIndex > 0) {
    // Racha: pierdes, vuelves al Occult -- pero la plantilla conserva
    // todo lo ganado (media y fichajes), a petición explícita.
    wt.stageIndex = 0;
    wt.cleared = [];
    wt.lastLossMessage = 'Racha rota: vuelves al Occult, pero tu plantilla conserva lo ganado.';
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
  G.screen = wt.pendingEvent ? 'worldTourEvent' : wt.pendingDraft ? 'worldTourDraft' : 'worldTourHome';
  render();
};
// Pantalla propia con dibujo para el evento aleatorio (antes solo era una
// línea de texto en Jornada) -- a petición explícita ("que tenga una
// pantalla especial con dibujos, no que salga como ahora").
var WORLD_TOUR_EVENT_STYLE = {
  boost: { icon: '📈', color: 'var(--success)' },
  drop: { icon: '📉', color: 'var(--danger)' },
  injury: { icon: '🤕', color: 'var(--danger)' }
};
function renderWorldTourEvent() {
  var wt = G.worldTour;
  var ev = wt.pendingEvent;
  if (!ev) { G.screen = wt.pendingDraft ? 'worldTourDraft' : 'worldTourHome'; return wt.pendingDraft ? renderWorldTourDraft() : renderWorldTourHome(); }
  var style = WORLD_TOUR_EVENT_STYLE[ev.kind];
  return (
    '<div class="screen">' +
      '<div class="panel center-text" style="border:2px solid ' + style.color + '">' +
        '<div style="font-size:3.4rem;line-height:1">' + style.icon + '</div>' +
        '<h2 class="panel-title mt mb0">' + escapeHtml(ev.title) + '</h2>' +
        '<div class="mt" style="display:flex;justify-content:center">' + avatarHtml(ev.player) + '</div>' +
        '<p class="dim small mt">' + escapeHtml(ev.text) + '</p>' +
      '</div>' +
      '<div class="panel center-text"><button class="btn btn-primary btn-block" onclick="actionDismissWorldTourEvent()">Seguir</button></div>' +
    '</div>'
  );
}
window.actionDismissWorldTourEvent = function () {
  var wt = G.worldTour;
  wt.pendingEvent = null;
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
        '<p class="dim small">Tu equipo sube +' + (wt.lastBoost || WORLD_TOUR_WIN_BOOST_MIN) + ' de media. Elige a uno de estos jugadores para fichar:</p>' +
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
