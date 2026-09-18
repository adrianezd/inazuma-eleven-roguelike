/* ---------------------------------------------------------------------
   15d. FUTDRAFT: modo independiente (sin plantilla persistente ni mapa).
   Draft de 11 jugadores de 1 en 1 eligiendo entre 3 opciones, con la
   formación que elijas se calcula el once titular y una puntuación de
   equipo, y se juegan 3 partidos con resultado aleatorio en base a esa
   puntuación, la formación y la fuerza real (TEAM_POWER) del rival de
   turno. No usa el plantel de espíritu del jugador ni da puntos al
   terminar, igual que Modo Penaltis.
   --------------------------------------------------------------------- */

var FUTDRAFT_SQUAD_SIZE = 11;
// Los 4 modos (Libre, Clásico, Afinidad y Liga, que reutiliza este mismo
// draft) draftean siempre 5 suplentes además del once (16 picks en
// total). En la pantalla de equipo se pueden hacer cambios ILIMITADOS
// antes de empezar el torneo, tanto entre titular y suplente como entre
// dos titulares (para reubicarlos de línea).
var FUTDRAFT_LIBRE_TOTAL = 16;
// Topes por posición durante el draft (banquillo, o todo el draft en modo
// Libre): la suma de los topes menos las 11 plazas del once da exactamente
// el hueco disponible para banquillo en CUALQUIER formación (todas suman
// 11 titulares), así que tiene que ser al menos FUTDRAFT_LIBRE_TOTAL -
// FUTDRAFT_SQUAD_SIZE (5) para que siempre se puedan draftear los 5
// suplentes sin quedarse corto -- Delantero sube de 4 a 5 para eso.
var FUTDRAFT_POS_CAPS = { Portero: 1, Defensa: 5, Centrocampista: 5, Delantero: 5 };

