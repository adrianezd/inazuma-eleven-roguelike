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
// Lesiones (a petición explícita: "un salto de 2 años puede truncarse
// antes de tiempo"): cada salto tiene una probabilidad de lesión de
// verdad, no solo de texto -- ver playerModeSimulateBlock, que resta
// partidos y un poco de crecimiento cuando toca.
var PLAYER_MODE_INJURY_CHANCE = 0.18;
var PLAYER_MODE_INJURY_MIN_SEVERITY = 0.2;
var PLAYER_MODE_INJURY_MAX_SEVERITY = 0.55;
// Media inicial por posición -- un debutante de 16 años, todavía lejos
// de su techo, arranca bajo en cualquier posición.
var PLAYER_MODE_START_OVR = { Portero: 52, Defensa: 54, Centrocampista: 55, Delantero: 56 };
// Probabilidad de gol/asistencia POR PARTIDO según posición, YA con la
// media de un crack (ovr≈95) -- se escala hacia abajo con
// playerModeQualityMult, así que estos son techos, no lo normal.
var PLAYER_MODE_GOAL_CHANCE = { Portero: 0.01, Defensa: 0.07, Centrocampista: 0.18, Delantero: 0.42 };
var PLAYER_MODE_ASSIST_CHANCE = { Portero: 0.02, Defensa: 0.13, Centrocampista: 0.35, Delantero: 0.17 };

function playerModeShieldClub(name) { return name ? teamShieldPath(name) : PLAYER_SHIELD; }

