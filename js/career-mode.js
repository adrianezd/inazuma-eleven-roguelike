/* ---------------------------------------------------------------------
   MODO CARRERA: todavía en construcción (Champions -- ver ideas sueltas).
   9 pestañas dentro de la misma pantalla (G.career.tab), reutilizando al
   máximo el motor ya existente de FutDraft/Liga/Torneo en vez de
   duplicar lógica:
   - Mi equipo: alineación (arranca en 4-3-3), formación libre (cualquiera
     de las 8 de FUTDRAFT_FORMATIONS), cambios ilimitados y capitán.
   - Gestionar plantilla: media y valor de mercado de cada jugador
     (fórmula sobre futDraftPlayerScore, no hay dato real de mercado en
     el roster), venta rápida (85% del valor, al momento), cesión de
     salida (se va gratis, sin poder recuperarlo esta temporada) y
     devolver a un cedido entrante -- entre 14 y 23 jugadores en
     plantilla (CAREER_MIN/MAX_SQUAD_SIZE). Mismos filtros que Mercado
     (búsqueda por nombre + posición + orden por atributo, con dirección).
     Etiquetas por fila (.player-tag): "Cedido" a ti (no es tuyo, ni se
     vende ni se puede volver a ceder), "Nuevo" fichado o cedido ESTA
     temporada (tampoco se puede mover hasta la que viene --
     boughtThisSeasonIds, se limpia en actionStartNewCareerSeason) y
     "Oferta" si tienes una oferta entrante por él (ver Mercado).
   - Entrenamiento: centro de entrenamiento de 10 niveles (cada uno más
     caro que el anterior, CAREER_TRAINING_LEVEL_COSTS) que sube el
     "techo natural" y la velocidad de la progresión anual de TODO
     ROSTER (careerTrainingEffectiveParams, ver progresión más abajo) --
     infraestructura del club, nunca se resetea entre temporadas. Por
     jugador de tu plantilla se ve su media, cuánto subió/bajó la
     temporada pasada y la media esperada la que viene (la parte
     determinista de la progresión, sin el ruido al azar), más un botón
     de subida rápida manual (+1 de media al momento, careerQuickBoostCost
     = fracción del valor de mercado con suelo mínimo, así que es barata
     para un jugador normal y carísima para un crack).
   - Mercado: fichar (en propiedad o cedido) es NEGOCIAR
     (careerNegotiationAccepts) -- ofreces un precio y el club puede
     aceptar o rechazar según cuánto ofrezcas respecto a su valor (por
     debajo del pedido, la probabilidad de rechazo sube) Y cuánto mejor
     sea que la media de tu plantilla (un crack no ficha por un equipo
     modesto aunque pagues bien). Una cesión ENTRANTE pide solo 1/3 del
     valor y dura 1 temporada, máximo 3 cedidos a la vez
     (CAREER_MAX_LOANS_IN) -- no confundir con la cesión de SALIDA de
     Gestionar plantilla, que es la contraria. Solo jugadores con media <
     80. Filtro de posición, búsqueda por nombre, orden por cualquier
     atributo (careerNegotiationAskingValue/CAREER_MARKET_SORT_FIELDS) y
     paginado de 30 en 30. Máximo 2 ofertas por jugador y jornada de
     mercado, máximo 2 fichajes al día (CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY/
     CAREER_MAX_SIGNINGS_PER_DAY, reseteados en actionAdvanceCareerMarketDay).
     Además, mientras el mercado está abierto también pueden LLEGARTE
     ofertas por tus propios jugadores sin que hagas nada
     (careerGenerateIncomingOffers, entre 2 y 4 ofertas nuevas al día a
     jugadores distintos elegidos al azar -- pocas a propósito, para que
     no llueva -- por ±20% de su valor de mercado o, si es cesión, de su
     precio de cesión; no aplica a cedidos/fichados esta temporada):
     salen listadas en el panel "Ofertas recibidas" de Mercado, con el
     precio de mercado al lado de la oferta para poder comparar
     (renderCareerIncomingOffers), caducan a los 2 días
     (CAREER_INCOMING_OFFER_DAYS) y se pueden Aceptar (vende al precio
     ofrecido, al momento), Rechazar, o Negociar -- la negociación de una
     oferta ENTRANTE se resuelve al instante, sin más rondas de días
     (careerCounterOfferAccepts/actionSendCounterOffer): pedir igual o
     menos de lo que ofrecían es aceptado seguro, por encima la
     probabilidad cae cuanto más te alejes.
   - Calendario: liga de 20 equipos a una vuelta real (generateRoundRobin,
     igual que Liga), con 19 rivales de nombre real sacados de las mismas
     listas que usa FutDraft/Liga.
   - Liga: la clasificación de esa misma liga (mismas funciones genéricas
     que renderLigaTable: ligaEmptyStanding/ligaApplyResult/ligaSortedTable/
     ligaFormHtml, con las mismas zonas de color por puesto) + botón de
     máximos goleadores y asistentes (renderTopScorersAssistsPanel).
   - Jornada: bloqueada mientras el mercado está abierto (5 días de
     pretemporada siempre al empezar cada temporada, más 2 días a mitad de
     liga tras la jornada 10 -- CAREER_PRESEASON_DAYS/CAREER_MIDSEASON_DAYS/
     CAREER_MIDSEASON_AT_MATCHDAY, careerMaybeOpenMidseasonWindow). Con la
     liga en marcha: "Simular partido" ve tu partido de verdad con el
     motor en vivo de FutDraft/Liga; "Saltar" lo resuelve de golpe sin
     verlo. El resto de la jornada siempre se resuelve de golpe. Ganar
     suelta 50k/100k/150k de presupuesto al azar (careerAwardWinBonus). Al
     terminar la liga (20 jornadas) se puede "Empezar temporada N+1"
     (actionStartNewCareerSeason): resetea liga/tabla/calendario y abre una
     nueva ventana de pretemporada, pero conserva presupuesto, plantilla y
     careerStats/bestPosition (esos nunca se resetean entre temporadas).
   - Copa del Rey: cuadro de eliminación directa de 16 equipos (careerNewCup,
     uno nuevo cada temporada), independiente de la Liga -- no bloquea ni
     depende de la ventana de fichajes ni del calendario. Reutiliza el
     motor de Modo Torneo tal cual para repartir rivales y resolver
     cruces CPU-vs-CPU (generateTournamentBracket/simulateCpuMatch) y su
     mismo árbol visual (roundNameForIndex/bracketMatchHtml/...), con el
     mismo puente de FutDraft que Jornada para tu partido. Al ser
     eliminatoria no puede quedar en empate: si sigue igualado, una tanda
     de penaltis resumida (careerCupPenaltyShootout) decide el marcador
     final. Ganar da un bonus de presupuesto y suma al contador de copas
     ganadas de toda la carrera (c.cupsWon, acumulado).
   - Estadísticas: mejor posición en liga alcanzada nunca (c.bestPosition,
     ligaSortedTable tras cada jornada) y máximos goleadores/asistentes de
     toda la carrera, no solo de la temporada actual (c.careerStats, solo
     cuenta tus propios goles/asistencias -- renderTopScorersAssistsPanel).
   Progresión de jugadores: cada temporada nueva (actionStartNewCareerSeason),
   TODO ROSTER (no solo tu plantilla) tira hacia el "techo natural" del
   centro de entrenamiento con algo de ruido (careerProgressAllPlayers) --
   uno con media baja sube bastante, uno ya alto tiende a bajar (salvo que
   el centro esté muy mejorado), nunca se toca el ROSTER real (el delta se
   guarda solo en la partida, c.playerProgression) para no afectar a
   FutDraft/Torneo/Liga/Colección. careerPlayerScore(p) (media efectiva)
   sustituye a futDraftPlayerScore en todo Modo Carrera.
   Dificultad: los rivales de Modo Carrera son más duros que en el resto de
   modos -- TODOS se nivelan hacia arriba, la media entre su TEAM_POWER
   real y 100 (careerRivalPower, usado en vez de teamPower() directo para
   cualquier cosa que involucre a un rival: jornada, Simular partido,
   resultado), así que un equipo flojo juega bastante mejor de lo que su
   potencia de base diría y uno fuerte también sube un poco. TEAM_POWER en
   sí no se toca, así que FutDraft/Torneo/Liga estándar quedan exactamente
   igual que antes. Además, el techo de media fichable en Mercado
   (careerMarketSignableCap) ya no es fijo: sube y baja con tu propia
   media de plantilla (careerTeamAvgScore), así que un equipo mejor
   también puede aspirar a fichajes mejores.
   Presupuesto: arranca en 2M€ (G.career.budget), en la misma unidad que
   careerPlayerValue.
   Guardado: manual, en 3 huecos independientes (CAREER_SLOT_COUNT,
   careerSlotKey/saveCareerToSlot/loadCareerFromSlot/actionDeleteCareerSlot)
   elegidos desde la pantalla 'careerSlots' (renderCareerSlots) -- NO hay
   auto-guardado en cada render, solo al pulsar "Guardar"
   (actionSaveCareerNow). careerSerialize/careerDeserialize convierten el
   estado en memoria (con referencias reales a ROSTER) a JSON con solo IDs
   de jugador, así que sobrevive a cambios de stats en roster-data.js entre
   sesiones. Independiente de G.futdraft/G.futdraft.liga (con
   guardado/restauración explícitos alrededor de "Simular partido"), para
   no interferir con una partida de FutDraft/Liga en curso.
   --------------------------------------------------------------------- */

var CAREER_TABS = [
  { id: 'equipo', name: 'Mi equipo' },
  { id: 'plantilla', name: 'Gestionar plantilla' },
  { id: 'entrenamiento', name: 'Entrenamiento' },
  { id: 'mercado', name: 'Mercado' },
  { id: 'calendario', name: 'Calendario' },
  { id: 'liga', name: 'Liga' },
  { id: 'jornada', name: 'Jornada' },
  { id: 'copa', name: 'Copa del Rey' },
  { id: 'estadisticas', name: 'Estadísticas' }
];

// 11 titulares + 5 suplentes elegidos por el usuario. Larry Pogue (r43,
// Centrocampista) sale de titular en vez de Eugene Conwell (r57,
// Delantero) -- a petición explícita, y de paso la distribución de
// posiciones de los titulares (3 Delantero, 3 Centrocampista, 4 Defensa,
// 1 Portero) encaja EXACTA con la formación 4-3-3 por defecto, así que ya
// no hace falta que nadie salga "fuera de posición" al arrancar.
var CAREER_MODE_STARTER_IDS = ['r41', 'r170', 'r67', 'r264', 'r267', 'r263', 'r268', 'r269', 'r265', 'r266', 'r43'];
// Deck/Cardson/Binder (r270-r272) son Tarjeteros nuevos, añadidos junto
// con Eugene Conwell (r57, que baja de titular) en vez de
// Boar/Franky/Chameleon/Wolf -- Jimmy Mach (r66) es el único suplente
// original que se queda.
var CAREER_MODE_BENCH_IDS = ['r270', 'r271', 'r272', 'r66', 'r57'];
var CAREER_MODE_DEFAULT_FORMATION = '433';
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
// Progresión de jugadores entre temporadas (ver careerProgressAllPlayers,
// llamada solo desde actionStartNewCareerSeason): cada jugador acumula un
// delta de media que se guarda SOLO en esta partida (c.playerProgression,
// {playerId: delta acumulado}) -- nunca se toca el ROSTER real, porque lo
// usan también FutDraft/Torneo/Liga/Colección y el resto de partidas
// guardadas, así que mutar sus stats se filtraría a todos los sitios.
// careerPlayerScore(p) es la "media efectiva" (futDraftPlayerScore + el
// delta acumulado, recortada a [30, 99]) y sustituye a futDraftPlayerScore
// en TODO Modo Carrera (valor de mercado, filtros/orden de Mercado,
// negociación, media de plantilla...) para que la progresión se note en
// todos lados a la vez. Solo afecta a la media/valor -- las 4 stats en
// crudo (tiro/pase/defensa/especial) que también se pueden ordenar en
// Mercado se quedan como están en roster-data.js, no hay un desglose de
// "qué stat subió" (fuera de alcance).
function careerPlayerScore(p) {
  var c = G.career;
  var delta = (c && c.playerProgression && c.playerProgression[p.id]) || 0;
  return clamp(futDraftPlayerScore(p) + delta, 30, 99);
}

// Mismo cálculo que futDraftScoreBreakdown (capitán/sinergia/fuera de
// posición), pero con careerPlayerScore en vez de futDraftPlayerScore como
// base -- para que la pestaña Mi equipo (puntuación de equipo + insignia de
// cada jugador) SÍ refleje la progresión de Entrenamiento, a petición
// explícita ("que suba la media de ese jugador en mi equipo, que ahora
// mismo no se actualiza"). Antes de esto, Mi equipo usaba el cálculo
// genérico de FutDraft, que solo mira las stats crudas del roster y nunca
// se entera de c.playerProgression.
function careerScoreBreakdown(lineup, captainId) {
  if (!lineup.length) return { base: 0, captainBonus: 0, synergyBonus: 0, misplaced: 0, misplacedPenalty: 0, total: 0 };
  var sum = 0, misplaced = 0, captainScore = null;
  var typeCounts = {};
  lineup.forEach(function (slot) {
    var p = slot.player;
    var score = careerPlayerScore(p);
    sum += score;
    if (captainId && p.id === captainId) captainScore = score;
    if (slot.pos !== p.posicion) misplaced++;
    typeCounts[p.tipo] = (typeCounts[p.tipo] || 0) + 1;
  });
  var base = sum / lineup.length;
  var captainBonus = captainScore === null ? 0 : clamp(Math.round((captainScore - base) * FUTDRAFT_CAPTAIN_BONUS_FACTOR), -FUTDRAFT_CAPTAIN_BONUS_CAP, FUTDRAFT_CAPTAIN_BONUS_CAP);
  var synergyBonus = 0;
  Object.keys(typeCounts).forEach(function (t) {
    if (typeCounts[t] >= FUTDRAFT_SYNERGY_THRESHOLD) synergyBonus += FUTDRAFT_SYNERGY_BONUS;
  });
  var misplacedPenalty = misplaced * FUTDRAFT_OUT_OF_POSITION_PENALTY;
  var total = Math.round(clamp(base + captainBonus + synergyBonus - misplacedPenalty, 0, 100));
  return { base: Math.round(base), captainBonus: captainBonus, synergyBonus: synergyBonus, misplaced: misplaced, misplacedPenalty: misplacedPenalty, total: total };
}