var FUTDRAFT_FORMATIONS = [
  { id: '442', name: '4-4-2', rows: [
      { pos: 'Delantero', count: 2 }, { pos: 'Centrocampista', count: 4 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 1.0, def: 1.12 },
  { id: '433', name: '4-3-3', rows: [
      { pos: 'Delantero', count: 3 }, { pos: 'Centrocampista', count: 3 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 1.2, def: 0.85 },
  { id: '352', name: '3-5-2', rows: [
      { pos: 'Delantero', count: 2 }, { pos: 'Centrocampista', count: 5 },
      { pos: 'Defensa', count: 3 }, { pos: 'Portero', count: 1 }
    ], atk: 1.08, def: 1.0 },
  { id: '334', name: '3-3-4', rows: [
      { pos: 'Delantero', count: 4 }, { pos: 'Centrocampista', count: 3 },
      { pos: 'Defensa', count: 3 }, { pos: 'Portero', count: 1 }
    ], atk: 1.35, def: 0.7 },
  { id: '343', name: '3-4-3', rows: [
      { pos: 'Delantero', count: 3 }, { pos: 'Centrocampista', count: 4 },
      { pos: 'Defensa', count: 3 }, { pos: 'Portero', count: 1 }
    ], atk: 1.28, def: 0.78 },
  { id: '532', name: '5-3-2', rows: [
      { pos: 'Delantero', count: 2 }, { pos: 'Centrocampista', count: 3 },
      { pos: 'Defensa', count: 5 }, { pos: 'Portero', count: 1 }
    ], atk: 0.85, def: 1.28 },
  { id: '541', name: '5-4-1', rows: [
      { pos: 'Delantero', count: 1 }, { pos: 'Centrocampista', count: 4 },
      { pos: 'Defensa', count: 5 }, { pos: 'Portero', count: 1 }
    ], atk: 0.8, def: 1.3 },
  { id: '424', name: '4-2-4', rows: [
      { pos: 'Delantero', count: 4 }, { pos: 'Centrocampista', count: 2 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 1.25, def: 1.05 },
  { id: '523', name: '5-2-3', rows: [
      { pos: 'Delantero', count: 3 }, { pos: 'Centrocampista', count: 2 },
      { pos: 'Defensa', count: 5 }, { pos: 'Portero', count: 1 }
    ], atk: 1.05, def: 1.15 },
  { id: '451', name: '4-5-1', rows: [
      { pos: 'Delantero', count: 1 }, { pos: 'Centrocampista', count: 5 },
      { pos: 'Defensa', count: 4 }, { pos: 'Portero', count: 1 }
    ], atk: 0.85, def: 1.15 }
];

// Cada draft ofrece solo unas pocas formaciones al azar, no las 7 de
// golpe -- se elige una vez al principio (antes de draftear, en los dos
// modos) y esas mismas son las que luego se pueden alternar en la
// pantalla de equipo. Clásico ofrece 4, Libre ofrece 3.
function pickFutDraftFormationChoices(n) {
  var shuffled = FUTDRAFT_FORMATIONS.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, n).map(function (f) { return f.id; });
}
function futDraftAvailableFormations() {
  var ids = G.futdraftFormationChoices || FUTDRAFT_FORMATIONS.map(function (f) { return f.id; });
  return FUTDRAFT_FORMATIONS.filter(function (f) { return ids.indexOf(f.id) !== -1; });
}

// Por defecto "Clásico" (índice 1 de FUTDRAFT_MODE_OPTIONS), no "Libre" --
// a petición explícita.
function actionGoFutDraftModeSelect() { G.futdraftBracketSizeIdx = 0; G.futdraftModeChoiceIdx = 1; G.futdraftConditionChoiceIdx = 0; G.screen = 'futdraftModeSelect'; render(); }

// Tipo de FutDraft (antes 3 botones apilados) y tamaño del torneo (antes
// un stepper dentro de la pantalla de equipo, ver renderFutDraftTeam) se
// eligen aquí, ANTES de empezar el draft -- ambos con flechas (solo se ve
// la elección actual), a petición explícita.
var FUTDRAFT_MODE_OPTIONS = [
  { id: 'libre', name: 'Libre', desc: 'Eliges a quien quieras, sin restricción de posición.' },
  { id: 'clasico', name: 'Clásico', desc: 'El draft solo te ofrece jugadores para los huecos que falten en tu formación.' },
  { id: 'afinidad', name: 'Afinidad', desc: 'Eliges un tipo elemental antes de nada: todo tu draft sale de ese tipo.' }
];
function futDraftModeChoiceIdx() { return G.futdraftModeChoiceIdx === undefined ? 1 : G.futdraftModeChoiceIdx; }
function actionFutDraftModeStep(delta) {
  var n = FUTDRAFT_MODE_OPTIONS.length;
  G.futdraftModeChoiceIdx = ((futDraftModeChoiceIdx() + delta) % n + n) % n;
  render();
}
function actionContinueFutDraftModeSelect() {
  var modeOpt = FUTDRAFT_MODE_OPTIONS[futDraftModeChoiceIdx()];
  if (modeOpt.id === 'afinidad') actionGoFutDraftAffinitySelect();
  else actionGoFutDraftFormationSelect(modeOpt.id);
}

function renderFutDraftModeSelect() {
  var modeOpt = FUTDRAFT_MODE_OPTIONS[futDraftModeChoiceIdx()];
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt">FutDraft</h2>' +
        '<h3 style="margin-bottom:8px">Tipo de FutDraft</h3>' +
        '<div class="stepper-row">' +
          '<button class="btn stepper-arrow" onclick="actionFutDraftModeStep(-1)" aria-label="Anterior">◀</button>' +
          '<span class="stepper-value">' + modeOpt.name + '</span>' +
          '<button class="btn stepper-arrow" onclick="actionFutDraftModeStep(1)" aria-label="Siguiente">▶</button>' +
        '</div>' +
        '<p class="dim small">' + modeOpt.desc + '</p>' +
        '<h3 style="margin-bottom:8px;margin-top:14px">Tamaño del torneo</h3>' +
        '<div class="stepper-row">' +
          '<button class="btn stepper-arrow" onclick="actionFutDraftBracketSizeStep(-1)" aria-label="Anterior">◀</button>' +
          '<span class="stepper-value">' + futDraftBracketSize() + ' equipos</span>' +
          '<button class="btn stepper-arrow" onclick="actionFutDraftBracketSizeStep(1)" aria-label="Siguiente">▶</button>' +
        '</div>' +
        '<h3 style="margin-bottom:8px;margin-top:14px">Condiciones del partido</h3>' +
        '<div class="stepper-row">' +
          '<button class="btn stepper-arrow" onclick="actionFutDraftConditionStep(-1)" aria-label="Anterior">◀</button>' +
          '<span class="stepper-value">' + FUTDRAFT_CONDITION_OPTIONS[futDraftConditionChoiceIdx()].name + '</span>' +
          '<button class="btn stepper-arrow" onclick="actionFutDraftConditionStep(1)" aria-label="Siguiente">▶</button>' +
        '</div>' +
        '<p class="dim small">' + FUTDRAFT_CONDITION_OPTIONS[futDraftConditionChoiceIdx()].desc + '</p>' +
        '<button class="btn btn-primary btn-block mt" onclick="actionContinueFutDraftModeSelect()">Continuar</button>' +
      '</div>' +
    '</div>'
  );
}

function actionGoFutDraftAffinitySelect() {
  G.futdraftPendingMode = 'afinidad';
  G.screen = 'futdraftAffinitySelect';
  render();
}

function renderFutDraftAffinitySelect() {
  var btns = TYPES.map(function (t) {
    return (
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-block" onclick="actionChooseFutDraftAffinity(\'' + t + '\')">' + typeBadge(t) + '</button>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoFutDraftModeSelect()">Volver</button>' +
        '<h2 class="panel-title mt">FutDraft Afinidad</h2>' +
        '<p class="dim small">Elige un tipo elemental: todo tu draft (portero incluido) saldrá de jugadores de ese tipo.</p>' +
        btns +
      '</div>' +
    '</div>'
  );
}

function actionChooseFutDraftAffinity(tipo) {
  G.futdraftAffinity = tipo;
  G.futdraftFormationChoices = pickFutDraftFormationChoices(FUTDRAFT_FORMATION_CHOICES_BY_MODE.afinidad);
  G.screen = 'futdraftFormationSelect';
  render();
}

// Los dos modos eligen formación ANTES de draftear: Clásico ofrece 4
// formaciones al azar, Libre 3. La formación no restringe el draft Libre
// (sigue siendo libre de verdad), pero fija la vista previa del campo
// durante el draft y la formación inicial de la pantalla de equipo.
var FUTDRAFT_FORMATION_CHOICES_BY_MODE = { libre: 3, clasico: 4, afinidad: 4 };

function actionGoFutDraftFormationSelect(mode) {
  G.futdraftPendingMode = mode;
  G.futdraftFormationChoices = pickFutDraftFormationChoices(FUTDRAFT_FORMATION_CHOICES_BY_MODE[mode]);
  G.screen = 'futdraftFormationSelect';
  render();
}

function renderFutDraftFormationSelect() {
  var mode = G.futdraftPendingMode;
  var btns = futDraftAvailableFormations().map(function (f) {
    return (
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-primary btn-block" onclick="actionChooseFutDraftFormation(\'' + f.id + '\')">' + f.name + '</button>' +
      '</div>'
    );
  }).join('');
  var hint = mode === 'clasico'
    ? 'Elige la formación antes de nada: el draft solo te ofrecerá jugadores para los huecos que aún falten en ella.'
    : mode === 'afinidad'
      ? 'Elige la formación: el draft irá cubriendo sus huecos, pero solo con jugadores de tipo ' + G.futdraftAffinity + '.'
      : mode === 'liga'
        ? 'Elige la formación antes de nada: el draft irá cubriendo sus huecos en orden, igual que en Clásico.'
        : 'Elige la formación con la que vas a empezar. En Libre puedes seguir cambiándola luego en la pantalla de equipo.';
  var modeTitle = mode === 'clasico' ? 'Clásico' : (mode === 'afinidad' ? 'Afinidad' : (mode === 'liga' ? ('Liga · ' + ligaTierName(G.ligaPendingTier)) : 'Libre'));
  var backAction = mode === 'liga' ? 'actionChooseLigaTier(\'' + G.ligaPendingTier + '\')' : 'actionGoFutDraftModeSelect()';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="' + backAction + '">Volver</button>' +
        '<h2 class="panel-title mt">FutDraft ' + modeTitle + '</h2>' +
        '<p class="dim small">' + hint + '</p>' +
        btns +
      '</div>' +
    '</div>'
  );
}

// Catálogo de modificadores que puede salir en un partido de FutDraft
// (ver FUTDRAFT_CONDITION_OPTIONS más abajo -- ya no se elige uno a mano,
// solo si pueden salir o no). Lluvia y Partido cerrado afectan a los dos
// equipos por igual (bothMult); Aire/Calor/Niebla/Barro favorecen solo a
// tu equipo, escalados por cuántos jugadores de ese tipo elemental tengas
// en el once (ver futDraftModifierMultipliers) -- el rival en FutDraft es
// solo un número (teamPower), no tiene un once real con el que comparar
// tipos.
var FUTDRAFT_MODIFIERS = [
  { id: 'ninguno', name: 'Sin modificador', desc: 'Partido en condiciones normales, sin ningún efecto añadido.' },
  { id: 'lluvia', name: 'Lluvia', desc: 'El balón resbala: baja el rendimiento ofensivo y defensivo de los dos equipos por igual.', bothMult: 0.9 },
  { id: 'aire', name: 'Aire', desc: 'Viento fuerte en el campo: cuantos más jugadores de tipo Viento tengas en el once, más rinde tu equipo.', favorType: 'Viento' },
  { id: 'calor', name: 'Calor', desc: 'Ola de calor: cuantos más jugadores de tipo Fuego tengas en el once, más rinde tu equipo.', favorType: 'Fuego' },
  { id: 'niebla', name: 'Niebla', desc: 'Poca visibilidad: cuantos más jugadores de tipo Bosque tengas en el once, más rinde tu equipo.', favorType: 'Bosque' },
  { id: 'barro', name: 'Barro', desc: 'Terreno embarrado: cuantos más jugadores de tipo Montaña tengas en el once, más rinde tu equipo.', favorType: 'Montaña' },
  { id: 'ataque', name: 'Delanteros en racha', desc: 'Tus delanteros están inspirados: sube tu ataque, más goles a tu favor.', myAtkMult: 1.18 },
  { id: 'cerrojo', name: 'Partido cerrado', desc: 'Los dos equipos juegan más atrás: baja el ataque de ambos, partido con menos goles.', bothMult: 0.82 }
];
var FUTDRAFT_MODIFIERS_BY_ID = {};
FUTDRAFT_MODIFIERS.forEach(function (m) { FUTDRAFT_MODIFIERS_BY_ID[m.id] = m; });
// Solo el catálogo sin la entrada "ninguno", para sortear uno de verdad
// cuando toca (ver futDraftRollMatchModifier).
var FUTDRAFT_RANDOM_MODIFIER_POOL = FUTDRAFT_MODIFIERS.filter(function (m) { return m.id !== 'ninguno'; });
var FUTDRAFT_RANDOM_MODIFIER_CHANCE = 0.05;

// Condiciones del partido para todo el FutDraft que empieza: se eligen
// con flechas en la propia pantalla de Tipo de FutDraft/Tamaño del
// torneo (renderFutDraftModeSelect), antes de draftear. Solo dos
// opciones, por defecto "Sin condiciones" (índice 0), a petición
// explícita -- no se elige un modificador concreto a mano: con
// "Aleatorio", cada partido tira por su cuenta un 5% de posibilidades de
// que salga alguno del catálogo de arriba (ver futDraftRollMatchModifier).
// Liga no pasa por esta pantalla, así que siempre juega "Sin condiciones"
// (ver actionGoLigaTierSelect).
var FUTDRAFT_CONDITION_OPTIONS = [
  { id: 'ninguna', name: 'Sin condiciones', desc: 'Todos los partidos se juegan en condiciones normales, sin ningún modificador.' },
  { id: 'aleatorio', name: 'Aleatorio', desc: 'Cada partido tiene un 5% de posibilidades de que salga algún modificador (lluvia, aire, calor, niebla, barro, delanteros en racha o partido cerrado).' }
];

function futDraftConditionChoiceIdx() { return G.futdraftConditionChoiceIdx || 0; }
function actionFutDraftConditionStep(delta) {
  var n = FUTDRAFT_CONDITION_OPTIONS.length;
  G.futdraftConditionChoiceIdx = ((futDraftConditionChoiceIdx() + delta) % n + n) % n;
  render();
}
// Se llama una vez por partido (ver futDraftSimulateMatchCore), no una
// vez por FutDraft: con condición "aleatorio" cada partido tira su propio
// 5%, así que un mismo torneo puede tener partidos normales y partidos
// con modificador mezclados.
function futDraftRollMatchModifier(condition) {
  if (condition !== 'aleatorio') return 'ninguno';
  if (Math.random() >= FUTDRAFT_RANDOM_MODIFIER_CHANCE) return 'ninguno';
  return choice(FUTDRAFT_RANDOM_MODIFIER_POOL).id;
}
function actionChooseFutDraftFormation(id) {
  var mode = G.futdraftPendingMode || 'clasico';
  G.futdraft = {
    squad: [], formation: id, mode: mode,
    affinity: mode === 'afinidad' ? G.futdraftAffinity : null,
    ligaPool: mode === 'liga' ? G.ligaPendingPool : null,
    ligaTier: mode === 'liga' ? G.ligaPendingTier : null,
    condition: FUTDRAFT_CONDITION_OPTIONS[futDraftConditionChoiceIdx()].id,
    captainId: null,
    matches: [], matchIndex: 0
  };
  G.futdraftOptions = generateFutDraftOptions();
  G.screen = 'futdraftPick';
  render();
}

function futDraftPosCounts(squad) {
  var c = { Portero: 0, Defensa: 0, Centrocampista: 0, Delantero: 0 };
  squad.forEach(function (p) { c[p.posicion]++; });
  return c;
}

// En modo clásico los huecos que aún faltan los marca la formación
// elegida al principio (no los topes fijos de FUTDRAFT_POS_CAPS): si ya
// están las 4 defensas de un 4-4-2, no vuelve a salir ningún defensa como
// opción, aunque en modo libre sí podría.
function futDraftNeededCounts(formation, squad) {
  var counts = futDraftPosCounts(squad);
  var needed = {};
  formation.rows.forEach(function (row) { needed[row.pos] = Math.max(0, row.count - (counts[row.pos] || 0)); });
  return needed;
}

// Orden fijo del draft en modo clásico: portero, luego defensas hasta
// cubrir los que pida la formación, luego centrocampistas, luego
// delanteros -- no se ofrece un delantero mientras aún falten defensas.
var FUTDRAFT_DRAFT_ORDER = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
function futDraftCurrentNeededPos(formation, squad) {
  var needed = futDraftNeededCounts(formation, squad);
  for (var i = 0; i < FUTDRAFT_DRAFT_ORDER.length; i++) {
    if (needed[FUTDRAFT_DRAFT_ORDER[i]] > 0) return FUTDRAFT_DRAFT_ORDER[i];
  }
  return null;
}

// Los 3 modos draftean siempre 11 titulares + 3 suplentes (14 en total).
// Clásico y Afinidad piden los 11 titulares en el orden fijo de la
// formación (ver futDraftCurrentNeededPos); una vez cubiertos, los 3
// últimos picks (banquillo) pasan al mismo criterio que Libre: cualquier
// posición dentro de los topes de FUTDRAFT_POS_CAPS -- en Afinidad, además,
// siempre del tipo elemental elegido, también en el banquillo.
// En modo Liga con el pool "desbloqueados", solo se puede draftear a
// quien ya tengas desbloqueado en el Vestuario -- igual que el plantel de
// Puntos de Espíritu en Normal/Torneo/Supervivencia. Con "todos" (o en
// cualquier otro modo de FutDraft) no hay restricción, como siempre.
function futDraftPassesLigaPool(f, p) {
  if (f.mode !== 'liga' || f.ligaPool !== 'desbloqueados') return true;
  return !p.locked || getUnlockedIds().indexOf(p.id) !== -1;
}

function generateFutDraftOptions() {
  var f = G.futdraft;
  var squad = f.squad;
  var squadIds = squad.map(function (p) { return p.id; });
  var pool;
  var draftingStarters = squad.length < FUTDRAFT_SQUAD_SIZE;
  if ((f.mode === 'clasico' || f.mode === 'afinidad' || f.mode === 'liga') && draftingStarters) {
    var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === f.formation; });
    var currentPos = futDraftCurrentNeededPos(formation, squad);
    pool = ROSTER.filter(function (p) {
      if (squadIds.indexOf(p.id) !== -1) return false;
      if (f.mode === 'afinidad' && p.tipo !== f.affinity) return false;
      if (!futDraftPassesLigaPool(f, p)) return false;
      return p.posicion === currentPos;
    });
  } else {
    var counts = futDraftPosCounts(squad);
    pool = ROSTER.filter(function (p) {
      if (squadIds.indexOf(p.id) !== -1) return false;
      if (f.mode === 'afinidad' && p.tipo !== f.affinity) return false;
      if (!futDraftPassesLigaPool(f, p)) return false;
      if (counts[p.posicion] >= FUTDRAFT_POS_CAPS[p.posicion]) return false;
      return true;
    });
  }
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}

function futDraftDraftTarget(mode) {
  return FUTDRAFT_LIBRE_TOTAL;
}

window.pickFutDraftPlayer = function (instanceId) {
  var f = G.futdraft;
  var picked = G.futdraftOptions.find(function (p) { return p.instanceId === instanceId; });
  if (!picked) return;
  f.squad.push(picked);
  if (f.squad.length >= futDraftDraftTarget(f.mode)) {
    var starters = f.squad.slice(0, FUTDRAFT_SQUAD_SIZE);
    f.bench = f.squad.slice(FUTDRAFT_SQUAD_SIZE);
    f.lineup = futDraftBuildLineup(starters, f.formation);
    f.swapSelectedId = null;
    G.screen = 'futdraftTeam';
    render();
  } else {
    G.futdraftOptions = generateFutDraftOptions();
    render();
  }
};

function renderFutDraftPick() {
  var f = G.futdraft;
  var squad = f.squad;
  var modeLabel = f.mode === 'clasico' ? 'Clásico' : (f.mode === 'afinidad' ? 'Afinidad · ' + f.affinity : (f.mode === 'liga' ? 'Liga · ' + ligaTierName(f.ligaTier) : 'Libre'));
  var target = futDraftDraftTarget(f.mode);
  var subtitle = 'Elige a tu jugador ' + (squad.length + 1) + ' de ' + target + '.';
  if ((f.mode === 'clasico' || f.mode === 'afinidad' || f.mode === 'liga') && squad.length < FUTDRAFT_SQUAD_SIZE) {
    var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === f.formation; });
    var currentPos = futDraftCurrentNeededPos(formation, squad);
    var needed = futDraftNeededCounts(formation, squad);
    var counts = futDraftPosCounts(squad);
    subtitle = 'Elige tu ' + currentPos + ' (' + ((counts[currentPos] || 0) + 1) + ' de ' + (needed[currentPos] + (counts[currentPos] || 0)) + ').';
  } else if (squad.length >= FUTDRAFT_SQUAD_SIZE) {
    subtitle = 'Elige a tu suplente ' + (squad.length - FUTDRAFT_SQUAD_SIZE + 1) + ' de ' + (target - FUTDRAFT_SQUAD_SIZE) + '.';
  }
  var benchPreview = futDraftComputeBench(squad);
  var optionsHtml = G.futdraftOptions.map(function (c) {
    return playerCardHtml(c, 'pickFutDraftPlayer(\'' + c.instanceId + '\')', false, false, true);
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">FutDraft &middot; ' + modeLabel + '</h2>' +
        '<p class="dim small">' + subtitle + '</p></div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Tu plantilla</h3>' +
        renderFutDraftPitch(squad, f.formation, true) +
      '</div>' +
      (benchPreview.length
        ? '<div class="panel"><h3 style="margin-bottom:8px">Suplentes</h3><div class="pitch-row" style="justify-content:center">' +
          benchPreview.map(function (p) { return '<div class="pitch-player">' + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>'; }).join('') +
          '</div></div>'
        : '') +
      '<div class="panel"><h3 style="margin-bottom:8px">Elige uno</h3><div class="card-grid">' + optionsHtml + '</div></div>' +
    '</div>'
  );
}

// Solo cuentan las estadísticas relevantes para el puesto de cada uno --
// promediar las 4 por igual diluía el tiro de un delantero con su defensa
// (floja a propósito) y al revés con los defensas, así que casi todos los
// jugadores acababan con una media parecida y la puntuación de equipo
// apenas se movía draftases a quien draftases.
var FUTDRAFT_SCORE_STATS = {
  Portero: ['defensa', 'especial'],
  Defensa: ['pase', 'defensa', 'especial'],
  Centrocampista: ['tiro', 'pase', 'defensa', 'especial'],
  Delantero: ['tiro', 'pase', 'especial']
};
function futDraftPlayerScore(p) {
  // Reserva por si algún jugador del roster tuviera una posición mal
  // escrita (p.ej. "Delantera" en vez de "Delantero"): mejor promediar
  // las 4 stats que romper toda la pantalla de equipo por un typo de dato.
  var stats = FUTDRAFT_SCORE_STATS[p.posicion] || ['tiro', 'pase', 'defensa', 'especial'];
  var sum = stats.reduce(function (s, key) { return s + p[key]; }, 0);
  return sum / stats.length;
}

// El capitán CUENTA DOBLE en la media del once (a petición explícita:
// "tiene que sumar como dos jugadores... pero no subir tanto" -- antes
// era un bonus aparte, (captainScore-base)*0.4, que con números como
// capitán 95 / media 91 podía dar un +4 "que no tenía sentido" según lo
// mismo pedido). Con el doble conteo, el bonus es la diferencia entre la
// media CON el capitán contado dos veces y la media normal -- se diluye
// solo con el tamaño del once (12 "jugadores" en vez de 11), así que un
// crack de capitán ya no dispara la nota de golpe. Se sigue recortando a
// [-8, 8] como red de seguridad, aunque con este cálculo el máximo real
// ronda los 5-6 puntos. La sinergia premia tener varios jugadores del
// mismo tipo elemental en el once (no hay dato de club real en el
// roster, así que el tipo hace de sustituto) -- bajada de +3 a +1 a
// petición explícita ("que suba 1"), en TODOS los modos que reutilizan
// este cálculo (FutDraft/Torneo/Liga/Modo Carrera). La penalización
// castiga colocar a un titular en una línea que no es su posición real
// -- el banquillo nunca cuenta aquí, solo quien sale de inicio.
var FUTDRAFT_CAPTAIN_BONUS_CAP = 8;
var FUTDRAFT_SYNERGY_THRESHOLD = 4;
var FUTDRAFT_SYNERGY_BONUS = 1;
var FUTDRAFT_OUT_OF_POSITION_PENALTY = 3;

// lineup: array de { pos, player } (la línea de la formación y quien la
// ocupa -- ver f.lineup). captainId: id del jugador capitán, o null.
// Devuelve el desglose completo (para explicarlo en pantalla) en vez de
// solo el número final -- ver futDraftTeamScore para cuando solo hace
// falta el total (p.ej. al resolver un partido).
function futDraftScoreBreakdown(lineup, captainId) {
  if (!lineup.length) return { base: 0, captainBonus: 0, synergyBonus: 0, misplaced: 0, misplacedPenalty: 0, total: 0 };
  var sum = 0, misplaced = 0, captainScore = null;
  var typeCounts = {};
  lineup.forEach(function (slot) {
    var p = slot.player;
    var score = futDraftPlayerScore(p);
    sum += score;
    if (captainId && p.id === captainId) captainScore = score;
    if (slot.pos !== p.posicion) misplaced++;
    typeCounts[p.tipo] = (typeCounts[p.tipo] || 0) + 1;
  });
  var base = sum / lineup.length;
  var captainBonus = captainScore === null ? 0 : Math.round(clamp(((sum + captainScore) / (lineup.length + 1)) - base, -FUTDRAFT_CAPTAIN_BONUS_CAP, FUTDRAFT_CAPTAIN_BONUS_CAP) * 10) / 10;
  var synergyBonus = 0;
  Object.keys(typeCounts).forEach(function (t) {
    if (typeCounts[t] >= FUTDRAFT_SYNERGY_THRESHOLD) synergyBonus += FUTDRAFT_SYNERGY_BONUS;
  });
  var misplacedPenalty = misplaced * FUTDRAFT_OUT_OF_POSITION_PENALTY;
  var total = Math.round(clamp(base + captainBonus + synergyBonus - misplacedPenalty, 0, 100));
  return { base: Math.round(base), captainBonus: captainBonus, synergyBonus: synergyBonus, misplaced: misplaced, misplacedPenalty: misplacedPenalty, total: total };
}

function futDraftTeamScore(lineup, captainId) {
  return futDraftScoreBreakdown(lineup, captainId).total;
}

// Vista previa durante el draft Libre (picks 12-14, antes de llegar a la
// pantalla de equipo): los "cambios" van siempre al banquillo por
// defecto, son justo los que draftas DESPUÉS de completar el once, así
// que no tiene sentido recalcular con las stats quién se queda fuera.
function futDraftComputeBench(squad) {
  if (squad.length <= FUTDRAFT_SQUAD_SIZE) return [];
  return squad.slice(FUTDRAFT_SQUAD_SIZE);
}

// A partir de aquí: el once real de la pantalla de equipo (f.lineup) ya no
// se recalcula solo -- se construye una vez al acabar el draft (o al
// cambiar de formación) y luego el jugador lo edita a mano con cambios
// ilimitados (ver selectFutDraftPlayer). f.lineup es un array de 11
// { pos, player }: pos es la línea del hueco (fija), player es quien lo
// ocupa (cambia con cada cambio). f.bench (solo Libre) son los suplentes,
// sin línea asignada.
function futDraftBuildLineup(starters, formationId) {
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === formationId; });
  var rows = assignFutDraftFormation(starters, formation);
  var lineup = [];
  rows.forEach(function (row) {
    row.players.forEach(function (p) { lineup.push({ pos: row.pos, player: p }); });
  });
  return lineup;
}

// Reparte a los 11 del draft en los huecos de la formación elegida en DOS
// pasadas: la 1ª reserva para cada línea a los jugadores de esa posición
// real que haya (portero primero, que casi siempre hay solo 1 -- si se
// mezclara con el relleno de otra línea en una sola pasada, esa línea
// podía "robarse" al único portero real por tener buena defensa, dejando
// la portería vacía). La 2ª pasada rellena los huecos que aún falten con
// los mejores jugadores que queden, sin mirar su posición real.
function assignFutDraftFormation(squad, formation) {
  var remaining = squad.slice();
  var statFor = { Portero: 'defensa', Defensa: 'defensa', Centrocampista: 'pase', Delantero: 'tiro' };
  var processOrder = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
  function takeBest(list, stat, n) {
    var sorted = list.slice().sort(function (a, b) { return b[stat] - a[stat]; });
    var taken = sorted.slice(0, n);
    taken.forEach(function (p) {
      var idx = remaining.indexOf(p);
      if (idx !== -1) remaining.splice(idx, 1);
    });
    return taken;
  }
  var byPos = {};
  processOrder.forEach(function (pos) {
    var row = formation.rows.find(function (r) { return r.pos === pos; });
    if (!row) return;
    var ownPos = remaining.filter(function (p) { return p.posicion === pos; });
    byPos[pos] = takeBest(ownPos, statFor[pos], row.count);
  });
  processOrder.forEach(function (pos) {
    var row = formation.rows.find(function (r) { return r.pos === pos; });
    if (!row || byPos[pos].length >= row.count) return;
    byPos[pos] = byPos[pos].concat(takeBest(remaining, statFor[pos], row.count - byPos[pos].length));
  });
  return formation.rows.map(function (row) { return { pos: row.pos, count: row.count, players: byPos[row.pos] }; });
}

// showEmptySlots (draft en curso, plantilla aún incompleta) añade un hueco
// marcado por cada sitio de la formación que todavía no tiene jugador,
// para que se vea de un vistazo cuánto queda de cada línea. Se usa solo
// durante el draft (vista previa, aún sin cambios posibles) -- la
// pantalla de equipo usa renderFutDraftLineupPitch, que sí es editable.
function renderFutDraftPitch(squad, formationId, showEmptySlots) {
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === formationId; });
  var rows = assignFutDraftFormation(squad, formation);
  var rowsHtml = rows.map(function (row) {
    var itemsHtml = row.players.map(function (p) {
      // Media y afinidad visibles desde el momento en que el jugador
      // entra al campo (justo al elegirlo en el pick), no solo luego en
      // la pantalla de "Tu once inicial" -- a petición explícita.
      return '<div class="pitch-player">' + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
    }).join('');
    if (showEmptySlots) {
      for (var k = row.players.length; k < row.count; k++) {
        itemsHtml += '<div class="pitch-player pitch-player-empty"><span class="pitch-empty-slot">+</span></div>';
      }
    }
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

// Campo de la pantalla de equipo: cada titular es clicable para hacer
// cambios ilimitados (con otro titular o con un suplente del banquillo).
// Media en una esquina del avatar (igual criterio de color que en las
// tarjetas de pick, ver mediaBadgeColor) -- sin esto, cambiar titulares por
// suplentes en esta pantalla era "a ciegas" (solo nombre y avatar, ningún
// dato de rendimiento), a petición explícita.
function pitchMediaBadgeHtml(p) {
  var score = Math.round(futDraftPlayerScore(p));
  return '<span class="pitch-media-badge" style="background:' + mediaBadgeColor(score) + '" title="Media según su posición">' + score + '</span>';
}

// Afinidad elemental en la esquina opuesta a la media (misma altura, lado
// derecho) -- para saber de qué tipo es cada jugador de un vistazo, sin
// tener que abrir su tarjeta completa. Reutiliza el icono/color de tipo
// de siempre (ver getTypeSymbol/type-bg-*), solo que en tamaño reducido.
function pitchAffinityBadgeHtml(p) {
  var tipo = p.tipo;
  var cls = 'type-bg-' + tipo.toLowerCase().replace('ñ', 'n');
  var icon = getTypeSymbol(tipo).replace(/22px/g, '12px');
  return '<span class="pitch-affinity-badge ' + cls + '" title="' + escapeHtml(tipo) + '">' + icon + '</span>';
}

function renderFutDraftLineupPitch(f) {
  var formation = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === f.formation; });
  var rowsHtml = formation.rows.map(function (row) {
    var itemsHtml = f.lineup.filter(function (slot) { return slot.pos === row.pos; }).map(function (slot) {
      var p = slot.player;
      var outOfPosition = slot.pos !== p.posicion;
      var cls = 'pitch-player futdraft-swappable' +
        (f.swapSelectedId === p.id ? ' selected' : '') +
        (outOfPosition ? ' futdraft-out-of-position' : '');
      var badge = f.captainId === p.id ? '<span class="futdraft-captain-badge" title="Capitán">👑</span>' : '';
      var nameSuffix = outOfPosition ? ' <span class="dim">(' + p.posicion + ')</span>' : '';
      return '<div class="' + cls + '" onclick="selectFutDraftPlayer(\'' + p.id + '\')">' + badge + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + nameSuffix + '</span></div>';
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

window.setFutDraftFormation = function (id) {
  var f = G.futdraft;
  f.formation = id;
  var starters = f.lineup.map(function (slot) { return slot.player; });
  f.lineup = futDraftBuildLineup(starters, id);
  f.swapSelectedId = null;
  render();
};

// Cambios ilimitados entre dos jugadores cualquiera -- dos titulares (se
// reubican de línea) o un titular y un suplente (el suplente entra al
// once, el titular pasa al banquillo). Toca a uno, luego al otro. Si el
// modo "elegir capitán" está activo, el toque se interpreta como elección
// de capitán en vez de cambio (ver toggleFutDraftCaptainMode).
window.selectFutDraftPlayer = function (id) {
  var f = G.futdraft;
  if (f.pickingCaptain) { pickFutDraftCaptainInternal(id); return; }
  if (f.swapSelectedId === id) { f.swapSelectedId = null; render(); return; }
  if (!f.swapSelectedId) { f.swapSelectedId = id; render(); return; }
  var otherId = f.swapSelectedId;
  var lineupIdxA = f.lineup.findIndex(function (s) { return s.player.id === otherId; });
  var lineupIdxB = f.lineup.findIndex(function (s) { return s.player.id === id; });
  if (lineupIdxA !== -1 && lineupIdxB !== -1) {
    var tmp = f.lineup[lineupIdxA].player;
    f.lineup[lineupIdxA].player = f.lineup[lineupIdxB].player;
    f.lineup[lineupIdxB].player = tmp;
  } else {
    var benchIdxA = f.bench.findIndex(function (p) { return p.id === otherId; });
    var benchIdxB = f.bench.findIndex(function (p) { return p.id === id; });
    if (lineupIdxA !== -1 && benchIdxB !== -1) {
      var starterOut = f.lineup[lineupIdxA].player;
      f.lineup[lineupIdxA].player = f.bench[benchIdxB];
      f.bench[benchIdxB] = starterOut;
      if (f.captainId === starterOut.id) f.captainId = null;
    } else if (lineupIdxB !== -1 && benchIdxA !== -1) {
      var starterOut2 = f.lineup[lineupIdxB].player;
      f.lineup[lineupIdxB].player = f.bench[benchIdxA];
      f.bench[benchIdxA] = starterOut2;
      if (f.captainId === starterOut2.id) f.captainId = null;
    }
  }
  f.swapSelectedId = null;
  render();
};

// Capitán: cuenta x2 en la media del equipo (ver futDraftTeamScore). Solo
// puede ser un titular -- tocar un suplente en modo "elegir capitán" no
// hace nada. Tocar al capitán actual otra vez le quita el brazalete.
window.toggleFutDraftCaptainMode = function () {
  var f = G.futdraft;
  f.pickingCaptain = !f.pickingCaptain;
  f.swapSelectedId = null;
  render();
};
function pickFutDraftCaptainInternal(id) {
  var f = G.futdraft;
  var isStarter = f.lineup.some(function (s) { return s.player.id === id; });
  if (!isStarter) { render(); return; }
  f.captainId = (f.captainId === id) ? null : id;
  f.pickingCaptain = false;
  render();
}

// Cuenta cuántos titulares hay de cada tipo elemental -- SOLO el once
// titular (f.lineup), el banquillo no cuenta para nada aquí, igual que en
// futDraftScoreBreakdown. Cambia en cuanto se hace un cambio en el once.
function futDraftElementCounts(f) {
  var counts = {};
  TYPES.forEach(function (t) { counts[t] = 0; });
  f.lineup.forEach(function (slot) { counts[slot.player.tipo] = (counts[slot.player.tipo] || 0) + 1; });
  return counts;
}

function renderFutDraftTeam() {
  var f = G.futdraft;
  var hasBench = f.bench.length > 0;
  var breakdown = futDraftScoreBreakdown(f.lineup, f.captainId);
  var captain = f.captainId ? f.lineup.find(function (s) { return s.player.id === f.captainId; }) : null;
  var formationBtns = futDraftAvailableFormations().map(function (ft) {
    return '<button class="btn-tiny' + (f.formation === ft.id ? ' active' : '') + '" onclick="setFutDraftFormation(\'' + ft.id + '\')">' + ft.name + '</button>';
  }).join('');
  var swapHint = 'Cambios ilimitados: toca a dos jugadores (titulares o suplente) para cambiarlos.';
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
  var elementCounts = futDraftElementCounts(f);
  var elementCountsHtml = TYPES.map(function (t) {
    return '<span class="type-badge type-' + t.toLowerCase().replace('ñ', 'n') + '" style="margin:2px">' +
      'Bonificación atributo ' + getTypeSymbol(t) + ' ' + elementCounts[t] + '/' + FUTDRAFT_SYNERGY_THRESHOLD +
    '</span>';
  }).join(' ');
  var benchHtml = '';
  if (hasBench) {
    var benchItemsHtml = f.bench.map(function (p) {
      var cls = 'pitch-player futdraft-swappable' + (f.swapSelectedId === p.id ? ' selected' : '');
      return '<div class="' + cls + '" onclick="selectFutDraftPlayer(\'' + p.id + '\')">' + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
    }).join('');
    benchHtml =
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Banquillo</h3>' +
        '<div class="pitch-row" style="justify-content:center">' + benchItemsHtml + '</div>' +
      '</div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Tu once inicial</h2>' +
        '<p class="dim small">Puntuación de equipo: <strong style="color:var(--accent-2)">' + breakdown.total + '</strong> / 100</p>' +
        '<p class="dim small">' + swapHint + '</p>' +
        '<p class="dim small">' + captainHint + '</p>' +
        '<button class="btn btn-tiny' + (f.pickingCaptain ? ' active' : '') + '" onclick="toggleFutDraftCaptainMode()">' + (f.pickingCaptain ? 'Toca a un titular para hacerlo capitán…' : 'Elegir capitán 👑') + '</button>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Formación</h3>' +
        '<div class="view-toggle view-toggle-wrap">' + formationBtns + '</div>' +
        renderFutDraftLineupPitch(f) +
        '<p class="dim small" style="margin-top:8px">Un jugador fuera de su posición real baja la puntuación del equipo. Tener 4 o más titulares del mismo tipo elemental la sube.</p>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:8px">Bonificación de atributo (once titular)</h3>' +
        '<div>' + elementCountsHtml + '</div>' +
      '</div>' +
      benchHtml +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionShareFutDraftSquad()">Compartir plantilla 🔗</button>' +
        (G.futdraftShareMessage ? '<p class="dim small">' + escapeHtml(G.futdraftShareMessage) + '</p>' : '') +
        (G.futdraftShareUrl ? '<input class="select-field mt" type="text" readonly value="' + escapeHtml(G.futdraftShareUrl) + '" onclick="this.select()">' : '') +
      '</div>' +
      (f.mode === 'liga'
        ? '<button class="btn btn-primary btn-block" onclick="startLigaRun()">Empezar Liga (18 equipos)</button>'
        : '<button class="btn btn-primary btn-block" onclick="startFutDraftMatches()">Jugar torneo (' + futDraftBracketSize() + ' equipos)</button>') +
    '</div>'
  );
}

// "Compartir plantilla" (Tu once inicial), a petición explícita ("que
// puedas compartir plantillas cuando haces una en futdraft"): codifica
// formación/titulares/banquillo/capitán en la propia URL
// (encodeShareParam, ver core.js) -- sin backend no hay otra forma de
// "guardar" algo así. Abrir ese enlace enseña la misma alineación en
// modo solo lectura (ver renderFutDraftSharedSquad/case
// 'futdraftSharedSquad', decodificado en init.js al cargar la página).
window.actionShareFutDraftSquad = function () {
  var f = G.futdraft;
  if (!f || !f.lineup) return;
  var summary = {
    mode: f.mode,
    formation: f.formation,
    captainId: f.captainId,
    score: futDraftScoreBreakdown(f.lineup, f.captainId).total,
    lineup: f.lineup.map(function (s) { return { pos: s.pos, id: s.player.id }; }),
    bench: f.bench.map(function (p) { return p.id; })
  };
  var url = location.origin + location.pathname + '?futdraftSquad=' + encodeShareParam(summary);
  G.futdraftShareUrl = url;
  G.futdraftShareMessage = 'Copia el enlace de abajo para compartirlo.';
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      G.futdraftShareMessage = 'Enlace copiado al portapapeles.';
      render();
    }).catch(function () { render(); });
  }
  render();
};
// Reconstruye la plantilla desde el resumen compartido (busca cada id en
// ROSTER) -- si algún jugador no existiera ya no rompe nada, se filtra.
function futDraftRebuildSharedSquad(summary) {
  var lineup = (summary.lineup || []).map(function (s) {
    var p = ROSTER.find(function (x) { return x.id === s.id; });
    return p ? { pos: s.pos, player: p } : null;
  }).filter(Boolean);
  var bench = (summary.bench || []).map(function (id) { return ROSTER.find(function (x) { return x.id === id; }); }).filter(Boolean);
  return { lineup: lineup, bench: bench };
}
// Campo de juego SOLO LECTURA (sin onclick de intercambiar/seleccionar,
// a diferencia de renderFutDraftLineupPitch -- esto no es tu G.futdraft
// real, tocar a alguien no debe intentar mutar nada) para la plantilla
// compartida por otro.
function futDraftSharedPitchHtml(formation, lineup, captainId) {
  var f = FUTDRAFT_FORMATIONS.find(function (x) { return x.id === formation; }) || FUTDRAFT_FORMATIONS[0];
  var rowsHtml = f.rows.map(function (row) {
    var itemsHtml = lineup.filter(function (slot) { return slot.pos === row.pos; }).map(function (slot) {
      var p = slot.player;
      var outOfPosition = slot.pos !== p.posicion;
      var badge = captainId === p.id ? '<span class="futdraft-captain-badge" title="Capitán">👑</span>' : '';
      var nameSuffix = outOfPosition ? ' <span class="dim">(' + p.posicion + ')</span>' : '';
      return '<div class="pitch-player' + (outOfPosition ? ' futdraft-out-of-position' : '') + '">' + badge + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + nameSuffix + '</span></div>';
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}
function renderFutDraftSharedSquad() {
  var summary = G.futdraftSharedSquad;
  if (!summary) {
    return '<div class="screen"><div class="panel center-text"><p class="dim small">Este enlace de plantilla no es válido.</p><button class="btn btn-primary btn-block mt" onclick="doBackToMenuNow()">Volver al menú</button></div></div>';
  }
  var squad = futDraftRebuildSharedSquad(summary);
  var benchHtml = squad.bench.length
    ? '<div class="panel"><h3 style="margin-bottom:4px">Banquillo</h3><div class="pitch-row" style="justify-content:center">' +
        squad.bench.map(function (p) { return '<div class="pitch-player">' + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>'; }).join('') +
      '</div></div>'
    : '';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Plantilla compartida</h2>' +
        '<p class="dim small">Puntuación de equipo: <strong style="color:var(--accent-2)">' + summary.score + '</strong> / 100</p>' +
      '</div>' +
      '<div class="panel">' + futDraftSharedPitchHtml(summary.formation, squad.lineup, summary.captainId) + '</div>' +
      benchHtml +
      '<div class="panel">' +
        '<button class="btn btn-primary btn-block" onclick="actionGoFutDraftModeSelect()">Hacer la mía</button>' +
        '<button class="btn btn-outline btn-block mt" onclick="doBackToMenuNow()">Volver al menú</button>' +
      '</div>' +
    '</div>'
  );
}

// El torneo de FutDraft reutiliza exactamente el mismo cuadro y la misma
// simulación CPU-vs-CPU que el Modo Torneo normal (generateTournamentBracket,
// simulateCpuMatch, TEAM_POWER) -- lo único distinto es cómo se resuelve el
// partido del jugador: en vez de jugarse a golpes, se simula igual que los
// de la CPU pero usando la puntuación de equipo y el multiplicador de la
// formación elegida en vez de TEAM_POWER.
// Recompensa en Puntos de Espíritu: 40 fijos por jugar el torneo (ganes o
// pierdas) + 10 más por cada partido propio ganado en el bracket.
var FUTDRAFT_BASE_REWARD = 40;
var FUTDRAFT_WIN_REWARD = 10;

// Tamaño del bracket elegible con flechas (antes fijo a 8) -- a petición
// explícita, mismas 3 opciones que ya existían en Modo Torneo.
var FUTDRAFT_BRACKET_SIZES = [8, 16, 32, 64];
function futDraftBracketSizeIdx() { return G.futdraftBracketSizeIdx === undefined ? 0 : G.futdraftBracketSizeIdx; }
function futDraftBracketSize() { return FUTDRAFT_BRACKET_SIZES[futDraftBracketSizeIdx()]; }
function actionFutDraftBracketSizeStep(delta) {
  var n = FUTDRAFT_BRACKET_SIZES.length;
  G.futdraftBracketSizeIdx = ((futDraftBracketSizeIdx() + delta) % n + n) % n;
  render();
}

// ===== FutDraft 2 jugadores (pasa y juega) =====
// Modo local para dos personas en el MISMO móvil, a petición explícita
// ("modo multijugador local... dos personas en móviles distintos... el
// mismo futdraft y cada vez van cogiendo un personaje del mismo draft, y
// al final se enfrentan los equipos entre sí"). La app es 100% estática
// sin servidor propio, así que sincronizar dos móviles de verdad
// necesitaría un backend externo (Firebase o similar) -- el usuario
// prefirió pasar y jugar en un solo móvil en su lugar, sin código de
// sala ni nada que instalar. Reutiliza TODO el motor de FutDraft ya
// existente (formaciones, futDraftCurrentNeededPos, futDraftBuildLineup,
// futDraftTeamScore, futDraftExpectedGoals/futDraftBuildTimeline) para
// dos plantillas REALES en vez de una real + un rival de potencia fija.
window.actionStartFutDraftVs = function () {
  var formationId = choice(FUTDRAFT_FORMATIONS.map(function (f) { return f.id; }));
  G.futdraftVs = { formationId: formationId, turn: 'A', squadA: [], squadB: [] };
  G.futdraftVsRevealed = false;
  G.futdraftVsOptions = futDraftVsGenerateOptions();
  G.screen = 'futdraftVsPick';
  render();
};
function futDraftVsCurrentSquad() {
  var s = G.futdraftVs;
  return s.turn === 'A' ? s.squadA : s.squadB;
}
// Misma restricción de posición que el modo Clásico de toda la vida
// (futDraftCurrentNeededPos), pero excluyendo a quien SEA que ya haya
// elegido cualquiera de los dos jugadores -- es un draft compartido de
// verdad, si Jugador A se lleva a alguien ya no está disponible para B.
function futDraftVsGenerateOptions() {
  var s = G.futdraftVs;
  var squad = futDraftVsCurrentSquad();
  var excludedIds = s.squadA.concat(s.squadB).map(function (p) { return p.id; });
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === s.formationId; });
  var currentPos = futDraftCurrentNeededPos(formation, squad);
  var pool = ROSTER.filter(function (p) { return excludedIds.indexOf(p.id) === -1 && p.posicion === currentPos; });
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(rosterInstance);
}
window.actionRevealFutDraftVsTurn = function () {
  G.futdraftVsRevealed = true;
  render();
};
window.actionPickFutDraftVsPlayer = function (instanceId) {
  var s = G.futdraftVs;
  var picked = G.futdraftVsOptions.find(function (p) { return p.instanceId === instanceId; });
  if (!picked) return;
  var squad = futDraftVsCurrentSquad();
  squad.push(picked);
  if (s.squadA.length >= FUTDRAFT_SQUAD_SIZE && s.squadB.length >= FUTDRAFT_SQUAD_SIZE) {
    futDraftVsFinishDraft();
    return;
  }
  var nextTurn = s.turn === 'A' ? 'B' : 'A';
  if (nextTurn === 'A' && s.squadA.length >= FUTDRAFT_SQUAD_SIZE) nextTurn = 'B';
  if (nextTurn === 'B' && s.squadB.length >= FUTDRAFT_SQUAD_SIZE) nextTurn = 'A';
  s.turn = nextTurn;
  G.futdraftVsRevealed = false;
  G.futdraftVsOptions = futDraftVsGenerateOptions();
  render();
};
// Termina el draft (los dos con 11) y simula el partido entre las dos
// plantillas REALES -- mismo motor de gol/asistencia ponderado por
// puesto (futDraftBuildTimeline) que el resto de FutDraft, pero sin
// "plantel fantasma": aquí los dos bandos tienen jugadores de verdad.
// El empate se queda como empate (nada de penaltis) -- es un duelo
// rápido de echar una partida, no una eliminatoria.
function futDraftVsFinishDraft() {
  var s = G.futdraftVs;
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === s.formationId; });
  s.lineupA = futDraftBuildLineup(s.squadA, s.formationId);
  s.lineupB = futDraftBuildLineup(s.squadB, s.formationId);
  var scoreA = futDraftTeamScore(s.lineupA, null);
  var scoreB = futDraftTeamScore(s.lineupB, null);
  var atkA = scoreA * formation.atk, defA = scoreA * formation.def;
  var atkB = scoreB * formation.atk, defB = scoreB * formation.def;
  var golA = futDraftRandomGoals(futDraftExpectedGoals(atkA, defB));
  var golB = futDraftRandomGoals(futDraftExpectedGoals(atkB, defA));
  var playersA = s.lineupA.map(function (x) { return x.player; });
  var playersB = s.lineupB.map(function (x) { return x.player; });
  var timeline = futDraftBuildTimeline(golA, golB, playersA, playersB);
  s.result = { golA: golA, golB: golB, timeline: timeline, scoreA: scoreA, scoreB: scoreB };
  G.screen = 'futdraftVsResult';
  render();
}
function renderFutDraftVsPick() {
  var s = G.futdraftVs;
  var squad = futDraftVsCurrentSquad();
  if (!G.futdraftVsRevealed) {
    return '<div class="screen"><div class="panel center-text">' +
      '<h2 class="panel-title mb0">Turno de Jugador ' + s.turn + '</h2>' +
      '<p class="dim small">Pasa el móvil a Jugador ' + s.turn + ' antes de seguir, para que el otro no vea el draft.</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionRevealFutDraftVsTurn()">Listo, mostrar draft</button>' +
    '</div></div>';
  }
  var formation = FUTDRAFT_FORMATIONS.find(function (f) { return f.id === s.formationId; });
  var currentPos = futDraftCurrentNeededPos(formation, squad);
  var optionsHtml = G.futdraftVsOptions.map(function (c) {
    return playerCardHtml(c, "actionPickFutDraftVsPlayer('" + c.instanceId + "')", false, false, true);
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">FutDraft &middot; 2 jugadores</h2>' +
        '<p class="dim small">Jugador ' + s.turn + ': elige tu ' + currentPos + ' (' + (squad.length + 1) + ' de ' + FUTDRAFT_SQUAD_SIZE + ').</p></div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Tu plantilla</h3>' +
        renderFutDraftPitch(squad, s.formationId, true) +
      '</div>' +
      '<div class="panel"><h3 style="margin-bottom:8px">Elige uno</h3><div class="card-grid">' + optionsHtml + '</div></div>' +
    '</div>'
  );
}
function futDraftVsTimelineRowHtml(ev) {
  var isB = ev.side === 'opp';
  var text = '<strong>' + escapeHtml(ev.scorer.nombre) + '</strong>' +
    (ev.assist ? ' <span class="dim">(asist. ' + escapeHtml(ev.assist.nombre) + ')</span>' : ' <span class="dim">(gol en solitario)</span>') +
    ' <span class="dim">· Jugador ' + (isB ? 'B' : 'A') + '</span>';
  var rowClass = 'futdraft-timeline-row' + (isB ? ' futdraft-timeline-row-opp' : '');
  return '<div class="' + rowClass + '"><span class="futdraft-timeline-minute">' + ev.minute + '\'</span>' + avatarHtml(ev.scorer) + '<span>' + text + '</span></div>';
}
function renderFutDraftVsResult() {
  var s = G.futdraftVs;
  var r = s.result;
  var resultLabel = r.golA === r.golB ? 'Empate' : (r.golA > r.golB ? '🏆 ¡Gana Jugador A!' : '🏆 ¡Gana Jugador B!');
  var timelineHtml = r.timeline.length
    ? '<div class="panel"><h3 style="margin-bottom:8px">Resumen del partido</h3><div class="futdraft-timeline">' +
        r.timeline.map(futDraftVsTimelineRowHtml).join('') +
      '</div></div>'
    : '<p class="dim small center-text">Partido sin goles.</p>';
  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><div style="font-size:1.6rem;margin-bottom:4px">🅰️</div><div class="score-name">Jugador A (' + r.scoreA + ')</div><div class="score-num">' + r.golA + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><div style="font-size:1.6rem;margin-bottom:4px">🅱️</div><div class="score-name">Jugador B (' + r.scoreB + ')</div><div class="score-num">' + r.golB + '</div></div>' +
      '</div>' +
      '<div class="panel center-text"><h3 style="margin-bottom:4px">' + resultLabel + '</h3></div>' +
      timelineHtml +
      '<button class="btn btn-primary btn-block mt" onclick="actionStartFutDraftVs()">Jugar otra vez</button>' +
      '<button class="btn btn-outline btn-block mt" onclick="actionBackToMenu()">Volver al menú</button>' +
    '</div>'
  );
}