// Escala CUADRÁTICA (no lineal) según media, a petición explícita ("no
// vas a jugar los 40 partidos y meter 40 goles con media 50 y 16 años,
// tiene que tener un poco de sentido"): con la escala anterior (casi
// lineal) un debutante de 16 años con 56 de media ya metía ~20 goles en
// un solo bloque de 2 años, una barbaridad. Elevar al cuadrado castiga
// mucho más a las medias bajas (56 de media da ~0.29 en vez de ~0.86) y
// deja que solo los cracks de verdad (85+) se acerquen al techo de
// arriba.
function playerModeQualityMult(ovr) {
  return Math.pow(clamp(ovr / 95, 0.15, 1.15), 2.2);
}
// Cuánto de la temporada juegas de verdad -- a los 16 años, con una
// media floja, no eres titular fijo ni de lejos; según subes de nivel,
// cada vez juegas más hasta jugarlo prácticamente todo con un crack
// hecho y derecho.
function playerModePlayTimeFactor(ovr) {
  return clamp(0.35 + (ovr - 50) / 70, 0.3, 1);
}

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
    tempOvrPenalty: 0, guaranteedStarter: false, reducedMinutes: false,
    // Relación con la afición/prensa: sube o baja con las ruedas de
    // prensa (playerModeRollDecision tipo 'prensa') y afecta un poco a
    // la chance de título colectivo (playerModeSimulateBlock), a
    // petición explícita ("relación con la afición/prensa, como las
    // decisiones de club pero social").
    reputation: 50,
    pressPenaltyPending: false,
    pressMessage: null,
    edad: PLAYER_MODE_START_AGE,
    ovr: startOvr,
    pj: 0, gls: 0, ast: 0,
    titulosIndividuales: [],
    titulosColectivos: [],
    // Historial de premios (individuales y de selección) con la edad y el
    // club en el que se ganaron, ver playerModeAwardsHtml.
    awards: [],
    // Selección nacional: status 'none' (aún no te llaman), 'called'
    // (convocado, suma partidos/goles/títulos cada bloque) o 'declined'.
    national: { status: 'none', caps: 0, goals: 0, titles: 0 },
    // Efectos de eventos con decisiones (playerModeApplyEventFx) que se
    // aplican UNA vez en el siguiente bloque y se vacían: growth (puntos
    // de media), inj (prob. de lesión extra), goal (multiplicador de
    // producción), title (prob. extra de título colectivo).
    mods: { growth: 0, inj: 0, goal: 1, title: 0 },
    eventMessage: null,
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
  // Efectos temporales de un "Cambio de posición" aceptado/rechazado el
  // salto anterior (ver playerModeRollDecision tipo 'posicion'): aceptar
  // garantiza titularidad (juegas el bloque entero) a cambio de que tu
  // media baje de verdad esos 2 años (ovrPenalty, aplicado más abajo
  // directo a ovrAfter, antes solo afectaba a la calidad interna de la
  // simulación sin bajar nunca la media de verdad, un bug real: "si
  // elijo bajar -2 puntos, baja de mi valoración, ahora no lo hace").
  // Rechazar te deja con bastante menos minutos (la mitad de partidos)
  // pero sin penalización de media.
  var ovrPenalty = p.tempOvrPenalty || 0;
  var effectiveOvr = clamp(p.ovr - ovrPenalty, 30, 99);
  var playTimeFactor = p.guaranteedStarter ? 1 : (p.reducedMinutes ? playerModePlayTimeFactor(effectiveOvr) * 0.5 : playerModePlayTimeFactor(effectiveOvr));
  p.tempOvrPenalty = 0;
  p.guaranteedStarter = false;
  p.reducedMinutes = false;
  var mods = p.mods || { growth: 0, inj: 0, goal: 1, title: 0 };
  p.mods = { growth: 0, inj: 0, goal: 1, title: 0 };

  var matches = Math.max(4, Math.round(PLAYER_MODE_SEASON_MATCHES * 2 * playTimeFactor));
  // Lesión real: probabilidad por salto, corta el bloque antes de tiempo
  // de verdad (menos partidos jugados) y se nota un poco en el
  // crecimiento (menos ritmo de competición), no es solo un aviso de
  // texto.
  var injury = null;
  var injuryGrowthPenalty = 0;
  if (Math.random() < clamp(PLAYER_MODE_INJURY_CHANCE + (mods.inj || 0), 0.02, 0.6)) {
    var severity = PLAYER_MODE_INJURY_MIN_SEVERITY + Math.random() * (PLAYER_MODE_INJURY_MAX_SEVERITY - PLAYER_MODE_INJURY_MIN_SEVERITY);
    var missedMatches = Math.max(1, Math.round(matches * severity));
    matches = Math.max(2, matches - missedMatches);
    injuryGrowthPenalty = Math.round(severity * 4);
    injury = { missedMatches: missedMatches, severity: severity };
  }
  var qualityMult = playerModeQualityMult(effectiveOvr);
  var goalChance = (PLAYER_MODE_GOAL_CHANCE[p.posicion] || 0.1) * qualityMult * (mods.goal || 1);
  var assistChance = (PLAYER_MODE_ASSIST_CHANCE[p.posicion] || 0.1) * qualityMult * (mods.goal || 1);
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
  var growth = clamp(rand(range[0], range[1]) + perfBonus + (mods.growth || 0), -10, 12);
  var ovrBefore = p.ovr;
  var ovrAfter = clamp(ovrBefore + growth - ovrPenalty - injuryGrowthPenalty, 35, 99);

  // Título colectivo: depende de lo fuerte que sea tu club (TEAM_POWER) --
  // un club "jefe" pelea títulos de verdad, uno normal solo de vez en
  // cuando. Si el bloque anterior te avisó de una crisis y decidiste
  // quedarte de todas formas, la chance se parte por la mitad de verdad
  // (no solo el aviso de texto) -- ver playerModeRollDecision/
  // actionPickPlayerClub.
  var clubPower = teamPower({ name: p.club });
  var titleChance = clamp(clubPower / 260, 0.05, 0.4);
  if (p.crisisPenaltyPending) titleChance *= 0.5;
  // Reputación con la afición/prensa: sube o baja el ambiente del
  // vestuario un poco, y una rueda de prensa mal resuelta (pressPenaltyPending,
  // ver playerModeRollDecision/actionPickPlayerClub tipo 'prensa') pesa
  // como una crisis menor.
  if (p.pressPenaltyPending) titleChance *= 0.7;
  var reputation = typeof p.reputation === 'number' ? p.reputation : 50;
  titleChance = clamp(titleChance + (reputation - 50) / 500 + (mods.title || 0), 0.02, 0.5);
  var colectivo = [];
  if (Math.random() < titleChance) {
    colectivo.push(choice(['Campeón de Liga', 'Campeón de Copa', 'Campeón continental']) + ' con ' + p.club);
  }
  p.crisisPenaltyPending = false;
  p.pressPenaltyPending = false;
  // Título individual: solo si el rendimiento de verdad ha sido bueno
  // (por encima de lo esperado para tu posición) -- no es automático solo
  // por tener buena media.
  var individual = [];
  if (actualProduction > expectedProduction * 1.4 && Math.random() < 0.5) {
    individual.push(p.edad < 21
      ? 'Mejor jugador joven de la categoría'
      : choice(['Bota de Oro de la categoría', 'Mejor jugador de la temporada']));
  }

  // Premios extra según el rendimiento (además de los de arriba).
  if (ovrAfter >= 85 && actualProduction > expectedProduction * 1.25 && Math.random() < 0.4) individual.push('Balón de Oro');
  if (p.posicion === 'Portero' && actualProduction >= expectedProduction && Math.random() < 0.3) individual.push('Guante de Oro');
  if (actualProduction > expectedProduction * 1.15 && Math.random() < 0.4) individual.push('Once ideal de la temporada');
  // Selección nacional: si estás convocado, suma partidos y goles y
  // puede ganar un torneo con ella (más chance cuanto mejor sea tu media).
  var nat = p.national || (p.national = { status: 'none', caps: 0, goals: 0, titles: 0 });
  var natBlock = null;
  if (nat.status === 'called') {
    var caps = rand(4, 12);
    var natGoals = 0;
    for (var k = 0; k < caps; k++) if (Math.random() < goalChance) natGoals++;
    nat.caps += caps; nat.goals += natGoals;
    natBlock = { caps: caps, goals: natGoals };
    if (Math.random() < clamp((ovrAfter - 60) / 170 + 0.03, 0.03, 0.28)) {
      colectivo.push(choice(['Campeón del Mundial', 'Campeón continental']) + ' con la selección');
      nat.titles++;
      natBlock.title = true;
    }
  }
  return { matches: matches, gls: gls, ast: ast, ovrBefore: ovrBefore, ovrAfter: ovrAfter, growth: growth, colectivo: colectivo, individual: individual, injury: injury, national: natBlock };
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
// Decisión normal (sin cesión activa): 15% cesión de salida ("también
// puedo irme cedido"), 15% CAMBIO DE POSICIÓN (el entrenador te pide
// cubrir otro puesto: aceptar da titularidad garantizada el próximo
// bloque a cambio de -2 de media temporal ESE bloque, rechazar te deja
// con bastante menos minutos -- ver playerModeSimulateBlock, misma
// referencia visual que dio el usuario), 20% CRISIS (quedarte tiene una
// pega real, ver p.crisisPenaltyPending), 25% OFERTA buena, el resto
// decisión neutra de toda la vida -- "también pueden ocurrir cosas
// malas".
function playerModeRollDecision(p) {
  if (p.onLoan) return playerModeRollReturnDecision(p);
  var bossChance = clamp(p.ovr / 130, 0.15, 0.75);
  var nat = p.national;
  if (nat && nat.status === 'none' && p.ovr >= 68 && Math.random() < 0.55) return playerModeRollCallUp(p);
  if (Math.random() < 0.3) return playerModeRollEvent(p);
  var roll0 = Math.random();
  if (roll0 < 0.15) {
    var loanClubs = [];
    for (var i = 0; i < 3; i++) loanClubs.push(playerModeRollAltClub(p, 0, [p.club].concat(loanClubs)));
    return { type: 'prestamo', options: loanClubs.map(function (name) { return { club: name, stay: false, hint: 'Préstamo' }; }) };
  }
  if (roll0 < 0.30) {
    return {
      type: 'posicion',
      options: [
        { accept: true, hint: 'Titular durante el próximo periodo', hint2: '-2 OVR temporal' },
        { accept: false, hint: 'Menos minutos' }
      ]
    };
  }
  if (roll0 < 0.45) {
    return {
      type: 'prensa',
      options: [
        { press: 'prudente', hint: 'Mensaje prudente', hint2: '+3 reputación' },
        { press: 'ambicioso', hint: 'Promete grandes cosas', hint2: 'Reputación a cara o cruz' },
        { press: 'critica', hint: 'Critica a la directiva', hint2: 'Arriesgado' }
      ]
    };
  }
  var alts = [];
  alts.push(playerModeRollAltClub(p, bossChance, [p.club]));
  alts.push(playerModeRollAltClub(p, bossChance, [p.club, alts[0]]));
  var roll = Math.random();
  var type = roll < 0.2 ? 'crisis' : (roll < 0.45 ? 'oferta' : 'normal');
  return {
    type: type,
    options: [
      { club: p.club, stay: true, hint: type === 'crisis' ? 'Menos opciones de ser campeón' : 'Quedarte en tu club' },
      { club: alts[0], stay: false, hint: 'Nuevo club' },
      { club: alts[1], stay: false, hint: 'Nuevo club' }
    ]
  };
}
// ===== Eventos con decisiones (fichaje, lesión, polémica...) =====
// Cada evento tiene 2-3 opciones con efectos (fx): rep (reputación), growth
// (puntos de media el próximo bloque), inj (prob. de lesión extra), goal
// (multiplicador de producción), title (prob. extra de título), starter /
// reduced (titularidad garantizada / menos minutos), msg (texto que se
// enseña luego). Con `chance` el efecto es a cara o cruz: si falla se usa
// `elseFx`. Se aplican en playerModeApplyEventFx y sus modificadores
// (p.mods) se consumen en el siguiente playerModeSimulateBlock.
var PLAYER_MODE_EVENTS = [
  {
    id: 'polemica', icon: '📸', title: 'Polémica en redes',
    text: 'Se filtra una foto tuya de fiesta la víspera de un partido importante y la prensa se te echa encima.',
    options: [
      { icon: '🙏', label: 'Pedir perdón en público', hint: '+2 reputación', fx: { rep: 2, msg: 'Pediste perdón y el asunto se olvidó rápido.' } },
      { icon: '🤐', label: 'No decir nada', hint: 'A cara o cruz', fx: { chance: 0.5, rep: 0, msg: 'El silencio funcionó: nadie volvió a hablar del tema.', elseFx: { rep: -8, title: -0.03, msg: 'El silencio se leyó como desprecio (-8 reputación, peor ambiente).' } } },
      { icon: '🔥', label: 'Contraatacar a la prensa', hint: '-6 reputación, +motivación', fx: { rep: -6, goal: 1.1, msg: 'Te sientes reivindicado: juegas con rabia (-6 reputación, más producción).' } }
    ]
  },
  {
    id: 'lesion', icon: '🩹', title: 'Decisión médica',
    text: 'Arrastras molestias de tu última lesión. El cuerpo médico te da dos caminos.',
    cond: function (p) { var b = p.history[p.history.length - 1]; return !!(b && b.injury); },
    options: [
      { icon: '🏥', label: 'Operarte ya', hint: 'Menos minutos, pero recuperación total', fx: { reduced: true, growth: 2, inj: -0.1, msg: 'Te operas: minutos reducidos pero vuelves como nuevo.' } },
      { icon: '💪', label: 'Rehabilitar sin operar', hint: 'Juegas, pero riesgo de recaída', fx: { growth: -2, inj: 0.15, msg: 'Rehabilitas sin pasar por quirófano: juegas, pero con riesgo de recaída.' } }
    ]
  },
  {
    id: 'entreno', icon: '🏋️', title: 'Plan de trabajo',
    text: 'Tu preparador te propone enfocar los próximos dos años de una forma distinta.',
    options: [
      { icon: '💪', label: 'Trabajo físico', hint: '+2 media, más riesgo de lesión', fx: { growth: 2, inj: 0.1, msg: 'Trabajo físico intenso: ganas nivel pero te expones más.' } },
      { icon: '🎯', label: 'Trabajo técnico', hint: '+1 media, más goles y asistencias', fx: { growth: 1, goal: 1.2, msg: 'Pules la técnica: más presencia en el marcador.' } },
      { icon: '🧘', label: 'Descanso y recuperación', hint: 'Menos riesgo de lesión', fx: { inj: -0.1, rep: 1, msg: 'Cuidas el cuerpo: te lesionas menos.' } }
    ]
  },
  {
    id: 'contrato', icon: '✍️', title: 'Renovación de contrato',
    text: 'Tu club te propone renovar. Puedes aceptar, o apretar para pedir más.',
    options: [
      { icon: '🤝', label: 'Renovar sin discutir', hint: '+6 reputación, titular seguro', fx: { rep: 6, starter: true, msg: 'Renuevas y el club te da la titularidad.' } },
      { icon: '💰', label: 'Pedir más dinero', hint: 'A cara o cruz', fx: { chance: 0.5, rep: 8, title: 0.02, msg: 'El club cede y la afición te ve como líder (+8 reputación).', elseFx: { rep: -6, reduced: true, msg: 'El club se enfada y te aparta un tiempo (-6 reputación, menos minutos).' } } }
    ]
  },
  {
    id: 'mentor', icon: '🧓', title: 'Un veterano se ofrece de mentor',
    text: 'Una leyenda del vestuario quiere guiarte. Puedes escucharle o preferir ir por tu cuenta.',
    cond: function (p) { return p.edad < 25; },
    options: [
      { icon: '📖', label: 'Aceptar su consejo', hint: '+3 media', fx: { growth: 3, msg: 'Aprendes mucho del veterano.' } },
      { icon: '🦁', label: 'Ir por tu cuenta', hint: '+2 reputación, más producción', fx: { rep: 2, goal: 1.1, msg: 'Apuestas por tu propio camino.' } }
    ]
  },
  {
    id: 'patrocinio', icon: '👟', title: 'Contrato publicitario',
    text: 'Una marca de botas quiere que seas su cara visible.',
    options: [
      { icon: '📺', label: 'Aceptar', hint: '+4 reputación, -1 media (distracción)', fx: { rep: 4, growth: -1, msg: 'Eres imagen de marca, pero tienes más compromisos.' } },
      { icon: '🚫', label: 'Rechazar y centrarte', hint: '+1 media', fx: { growth: 1, msg: 'Te centras solo en el fútbol.' } }
    ]
  },
  {
    id: 'capitania', icon: '©️', title: 'Brazalete de capitán',
    text: 'El entrenador te propone ser capitán del equipo.',
    cond: function (p) { return p.edad >= 22 && (p.reputation || 50) >= 45; },
    options: [
      { icon: '🎖️', label: 'Aceptar la capitanía', hint: '+5 reputación, más opciones de título', fx: { rep: 5, title: 0.04, msg: 'Eres el capitán: el vestuario rema a una.' } },
      { icon: '🙅', label: 'Prefiero no tener presión', hint: 'Sin cambios', fx: { msg: 'Rechazas el brazalete y sigues a lo tuyo.' } }
    ]
  }
];
function playerModeRollEvent(p) {
  var pool = PLAYER_MODE_EVENTS.filter(function (e) { return !e.cond || e.cond(p); });
  var ev = choice(pool);
  return { type: 'evento', eventId: ev.id, title: ev.title, text: ev.text, icon: ev.icon, options: ev.options.map(function (o) { return { icon: o.icon, label: o.label, hint: o.hint, fx: o.fx }; }) };
}
function playerModeApplyEventFx(p, fx) {
  var eff = fx;
  if (typeof fx.chance === 'number' && Math.random() >= fx.chance) eff = fx.elseFx || {};
  p.mods = p.mods || { growth: 0, inj: 0, goal: 1, title: 0 };
  if (eff.rep) p.reputation = clamp((typeof p.reputation === 'number' ? p.reputation : 50) + eff.rep, 0, 100);
  if (eff.growth) p.mods.growth += eff.growth;
  if (eff.inj) p.mods.inj += eff.inj;
  if (eff.goal) p.mods.goal *= eff.goal;
  if (eff.title) p.mods.title += eff.title;
  if (eff.starter) p.guaranteedStarter = true;
  if (eff.reduced) p.reducedMinutes = true;
  p.eventMessage = eff.msg || null;
}
// Convocatoria con la selección: una sola vez, cuando tu media lo permite.
function playerModeRollCallUp(p) {
  return {
    type: 'seleccion', title: 'Convocatoria con la selección', icon: '🌍',
    text: 'El seleccionador cuenta contigo. Jugar con tu país suma partidos, goles y la opción de ganar títulos con la selección.',
    options: [
      { icon: '🇺🇳', label: 'Aceptar la convocatoria', hint: 'Partidos, goles y torneos con la selección', call: true },
      { icon: '🏠', label: 'Centrarme en mi club', hint: '+1 media, sin selección', call: false }
    ]
  };
}
function playerModeDecisionCopy(decision, p) {
  if (decision.type === 'evento' || decision.type === 'seleccion') return { title: decision.title, text: decision.text };
  if (decision.type === 'crisis') return { title: 'Crisis en el club', text: 'El equipo atraviesa una mala etapa y otro club viene a buscarte.' };
  if (decision.type === 'oferta') return { title: 'Buenas noticias', text: 'Tu rendimiento ha llamado la atención de otros clubes. Elige dónde sigues tu carrera:' };
  if (decision.type === 'prestamo') return { title: 'Salida a préstamo', text: 'Tu club quiere que sumes minutos en otro equipo. Elige dónde seguir tu desarrollo.' };
  if (decision.type === 'regreso') return { title: 'Regreso a tu club', text: 'Vuelves a ' + p.homeClub + ' y vas a ser tenido en cuenta. Si aun así quieres salir, tienes dos ofertas.' };
  if (decision.type === 'posicion') return { title: 'Cambio de posición', text: 'El entrenador te necesita para cubrir otro puesto.' };
  if (decision.type === 'prensa') return { title: 'Rueda de prensa', text: 'La prensa te pregunta cómo ves la temporada que empieza. ¿Qué dices?' };
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
// El dorsal se guarda TAL CUAL mientras se escribe (ni parseInt ni
// clamp en cada tecla), a petición explícita ("en dorsal, en móvil, no
// puedo poner un 7... intento borrar el número que haya para escribir y
// siempre queda el 1... queda un 16"): forzar un valor por defecto (1)
// en cuanto el campo quedaba vacío a medio borrar hacía que el propio
// campo "peleara" con el usuario -- borrar el "10" pasaba por un
// instante en blanco, se forzaba a "1" antes de que diera tiempo a
// teclear el dígito de verdad, y el "6" se escribía detrás de ese "1"
// fantasma. Se recorta de verdad al confirmar la identidad
// (actionConfirmJugadorSetup/playerModeFreshState) -- a propósito NO se
// recorta con un onblur intermedio: cada render() sustituye el DOM
// entero, así que el input de dorsal se destruye y se crea de nuevo en
// cada tecla, y eso dispara un blur "fantasma" en el nodo viejo en
// CUALQUIER render, no solo cuando el usuario de verdad se va del campo
// -- con un onblur que llama a render(), eso encadenaba un render()
// infinito (visto de verdad: la pestaña llegaba a crashear).
window.actionSetJugadorField = function (field, value) {
  if (!G.jugadorSetupChoices) return;
  G.jugadorSetupChoices[field] = value;
  if (field === 'apellido') {
    var btn = document.querySelector('[onclick="actionConfirmJugadorSetup()"]');
    if (btn) btn.disabled = !(String(value).trim() && G.jugadorSetupChoices.club);
    return;
  }
  if (field === 'dorsal') return;
  render();
};
window.actionConfirmJugadorSetup = function () {
  var ch = G.jugadorSetupChoices;
  if (!ch || !ch.apellido.trim() || !ch.club) return;
  ch.dorsal = clamp(parseInt(ch.dorsal, 10) || 10, 1, 99);
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
  block.individual.forEach(function (t) { p.titulosIndividuales.push(t); (p.awards = p.awards || []).push({ edad: p.edad, title: t, club: p.club }); });
  block.colectivo.forEach(function (t) { if (/selección/.test(t)) (p.awards = p.awards || []).push({ edad: p.edad, title: t, club: 'Selección' }); });
  p.eventMessage = null;
  p.history.push({
    edadDesde: p.edad, edadHasta: p.edad + 1, club: p.club,
    ovrBefore: block.ovrBefore, ovrAfter: block.ovrAfter,
    matches: block.matches, gls: block.gls, ast: block.ast,
    colectivo: block.colectivo, individual: block.individual,
    injury: block.injury, national: block.national
  });
  p.edad += 2;
  if (p.edad >= PLAYER_MODE_RETIRE_AGE) {
    p.retired = true;
  } else {
    p.pendingDecision = playerModeRollDecision(p);
  }
  // Animación de trofeo al ganar algo (individual o colectivo), a
  // petición explícita ("cuando gano un trofeo tiene que salir en
  // pantalla con una animación chula") -- overlay a pantalla completa
  // (renderJugadorTrophyPopup) que se cierra tocando/pulsando "Seguir".
  var wonTitles = block.colectivo.concat(block.individual);
  if (wonTitles.length) G.jugadorTrophyPopup = { titles: wonTitles };
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
  if (decision.type === 'evento') {
    playerModeApplyEventFx(p, option.fx || {});
    p.pendingDecision = null;
    render();
    return;
  }
  if (decision.type === 'seleccion') {
    p.national = p.national || { status: 'none', caps: 0, goals: 0, titles: 0 };
    if (option.call) {
      p.national.status = 'called';
      p.awards = p.awards || [];
      p.awards.push({ edad: p.edad, title: 'Primera convocatoria con la selección', club: 'Selección' });
      p.eventMessage = 'Eres internacional: a partir de ahora juegas también con tu selección.';
    } else {
      p.national.status = 'declined';
      p.mods = p.mods || { growth: 0, inj: 0, goal: 1, title: 0 };
      p.mods.growth += 1;
      p.eventMessage = 'Renuncias a la selección para centrarte en tu club.';
    }
    p.pendingDecision = null;
    render();
    return;
  }
  if (decision.type === 'posicion') {
    p.guaranteedStarter = !!option.accept;
    p.tempOvrPenalty = option.accept ? 2 : 0;
    p.reducedMinutes = !option.accept;
    p.pendingDecision = null;
    render();
    return;
  }
  if (decision.type === 'prensa') {
    p.reputation = typeof p.reputation === 'number' ? p.reputation : 50;
    if (option.press === 'prudente') {
      p.reputation = clamp(p.reputation + 3, 0, 100);
      p.pressMessage = 'La afición valora tu prudencia (+3 reputación).';
    } else if (option.press === 'ambicioso') {
      if (Math.random() < 0.5) {
        p.reputation = clamp(p.reputation + 10, 0, 100);
        p.pressMessage = 'Tu ambición ilusiona a la afición (+10 reputación).';
      } else {
        p.reputation = clamp(p.reputation - 8, 0, 100);
        p.pressMessage = 'Prometiste demasiado y no convence (-8 reputación).';
      }
    } else {
      if (Math.random() < 0.5) {
        p.reputation = clamp(p.reputation + 6, 0, 100);
        p.pressMessage = 'La afición aplaude tu sinceridad (+6 reputación).';
      } else {
        p.reputation = clamp(p.reputation - 5, 0, 100);
        p.pressPenaltyPending = true;
        p.pressMessage = 'La directiva se molesta con tus declaraciones (-5 reputación, próxima etapa más difícil).';
      }
    }
    p.pendingDecision = null;
    render();
    return;
  }
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

// Insignia de media con color según nivel (bronce/plata/oro/élite),
// mismo lenguaje visual que la referencia que dio el usuario ("esto más
// bonito también") -- puramente decorativo, el número es el mismo p.ovr
// de siempre.
function playerModeOvrTierClass(ovr) {
  if (ovr >= 85) return 'jugador-ovr-elite';
  if (ovr >= 75) return 'jugador-ovr-gold';
  if (ovr >= 60) return 'jugador-ovr-silver';
  return 'jugador-ovr-bronze';
}
// Etiqueta + color de la reputación con la afición (ver playerModeFreshState/
// playerModeRollDecision tipo 'prensa'), mismo criterio de tramos que
// playerModeOvrTierClass pero en texto en vez de insignia.
function playerModeReputationLabel(reputation) {
  if (reputation >= 80) return { text: 'Ídolo de la afición', color: 'var(--accent-2)' };
  if (reputation >= 60) return { text: 'Querido por la afición', color: 'var(--success)' };
  if (reputation >= 40) return { text: 'Reputación normal', color: 'var(--text-dim)' };
  if (reputation >= 20) return { text: 'Cuestionado por la afición', color: '#e08a1e' };
  return { text: 'Odiado por la afición', color: 'var(--danger)' };
}
function playerModeCardHtml(p) {
  return '<div class="panel matchup-card">' +
    '<div class="matchup-row">' +
      '<div class="matchup-side">' +
        '<img class="matchup-shield" src="' + escapeHtml(playerModeShieldClub(p.club)) + '" alt="">' +
        '<div class="matchup-name">' + escapeHtml(p.club) + (p.onLoan ? ' <span class="player-tag player-tag-loan" title="Cedido, perteneces a otro club">Cedido</span>' : '') + '</div>' +
      '</div>' +
    '</div>' +
    (p.onLoan ? '<p class="dim small center-text">Perteneces a <strong>' + escapeHtml(p.homeClub) + '</strong>.</p>' : '') +
    '<div class="jugador-ovr-badge ' + playerModeOvrTierClass(p.ovr) + '">' + p.ovr + '</div>' +
    '<p class="center-text" style="margin-top:4px">' +
      '<strong style="font-family:\'Oswald\',sans-serif;font-size:1.3rem">' + escapeHtml(p.apellido) + '</strong> ' +
      '<span class="dim small">#' + p.dorsal + '</span>' +
    '</p>' +
    '<p class="center-text dim small" style="display:flex;align-items:center;justify-content:center;gap:6px">' +
      (typeof positionIconPath === 'function' ? '<img src="' + positionIconPath(p.posicion) + '" alt="" style="width:16px;height:16px">' : '') +
      escapeHtml(p.posicion) + ', ' + p.edad + ' años' +
    '</p>' +
    (function () {
      var rep = typeof p.reputation === 'number' ? p.reputation : 50;
      var label = playerModeReputationLabel(rep);
      return '<p class="center-text small" style="color:' + label.color + '">📣 ' + escapeHtml(label.text) + ' (' + rep + '/100)</p>';
    })() +
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
  if (!all.length) return '<div class="panel center-text"><p class="dim small">Vitrina vacía, todavía sin títulos.</p></div>';
  var rows = all.map(function (t) {
    return '<div class="season-badge season-badge-gold"><div class="season-badge-icon">🏆</div><div class="season-badge-text">' + escapeHtml(t) + '</div></div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Vitrina de trofeos (' + all.length + ')</h3><div class="season-summary-badges">' + rows + '</div></div>';
}

function playerModeAwardsHtml(p) {
  var awards = p.awards || [];
  if (!awards.length) return '';
  var rows = awards.slice().reverse().map(function (a) {
    return '<div class="season-badge"><div class="season-badge-icon">' + (/Bal[oó]n|Mundial/.test(a.title) ? '🥇' : '🏅') + '</div><div>' +
      '<div class="season-badge-label">' + a.edad + ' años · ' + escapeHtml(a.club) + '</div>' +
      '<div class="season-badge-text">' + escapeHtml(a.title) + '</div></div></div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Historial de premios (' + awards.length + ')</h3><div class="season-summary-badges">' + rows + '</div></div>';
}
function playerModeNationalHtml(p) {
  var n = p.national;
  if (!n || n.status !== 'called') return '';
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">🌍 Selección nacional</h3>' +
    '<div class="stats-summary" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="stat-tile"><div class="num">' + n.caps + '</div><div class="label">Partidos</div></div>' +
      '<div class="stat-tile"><div class="num">' + n.goals + '</div><div class="label">Goles</div></div>' +
      '<div class="stat-tile"><div class="num">' + n.titles + '</div><div class="label">Títulos</div></div>' +
    '</div></div>';
}
function playerModeHistoryHtml(p) {
  if (!p.history.length) return '';
  var rows = p.history.slice().reverse().map(function (h) {
    var deltaHtml = careerDeltaHtml(h.ovrAfter - h.ovrBefore);
    var titles = h.colectivo.concat(h.individual);
    return '<div class="season-badge">' +
      '<img class="matchup-shield" style="width:36px;height:36px" src="' + escapeHtml(playerModeShieldClub(h.club)) + '" alt="">' +
      '<div>' +
        '<div class="season-badge-label">' + h.edadDesde + '-' + h.edadHasta + ' años, ' + escapeHtml(h.club) + '</div>' +
        '<div class="season-badge-text">Media ' + h.ovrAfter + ' (' + deltaHtml + '), ' + h.matches + ' PJ, ' + h.gls + ' G, ' + h.ast + ' A</div>' +
        (titles.length ? '<div class="dim small">🏆 ' + titles.map(escapeHtml).join(' · ') + '</div>' : '') +
        (h.injury ? '<div class="dim small" style="color:var(--danger)">🩹 Lesión, ' + h.injury.missedMatches + ' partidos perdidos</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Trayectoria</h3><div class="season-summary-badges">' + rows + '</div></div>';
}

function renderJugadorSetup() {
  var ch = G.jugadorSetupChoices;
  var posBtns = POSITIONS.map(function (pos) {
    return '<button class="jugador-pos-card' + (ch.posicion === pos ? ' active' : '') + '" onclick="actionSetJugadorField(\'posicion\',\'' + pos + '\')">' +
      '<img src="' + positionIconPath(pos) + '" alt="' + pos + '">' +
      '<span>' + pos + '</span>' +
    '</button>';
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
        '<div class="jugador-pos-grid">' + posBtns + '</div>' +
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
  var headerHtml = '<div class="panel center-text"><h3 style="margin-bottom:4px">' + escapeHtml(copy.title) + '</h3><p class="dim small">' + escapeHtml(copy.text) + '</p></div>';
  // Aviso de lesión de la etapa que acabas de terminar (ver
  // playerModeSimulateBlock/PLAYER_MODE_INJURY_CHANCE, "un salto de 2
  // años puede truncarse antes de tiempo"), mientras siga siendo la
  // última etapa jugada.
  var lastBlock = p.history[p.history.length - 1];
  if (lastBlock && lastBlock.injury) {
    headerHtml = '<div class="panel center-text" style="border-left:4px solid var(--danger)">' +
      '<h3 style="margin-bottom:4px">🩹 Lesión</h3>' +
      '<p class="dim small">Te perdiste ' + lastBlock.injury.missedMatches + ' partidos de la etapa anterior por lesión.</p>' +
    '</div>' + headerHtml;
  }
  if (p.pressMessage) {
    headerHtml = '<div class="panel center-text"><p class="dim small">' + escapeHtml(p.pressMessage) + '</p></div>' + headerHtml;
  }
  if (decision.type === 'evento' || decision.type === 'seleccion') {
    var evCardsHtml = decision.options.map(function (opt, idx) {
      return '<button class="jugador-decision-card" onclick="actionPickPlayerClub(' + idx + ')">' +
        '<div class="jugador-decision-icon">' + opt.icon + '</div>' +
        '<strong>' + escapeHtml(opt.label) + '</strong>' +
        '<span class="player-tag player-tag-offer">' + escapeHtml(opt.hint) + '</span>' +
      '</button>';
    }).join('');
    return '<div class="panel center-text"><div style="font-size:2rem">' + decision.icon + '</div><h3 style="margin-bottom:4px">' + escapeHtml(decision.title) + '</h3><p class="dim small">' + escapeHtml(decision.text) + '</p></div>' +
      '<div class="panel"><div class="jugador-decision-grid">' + evCardsHtml + '</div></div>';
  }
  if (decision.type === 'posicion') {
    var cardsHtml = decision.options.map(function (opt, idx) {
      return '<button class="jugador-decision-card" onclick="actionPickPlayerClub(' + idx + ')">' +
        '<div class="jugador-decision-icon">' + (opt.accept ? '📋' : '🙅') + '</div>' +
        '<strong>' + (opt.accept ? 'Aceptar' : 'Rechazar') + '</strong>' +
        '<span class="player-tag ' + (opt.accept ? 'player-tag-offer' : 'player-tag-danger') + '">' + escapeHtml(opt.hint) + '</span>' +
        (opt.hint2 ? '<span class="player-tag player-tag-danger">' + escapeHtml(opt.hint2) + '</span>' : '') +
      '</button>';
    }).join('');
    return headerHtml + '<div class="panel"><div class="jugador-decision-grid">' + cardsHtml + '</div></div>';
  }
  if (decision.type === 'prensa') {
    var pressIcons = { prudente: '🛡️', ambicioso: '🔥', critica: '🗯️' };
    var pressCardsHtml = decision.options.map(function (opt, idx) {
      return '<button class="jugador-decision-card" onclick="actionPickPlayerClub(' + idx + ')">' +
        '<div class="jugador-decision-icon">' + pressIcons[opt.press] + '</div>' +
        '<strong>' + escapeHtml(opt.hint) + '</strong>' +
        (opt.hint2 ? '<span class="player-tag player-tag-danger">' + escapeHtml(opt.hint2) + '</span>' : '') +
      '</button>';
    }).join('');
    return headerHtml + '<div class="panel"><div class="jugador-decision-grid">' + pressCardsHtml + '</div></div>';
  }
  var itemsHtml = decision.options.map(function (opt, idx) {
    return '<button class="shop-item" style="width:100%;text-align:left" onclick="actionPickPlayerClub(' + idx + ')">' +
      '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(opt.club)) + '" alt="">' +
      '<div style="flex:1"><strong>' + escapeHtml(opt.club) + '</strong><div class="dim small">' + escapeHtml(opt.hint) + '</div></div>' +
    '</button>';
  }).join('');
  return headerHtml + '<div class="panel">' + itemsHtml + '</div>';
}

function renderJugadorRetired(p) {
  var shareHtml = '<div class="panel center-text">' +
    '<button class="btn btn-outline btn-block" onclick="actionShareJugadorCareer()">Compartir 🔗</button>' +
    (G.jugadorShareMessage ? '<p class="dim small">' + escapeHtml(G.jugadorShareMessage) + '</p>' : '') +
    (G.jugadorShareUrl ? '<input class="select-field mt" type="text" readonly value="' + escapeHtml(G.jugadorShareUrl) + '" onclick="this.select()">' : '') +
  '</div>';
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Retirada a los ' + p.edad + ' años</h3>' +
      '<p class="dim small">Termina la carrera de ' + escapeHtml(p.apellido) + '. Gracias por jugar.</p>' +
    '</div>' +
    playerModeCardHtml(p) +
    playerModeTrophyCaseHtml(p) +
    playerModeAwardsHtml(p) +
    playerModeNationalHtml(p) +
    playerModeHistoryHtml(p) +
    shareHtml +
    '<div class="panel">' +
      '<button class="btn btn-primary btn-block" onclick="actionReplayJugadorCareer()">Repetir</button>' +
      '<button class="btn btn-outline btn-block mt" onclick="actionRestartJugadorCareer()">Crear otra carrera</button>' +
      '<button class="btn btn-outline btn-block mt" onclick="doBackToMenuNow()">Volver al menú</button>' +
    '</div>'
  );
}

// Comparte la carrera terminada codificada en la propia URL (JSON ->
// UTF-8 -> base64 en un parámetro ?jugador=), a petición explícita
// ("cuando acabe un modo jugador, pueda compartirlo con un enlace") --
// sin backend no hay otra forma de "guardar" y compartir algo así, pero
// abrir ese enlace enseña la misma ficha/vitrina/trayectoria en modo
// solo lectura (ver renderJugadorShared/case 'jugadorShared').
function playerModeEncodeShare(p) {
  var summary = {
    apellido: p.apellido, dorsal: p.dorsal, posicion: p.posicion, pierna: p.pierna,
    club: p.club, edad: p.edad, ovr: p.ovr, pj: p.pj, gls: p.gls, ast: p.ast,
    titulosIndividuales: p.titulosIndividuales, titulosColectivos: p.titulosColectivos,
    awards: p.awards || [], national: p.national || null,
    history: p.history
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(summary))));
}
function playerModeDecodeShare(encoded) {
  try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))); } catch (e) { return null; }
}
window.actionShareJugadorCareer = function () {
  var p = G.playerCareer;
  if (!p) return;
  var url = location.origin + location.pathname + '?jugador=' + playerModeEncodeShare(p);
  G.jugadorShareUrl = url;
  G.jugadorShareMessage = 'Copia el enlace de abajo para compartirlo.';
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      G.jugadorShareMessage = 'Enlace copiado al portapapeles.';
      render();
    }).catch(function () { render(); });
  }
  render();
};
window.actionRestartJugadorCareer = function () {
  G.playerCareer = null;
  G.jugadorShareUrl = null;
  G.jugadorShareMessage = null;
  actionGoJugadorSetup();
};
// "Volver a jugar": misma identidad (apellido, dorsal, pierna, posición y
// club de origen) pero una carrera nueva de cero, otra vez con 16 años --
// a petición explícita, para no tener que rellenar el formulario de
// nuevo si solo quieres repetir con el mismo jugador.
window.actionReplayJugadorCareer = function () {
  var p = G.playerCareer;
  if (!p) return;
  G.playerCareer = playerModeFreshState({ apellido: p.apellido, dorsal: p.dorsal, pierna: p.pierna, posicion: p.posicion, club: p.homeClub || p.club });
  G.jugadorShareUrl = null;
  G.jugadorShareMessage = null;
  G.screen = 'jugadorMode';
  render();
};
function renderJugadorShared() {
  var p = G.jugadorSharedSummary;
  if (!p) {
    return '<div class="screen"><div class="panel center-text"><p class="dim small">Este enlace de Modo Jugador no es válido.</p><button class="btn btn-primary btn-block mt" onclick="doBackToMenuNow()">Volver al menú</button></div></div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Carrera compartida</h2>' +
        '<p class="dim small">La carrera de ' + escapeHtml(p.apellido) + ' en Modo Jugador.</p>' +
      '</div>' +
      playerModeCardHtml(p) +
      playerModeTrophyCaseHtml(p) +
      playerModeAwardsHtml(p) +
      playerModeNationalHtml(p) +
      playerModeHistoryHtml(p) +
      '<div class="panel">' +
        '<button class="btn btn-primary btn-block" onclick="actionGoModoJugador()">Crear la mía</button>' +
        '<button class="btn btn-outline btn-block mt" onclick="doBackToMenuNow()">Volver al menú</button>' +
      '</div>' +
    '</div>'
  );
}

window.actionDismissJugadorTrophyPopup = function () {
  G.jugadorTrophyPopup = null;
  render();
};
// Overlay a pantalla completa con animación (keyframes jugadorTrophyPop/
// jugadorTrophyShine en style.css) para celebrar un título nuevo -- se
// cierra tocando "Seguir" o fuera de la tarjeta.
function renderJugadorTrophyPopup() {
  var titles = G.jugadorTrophyPopup.titles;
  return '<div class="modal-overlay" onclick="actionDismissJugadorTrophyPopup()">' +
    '<div class="jugador-trophy-card" onclick="event.stopPropagation()">' +
      '<div class="jugador-trophy-icon">🏆</div>' +
      '<h3 style="margin-bottom:4px">¡Título conseguido!</h3>' +
      '<div class="season-summary-badges">' +
        titles.map(function (t) { return '<div class="season-badge season-badge-gold"><div class="season-badge-icon">⭐</div><div class="season-badge-text">' + escapeHtml(t) + '</div></div>'; }).join('') +
      '</div>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionDismissJugadorTrophyPopup()">Seguir</button>' +
    '</div>' +
  '</div>';
}
function renderJugadorMode() {
  var p = G.playerCareer;
  if (!p) { return '<div class="panel center-text"><p class="dim small">Todavía no has creado a tu jugador.</p><button class="btn btn-primary btn-block mt" onclick="actionGoJugadorSetup()">Crear jugador</button></div>'; }
  if (p.retired) return '<div class="screen">' + renderJugadorRetired(p) + (G.jugadorTrophyPopup ? renderJugadorTrophyPopup() : '') + '</div>';
  var bodyHtml = p.pendingDecision
    ? renderJugadorDecision(p)
    : '<div class="panel center-text"><button class="btn btn-primary btn-block" onclick="actionAdvancePlayerCareer()">Avanzar 2 años ▶</button></div>';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="doBackToMenuNow()">Volver</button>' +
      '</div>' +
      playerModeCardHtml(p) +
      (p.eventMessage && !p.pendingDecision ? '<div class="panel center-text"><p class="dim small">' + escapeHtml(p.eventMessage) + '</p></div>' : '') +
      bodyHtml +
      playerModeTrophyCaseHtml(p) +
      playerModeAwardsHtml(p) +
      playerModeNationalHtml(p) +
      playerModeHistoryHtml(p) +
      (G.jugadorTrophyPopup ? renderJugadorTrophyPopup() : '') +
    '</div>'
  );
}