// Progresión anual: cada jugador tira hacia un "techo natural"
// (CAREER_PROGRESSION_ANCHOR) con algo de ruido -- uno con media baja
// tiene mucho margen por debajo del ancla, así que sube bastante (un
// canterano que despunta); uno ya por encima tiene margen negativo, así
// que tiende a bajar (declive por edad de un veterano), y uno cerca del
// ancla se mueve poco en cualquier dirección. CAREER_PROGRESSION_RATE es
// cuánta distancia al ancla se cierra cada temporada y
// CAREER_PROGRESSION_VARIANCE es el ruido -- juntos dan el "o muchos, o
// que bajen" pedido explícitamente, no una subida fija para todos.
// Se aplica a TODO ROSTER, no solo a tu plantilla (a petición explícita:
// "para el resto de jugadores también"), así que el mercado entero se
// mueve de una temporada a otra, no solo quien fichas tú.
var CAREER_PROGRESSION_ANCHOR = 80;
var CAREER_PROGRESSION_RATE = 0.25;
var CAREER_PROGRESSION_VARIANCE = 2;

// Centro de entrenamiento (pestaña Entrenamiento): 10 niveles, cada uno
// más caro que el anterior (CAREER_TRAINING_LEVEL_COSTS, índice = subir
// de ese nivel al siguiente), que MEJORAN los parámetros de progresión
// de ARRIBA para TODO ROSTER, a petición explícita ("para que tus
// jugadores suban en vez de bajar, suban más"): cada nivel por encima
// del 1 sube el ancla (así hasta un crack casi tocando el 99 sigue
// teniendo margen para no bajar) y la velocidad de acercamiento, y baja
// el ruido (menos mala suerte, progresión más fiable). c.trainingLevel
// es infraestructura del club -- nunca se resetea entre temporadas,
// igual que el presupuesto.
var CAREER_TRAINING_MAX_LEVEL = 10;
var CAREER_TRAINING_ANCHOR_PER_LEVEL = 1.5;
var CAREER_TRAINING_RATE_PER_LEVEL = 0.02;
var CAREER_TRAINING_VARIANCE_REDUCTION_PER_LEVEL = 0.05;
var CAREER_TRAINING_LEVEL_COSTS = [0.3, 0.5, 0.8, 1.2, 1.8, 2.5, 3.5, 5, 7];
function careerTrainingEffectiveParams(level) {
  var lvl = level || 1;
  return {
    anchor: CAREER_PROGRESSION_ANCHOR + (lvl - 1) * CAREER_TRAINING_ANCHOR_PER_LEVEL,
    rate: CAREER_PROGRESSION_RATE + (lvl - 1) * CAREER_TRAINING_RATE_PER_LEVEL,
    variance: Math.max(0.5, CAREER_PROGRESSION_VARIANCE - (lvl - 1) * CAREER_TRAINING_VARIANCE_REDUCTION_PER_LEVEL)
  };
}
// "Media esperada" de la pestaña Entrenamiento: la parte DETERMINISTA del
// cálculo de abajo (el tirón hacia el ancla, sin el ruido al azar), para
// poder enseñar una previsión antes de que pase la temporada.
function careerExpectedProgressionDelta(c, p) {
  var params = careerTrainingEffectiveParams(c.trainingLevel);
  var current = careerPlayerScore(p);
  return Math.round((params.anchor - current) * params.rate * 2) / 2;
}
function careerProgressAllPlayers(c) {
  c.playerProgression = c.playerProgression || {};
  // Delta de ESTA temporada solamente (no acumulado), para poder enseñar
  // "cuánto subió la temporada pasada" en Entrenamiento -- c.playerProgression
  // sigue siendo el acumulado de siempre, usado por careerPlayerScore.
  c.lastPlayerProgressionDelta = {};
  var params = careerTrainingEffectiveParams(c.trainingLevel);
  ROSTER.forEach(function (p) {
    var current = careerPlayerScore(p);
    var pull = (params.anchor - current) * params.rate;
    var noise = (Math.random() * 2 - 1) * params.variance;
    var delta = Math.round((pull + noise) * 2) / 2;
    c.playerProgression[p.id] = (c.playerProgression[p.id] || 0) + delta;
    c.lastPlayerProgressionDelta[p.id] = delta;
  });
}

// Subida rápida manual (Entrenamiento): +1 de media al momento por
// dinero, a petición explícita ("no es barata", "de 1 en 1"). El coste
// es una fracción del valor de mercado del jugador (careerPlayerValue),
// así que por diseño se dispara para un crack ya carísimo (la misma
// curva exponencial de careerPlayerValue) y se queda asequible para un
// jugador normal -- con un suelo mínimo para que nunca sea gratis.
var CAREER_QUICK_BOOST_FACTOR = 0.15;
var CAREER_QUICK_BOOST_MIN_COST = 0.3;
var CAREER_QUICK_BOOST_CAP = 99;
function careerQuickBoostCost(p) {
  return Math.max(CAREER_QUICK_BOOST_MIN_COST, Math.round(careerPlayerValue(p) * CAREER_QUICK_BOOST_FACTOR * 10) / 10);
}

var CAREER_VALUE_ANCHOR_SCORE = 75;
var CAREER_VALUE_ANCHOR_MILLIONS = 1;
var CAREER_VALUE_DOUBLING_BELOW_ANCHOR = 10;
var CAREER_VALUE_DOUBLING_ABOVE_ANCHOR = 2.6;
function careerPlayerValue(p) {
  var score = careerPlayerScore(p);
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
    matchdayIndex: 0,
    stats: { scorers: {}, assists: {} }
  };
}

// Presupuesto en M€, misma unidad que careerPlayerValue -- 2M€ de
// salida, +50k/100k/150k al azar por cada partido tuyo ganado (ver
// careerAwardWinBonus), gastable en fichajes (Mercado) y repuesto al
// vender/ceder (Gestionar plantilla).
var CAREER_STARTING_BUDGET = 2;

// Ventana de fichajes, a petición explícita, igual en TODAS las
// temporadas: 5 días de negociación antes de que arranque la liga
// (pretemporada), y 2 días más a mitad de liga (justo después de la
// jornada 10) -- fuera de esos días el Mercado está cerrado del todo y
// no se puede jugar ninguna jornada mientras la ventana esté abierta.
// Dentro de una ventana, tope de 2 ofertas por jugador y día
// (offersToday, se resetea cada día) y 2 fichajes CONFIRMADOS por día
// (signingsToday, cuentan tanto compra como cesión entrante).
var CAREER_PRESEASON_DAYS = 5;
var CAREER_MIDSEASON_DAYS = 2;
var CAREER_MIDSEASON_AT_MATCHDAY = 10;
var CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY = 2;
var CAREER_MAX_SIGNINGS_PER_DAY = 2;
function careerNewMarketWindow(phase, totalDays) {
  return { open: true, phase: phase, dayIndex: 1, totalDays: totalDays, offersToday: {}, signingsToday: 0 };
}

// Ofertas ENTRANTES (otros clubes te ofrecen por tus jugadores), a
// petición explícita: cada día de ventana abierta llegan entre
// CAREER_INCOMING_OFFERS_MIN_PER_DAY y CAREER_INCOMING_OFFERS_MAX_PER_DAY
// ofertas nuevas (pocas a propósito, para que no llueva), repartidas al
// azar entre jugadores elegibles distintos -- precio al azar entre ±20%
// de su valor de mercado (careerPlayerValue) o, si es cesión, de su
// precio de cesión (1/3 del valor, careerNegotiationAskingValue -- si no,
// una cesión podía "ofrecer" más que comprarlo entero). Nunca a un
// jugador cedido (no es tuyo) ni fichado esta misma temporada (no se
// puede mover hasta la que viene, ver CAREER_MIN_SQUAD_SIZE y los guardas
// de actionSellCareerPlayer/actionLoanCareerPlayer), ni si ya tiene una
// oferta pendiente. Cada oferta dura CAREER_INCOMING_OFFER_DAYS días
// desde que llega -- pasado ese plazo se retira sola al avanzar el día
// (ver actionAdvanceCareerMarketDay), así que el número de ofertas
// VISIBLES a la vez puede ser algo mayor que el máximo diario si se
// solapan con las del día anterior.
var CAREER_INCOMING_OFFERS_MIN_PER_DAY = 2;
var CAREER_INCOMING_OFFERS_MAX_PER_DAY = 4;
var CAREER_INCOMING_OFFER_VARIANCE = 0.2;
var CAREER_INCOMING_OFFER_DAYS = 2;
function careerGenerateIncomingOffers(c) {
  var w = c.marketWindow;
  if (!w || !w.open) return;
  var loanedIds = c.loanedIds || [];
  var boughtIds = c.boughtThisSeasonIds || [];
  var pending = c.incomingOffers || (c.incomingOffers = []);
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var eligible = all.filter(function (p) {
    return loanedIds.indexOf(p.id) === -1 && boughtIds.indexOf(p.id) === -1 &&
      !pending.some(function (o) { return o.playerId === p.id; });
  });
  var shuffled = eligible.slice().sort(function () { return Math.random() - 0.5; });
  var target = CAREER_INCOMING_OFFERS_MIN_PER_DAY + Math.floor(Math.random() * (CAREER_INCOMING_OFFERS_MAX_PER_DAY - CAREER_INCOMING_OFFERS_MIN_PER_DAY + 1));
  shuffled.slice(0, target).forEach(function (p) {
    var mode = Math.random() < 0.25 ? 'loan' : 'buy';
    var asking = careerNegotiationAskingValue(p, mode);
    var variance = 1 + (Math.random() * 2 - 1) * CAREER_INCOMING_OFFER_VARIANCE;
    pending.push({
      id: uid(),
      playerId: p.id,
      mode: mode,
      amount: Math.max(0.1, Math.round(asking * variance * 10) / 10),
      dayReceived: w.dayIndex,
      expiresOnDay: w.dayIndex + CAREER_INCOMING_OFFER_DAYS
    });
  });
}

function careerFreshState() {
  var starters = careerModeRoster(CAREER_MODE_STARTER_IDS);
  var state = {
    tab: 'equipo',
    season: 1,
    formation: CAREER_MODE_DEFAULT_FORMATION,
    lineup: futDraftBuildLineup(starters, CAREER_MODE_DEFAULT_FORMATION),
    bench: careerModeRoster(CAREER_MODE_BENCH_IDS),
    captainId: null,
    pickingCaptain: false,
    swapSelectedId: null,
    league: careerBuildLeague(),
    lastMatchdayResult: null,
    loanedIds: [],
    // Jugadores comprados (fichaje en propiedad) ESTA temporada: no se
    // pueden vender ni ceder hasta la que viene, a petición explícita --
    // se vacía en cada actionStartNewCareerSeason. Los cedidos entrantes
    // ya tenían su propia protección (loanedIds), esto es la misma idea
    // pero para compras.
    boughtThisSeasonIds: [],
    incomingOffers: [],
    budget: CAREER_STARTING_BUDGET,
    marketWindow: careerNewMarketWindow('preseason', CAREER_PRESEASON_DAYS),
    // Mejor posición en liga y goleadores/asistentes ACUMULADOS de toda
    // la carrera (todas las temporadas, no se resetean con
    // actionStartNewCareerSeason) -- ver careerUpdateBestPosition y la
    // pestaña Estadísticas.
    bestPosition: null,
    careerStats: { scorers: {}, assists: {} },
    // Delta de progresión acumulado por jugador ({playerId: número}), ver
    // careerPlayerScore/careerProgressAllPlayers -- vacío en una partida
    // nueva, se rellena a partir de la temporada 2 (actionStartNewCareerSeason).
    playerProgression: {},
    lastPlayerProgressionDelta: {},
    // Centro de entrenamiento: infraestructura del club, nunca se
    // resetea entre temporadas (como el presupuesto) -- ver
    // careerTrainingEffectiveParams/CAREER_TRAINING_LEVEL_COSTS.
    trainingLevel: 1,
    trainingMessage: null,
    // Copa del Rey: cuadro nuevo cada temporada (careerNewCup), no
    // bloqueado por la ventana de fichajes ni por el calendario de Liga
    // -- se puede jugar cuando se quiera. cupsWon es ACUMULADO de toda la
    // carrera, como bestPosition/careerStats, nunca se resetea.
    cup: careerNewCup(),
    cupsWon: 0,
    lastCupResult: null
  };
  careerGenerateIncomingOffers(state);
  return state;
}

// A petición explícita: guardado a MANO en huecos de partida (no
// automático) -- 3 huecos fijos, cada uno se puede guardar, cargar o
// borrar independientemente desde la pantalla de selección
// (renderCareerSlots, la que se ve al entrar en Modo Carrera). Solo se
// guardan los IDs de lineup/bench/loanedIds (no los objetos de jugador
// completos): al recuperarlos se buscan de nuevo en ROSTER, así que si
// roster-data.js cambia de una sesión a otra (stats retocados, etc.) la
// partida guardada sigue viendo los datos actuales, no una foto
// congelada del momento en que se guardó.
var CAREER_SLOT_COUNT = 3;
function careerSlotKey(slot) { return 'inazumaRoguelike_career_slot_' + slot; }

function careerSerialize(c) {
  return {
    tab: c.tab, season: c.season || 1, formation: c.formation, captainId: c.captainId, budget: c.budget,
    lineup: c.lineup.map(function (s) { return { pos: s.pos, id: s.player.id }; }),
    bench: c.bench.map(function (p) { return p.id; }),
    loanedIds: c.loanedIds || [],
    league: c.league,
    lastMatchdayResult: c.lastMatchdayResult,
    calendarView: c.calendarView,
    marketFilter: c.marketFilter, marketSearch: c.marketSearch, marketOnlyInterested: c.marketOnlyInterested,
    marketSort: c.marketSort, marketSortDir: c.marketSortDir, marketPage: c.marketPage,
    plantillaFilter: c.plantillaFilter, plantillaSearch: c.plantillaSearch,
    plantillaSort: c.plantillaSort, plantillaSortDir: c.plantillaSortDir,
    showTopScorers: c.showTopScorers,
    bestPosition: c.bestPosition || null,
    careerStats: c.careerStats || { scorers: {}, assists: {} },
    marketWindow: c.marketWindow || null,
    boughtThisSeasonIds: c.boughtThisSeasonIds || [],
    incomingOffers: c.incomingOffers || [],
    playerProgression: c.playerProgression || {},
    lastPlayerProgressionDelta: c.lastPlayerProgressionDelta || {},
    trainingLevel: c.trainingLevel || 1,
    cup: c.cup, cupsWon: c.cupsWon || 0, lastCupResult: c.lastCupResult || null
  };
}
function careerDeserialize(data) {
  var lineup = (data.lineup || []).map(function (s) {
    var p = ROSTER.find(function (x) { return x.id === s.id; });
    return p ? { pos: s.pos, player: p } : null;
  }).filter(Boolean);
  var bench = (data.bench || []).map(function (id) { return ROSTER.find(function (x) { return x.id === id; }); }).filter(Boolean);
  return {
    tab: data.tab || 'equipo',
    season: data.season || 1,
    formation: data.formation || CAREER_MODE_DEFAULT_FORMATION,
    lineup: lineup, bench: bench,
    captainId: data.captainId || null,
    pickingCaptain: false, swapSelectedId: null,
    league: data.league,
    lastMatchdayResult: data.lastMatchdayResult || null,
    budget: typeof data.budget === 'number' ? data.budget : CAREER_STARTING_BUDGET,
    loanedIds: data.loanedIds || [],
    calendarView: data.calendarView,
    marketFilter: data.marketFilter || null, marketSearch: data.marketSearch || '', marketOnlyInterested: !!data.marketOnlyInterested,
    marketSort: data.marketSort, marketSortDir: data.marketSortDir, marketPage: data.marketPage || 0,
    plantillaFilter: data.plantillaFilter || null, plantillaSearch: data.plantillaSearch || '',
    plantillaSort: data.plantillaSort, plantillaSortDir: data.plantillaSortDir,
    showTopScorers: !!data.showTopScorers,
    bestPosition: data.bestPosition || null,
    careerStats: data.careerStats || { scorers: {}, assists: {} },
    marketWindow: data.marketWindow || careerNewMarketWindow('preseason', CAREER_PRESEASON_DAYS),
    boughtThisSeasonIds: data.boughtThisSeasonIds || [],
    incomingOffers: data.incomingOffers || [],
    playerProgression: data.playerProgression || {},
    lastPlayerProgressionDelta: data.lastPlayerProgressionDelta || {},
    trainingLevel: data.trainingLevel || 1,
    trainingMessage: null,
    cup: careerCupRelinkWinners(data.cup) || careerNewCup(),
    cupsWon: data.cupsWon || 0,
    lastCupResult: data.lastCupResult || null
  };
}
// Guarda el estado ACTUAL (G.career) en el hueco activo
// (G.careerActiveSlot) -- llamado solo a mano, con el botón "Guardar"
// de la cabecera de Modo Carrera (ver actionSaveCareerNow), nunca solo.
function saveCareerToSlot(slot) {
  if (!G.career || typeof localStorage === 'undefined') return false;
  try { localStorage.setItem(careerSlotKey(slot), JSON.stringify(careerSerialize(G.career))); return true; } catch (e) { return false; }
}
function loadCareerFromSlot(slot) {
  if (typeof localStorage === 'undefined') return null;
  try {
    var raw = localStorage.getItem(careerSlotKey(slot));
    if (!raw) return null;
    return careerDeserialize(JSON.parse(raw));
  } catch (e) { return null; }
}
// Resumen ligero para la pantalla de huecos (renderCareerSlots): no hace
// falta reconstruir jugadores completos solo para enseñar un par de
// líneas, así que lee el JSON crudo directamente.
function careerSlotSummary(slot) {
  if (typeof localStorage === 'undefined') return null;
  try {
    var raw = localStorage.getItem(careerSlotKey(slot));
    if (!raw) return null;
    var data = JSON.parse(raw);
    return {
      season: data.season || 1,
      matchday: data.league ? Math.min(data.league.matchdayIndex + 1, data.league.schedule.length) : 1,
      totalMatchdays: data.league ? data.league.schedule.length : CAREER_LEAGUE_TEAM_COUNT - 1,
      budget: typeof data.budget === 'number' ? data.budget : CAREER_STARTING_BUDGET
    };
  } catch (e) { return null; }
}

// Se entra siempre por la pantalla de huecos (renderCareerSlots) -- ya no
// hay guardado automático ni "seguir donde lo dejé" implícito, a
// petición explícita ("quiero guardar a mano").
function actionGoCareerMode() {
  G.screen = 'careerSlots';
  render();
}
window.actionNewCareerInSlot = function (slot) {
  G.career = careerFreshState();
  G.careerActiveSlot = slot;
  saveCareerToSlot(slot);
  G.screen = 'careerMode';
  render();
};
window.actionLoadCareerFromSlot = function (slot) {
  var data = loadCareerFromSlot(slot);
  if (!data) return;
  G.career = data;
  G.careerActiveSlot = slot;
  G.screen = 'careerMode';
  render();
};
window.actionDeleteCareerSlot = function (slot) {
  if (typeof window.confirm === 'function' && !window.confirm('¿Borrar la partida del hueco ' + slot + '? No se puede deshacer.')) return;
  try { localStorage.removeItem(careerSlotKey(slot)); } catch (e) { /* almacenamiento no disponible */ }
  if (G.careerActiveSlot === slot) { G.career = null; G.careerActiveSlot = null; }
  render();
};
window.actionSaveCareerNow = function () {
  var c = G.career;
  if (!c || !G.careerActiveSlot) return;
  var ok = saveCareerToSlot(G.careerActiveSlot);
  c.saveMessage = ok ? 'Partida guardada en el hueco ' + G.careerActiveSlot + '.' : 'No se pudo guardar (almacenamiento no disponible).';
  render();
};

function renderCareerSlots() {
  var rowsHtml = '';
  for (var i = 1; i <= CAREER_SLOT_COUNT; i++) {
    var summary = careerSlotSummary(i);
    var isActive = G.careerActiveSlot === i && G.career;
    rowsHtml += '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Hueco ' + i + (isActive ? ' · en curso' : '') + '</h3>' +
      (summary
        ? '<p class="dim small">Temporada ' + summary.season + ' · Jornada ' + summary.matchday + ' / ' + summary.totalMatchdays + ' · Presupuesto ' + summary.budget + ' M€</p>' +
          '<div class="btn-row">' +
            '<button class="btn btn-primary" onclick="actionLoadCareerFromSlot(' + i + ')">Cargar</button>' +
            '<button class="btn btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="actionDeleteCareerSlot(' + i + ')">Borrar</button>' +
          '</div>'
        : '<p class="dim small">Vacío.</p>' +
          '<button class="btn btn-primary btn-block" onclick="actionNewCareerInSlot(' + i + ')">Nueva partida</button>') +
    '</div>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoOtrosModos()">Volver</button>' +
        '<h2 class="panel-title mt">Modo Carrera</h2>' +
        '<p class="dim small">Elige un hueco de partida guardada, o empieza una nueva en uno vacío. El guardado es a mano (botón Guardar dentro de la partida).</p>' +
      '</div>' +
      rowsHtml +
    '</div>'
  );
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
    } else if (benchIdxA !== -1 && benchIdxB !== -1) {
      // Dos suplentes: solo reordena el banquillo (nadie sale ni entra al
      // once), para poder dejar el orden que se quiera -- a petición
      // explícita, igual que ya se podía hacer con dos titulares.
      var tmpBench = c.bench[benchIdxA];
      c.bench[benchIdxA] = c.bench[benchIdxB];
      c.bench[benchIdxB] = tmpBench;
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
      return '<div class="' + cls + '" onclick="selectCareerPlayer(\'' + p.id + '\')">' + badge + careerPitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + nameSuffix + '</span></div>';
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch pitch-11">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

function renderCareerEquipo(c) {
  var breakdown = careerScoreBreakdown(c.lineup, c.captainId);
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
    return '<div class="' + cls + '" onclick="selectCareerPlayer(\'' + p.id + '\')">' + careerPitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
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
  var score = Math.round(careerPlayerScore(p));
  return '<span class="media-badge" style="background:' + mediaBadgeColor(score) + '" title="Media según su posición">' + score + '</span>';
}

// Igual que pitchMediaBadgeHtml (misma clase "pitch-media-badge", posición
// de esquina sobre el avatar en el campo), pero con careerPlayerScore en
// vez de futDraftPlayerScore -- para el campo/banquillo de Mi equipo, que
// necesita la media CON progresión (a diferencia del resto de FutDraft/
// Torneo, que no tienen progresión y siguen usando pitchMediaBadgeHtml).
function careerPitchMediaBadgeHtml(p) {
  var score = Math.round(careerPlayerScore(p));
  return '<span class="pitch-media-badge" style="background:' + mediaBadgeColor(score) + '" title="Media según su posición">' + score + '</span>';
}

// Icono de posición (los mismos PR/DF/MD/DL de siempre, ver
// positionIconPath) en vez del nombre en texto -- se usa tanto en los
// filtros como junto al nombre de cada jugador, para no repetir la
// palabra "Delantero"/"Defensa"/etc en ningún sitio de esta pestaña.
function positionIconHtml(pos, size) {
  return '<img src="' + positionIconPath(pos) + '" alt="' + pos + '" title="' + pos + '" style="width:' + size + 'px;height:' + size + 'px;vertical-align:middle;">';
}

function careerPositionFilterBtnsHtml(filter, actionName) {
  return [null].concat(POSITIONS).map(function (pos) {
    var active = filter === pos;
    var arg = pos ? "'" + pos + "'" : 'null';
    var label = pos ? positionIconHtml(pos, 20) : 'Todos';
    return '<button class="btn btn-tiny' + (active ? ' active' : '') + '" onclick="' + actionName + '(' + arg + ')" title="' + (pos || 'Todos') + '">' + label + '</button>';
  }).join('');
}

window.actionSetCareerPlantillaFilter = function (pos) {
  G.career.plantillaFilter = pos;
  render();
};
// Mismo filtrado que en Mercado (búsqueda por nombre + orden por
// atributo), a petición explícita.
window.actionSetCareerPlantillaSearch = function (value) {
  G.career.plantillaSearch = value;
  render();
};
window.actionSetCareerPlantillaSort = function (fieldId) {
  G.career.plantillaSort = fieldId;
  render();
};
window.actionToggleCareerPlantillaSortDir = function () {
  G.career.plantillaSortDir = G.career.plantillaSortDir === 'asc' ? 'desc' : 'asc';
  render();
};

// Mismo criterio de "mejor disponible para esta línea" que
// assignFutDraftFormation (stat según posición), usado para elegir a
// quién subir del banquillo cuando se vende/cede a un titular.
var CAREER_LINE_STAT = { Portero: 'defensa', Defensa: 'defensa', Centrocampista: 'pase', Delantero: 'tiro' };

// Quita a un jugador del once o del banquillo (lo que toque) y le quita
// el brazalete/selección si lo tenía -- compartido por vender y ceder,
// que solo se diferencian en si sueltan dinero o no. Si era titular, sube
// automáticamente al mejor disponible del banquillo para esa misma línea
// (o el mejor de cualquier posición si no hay ninguno de esa línea) --
// a petición explícita, para no dejar un hueco vacío en el campo.
function careerRemoveFromSquad(c, id) {
  var lineupIdx = c.lineup.findIndex(function (s) { return s.player.id === id; });
  if (lineupIdx !== -1) {
    var vacatedPos = c.lineup[lineupIdx].pos;
    c.lineup.splice(lineupIdx, 1);
    if (c.bench.length) {
      var stat = CAREER_LINE_STAT[vacatedPos];
      var candidates = c.bench.filter(function (p) { return p.posicion === vacatedPos; });
      if (!candidates.length) candidates = c.bench.slice();
      candidates.sort(function (a, b) { return b[stat] - a[stat]; });
      var promoted = candidates[0];
      c.bench = c.bench.filter(function (p) { return p.id !== promoted.id; });
      c.lineup.push({ pos: vacatedPos, player: promoted });
    }
  } else {
    c.bench = c.bench.filter(function (p) { return p.id !== id; });
  }
  if (c.captainId === id) c.captainId = null;
  if (c.swapSelectedId === id) c.swapSelectedId = null;
}

// Límites de plantilla, a petición explícita: no se puede vender/ceder
// por debajo de 14 (para no dejar la pantalla de equipo con huecos
// imposibles de rellenar sin ir antes al Mercado), ni fichar por encima
// de 23 (tope realista de convocatoria de temporada).
var CAREER_MIN_SQUAD_SIZE = 14;
var CAREER_MAX_SQUAD_SIZE = 23;

// Venta rápida: se cobra al momento, pero por debajo del valor de
// mercado (85% -- "un poco menos", a petición explícita), ya que es una
// venta inmediata y no una negociación de verdad como al fichar (ver
// careerNegotiationAccepts). No hay forma de vender AL valor completo en
// esta pantalla -- para eso habría que negociar con alguien, y de
// momento (la base) solo se negocia para fichar, no para vender.
var CAREER_QUICK_SELL_FACTOR = 0.85;
window.actionSellCareerPlayer = function (id) {
  var c = G.career;
  if ((c.loanedIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes vender a un jugador cedido -- no es tuyo. Puedes devolverlo cuando quieras.'; render(); return; }
  if ((c.boughtThisSeasonIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes vender a un jugador fichado esta misma temporada -- espera a la que viene.'; render(); return; }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  if (all.length <= CAREER_MIN_SQUAD_SIZE) { c.plantillaMessage = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores en plantilla.'; render(); return; }
  var p = all.find(function (x) { return x.id === id; });
  if (!p) return;
  var payout = Math.round(careerPlayerValue(p) * CAREER_QUICK_SELL_FACTOR * 10) / 10;
  careerRemoveFromSquad(c, id);
  c.budget = Math.round((c.budget + payout) * 10) / 10;
  c.plantillaMessage = 'Venta rápida: ' + p.nombre + ' por ' + payout + ' M€ (algo por debajo de su valor de mercado).';
  render();
};

// Cesión (de salida): el jugador se va a un equipo rival cualquiera, sin
// cobrar nada (a diferencia de vender) -- y de momento no hay forma de
// recuperarlo esta temporada, no hay ficha de "cedido saliente" que
// rastrear todavía (la base). Se avisa de eso mismo en el mensaje para
// que no sorprenda. No confundir con fichar cedido (entrante, ver
// actionStartCareerNegotiation con mode 'loan') -- esto es lo contrario.
window.actionLoanCareerPlayer = function (id) {
  var c = G.career;
  if ((c.loanedIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes ceder a un jugador que ya tienes cedido -- no es tuyo. Puedes devolverlo cuando quieras.'; render(); return; }
  if ((c.boughtThisSeasonIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes ceder a un jugador fichado esta misma temporada -- espera a la que viene.'; render(); return; }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  if (all.length <= CAREER_MIN_SQUAD_SIZE) { c.plantillaMessage = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores en plantilla.'; render(); return; }
  var p = all.find(function (x) { return x.id === id; });
  if (!p) return;
  var destTeam = choice(Math.random() < 0.4 ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES);
  careerRemoveFromSquad(c, id);
  c.plantillaMessage = 'Cedido ' + p.nombre + ' a ' + destTeam + ' (sin cobrar nada). No se puede recuperar esta temporada.';
  render();
};

// Devolver a un jugador que TÚ tienes cedido (entrante): se va gratis, sin
// venta ni cesión de salida -- solo libera su hueco de cesión (máximo
// CAREER_MAX_LOANS_IN a la vez) y su sitio en la plantilla.
window.actionReturnLoanedPlayer = function (id) {
  var c = G.career;
  if ((c.loanedIds || []).indexOf(id) === -1) return;
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var p = all.find(function (x) { return x.id === id; });
  careerRemoveFromSquad(c, id);
  c.loanedIds = c.loanedIds.filter(function (x) { return x !== id; });
  c.plantillaMessage = p ? ('Devuelto ' + p.nombre + ' a su club.') : 'Jugador devuelto a su club.';
  render();
};

function renderCareerPlantilla(c) {
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var rawTotal = all.reduce(function (sum, p) { return sum + careerPlayerValue(p); }, 0);
  var total = Math.round(rawTotal * 10) / 10;
  var filter = c.plantillaFilter || null;
  var search = (c.plantillaSearch || '').trim().toLowerCase();
  var filtered = all.filter(function (p) {
    if (filter && p.posicion !== filter) return false;
    if (search && p.nombre.toLowerCase().indexOf(search) === -1) return false;
    return true;
  });
  var sortField = CAREER_MARKET_SORT_FIELDS.find(function (f) { return f.id === c.plantillaSort; }) || CAREER_MARKET_SORT_FIELDS[0];
  var sortDir = c.plantillaSortDir === 'asc' ? 1 : -1;
  filtered = filtered.slice().sort(function (a, b) { return (sortField.get(a) - sortField.get(b)) * sortDir; });
  var sortOptionsHtml = CAREER_MARKET_SORT_FIELDS.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === sortField.id ? ' selected' : '') + '>' + f.name + '</option>';
  }).join('');
  var filterBtnsHtml = careerPositionFilterBtnsHtml(filter, 'actionSetCareerPlantillaFilter');
  var canRemove = all.length > CAREER_MIN_SQUAD_SIZE;
  var loanedIds = c.loanedIds || [];
  var boughtIds = c.boughtThisSeasonIds || [];
  var offeredIds = (c.incomingOffers || []).map(function (o) { return o.playerId; });
  var rowsHtml = filtered.map(function (p) {
    var isLoaned = loanedIds.indexOf(p.id) !== -1;
    var isBought = boughtIds.indexOf(p.id) !== -1;
    var hasOffer = offeredIds.indexOf(p.id) !== -1;
    var locked = isLoaned || isBought;
    var actionsHtml = isLoaned
      ? '<button class="btn btn-tiny" style="margin-left:6px" onclick="actionReturnLoanedPlayer(\'' + p.id + '\')">Devolver</button>'
      : '<button class="btn btn-tiny" style="margin-left:6px" ' + (canRemove && !locked ? '' : 'disabled') + ' onclick="actionSellCareerPlayer(\'' + p.id + '\')">Vender</button>' +
        '<button class="btn btn-tiny" ' + (canRemove && !locked ? '' : 'disabled') + ' onclick="actionLoanCareerPlayer(\'' + p.id + '\')">Ceder</button>';
    var tagsHtml =
      (isLoaned ? ' <span class="player-tag player-tag-loan" title="Cedido a ti: no es tuyo">Cedido</span>' : '') +
      (isBought ? ' <span class="player-tag player-tag-new" title="Fichado esta temporada: no se puede mover hasta la que viene">Nuevo</span>' : '') +
      (hasOffer ? ' <span class="player-tag player-tag-offer" title="Tienes una oferta por él, mira Mercado">Oferta</span>' : '');
    return '<div class="futdraft-timeline-row">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
      '<span>' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + tagsHtml + '</span>' +
      '<strong style="margin-left:auto;white-space:nowrap;color:var(--accent-2)">' + careerPlayerValue(p) + ' M€</strong>' +
      actionsHtml +
    '</div>';
  }).join('');
  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Gestionar plantilla</h3>' +
      '<p class="dim small">Valor total de la plantilla: <strong style="color:var(--accent-2)">' + total + ' M€</strong>. Presupuesto disponible: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong>. Cedidos: ' + loanedIds.length + ' / ' + CAREER_MAX_LOANS_IN + '.</p>' +
      (c.plantillaMessage ? '<p class="dim small">' + escapeHtml(c.plantillaMessage) + '</p>' : '') +
      '<input class="select-field" type="text" placeholder="Buscar por nombre…" value="' + escapeHtml(c.plantillaSearch || '') + '" oninput="actionSetCareerPlantillaSearch(this.value)">' +
      '<div class="btn-row mt">' + filterBtnsHtml + '</div>' +
      '<div class="btn-row mt" style="align-items:center">' +
        '<select class="select-field" style="width:auto;min-height:36px;padding:6px 10px" onchange="actionSetCareerPlantillaSort(this.value)">' + sortOptionsHtml + '</select>' +
        '<button class="btn btn-tiny" onclick="actionToggleCareerPlantillaSortDir()">' + (sortDir === -1 ? '⬇ Mayor a menor' : '⬆ Menor a mayor') + '</button>' +
      '</div>' +
      '<div class="futdraft-timeline mt">' + (rowsHtml || '<p class="dim small center-text">Nadie con ese filtro.</p>') + '</div>' +
    '</div>'
  );
}

// ===== Entrenamiento =====
// Centro de entrenamiento (mejora los parámetros de careerProgressAllPlayers
// para TODO ROSTER, ver arriba) + subida rápida manual de un punto por
// dinero para TU plantilla -- a petición explícita: "veas la progresión
// del jugador, cuánto ha subido, cuánto debería subir... y puedas
// gastarte dinero para mejorar las instalaciones... y además, puedes
// subir a los jugadores manualmente tú".
window.actionUpgradeTrainingCenter = function () {
  var c = G.career;
  var level = c.trainingLevel || 1;
  if (level >= CAREER_TRAINING_MAX_LEVEL) return;
  var cost = CAREER_TRAINING_LEVEL_COSTS[level - 1];
  if (c.budget < cost) { c.trainingMessage = 'No tienes presupuesto para mejorar el centro de entrenamiento (' + cost + ' M€).'; render(); return; }
  c.budget = Math.round((c.budget - cost) * 10) / 10;
  c.trainingLevel = level + 1;
  c.trainingMessage = 'Centro de entrenamiento mejorado a nivel ' + c.trainingLevel + '.';
  render();
};
window.actionQuickBoostPlayer = function (id) {
  var c = G.career;
  var p = c.lineup.map(function (s) { return s.player; }).concat(c.bench).find(function (x) { return x.id === id; });
  if (!p) return;
  if (careerPlayerScore(p) >= CAREER_QUICK_BOOST_CAP) { c.trainingMessage = escapeHtml(p.nombre) + ' ya está al máximo (99).'; render(); return; }
  var cost = careerQuickBoostCost(p);
  if (c.budget < cost) { c.trainingMessage = 'No tienes presupuesto para pagar la subida rápida de ' + escapeHtml(p.nombre) + ' (' + cost + ' M€).'; render(); return; }
  c.budget = Math.round((c.budget - cost) * 10) / 10;
  c.playerProgression = c.playerProgression || {};
  c.playerProgression[p.id] = (c.playerProgression[p.id] || 0) + 1;
  c.trainingMessage = 'Subida rápida pagada: ' + escapeHtml(p.nombre) + ' ahora tiene ' + Math.round(careerPlayerScore(p)) + ' de media (-' + cost + ' M€).';
  render();
};
// Texto con color para un delta (+/-), reutilizado tanto para la
// progresión de la temporada pasada como para la media esperada --
// gris/"—" si no hay dato todavía (temporada 1, nadie ha progresado aún).
function careerDeltaHtml(d) {
  if (typeof d !== 'number') return '<span class="dim">—</span>';
  if (d === 0) return '<span class="dim">+0</span>';
  var color = d > 0 ? 'var(--success)' : 'var(--danger)';
  return '<strong style="color:' + color + '">' + (d > 0 ? '+' : '') + d + '</strong>';
}
function renderCareerEntrenamiento(c) {
  var level = c.trainingLevel || 1;
  var maxed = level >= CAREER_TRAINING_MAX_LEVEL;
  var nextCost = maxed ? null : CAREER_TRAINING_LEVEL_COSTS[level - 1];
  var headerHtml =
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Entrenamiento</h3>' +
      '<p class="dim small">Centro de entrenamiento: nivel <strong style="color:var(--accent-2)">' + level + '</strong> / ' + CAREER_TRAINING_MAX_LEVEL + '. Cuanto más alto, más tienden a mejorar tus jugadores cada temporada (y menos a bajar los veteranos) -- afecta a todo el mundo, no solo a tu plantilla.</p>' +
      (c.trainingMessage ? '<p class="dim small">' + escapeHtml(c.trainingMessage) + '</p>' : '') +
      (maxed
        ? '<p class="dim small">Centro al máximo.</p>'
        : '<button class="btn btn-primary btn-block mt" ' + (c.budget < nextCost ? 'disabled' : '') + ' onclick="actionUpgradeTrainingCenter()">Mejorar a nivel ' + (level + 1) + ' (' + nextCost + ' M€)</button>') +
    '</div>';
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var rowsHtml = all.map(function (p) {
    var currentScore = careerPlayerScore(p);
    var lastDelta = (c.lastPlayerProgressionDelta || {})[p.id];
    var expectedScore = clamp(currentScore + careerExpectedProgressionDelta(c, p), 30, 99);
    var atCap = currentScore >= CAREER_QUICK_BOOST_CAP;
    var cost = careerQuickBoostCost(p);
    var canAfford = c.budget >= cost && !atCap;
    return '<div class="career-offer-card">' +
      '<div class="career-offer-head">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
        '<span class="career-offer-name">' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + '</span>' +
        '<span style="margin-left:auto" title="' + escapeHtml(p.tipo) + '">' + getTypeSymbol(p.tipo).replace(/22px/g, '18px') + '</span>' +
      '</div>' +
      '<div class="career-offer-prices">' +
        '<span class="dim">Media: <strong>' + Math.round(currentScore) + '</strong></span>' +
        '<span class="dim">Progresión temporada pasada: ' + careerDeltaHtml(lastDelta) + '</span>' +
        '<span class="dim">Media esperada próxima temporada: <strong>' + Math.round(expectedScore) + '</strong></span>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-tiny" ' + (canAfford ? '' : 'disabled') + ' title="' + (atCap ? 'Ya está al máximo' : 'Sube +1 de media al momento') + '" onclick="actionQuickBoostPlayer(\'' + p.id + '\')">Subida rápida +1 (' + cost + ' M€)</button>' +
      '</div>' +
    '</div>';
  }).join('');
  return headerHtml + '<div class="panel">' + rowsHtml + '</div>';
}

window.actionSetCareerMarketFilter = function (pos) {
  G.career.marketFilter = pos;
  G.career.marketPage = 0;
  render();
};
window.actionSetCareerMarketSearch = function (value) {
  G.career.marketSearch = value;
  G.career.marketPage = 0;
  render();
};
window.actionToggleCareerMarketInterested = function () {
  G.career.marketOnlyInterested = !G.career.marketOnlyInterested;
  G.career.marketPage = 0;
  render();
};

// Ordenar por un atributo concreto (media, valor, o cualquiera de las 4
// stats) de mayor a menor o al revés -- a petición explícita ("filtros
// para poner de mayor a menor... busca de un atributo en concreto").
var CAREER_MARKET_SORT_FIELDS = [
  { id: 'media', name: 'Media', get: function (p) { return careerPlayerScore(p); } },
  { id: 'valor', name: 'Valor de mercado', get: function (p) { return careerPlayerValue(p); } },
  { id: 'tiro', name: 'Tiro', get: function (p) { return p.tiro; } },
  { id: 'pase', name: 'Regate', get: function (p) { return p.pase; } },
  { id: 'defensa', name: 'Defensa', get: function (p) { return p.defensa; } },
  { id: 'especial', name: 'Especial', get: function (p) { return p.especial; } }
];
window.actionSetCareerMarketSort = function (fieldId) {
  G.career.marketSort = fieldId;
  G.career.marketPage = 0;
  render();
};
window.actionToggleCareerMarketSortDir = function () {
  G.career.marketSortDir = G.career.marketSortDir === 'asc' ? 'desc' : 'asc';
  G.career.marketPage = 0;
  render();
};

// Páginas de 30 en 30 (CAREER_MARKET_PAGE_SIZE) en vez de volcar los 200+
// jugadores disponibles de golpe -- a petición explícita.
var CAREER_MARKET_PAGE_SIZE = 30;
window.actionCareerMarketPageStep = function (delta) {
  G.career.marketPage = Math.max(0, (G.career.marketPage || 0) + delta);
  render();
};

// La misma "Puntuación de equipo" que se ve en Mi equipo (careerScoreBreakdown,
// con capitán/sinergia/fuera de posición incluidos), reutilizada aquí como
// "qué nivel de club eres" para Mercado/negociación -- antes esta función
// calculaba una media plana aparte (titulares + banquillo, sin bonus), que
// daba un número DISTINTO al de Mi equipo y confundía sobre qué media
// manda para fichar ("mi media de equipo es 75... debería fichar hasta
// 80", a petición explícita: un solo número, no dos que no cuadran).
function careerTeamAvgScore(c) {
  return careerScoreBreakdown(c.lineup, c.captainId).total;
}
// Un jugador se considera "puede que quiera unirse" si no está
// demasiado por encima de tu nivel de club (gap corto -> más probable
// que acepte cualquier oferta razonable, ver el mismo coeficiente 0.08
// que usa careerNegotiationAccepts).
var CAREER_INTERESTED_GAP = 6;

// El techo de media fichable en Mercado ya no es un 80 fijo -- sube y
// baja con tu propia media de plantilla (careerTeamAvgScore), a
// petición explícita: si tu equipo tiene 82 de media, se puede fichar
// hasta ~87; con 77, hasta ~82. Con un equipo recién empezado (media
// ~69) el techo baja de los 80 de antes, así que también es parte del
// endurecimiento general de Modo Carrera. CAREER_MARKET_SIGNABLE_MIN_CAP
// evita que un bajón puntual de media deje el mercado casi vacío.
var CAREER_MARKET_SIGNABLE_GAP = 5;
var CAREER_MARKET_SIGNABLE_MIN_CAP = 70;
function careerMarketSignableCap(teamAvg) {
  return clamp(Math.round(teamAvg) + CAREER_MARKET_SIGNABLE_GAP, CAREER_MARKET_SIGNABLE_MIN_CAP, 99);
}

// Decide si el club rival acepta tu oferta: dos factores independientes.
// 1) Dinero: si ofreces igual o más que su valor de mercado, seguro;
//    por debajo, la probabilidad cae con el cubo de la proporción (una
//    oferta muy baja casi nunca cuela, una oferta cercana al valor casi
//    siempre sí).
// 2) Prestigio: un jugador bastante mejor que la media de tu plantilla
//    no quiere bajar de nivel aunque pagues su precio -- a petición
//    explícita ("si la media del equipo es 70 e intentas fichar a uno
//    de 81/82, igual no quiere"). Cada punto por encima de tu media
//    resta un 8% de ganas, con un suelo del 5% (nunca es del todo
//    imposible, pero muy raro).
function careerNegotiationAccepts(offer, value, playerScore, teamAvgScore) {
  var moneyFactor = offer >= value ? 1 : Math.pow(offer / value, 3);
  var gap = Math.max(0, playerScore - teamAvgScore);
  var prestigeFactor = clamp(1 - gap * 0.08, 0.05, 1);
  return Math.random() < moneyFactor * prestigeFactor;
}

// Cuántas cesiones ENTRANTES tienes ahora mismo (jugadores que no son
// tuyos, solo prestados) -- tope de CAREER_MAX_LOANS_IN a la vez, a
// petición explícita.
var CAREER_MAX_LOANS_IN = 3;
function careerLoanCount(c) { return (c.loanedIds || []).length; }

// El "valor a negociar" depende del modo: fichar en propiedad pide el
// valor de mercado completo; fichar cedido (mode 'loan', una temporada)
// pide solo 1/3 de ese valor -- en los dos casos es una negociación de
// verdad (careerNegotiationAccepts), con la misma posibilidad de rechazo
// por debajo de ese precio, a petición explícita.
function careerNegotiationAskingValue(p, mode) {
  var value = careerPlayerValue(p);
  return mode === 'loan' ? Math.max(0.1, Math.round(value / 3 * 10) / 10) : value;
}

// Aceptar/rechazar/negociar una oferta ENTRANTE (ver careerGenerateIncomingOffers).
// Aceptar y negociar-con-éxito hacen lo mismo que vender/ceder de salida
// (careerRemoveFromSquad + suma al presupuesto), respetando el mínimo de
// plantilla -- no se puede aceptar si eso te dejaría por debajo de
// CAREER_MIN_SQUAD_SIZE, tienes que vender/ceder a otro primero.
function careerResolveIncomingOffer(c, offer, amount) {
  careerRemoveFromSquad(c, offer.playerId);
  c.budget = Math.round((c.budget + amount) * 10) / 10;
  c.incomingOffers = (c.incomingOffers || []).filter(function (o) { return o.id !== offer.id; });
}
window.actionAcceptIncomingOffer = function (offerId) {
  var c = G.career;
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === offerId; });
  if (!offer) return;
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  if (all.length <= CAREER_MIN_SQUAD_SIZE) { c.marketMessage = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores en plantilla -- vende o cede a otro primero.'; render(); return; }
  var p = all.find(function (x) { return x.id === offer.playerId; });
  careerResolveIncomingOffer(c, offer, offer.amount);
  c.marketMessage = p ? ('Aceptada la oferta por ' + p.nombre + ': ' + offer.amount + ' M€.') : 'Oferta aceptada.';
  render();
};
window.actionRejectIncomingOffer = function (offerId) {
  var c = G.career;
  c.incomingOffers = (c.incomingOffers || []).filter(function (o) { return o.id !== offerId; });
  render();
};

// Negociar una oferta entrante es al momento (no otra ronda de días): tú
// propones un precio y el club decide ahí mismo -- si pides igual o
// menos de lo que ya ofrecían, seguro; por encima, la probabilidad cae
// cuanto más te alejes de su oferta original (misma idea que
// careerNegotiationAccepts, pero mirando desde el otro lado).
function careerCounterOfferAccepts(counter, originalAmount) {
  if (counter <= originalAmount) return true;
  var ratio = counter / originalAmount;
  return Math.random() < clamp(1 - (ratio - 1) * 2, 0.05, 1);
}
window.actionStartCounterNegotiation = function (offerId) {
  var c = G.career;
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === offerId; });
  if (!offer) return;
  c.counterNegotiation = { offerId: offerId, playerId: offer.playerId, counter: offer.amount, lastResult: null };
  render();
};
window.actionCancelCounterNegotiation = function () {
  G.career.counterNegotiation = null;
  render();
};
window.actionAdjustCounterOffer = function (delta) {
  var cn = G.career.counterNegotiation;
  if (!cn) return;
  cn.counter = Math.max(0.1, Math.round((cn.counter + delta) * 10) / 10);
  cn.lastResult = null;
  render();
};
window.actionSendCounterOffer = function () {
  var c = G.career;
  var cn = c.counterNegotiation;
  if (!cn) return;
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === cn.offerId; });
  if (!offer) { c.counterNegotiation = null; render(); return; }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  if (all.length <= CAREER_MIN_SQUAD_SIZE) { cn.lastResult = 'plantillaMinima'; render(); return; }
  var accepted = careerCounterOfferAccepts(cn.counter, offer.amount);
  if (accepted) {
    careerResolveIncomingOffer(c, offer, cn.counter);
    cn.lastResult = 'accepted';
  } else {
    cn.lastResult = 'rejected';
  }
  render();
};

window.actionStartCareerNegotiation = function (id, mode) {
  var c = G.career;
  if (!c.marketWindow || !c.marketWindow.open) return;
  var p = ROSTER.find(function (x) { return x.id === id; });
  if (!p) return;
  mode = mode === 'loan' ? 'loan' : 'buy';
  var asking = careerNegotiationAskingValue(p, mode);
  c.negotiation = { playerId: id, mode: mode, offer: Math.max(0.1, Math.round(asking * 0.8 * 10) / 10), lastResult: null };
  render();
};
window.actionCancelCareerNegotiation = function () {
  G.career.negotiation = null;
  render();
};
window.actionAdjustCareerOffer = function (delta) {
  var neg = G.career.negotiation;
  if (!neg) return;
  neg.offer = Math.max(0.1, Math.round((neg.offer + delta) * 10) / 10);
  neg.lastResult = null;
  render();
};
window.actionSendCareerOffer = function () {
  var c = G.career;
  var neg = c.negotiation;
  if (!neg) return;
  var w = c.marketWindow;
  if (!w || !w.open) { neg.lastResult = 'mercadoCerrado'; render(); return; }
  var p = ROSTER.find(function (x) { return x.id === neg.playerId; });
  if (!p) return;
  var squadSize = c.lineup.length + c.bench.length;
  if (squadSize >= CAREER_MAX_SQUAD_SIZE) { neg.lastResult = 'plantillaLlena'; render(); return; }
  if (neg.mode === 'loan' && careerLoanCount(c) >= CAREER_MAX_LOANS_IN) { neg.lastResult = 'cesionesLlenas'; render(); return; }
  var offersSoFar = w.offersToday[neg.playerId] || 0;
  if (offersSoFar >= CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY) { neg.lastResult = 'limiteOfertas'; render(); return; }
  if (w.signingsToday >= CAREER_MAX_SIGNINGS_PER_DAY) { neg.lastResult = 'limiteFichajes'; render(); return; }
  if (neg.offer > c.budget) { neg.lastResult = 'sinPresupuesto'; render(); return; }
  var asking = careerNegotiationAskingValue(p, neg.mode);
  var teamAvg = careerTeamAvgScore(c);
  var accepted = careerNegotiationAccepts(neg.offer, asking, careerPlayerScore(p), teamAvg);
  w.offersToday[neg.playerId] = offersSoFar + 1;
  if (accepted) {
    c.budget = Math.round((c.budget - neg.offer) * 10) / 10;
    c.bench.push(p);
    if (neg.mode === 'loan') { c.loanedIds = (c.loanedIds || []).concat([p.id]); }
    else { c.boughtThisSeasonIds = (c.boughtThisSeasonIds || []).concat([p.id]); }
    w.signingsToday++;
    neg.lastResult = 'accepted';
  } else {
    neg.lastResult = 'rejected';
  }
  render();
};

function renderCareerNegotiation(c) {
  var neg = c.negotiation;
  var p = ROSTER.find(function (x) { return x.id === neg.playerId; });
  if (!p) { c.negotiation = null; return renderCareerMercado(c); }
  var isLoan = neg.mode === 'loan';
  var value = careerPlayerValue(p);
  var asking = careerNegotiationAskingValue(p, neg.mode);
  var teamAvg = careerTeamAvgScore(c);
  var gap = Math.round(careerPlayerScore(p) - teamAvg);
  var prestigeHint = gap > CAREER_INTERESTED_GAP
    ? '<p class="dim small">Tu plantilla tiene una media de ' + Math.round(teamAvg) + '; ' + escapeHtml(p.nombre) + ' tiene ' + Math.round(careerPlayerScore(p)) + '. Puede que no quiera bajar de nivel, aunque pagues bien.</p>'
    : '';
  var w = c.marketWindow;
  var offersUsed = (w && w.offersToday[neg.playerId]) || 0;
  var offersLeft = CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY - offersUsed;
  var signingsLeft = w ? CAREER_MAX_SIGNINGS_PER_DAY - w.signingsToday : 0;
  var canOffer = w && w.open && offersLeft > 0 && signingsLeft > 0;
  var resultHtml;
  if (neg.lastResult === 'accepted') {
    resultHtml =
      '<p class="dim small" style="color:var(--accent-2)">¡Trato cerrado! ' + escapeHtml(p.nombre) + (isLoan ? ' llega cedido por una temporada por ' : ' se une a tu plantilla por ') + neg.offer + ' M€.</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionCancelCareerNegotiation()">Volver al mercado</button>';
  } else {
    resultHtml =
      (neg.lastResult === 'rejected' ? '<p class="dim small" style="color:var(--danger)">' + escapeHtml(p.nombre) + ' rechaza tu oferta de ' + neg.offer + ' M€.</p>' : '') +
      (neg.lastResult === 'sinPresupuesto' ? '<p class="dim small" style="color:var(--danger)">No tienes presupuesto para ofrecer eso.</p>' : '') +
      (neg.lastResult === 'plantillaLlena' ? '<p class="dim small" style="color:var(--danger)">Tu plantilla ya está al máximo (' + CAREER_MAX_SQUAD_SIZE + '). Vende o cede a alguien antes de fichar.</p>' : '') +
      (neg.lastResult === 'cesionesLlenas' ? '<p class="dim small" style="color:var(--danger)">Ya tienes ' + CAREER_MAX_LOANS_IN + ' jugadores cedidos, el máximo. Devuelve a alguno antes de fichar otra cesión.</p>' : '') +
      (neg.lastResult === 'limiteOfertas' ? '<p class="dim small" style="color:var(--danger)">Ya le has hecho ' + CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY + ' ofertas hoy a ' + escapeHtml(p.nombre) + '. Prueba mañana.</p>' : '') +
      (neg.lastResult === 'limiteFichajes' ? '<p class="dim small" style="color:var(--danger)">Ya has fichado ' + CAREER_MAX_SIGNINGS_PER_DAY + ' jugadores hoy, el máximo. Avanza el día para seguir.</p>' : '') +
      (neg.lastResult === 'mercadoCerrado' ? '<p class="dim small" style="color:var(--danger)">La ventana de fichajes se ha cerrado.</p>' : '') +
      '<p class="dim small">Ofertas a este jugador hoy: ' + offersUsed + ' / ' + CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY + '. Fichajes hoy: ' + (w ? w.signingsToday : 0) + ' / ' + CAREER_MAX_SIGNINGS_PER_DAY + '.</p>' +
      '<div class="stepper-row">' +
        '<button class="btn stepper-arrow" onclick="actionAdjustCareerOffer(-0.1)">◀</button>' +
        '<span class="stepper-value">' + neg.offer + ' M€</span>' +
        '<button class="btn stepper-arrow" onclick="actionAdjustCareerOffer(0.1)">▶</button>' +
      '</div>' +
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-primary" ' + (canOffer ? '' : 'disabled') + ' onclick="actionSendCareerOffer()">Enviar oferta</button>' +
        '<button class="btn btn-outline" onclick="actionCancelCareerNegotiation()">Cancelar</button>' +
      '</div>';
  }
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:8px">' + (isLoan ? 'Negociar cesión de ' : 'Negociar con ') + escapeHtml(p.nombre) + '</h3>' +
      '<div style="display:flex;justify-content:center;margin-bottom:8px">' + careerMediaBadgeHtml(p) + avatarHtml(p) + '</div>' +
      (isLoan
        ? '<p class="dim small">Cesión de 1 temporada. Precio orientativo (1/3 del valor de mercado, ' + value + ' M€): <strong style="color:var(--accent-2)">' + asking + ' M€</strong>. Presupuesto: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong>.</p>'
        : '<p class="dim small">Valor de mercado orientativo: <strong style="color:var(--accent-2)">' + asking + ' M€</strong>. Presupuesto: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong>.</p>') +
      prestigeHint +
      resultHtml +
    '</div>'
  );
}

// Botón para pasar al día siguiente de la ventana de fichajes -- resetea
// los topes diarios (ofertas por jugador y fichajes), retira las ofertas
// entrantes caducadas y sortea las de hoy; si ya se pasó del último día,
// cierra la ventana del todo (se puede volver a jugar) y descarta
// cualquier oferta que quedara sin responder.
window.actionAdvanceCareerMarketDay = function () {
  var c = G.career;
  var w = c.marketWindow;
  if (!w || !w.open) return;
  w.dayIndex++;
  w.offersToday = {};
  w.signingsToday = 0;
  if (w.dayIndex > w.totalDays) {
    w.open = false;
    c.incomingOffers = [];
  } else {
    c.incomingOffers = (c.incomingOffers || []).filter(function (o) { return w.dayIndex <= o.expiresOnDay; });
    careerGenerateIncomingOffers(c);
  }
  render();
};

function renderCareerCounterNegotiation(c) {
  var cn = c.counterNegotiation;
  // Cuando se acepta, careerResolveIncomingOffer ya quitó la oferta de
  // c.incomingOffers (está resuelta) -- hay que mirar lastResult ANTES de
  // buscarla ahí, si no el siguiente render la da por perdida y borra
  // counterNegotiation justo después de aceptar.
  if (cn.lastResult === 'accepted') {
    var acceptedPlayer = ROSTER.find(function (x) { return x.id === cn.playerId; });
    return (
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Negociar la oferta</h3>' +
        '<p class="dim small" style="color:var(--accent-2)">¡Trato cerrado! ' + escapeHtml(acceptedPlayer ? acceptedPlayer.nombre : '') + ' se va por ' + cn.counter + ' M€.</p>' +
        '<button class="btn btn-primary btn-block mt" onclick="actionCancelCounterNegotiation()">Volver al mercado</button>' +
      '</div>'
    );
  }
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === cn.offerId; });
  if (!offer) { c.counterNegotiation = null; return renderCareerMercado(c); }
  var p = ROSTER.find(function (x) { return x.id === offer.playerId; });
  if (!p) { c.counterNegotiation = null; c.incomingOffers = c.incomingOffers.filter(function (o) { return o.id !== offer.id; }); return renderCareerMercado(c); }
  var resultHtml;
  if (cn.lastResult === 'accepted') {
    resultHtml =
      '<p class="dim small" style="color:var(--accent-2)">¡Trato cerrado! ' + escapeHtml(p.nombre) + ' se va por ' + cn.counter + ' M€.</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionCancelCounterNegotiation()">Volver al mercado</button>';
  } else {
    resultHtml =
      (cn.lastResult === 'rejected' ? '<p class="dim small" style="color:var(--danger)">El club no acepta ' + cn.counter + ' M€ por ' + escapeHtml(p.nombre) + '.</p>' : '') +
      (cn.lastResult === 'plantillaMinima' ? '<p class="dim small" style="color:var(--danger)">No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores en plantilla.</p>' : '') +
      '<div class="stepper-row">' +
        '<button class="btn stepper-arrow" onclick="actionAdjustCounterOffer(-0.1)">◀</button>' +
        '<span class="stepper-value">' + cn.counter + ' M€</span>' +
        '<button class="btn stepper-arrow" onclick="actionAdjustCounterOffer(0.1)">▶</button>' +
      '</div>' +
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn btn-primary" onclick="actionSendCounterOffer()">Enviar contraoferta</button>' +
        '<button class="btn btn-outline" onclick="actionCancelCounterNegotiation()">Cancelar</button>' +
      '</div>';
  }
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:8px">Negociar la oferta por ' + escapeHtml(p.nombre) + '</h3>' +
      '<div style="display:flex;justify-content:center;margin-bottom:8px">' + careerMediaBadgeHtml(p) + avatarHtml(p) + '</div>' +
      '<p class="dim small">Te ofrecían <strong style="color:var(--accent-2)">' + offer.amount + ' M€</strong> (' + (offer.mode === 'loan' ? 'cesión' : 'compra') + '). Se resuelve al momento: pedir más de eso baja las probabilidades de que acepten.</p>' +
      resultHtml +
    '</div>'
  );
}

// "Ofertas recibidas": una tarjeta por oferta entrante pendiente (ver
// careerGenerateIncomingOffers), con la media del jugador (careerMediaBadgeHtml,
// misma insignia que Gestionar plantilla/Mercado) y el precio de mercado
// al lado de lo que ofrecen (para poder comparar de un vistazo -- antes
// no salía ninguno de los dos, solo la oferta), cuántos días le quedan
// antes de caducar y los 3
// botones -- Aceptar, Rechazar, Negociar (al momento, ver
// renderCareerCounterNegotiation). Si aceptar te dejaría por debajo de
// CAREER_MIN_SQUAD_SIZE, Aceptar/Negociar salen deshabilitados con un
// tooltip explicándolo, en vez de fallar en silencio (careerResolveIncomingOffer
// ya rechaza igualmente el negociar-al-momento, pero mejor que ni se
// pueda intentar). Vacío si no hay ninguna ahora mismo (no siempre llegan
// ofertas).
function renderCareerIncomingOffers(c) {
  var offers = c.incomingOffers || [];
  if (!offers.length) return '';
  var w = c.marketWindow;
  var atMinSquad = (c.lineup.length + c.bench.length) <= CAREER_MIN_SQUAD_SIZE;
  var blockedTitle = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores en plantilla -- vende o cede a otro primero.';
  var rowsHtml = offers.map(function (o) {
    var p = ROSTER.find(function (x) { return x.id === o.playerId; });
    if (!p) return '';
    var daysLeft = o.expiresOnDay - (w ? w.dayIndex : o.expiresOnDay);
    var value = careerPlayerValue(p);
    return '<div class="career-offer-card">' +
      '<div class="career-offer-head">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
        '<span class="career-offer-name">' + escapeHtml(p.nombre) + '</span>' +
        '<span class="dim small">' + (o.mode === 'loan' ? 'cesión' : 'compra') + ' · caduca en ' + daysLeft + ' día' + (daysLeft === 1 ? '' : 's') + '</span>' +
      '</div>' +
      '<div class="career-offer-prices">' +
        '<span class="dim">Precio mercado: <strong>' + value + ' M€</strong></span>' +
        '<span class="dim">Te ofrecen: <strong style="color:var(--accent-2)">' + o.amount + ' M€</strong></span>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-tiny btn-tiny-accept" ' + (atMinSquad ? 'disabled title="' + escapeHtml(blockedTitle) + '"' : '') + ' onclick="actionAcceptIncomingOffer(\'' + o.id + '\')">Aceptar</button>' +
        '<button class="btn btn-tiny" ' + (atMinSquad ? 'disabled title="' + escapeHtml(blockedTitle) + '"' : '') + ' onclick="actionStartCounterNegotiation(\'' + o.id + '\')">Negociar</button>' +
        '<button class="btn btn-tiny btn-tiny-danger" onclick="actionRejectIncomingOffer(\'' + o.id + '\')">Rechazar</button>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="panel">' +
    '<h3 style="margin-bottom:4px">Ofertas recibidas</h3>' +
    (atMinSquad ? '<p class="dim small" style="color:var(--danger)">' + escapeHtml(blockedTitle) + '</p>' : '') +
    rowsHtml +
  '</div>';
}

function renderCareerMercado(c) {
  if (c.negotiation) return renderCareerNegotiation(c);
  if (c.counterNegotiation) return renderCareerCounterNegotiation(c);
  var w = c.marketWindow;
  if (!w || !w.open) {
    var closedMsg = c.league.matchdayIndex < CAREER_MIDSEASON_AT_MATCHDAY
      ? ('El mercado reabrirá tras la jornada ' + CAREER_MIDSEASON_AT_MATCHDAY + ' (llevas ' + c.league.matchdayIndex + ').')
      : 'El mercado reabrirá al empezar la próxima temporada.';
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Mercado cerrado</h3>' +
      '<p class="dim small">' + closedMsg + '</p>' +
    '</div>';
  }
  var windowBannerHtml = '<div class="panel center-text">' +
    '<h3 style="margin-bottom:4px">Ventana de fichajes: día ' + w.dayIndex + ' de ' + w.totalDays + ' (' + (w.phase === 'preseason' ? 'pretemporada' : 'mercado de invierno') + ')</h3>' +
    '<p class="dim small">Máximo ' + CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY + ' ofertas por jugador y día, y ' + CAREER_MAX_SIGNINGS_PER_DAY + ' fichajes confirmados al día. Fichajes hoy: ' + w.signingsToday + ' / ' + CAREER_MAX_SIGNINGS_PER_DAY + '.</p>' +
    '<button class="btn btn-outline btn-block" onclick="actionAdvanceCareerMarketDay()">Avanzar día ▶</button>' +
  '</div>';
  var incomingOffersHtml = renderCareerIncomingOffers(c);
  var owned = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; }));
  var filter = c.marketFilter || null;
  var search = (c.marketSearch || '').trim().toLowerCase();
  var onlyInterested = !!c.marketOnlyInterested;
  var teamAvg = careerTeamAvgScore(c);
  var signableCap = careerMarketSignableCap(teamAvg);
  var available = ROSTER.filter(function (p) {
    if (owned.indexOf(p.id) !== -1) return false;
    var score = careerPlayerScore(p);
    if (score >= signableCap) return false;
    if (filter && p.posicion !== filter) return false;
    if (search && p.nombre.toLowerCase().indexOf(search) === -1) return false;
    if (onlyInterested && (score - teamAvg) > CAREER_INTERESTED_GAP) return false;
    return true;
  });
  var sortField = CAREER_MARKET_SORT_FIELDS.find(function (f) { return f.id === c.marketSort; }) || CAREER_MARKET_SORT_FIELDS[0];
  var sortDir = c.marketSortDir === 'asc' ? 1 : -1;
  available = available.slice().sort(function (a, b) { return (sortField.get(a) - sortField.get(b)) * sortDir; });

  var totalPages = Math.max(1, Math.ceil(available.length / CAREER_MARKET_PAGE_SIZE));
  var page = clamp(c.marketPage || 0, 0, totalPages - 1);
  c.marketPage = page;
  var pageItems = available.slice(page * CAREER_MARKET_PAGE_SIZE, (page + 1) * CAREER_MARKET_PAGE_SIZE);

  var filterBtnsHtml = careerPositionFilterBtnsHtml(filter, 'actionSetCareerMarketFilter');
  var sortOptionsHtml = CAREER_MARKET_SORT_FIELDS.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === sortField.id ? ' selected' : '') + '>' + f.name + '</option>';
  }).join('');
  var squadFull = (c.lineup.length + c.bench.length) >= CAREER_MAX_SQUAD_SIZE;
  var loansFull = careerLoanCount(c) >= CAREER_MAX_LOANS_IN;
  var rowsHtml = pageItems.map(function (p) {
    var value = careerPlayerValue(p);
    return '<div class="futdraft-timeline-row">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
      '<span>' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + '</span>' +
      '<strong style="margin-left:auto;white-space:nowrap;color:var(--accent-2)">' + value + ' M€</strong>' +
      '<button class="btn btn-tiny" style="margin-left:6px" ' + (squadFull ? 'disabled' : '') + ' onclick="actionStartCareerNegotiation(\'' + p.id + '\', \'buy\')">Negociar</button>' +
      '<button class="btn btn-tiny" ' + (squadFull || loansFull ? 'disabled' : '') + ' onclick="actionStartCareerNegotiation(\'' + p.id + '\', \'loan\')" title="Cesión de 1 temporada por 1/3 del valor">Cesión</button>' +
    '</div>';
  }).join('');
  var pagerHtml = totalPages > 1
    ? '<div class="stepper-row">' +
        '<button class="btn stepper-arrow" onclick="actionCareerMarketPageStep(-1)" aria-label="Página anterior"' + (page === 0 ? ' disabled' : '') + '>◀</button>' +
        '<span class="stepper-value">Página ' + (page + 1) + ' / ' + totalPages + '</span>' +
        '<button class="btn stepper-arrow" onclick="actionCareerMarketPageStep(1)" aria-label="Página siguiente"' + (page === totalPages - 1 ? ' disabled' : '') + '>▶</button>' +
      '</div>'
    : '';
  return (
    windowBannerHtml +
    incomingOffersHtml +
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Mercado</h3>' +
      '<p class="dim small">Presupuesto disponible: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong>. Con tu puntuación de equipo (' + Math.round(teamAvg) + ', la misma que en Mi equipo) puedes fichar hasta <strong style="color:var(--accent-2)">' + (signableCap - 1) + '</strong> de media -- los mejores todavía no están a la venta, pero el techo sube según mejora tu equipo. Fichar (en propiedad o cedido) es negociar: ofreces dinero y el club puede aceptar o rechazar. Cedidos: ' + careerLoanCount(c) + ' / ' + CAREER_MAX_LOANS_IN + '.</p>' +
      '<p class="dim small">' + available.length + ' jugador' + (available.length === 1 ? '' : 'es') + ' con este filtro.</p>' +
      (squadFull ? '<p class="dim small" style="color:var(--danger)">Plantilla al máximo (' + CAREER_MAX_SQUAD_SIZE + '). Vende o cede a alguien antes de fichar.</p>' : '') +
      (loansFull ? '<p class="dim small" style="color:var(--danger)">Ya tienes ' + CAREER_MAX_LOANS_IN + ' cesiones, el máximo -- devuelve a alguna antes de fichar cedido a otro.</p>' : '') +
      (c.marketMessage ? '<p class="dim small">' + escapeHtml(c.marketMessage) + '</p>' : '') +
      '<input class="select-field" type="text" placeholder="Buscar por nombre…" value="' + escapeHtml(c.marketSearch || '') + '" oninput="actionSetCareerMarketSearch(this.value)">' +
      '<div class="btn-row mt">' + filterBtnsHtml +
        '<button class="btn btn-tiny' + (onlyInterested ? ' active' : '') + '" onclick="actionToggleCareerMarketInterested()">Podrían unirse</button>' +
      '</div>' +
      '<div class="btn-row mt" style="align-items:center">' +
        '<select class="select-field" style="width:auto;min-height:36px;padding:6px 10px" onchange="actionSetCareerMarketSort(this.value)">' + sortOptionsHtml + '</select>' +
        '<button class="btn btn-tiny" onclick="actionToggleCareerMarketSortDir()">' + (sortDir === -1 ? '⬇ Mayor a menor' : '⬆ Menor a mayor') + '</button>' +
      '</div>' +
      '<div class="futdraft-timeline mt">' + (rowsHtml || '<p class="dim small center-text">No queda nadie disponible con ese filtro.</p>') + '</div>' +
      pagerHtml +
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
  var topScorersHtml = c.showTopScorers ? renderTopScorersAssistsPanel(league.stats) : '';
  return (
    '<div class="panel center-text">' +
      '<p class="dim small">Jornada ' + Math.min(league.matchdayIndex + 1, league.schedule.length) + ' de ' + league.schedule.length + '</p>' +
      '<button class="btn btn-tiny' + (c.showTopScorers ? ' active' : '') + '" onclick="actionToggleCareerTopScorers()">Máximos goleadores y asistentes</button>' +
    '</div>' +
    (topScorersHtml || '') +
    '<div class="panel" style="overflow-x:auto">' +
      '<table class="liga-table"><thead><tr><th>#</th><th></th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th><th>Últimos</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
    '</div>'
  );
}

window.actionToggleCareerTopScorers = function () {
  G.career.showTopScorers = !G.career.showTopScorers;
  render();
};

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

// Modo Carrera es más exigente que el resto de modos: TODOS los rivales
// se nivelan hacia arriba (a petición explícita: "aunque un equipo sea
// 70 que juegue como uno de 85, uno de 60 como uno de 80"), no solo los
// flojos -- la fórmula es la media entre su potencia real y el máximo
// (100), que encaja exacto con los dos ejemplos dados (70 -> 85, 60 ->
// 80) y de paso también sube un poco a los equipos ya fuertes, en vez de
// solo aplanar por abajo. No se toca TEAM_POWER global porque eso
// afectaría también a FutDraft/Torneo/Liga estándar.
var CAREER_RIVAL_LEVEL_TARGET = 100;
function careerRivalPower(name) {
  var p = teamPower({ name: name });
  return Math.round((p + CAREER_RIVAL_LEVEL_TARGET) / 2);
}

// Plantel "fantasma" para goleadores/asistentes de cualquier gol que no
// sea tuyo (mismo truco que futDraftUndraftedPool, pero excluyendo tus
// 16 del Modo Carrera en vez del draft de un FutDraft) -- así un rival
// nunca "marca" con el nombre de uno de tus propios jugadores.
function careerGhostPool(c) {
  var myIds = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; }));
  return ROSTER.filter(function (p) { return myIds.indexOf(p.id) === -1; });
}

// Genera goleador (y asistente, si toca) para cada gol de un marcador ya
// decidido y los suma a league.stats (de ESTA temporada) -- mismo
// mecanismo que futDraftRecordGoalEvents/futDraftGoalEvent de
// FutDraft/Liga, reutilizado tal cual. 'Tu equipo' es la etiqueta que ya
// reconoce renderTopScorersAssistsPanel para mostrar tu propio escudo.
// Los goles TUYOS (no los del rival, que son solo nombres fantasma sin
// identidad real de una temporada a otra) también se suman a
// c.careerStats, que no se resetea nunca entre temporadas -- ver la
// pestaña Estadísticas.
function careerRecordMatchGoals(c, league, homeIdx, awayIdx, homeGoals, awayGoals) {
  var homeLabel = homeIdx === 0 ? 'Tu equipo' : league.teamNames[homeIdx];
  var awayLabel = awayIdx === 0 ? 'Tu equipo' : league.teamNames[awayIdx];
  var myPlayers = c.lineup.map(function (s) { return s.player; });
  var ghostPool = careerGhostPool(c);
  var homePool = homeIdx === 0 ? myPlayers : ghostPool;
  var awayPool = awayIdx === 0 ? myPlayers : ghostPool;
  var homeEvents = [], awayEvents = [];
  for (var i = 0; i < homeGoals; i++) homeEvents.push(futDraftGoalEvent(homePool));
  for (var j = 0; j < awayGoals; j++) awayEvents.push(futDraftGoalEvent(awayPool));
  futDraftRecordGoalEvents(league.stats, homeEvents, homeLabel);
  futDraftRecordGoalEvents(league.stats, awayEvents, awayLabel);
  if (homeIdx === 0) futDraftRecordGoalEvents(c.careerStats, homeEvents, homeLabel);
  if (awayIdx === 0) futDraftRecordGoalEvents(c.careerStats, awayEvents, awayLabel);
}

// Se llama tras aplicar CUALQUIER resultado a la tabla (tuyo o ajeno):
// mira dónde quedas ahora mismo y, si es mejor que tu mejor marca
// histórica, la actualiza -- así "mejor posición" cuenta cualquier
// momento en que hayas estado ahí, no solo el resultado final de una
// temporada completa.
function careerUpdateBestPosition(c) {
  var sorted = ligaSortedTable(c.league.table);
  var idx = sorted.findIndex(function (t) { return t.idx === 0; });
  if (idx === -1) return;
  var position = idx + 1;
  if (!c.bestPosition || position < c.bestPosition) c.bestPosition = position;
}

// Resuelve todos los partidos de la jornada actual que NO sean el tuyo
// (o todos, si fromIdx se omite): comparando potencias 0-100, igual que
// el resto de la jornada en Liga (continueLigaMatchday). Se usa tanto
// desde "Saltar" (todos, tu partido incluido) como al terminar de VER tu
// partido con "Simular" (todos menos el tuyo, que ya se resolvió aparte).
function careerResolveOtherFixtures(c, league, skipFixtureIdx) {
  var fixtures = league.schedule[league.matchdayIndex];
  fixtures.forEach(function (fx, fi) {
    if (fi === skipFixtureIdx) return;
    var powerHome = careerRivalPower(league.teamNames[fx[0]]);
    var powerAway = careerRivalPower(league.teamNames[fx[1]]);
    var goles = careerSimulateMatchGoals(powerHome, powerAway);
    ligaApplyResult(league.table, fx[0], fx[1], goles[0], goles[1]);
    league.results[league.matchdayIndex][fi] = goles;
    careerRecordMatchGoals(c, league, fx[0], fx[1], goles[0], goles[1]);
  });
}

// Bonus de presupuesto por ganar TU partido de la jornada (50k/100k/150k
// al azar, a petición explícita) -- nunca por empatar ni perder. Se llama
// una sola vez por jornada, tanto desde "Saltar" como al terminar de ver
// tu partido con "Simular" (ver finishCareerMatchdayMatch).
var CAREER_WIN_BONUSES = [0.05, 0.1, 0.15];
function careerAwardWinBonus(c, myGoals, oppGoals) {
  if (myGoals <= oppGoals) return 0;
  var bonus = choice(CAREER_WIN_BONUSES);
  c.budget = Math.round((c.budget + bonus) * 10) / 10;
  return bonus;
}

// Si tocaba abrir la ventana de mitad de temporada (justo tras jugar la
// jornada CAREER_MIDSEASON_AT_MATCHDAY), la abre -- se llama después de
// cada jornada jugada, en los dos caminos (Saltar y Simular).
function careerMaybeOpenMidseasonWindow(c) {
  if (c.league.matchdayIndex === CAREER_MIDSEASON_AT_MATCHDAY && (!c.marketWindow || !c.marketWindow.open)) {
    c.marketWindow = careerNewMarketWindow('midseason', CAREER_MIDSEASON_DAYS);
    c.incomingOffers = [];
    careerGenerateIncomingOffers(c);
  }
}

// "Saltar": la jornada entera se resuelve de golpe sin ver nada, tu
// partido incluido -- lo que ya había. Bloqueada mientras haya una
// ventana de fichajes abierta (ver renderCareerJornada, que ni siquiera
// enseña el botón en ese caso -- esto es el cinturón y tirantes).
window.actionSkipCareerMatchday = function () {
  var c = G.career;
  if (c.marketWindow && c.marketWindow.open) return;
  if (careerCupPending(c)) return;
  var league = c.league;
  if (league.matchdayIndex >= league.schedule.length) return;
  var myPower = futDraftScoreBreakdown(c.lineup, c.captainId).total;
  var myFixtureIdx = league.schedule[league.matchdayIndex].findIndex(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var myFixture = league.schedule[league.matchdayIndex][myFixtureIdx];
  var youAreHome = myFixture[0] === 0;
  var oppIdx = youAreHome ? myFixture[1] : myFixture[0];
  var powerHome = youAreHome ? myPower : careerRivalPower(league.teamNames[myFixture[0]]);
  var powerAway = youAreHome ? careerRivalPower(league.teamNames[myFixture[1]]) : myPower;
  var goles = careerSimulateMatchGoals(powerHome, powerAway);
  ligaApplyResult(league.table, myFixture[0], myFixture[1], goles[0], goles[1]);
  league.results[league.matchdayIndex][myFixtureIdx] = goles;
  careerRecordMatchGoals(c, league, myFixture[0], myFixture[1], goles[0], goles[1]);
  careerResolveOtherFixtures(c, league, myFixtureIdx);
  var myGoals = youAreHome ? goles[0] : goles[1];
  var oppGoals = youAreHome ? goles[1] : goles[0];
  var winBonus = careerAwardWinBonus(c, myGoals, oppGoals);
  c.lastMatchdayResult = {
    matchday: league.matchdayIndex + 1,
    oppName: league.teamNames[oppIdx],
    myGoals: myGoals,
    oppGoals: oppGoals,
    winBonus: winBonus
  };
  league.matchdayIndex++;
  careerUpdateBestPosition(c);
  careerMaybeOpenMidseasonWindow(c);
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
  if (c.marketWindow && c.marketWindow.open) return;
  if (careerCupPending(c)) return;
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
  var sim = futDraftSimulateMatchCore(careerRivalPower(oppName));
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
  // Tu partido ya trae sus propios goleadores/asistentes de verdad (los
  // generó futDraftBuildTimeline al simular la cadena, ver live.revealed),
  // así que aquí se registran esos en vez de generar unos nuevos.
  var myEvents = live.revealed.filter(function (e) { return e.side === 'me'; });
  futDraftRecordGoalEvents(league.stats, myEvents, 'Tu equipo');
  futDraftRecordGoalEvents(league.stats, live.revealed.filter(function (e) { return e.side === 'opp'; }), oppName);
  futDraftRecordGoalEvents(c.careerStats, myEvents, 'Tu equipo');
  careerResolveOtherFixtures(c, league, fi);
  var winBonus = careerAwardWinBonus(c, myGoals, oppGoals);
  c.lastMatchdayResult = { matchday: league.matchdayIndex + 1, oppName: oppName, myGoals: myGoals, oppGoals: oppGoals, winBonus: winBonus };
  league.matchdayIndex++;
  careerUpdateBestPosition(c);
  careerMaybeOpenMidseasonWindow(c);

  G.futdraft.lastMatchResult = {
    oppName: oppName, oppShield: teamShieldPath(oppName), oppPower: careerRivalPower(oppName),
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
window.continueCareerCupMatch = function () {
  var c = G.career;
  G.futdraft = c.savedFutdraft;
  c.savedFutdraft = null;
  G.screen = 'careerMode';
  c.tab = 'copa';
  render();
};

// Nueva temporada: sube el número, aplica la progresión anual a TODO
// ROSTER (careerProgressAllPlayers, no solo tu plantilla), genera una
// liga nueva de cero (rivales, calendario, tabla y goleadores/asistentes
// DE ESA TEMPORADA reiniciados) y abre la ventana de pretemporada de
// siempre -- el equipo, presupuesto, plantilla, mejor posición histórica
// y careerStats NO se tocan, siguen siendo los mismos de antes, como una
// temporada real de verdad.
window.actionStartNewCareerSeason = function () {
  var c = G.career;
  if (c.league.matchdayIndex < c.league.schedule.length) return;
  c.season = (c.season || 1) + 1;
  careerProgressAllPlayers(c);
  c.league = careerBuildLeague();
  c.marketWindow = careerNewMarketWindow('preseason', CAREER_PRESEASON_DAYS);
  c.incomingOffers = [];
  c.boughtThisSeasonIds = []; // temporada nueva: ya se pueden volver a mover
  careerGenerateIncomingOffers(c);
  c.lastMatchdayResult = null;
  c.calendarView = null;
  c.cup = careerNewCup();
  c.lastCupResult = null;
  render();
};

// ===== Copa del Rey =====
// Cuadro de eliminación directa independiente de la Liga (no bloquea ni
// depende de la ventana de fichajes ni del calendario, se juega cuando se
// quiera) -- uno nuevo cada temporada (careerNewCup, arriba y en
// actionStartNewCareerSeason). Reutiliza CASI TODO el motor genérico de
// Modo Torneo tal cual, porque no depende de G.run/G.match/G.tournament:
// generateTournamentBracket (reparto de rivales sin repetir, jefe/normal),
// simulateCpuMatch (quién gana un CPU-vs-CPU, dado alrededor de
// TEAM_POWER) y todo el HTML del árbol (roundNameForIndex/bracketShieldHtml/
// bracketTeamHtml/bracketMatchHtml, de tournament.js) para tener un
// cuadro visual igual de currado sin duplicar ese CSS/markup.
// TU partido sigue el mismo patrón de puente con FutDraft que ya usa
// Jornada (ver actionSimulateCareerMatchday/finishCareerMatchdayMatch):
// "Simular partido" lo ve en vivo con el motor de FutDraft, "Saltar" lo
// resuelve al momento con careerSimulateMatchGoals. A propósito NO se usa
// la prórroga/tanda de penaltis del bracket de FutDraft (ligada a su
// propio flujo fijo de G.futdraft.pendingMatch/pendingOppSide, pensado
// solo para Modo Torneo) -- si acaba empatado, se decide con una tanda
// de penaltis resumida (careerCupPenaltyShootout, mismas fórmulas que la
// de FutDraft -- futDraftPenaltyShotChance/PENALTY_MODE_ROUNDS -- pero
// solo el marcador final, sin lanzamiento a lanzamiento) en vez de la
// pantalla de tanda completa, simplificación deliberada para no complicar
// el puente.
var CAREER_CUP_SIZE = 16;
var CAREER_CUP_WIN_BONUS = 0.5;
function careerNewCup() {
  var bracket = generateTournamentBracket(CAREER_CUP_SIZE);
  var round1 = [];
  for (var i = 0; i < bracket.slots.length; i += 2) round1.push({ a: bracket.slots[i], b: bracket.slots[i + 1], winner: null });
  return { rounds: [round1], size: bracket.size, eliminated: false, eliminatedRound: null, rewardClaimed: false };
}
// Tras un guardar/cargar (JSON de por medio), match.winner deja de ser el
// MISMO objeto que match.a o match.b (dos copias distintas, iguales mano
// a mano), lo que rompe el resaltado de "quién ganó" en bracketTeamHtml
// (usa === ). Se re-enlaza comparando isPlayer+name, que sí sobrevive
// intactos al JSON.
function careerCupRelinkWinners(cup) {
  if (!cup) return cup;
  cup.rounds.forEach(function (round) {
    round.forEach(function (m) {
      if (!m.winner) return;
      m.winner = (m.winner.isPlayer === m.a.isPlayer && m.winner.name === m.a.name) ? m.a : m.b;
    });
  });
  return cup;
}
function careerCupMyMatch(cup) {
  var round = cup.rounds[cup.rounds.length - 1];
  return round.find(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; }) || null;
}
function careerCupOpponent(match) { return match.a.isPlayer ? match.b : match.a; }
function careerCupChampion(cup) {
  var round = cup.rounds[cup.rounds.length - 1];
  return (round.length === 1 && round[0].winner) ? round[0].winner : null;
}
// true si ya no queda nada por jugar en la Copa esta temporada (o la
// ganaste, o caíste en algún cruce) -- usado tanto para saber si se puede
// seguir con la Liga (careerCupPending) como para el mensaje de la propia
// pestaña Copa.
function careerCupFinished(cup) { return cup.eliminated || !!careerCupChampion(cup); }
// La Copa se juega siempre JUSTO DESPUÉS de la jornada 10 (a petición
// explícita: "la copa del rey, se juega siempre justo después de la
// jornada 10, y luego sigue la liga"), no en cualquier momento como
// antes -- comparte umbral con la ventana de fichajes de mitad de
// temporada (CAREER_MIDSEASON_AT_MATCHDAY) porque las dos cosas pasan en
// el mismo punto del calendario. Antes de llegar ahí, la pestaña Copa
// está bloqueada (careerCupLocked); una vez desbloqueada, la Liga no deja
// jugar la jornada 11 hasta que la Copa esté careerCupFinished
// (careerCupPending, comprobado en renderCareerJornada y en los dos
// actionSkip/actionSimulateCareerMatchday).
function careerCupLocked(c) { return c.league.matchdayIndex < CAREER_MIDSEASON_AT_MATCHDAY; }
function careerCupPending(c) { return !careerCupLocked(c) && !careerCupFinished(c.cup); }
// Resuelve cualquier partido pendiente de la ronda actual que no sea el
// tuyo (CPU vs CPU, igual que careerResolveOtherFixtures en Liga) y, si
// ya está completa, arma la siguiente ronda con los ganadores -- si la
// ronda actual era la Final, no hay ronda siguiente, el campeón sale de
// careerCupChampion.
function careerCupAdvanceRound(cup) {
  var round = cup.rounds[cup.rounds.length - 1];
  round.forEach(function (m) {
    if (m.winner === null) m.winner = simulateCpuMatch(m.a, m.b);
  });
  if (round.length === 1) return;
  var winners = round.map(function (m) { return m.winner; });
  var nextRound = [];
  for (var i = 0; i < winners.length; i += 2) nextRound.push({ a: winners[i], b: winners[i + 1], winner: null });
  cup.rounds.push(nextRound);
}
// Una vez eliminado ya no hay más partidos TUYOS que jugar (careerCupMyMatch
// no volverá a encontrar nada), así que se resuelve solo el resto del
// cuadro de golpe para tener un campeón que enseñar en vez de dejar el
// árbol a medias para siempre.
function careerCupSettleRemaining(cup) {
  while (!careerCupChampion(cup)) careerCupAdvanceRound(cup);
}
function careerCupPenaltyShootout(c, oppName) {
  var myScore = futDraftTeamScore(c.lineup, c.captainId);
  var diff = myScore - careerRivalPower(oppName);
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
// Premio de la Copa: presupuesto + contador de copas ganadas ACUMULADO de
// toda la carrera (c.cupsWon, como bestPosition/careerStats, nunca se
// resetea) -- rewardClaimed evita darlo dos veces si se vuelve a mirar la
// pestaña tras ya haber quedado campeón.
function careerCupMaybeAwardChampion(c) {
  var cup = c.cup;
  if (cup.rewardClaimed) return;
  var champion = careerCupChampion(cup);
  if (!champion) return;
  cup.rewardClaimed = true;
  if (champion.isPlayer) {
    c.budget = Math.round((c.budget + CAREER_CUP_WIN_BONUS) * 10) / 10;
    c.cupsWon = (c.cupsWon || 0) + 1;
  }
}
window.actionSimulateCareerCupMatch = function () {
  var c = G.career;
  var cup = c.cup;
  var match = careerCupMyMatch(cup);
  if (!match) return;
  var opp = careerCupOpponent(match);
  c.savedFutdraft = G.futdraft;
  G.futdraft = { lineup: c.lineup, captainId: c.captainId, formation: c.formation, condition: 'ninguna' };
  var sim = futDraftSimulateMatchCore(careerRivalPower(opp.name));
  G.futdraft.live = {
    oppSide: { name: opp.name }, modifier: sim.modifier,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    // allowDraw:true aunque sea eliminatoria: así el tick genérico no
    // mete su propia prórroga (pensada para el flujo fijo de Torneo). Si
    // sigue empatado, finishCareerCupMatch tira una tanda de penaltis
    // resumida (careerCupPenaltyShootout).
    inExtraTime: false, allowDraw: true, onFinish: finishCareerCupMatch,
    careerCupMatch: match,
    done: false
  };
  G.screen = 'futdraftLive';
  render();
  futDraftLiveTick();
};
function finishCareerCupMatch() {
  var c = G.career;
  var cup = c.cup;
  var live = G.futdraft.live;
  var match = live.careerCupMatch;
  var opp = careerCupOpponent(match);
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  var penalty = myGoals === oppGoals ? careerCupPenaltyShootout(c, opp.name) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : myGoals > oppGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);

  var myEvents = live.revealed.filter(function (e) { return e.side === 'me'; });
  futDraftRecordGoalEvents(c.careerStats, myEvents, 'Tu equipo');

  var roundIdxAtElimination = cup.rounds.length - 1;
  careerCupAdvanceRound(cup);
  if (!playerWon) { cup.eliminated = true; cup.eliminatedRound = roundIdxAtElimination; careerCupSettleRemaining(cup); }
  careerCupMaybeAwardChampion(c);
  c.lastCupResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, penalty: penalty };

  G.futdraft.lastMatchResult = {
    oppName: opp.name, oppShield: teamShieldPath(opp.name), oppPower: careerRivalPower(opp.name),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon,
    timeline: live.revealed, modifier: live.modifier, isCareer: true, isCup: true, penalty: penalty
  };
  G.futdraft.live = null;
  G.screen = 'futdraftMatchResult';
  render();
}
window.actionSkipCareerCupMatch = function () {
  var c = G.career;
  var cup = c.cup;
  var match = careerCupMyMatch(cup);
  if (!match) return;
  var opp = careerCupOpponent(match);
  var myPower = futDraftScoreBreakdown(c.lineup, c.captainId).total;
  var oppPower = careerRivalPower(opp.name);
  var goles = careerSimulateMatchGoals(myPower, oppPower);
  var myGoals = goles[0], oppGoals = goles[1];
  var penalty = myGoals === oppGoals ? careerCupPenaltyShootout(c, opp.name) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : myGoals > oppGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);

  var myPlayers = c.lineup.map(function (s) { return s.player; });
  var events = [];
  for (var i = 0; i < myGoals; i++) events.push(futDraftGoalEvent(myPlayers));
  futDraftRecordGoalEvents(c.careerStats, events, 'Tu equipo');

  var roundIdxAtElimination = cup.rounds.length - 1;
  careerCupAdvanceRound(cup);
  if (!playerWon) { cup.eliminated = true; cup.eliminatedRound = roundIdxAtElimination; careerCupSettleRemaining(cup); }
  careerCupMaybeAwardChampion(c);
  c.lastCupResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, penalty: penalty };
  render();
};
function renderCareerCopa(c) {
  if (careerCupLocked(c)) {
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Copa del Rey</h3>' +
      '<p class="dim small">La Copa del Rey se juega justo después de la jornada ' + CAREER_MIDSEASON_AT_MATCHDAY + ' -- llevas jugadas ' + c.league.matchdayIndex + ' de ' + CAREER_MIDSEASON_AT_MATCHDAY + ' jornadas.</p>' +
    '</div>';
  }
  var cup = c.cup;
  var totalRounds = Math.log2(cup.size);
  var champion = careerCupChampion(cup);
  var myMatch = careerCupMyMatch(cup);
  var headerHtml =
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Copa del Rey</h3>' +
      '<p class="dim small">Tú y ' + (cup.size - 1) + ' rivales, eliminación directa. Copas ganadas en la carrera: <strong style="color:var(--accent-2)">' + (c.cupsWon || 0) + '</strong>.</p>' +
      (c.lastCupResult
        ? '<p class="dim small">Último resultado: Tú ' + c.lastCupResult.myGoals + ' - ' + c.lastCupResult.oppGoals + ' ' + escapeHtml(c.lastCupResult.oppName) + (c.lastCupResult.penalty ? ' (penaltis ' + c.lastCupResult.penalty.myGoals + '-' + c.lastCupResult.penalty.oppGoals + ')' : '') + ' -- ' + (c.lastCupResult.playerWon ? 'ganaste' : 'perdiste') + '.</p>'
        : '') +
    '</div>';
  var actionHtml;
  if (champion) {
    actionHtml = '<div class="panel center-text"><p class="dim small">' + (champion.isPlayer ? '¡Campeón de la Copa!' : 'Campeón: ' + escapeHtml(champion.name)) + '</p></div>';
  } else if (cup.eliminated) {
    actionHtml = '<div class="panel center-text"><p class="dim small">Eliminado en ' + roundNameForIndex(cup.eliminatedRound, totalRounds) + '.</p></div>';
  } else if (myMatch) {
    var opp = careerCupOpponent(myMatch);
    actionHtml =
      '<div class="panel center-text">' +
        '<p class="dim small">Tu rival: <strong>' + escapeHtml(opp.name) + '</strong> (' + roundNameForIndex(cup.rounds.length - 1, totalRounds) + ')</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary" onclick="actionSimulateCareerCupMatch()">▶ Simular partido</button>' +
          '<button class="btn btn-outline" onclick="actionSkipCareerCupMatch()">Saltar</button>' +
        '</div>' +
      '</div>';
  } else {
    actionHtml = '';
  }
  var bracketHtml =
    '<div class="panel bracket-panel"><div class="bracket-tree">' +
      cup.rounds.map(function (round, ri) {
        var isFinal = round.length === 1;
        var body;
        if (isFinal) {
          body = '<div class="bracket-final-wrap">' + bracketMatchHtml(round[0]) + '</div>';
        } else {
          body = '<div class="bracket-pairs">';
          for (var i = 0; i < round.length; i += 2) body += '<div class="bracket-pair">' + bracketMatchHtml(round[i]) + bracketMatchHtml(round[i + 1]) + '</div>';
          body += '</div>';
        }
        return '<div class="bracket-round-col"><div class="bracket-round-title">' + roundNameForIndex(ri, totalRounds) + '</div>' + body + '</div>';
      }).join('') +
      '<div class="bracket-round-col bracket-trophy-col"><div class="bracket-round-title">Campeón</div>' +
        '<div class="bracket-trophy-wrap"><div class="bracket-trophy' + (champion ? '' : ' is-pending') + '">🏆</div>' +
        '<div class="bracket-champion-name">' + (champion ? (champion.isPlayer ? 'Tú' : escapeHtml(champion.name)) : '?') + '</div></div></div>' +
    '</div></div>';
  return headerHtml + actionHtml + bracketHtml;
}

function renderCareerJornada(c) {
  var league = c.league;
  var w = c.marketWindow;
  if (w && w.open) {
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Ventana de fichajes abierta</h3>' +
      '<p class="dim small">Día ' + w.dayIndex + ' de ' + w.totalDays + ' (' + (w.phase === 'preseason' ? 'pretemporada' : 'mercado de invierno') + '). No se puede jugar hasta que cierre -- ve a la pestaña Mercado para negociar o avanzar el día.</p>' +
    '</div>';
  }
  // La Copa del Rey se cuela justo después de la jornada 10 -- hasta que
  // no esté resuelta (campeón o eliminado), la Liga no sigue a la jornada
  // 11, a petición explícita ("la copa del rey, se juega siempre justo
  // después de la jornada 10, y luego sigue la liga").
  if (careerCupPending(c)) {
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Toca Copa del Rey</h3>' +
      '<p class="dim small">Antes de seguir con la jornada ' + (league.matchdayIndex + 1) + ' hay que resolver la Copa del Rey.</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionSetCareerTab(\'copa\')">Ir a la Copa del Rey</button>' +
    '</div>';
  }
  var seasonOver = league.matchdayIndex >= league.schedule.length;
  var r = c.lastMatchdayResult;
  var resultHtml = r
    ? '<div class="panel center-text">' +
        '<h3 style="margin-bottom:4px">Resultado de la jornada ' + r.matchday + '</h3>' +
        '<p class="dim small">Tú <strong>' + r.myGoals + ' - ' + r.oppGoals + '</strong> ' + escapeHtml(r.oppName) + '</p>' +
        (r.winBonus ? '<p class="dim small">Presupuesto: <strong style="color:var(--accent-2)">+' + r.winBonus + ' M€</strong> por ganar.</p>' : '') +
        '<p class="dim small">El resto de partidos de la jornada también se han resuelto -- mira la pestaña Liga.</p>' +
      '</div>'
    : '';
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">' + (seasonOver ? 'Temporada ' + c.season + ' terminada' : ('Jornada ' + (league.matchdayIndex + 1) + ' de ' + league.schedule.length)) + '</h3>' +
      (seasonOver
        ? '<p class="dim small">Ya se han jugado las ' + league.schedule.length + ' jornadas.</p>' +
          '<button class="btn btn-primary btn-block mt" onclick="actionStartNewCareerSeason()">Empezar temporada ' + (c.season + 1) + '</button>'
        : '<div class="btn-row" style="justify-content:center">' +
            '<button class="btn btn-primary" onclick="actionSimulateCareerMatchday()">▶ Simular partido</button>' +
            '<button class="btn btn-outline" onclick="actionSkipCareerMatchday()">Saltar</button>' +
          '</div>') +
    '</div>' +
    resultHtml
  );
}

// Estadísticas de toda la carrera (todas las temporadas, no solo la
// actual) -- mejor posición en liga alcanzada nunca (careerUpdateBestPosition)
// y máximos goleadores/asistentes acumulados (c.careerStats, solo de TUS
// jugadores, ver careerRecordMatchGoals), a petición explícita.
function renderCareerEstadisticas(c) {
  var bestPosText = c.bestPosition ? (c.bestPosition + 'º de ' + CAREER_LEAGUE_TEAM_COUNT) : 'Todavía sin datos.';
  var statsPanel = renderTopScorersAssistsPanel(c.careerStats);
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Estadísticas de la carrera</h3>' +
      '<p class="dim small">Temporada actual: <strong>' + (c.season || 1) + '</strong></p>' +
      '<p class="dim small">Mejor posición en liga: <strong style="color:var(--accent-2)">' + bestPosText + '</strong></p>' +
    '</div>' +
    (statsPanel || '<div class="panel center-text"><p class="dim small">Todavía no hay goles registrados.</p></div>')
  );
}

function renderCareerMode() {
  var c = G.career;
  var tabsHtml = CAREER_TABS.map(function (t) {
    return '<button class="btn btn-tiny' + (c.tab === t.id ? ' active' : '') + '" onclick="actionSetCareerTab(\'' + t.id + '\')">' + t.name + '</button>';
  }).join('');
  var bodyHtml;
  if (c.tab === 'plantilla') bodyHtml = renderCareerPlantilla(c);
  else if (c.tab === 'entrenamiento') bodyHtml = renderCareerEntrenamiento(c);
  else if (c.tab === 'mercado') bodyHtml = renderCareerMercado(c);
  else if (c.tab === 'calendario') bodyHtml = renderCareerCalendario(c);
  else if (c.tab === 'liga') bodyHtml = renderCareerLiga(c);
  else if (c.tab === 'jornada') bodyHtml = renderCareerJornada(c);
  else if (c.tab === 'copa') bodyHtml = renderCareerCopa(c);
  else if (c.tab === 'estadisticas') bodyHtml = renderCareerEstadisticas(c);
  else bodyHtml = renderCareerEquipo(c);
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoOtrosModos()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Modo Carrera</h2>' +
        '<p class="dim small">Todavía en construcción -- esta es la base: equipo, plantilla, mercado, calendario, liga, jornada y estadísticas de una liga de ' + CAREER_LEAGUE_TEAM_COUNT + ' equipos.</p>' +
        '<p class="dim small">Temporada <strong>' + (c.season || 1) + '</strong> · Presupuesto: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong> · Hueco ' + G.careerActiveSlot + '</p>' +
        (c.saveMessage ? '<p class="dim small">' + escapeHtml(c.saveMessage) + '</p>' : '') +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-tiny" onclick="actionSaveCareerNow()">Guardar</button>' +
          '<button class="btn btn-tiny" onclick="actionGoCareerMode()">Cambiar partida</button>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row" style="justify-content:center">' + tabsHtml + '</div>' +
      bodyHtml +
    '</div>'
  );
}
