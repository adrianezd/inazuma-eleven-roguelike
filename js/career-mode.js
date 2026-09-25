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
   - Entrenamiento: centro de entrenamiento que arranca SIN construir
     (nivel 0) y sube hasta 10, cada nivel más caro que el anterior
     (CAREER_TRAINING_LEVEL_COSTS, índice 0 = construirlo) y sube el
     "techo natural" y la velocidad de la progresión anual de TODO
     ROSTER (careerTrainingEffectiveParams, ver progresión más abajo) --
     infraestructura del club, nunca se resetea entre temporadas. Por
     jugador de tu plantilla se ve su media, su crecimiento fijo (flecha
     de color, careerGrowthArrowHtml), cuánto subió/bajó la temporada
     pasada y el potencial (rango bajo-alto) la que viene, la parte
     determinista de la progresión más ese crecimiento, ya diluido cerca
     del máximo -- ver careerPlayerPotentialRange/careerGrowthTierBonus.
     Ya no hay subida rápida manual por jugador (se quitó a petición
     explícita).
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
   - Calendario: liga a DOBLE vuelta (careerGenerateDoubleRoundRobin, a
     diferencia de Liga que es a una vuelta -- 16 equipos dan 30
     jornadas, 20 dan 38), con rivales de nombre real sacados de las
     mismas listas que usa FutDraft/Liga. Dos divisiones (c.division, 1
     o 2): Segunda (16 equipos: tú + 4 jefes + 11 "normales") al empezar
     la carrera, con Primera "en la sombra" de 20 (17 jefes + 3
     "normales", sin ti todavía) -- si asciendes, ocupas un hueco ahí y
     quedan 19 reales (16 jefes + 3 normales). Los mismos 35 rivales de
     toda la carrera, nunca se sustituyen por otros, solo se mueven entre
     las dos listas por ascenso/descenso. Ver careerInitialDivisionTeams/
     careerBuildLeague/careerComputePromotionRelegation más abajo.
   - Liga: la clasificación de esa misma liga (mismas funciones genéricas
     que renderLigaTable: ligaEmptyStanding/ligaApplyResult/ligaSortedTable/
     ligaFormHtml) + insignia de posición propia (careerLigaPosBadgeHtml:
     verde la zona de ascenso en Segunda, rojo la de descenso en Primera)
     + botón de máximos goleadores y asistentes DE ESTA TEMPORADA
     (renderTopScorersAssistsPanel).
   - Jornada: bloqueada mientras el mercado está abierto (5 días de
     pretemporada siempre al empezar cada temporada, más 2 días a mitad de
     liga tras la jornada 10 -- CAREER_PRESEASON_DAYS/CAREER_MIDSEASON_DAYS/
     CAREER_MIDSEASON_AT_MATCHDAY, careerMaybeOpenMidseasonWindow) y
     mientras la Copa del Rey esté pendiente (careerCupPending, solo
     aplica en Primera, ver más abajo). Con la liga en marcha: "Simular
     partido" ve tu partido de verdad con el motor en vivo de FutDraft/
     Liga; "Saltar" lo resuelve de golpe sin verlo. El resto de la
     jornada siempre se resuelve de golpe. Ganar suelta 50k/100k/150k de
     presupuesto al azar (careerAwardWinBonus). Al terminar todas las
     jornadas se concede el premio de posición (careerMaybeAwardLeagueFinish)
     y se calculan los ascensos/descensos (careerComputePromotionRelegation,
     mostrados en el resumen de temporada) y se puede "Empezar temporada
     N+1" (actionStartNewCareerSeason): aplica ese ascenso/descenso de
     verdad, resetea liga/tabla/calendario y abre una nueva ventana de
     pretemporada, pero conserva presupuesto, plantilla y careerStats/
     bestPosition (esos nunca se resetean entre temporadas).
   - Copa del Rey: cuadro de eliminación directa de 16 equipos (careerNewCup,
     uno nuevo cada temporada), solo jugable en Primera División y tras la
     jornada 10 (careerCupLocked) -- en Segunda está bloqueada del todo.
     Reutiliza el motor de Modo Torneo tal cual para repartir rivales y
     resolver cruces CPU-vs-CPU (generateTournamentBracket/simulateCpuMatch)
     y su mismo árbol visual (roundNameForIndex/bracketMatchHtml/...), con el
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

// Calendario/Liga/Copa del Rey vivían como 3 pestañas sueltas -- ahora
// Calendario se ve DENTRO de Liga (un botón más de vista, junto a
// Resumida/Completa/Forma) y Liga+Copa del Rey viven dentro de una única
// pestaña "Competiciones" con su propia sub-navegación (c.competicionesTab,
// ver renderCareerCompeticiones), a petición explícita.
// "Guardar"/"Cambiar partida" vivían siempre visibles en la cabecera --
// ahora son su propia pestaña "Gestión de partida", a petición explícita
// ("guardar y cambiar partida, pertenecen a gestión de partida, un
// nuevo modo también a la misma altura que liga, mi plantilla...").
// Agrupadas para que la fila de pestañas no sea eterna en móvil, a
// petición explícita ("agruparas las que creas que tiene sentido
// agruparlas juntas... para que no estén como con 10 pestañas distintas
// a la vez"): "Mi equipo" junta Alineación + Plantilla, "Club" junta
// Entrenamiento + Mercado + Patrocinadores, y "Ajustes" junta Gestión de
// partida + Configuración -- cada una con su propia fila de sub-pestañas
// (mismo patrón que ya usaba Competiciones con Liga/Copa/Champions).
var CAREER_TABS = [
  { id: 'jornada', name: 'Jornada' },
  { id: 'equipo', name: 'Mi equipo' },
  { id: 'club', name: 'Club' },
  { id: 'competiciones', name: 'Competiciones' },
  { id: 'estadisticas', name: 'Estadísticas' },
  { id: 'ajustes', name: 'Ajustes' }
];
function careerSubTabsHtml(items) {
  return '<div class="btn-row career-tabs-scroll" style="margin-bottom:10px">' +
    items.map(function (it) { return '<button class="btn btn-tiny' + (it.active ? ' active' : '') + '" onclick="' + it.onclick + '">' + escapeHtml(it.name) + '</button>'; }).join('') +
  '</div>';
}
window.actionSetCareerEquipoTab = function (id) { G.career.equipoTab = id; render(); };
function renderCareerEquipoGroup(c) {
  var sub = c.equipoTab === 'plantilla' ? 'plantilla' : (c.equipoTab === 'estilo' ? 'estilo' : 'alineacion');
  return careerSubTabsHtml([
    { name: 'Alineación', active: sub === 'alineacion', onclick: "actionSetCareerEquipoTab('alineacion')" },
    { name: 'Gestionar plantilla', active: sub === 'plantilla', onclick: "actionSetCareerEquipoTab('plantilla')" },
    { name: 'Estilo de juego', active: sub === 'estilo', onclick: "actionSetCareerEquipoTab('estilo')" }
  ]) + (sub === 'plantilla' ? renderCareerPlantilla(c) : sub === 'estilo' ? renderCareerEstilo(c) : renderCareerEquipo(c));
}
// Pestaña propia con el estilo de juego, el estilo físico y la intensidad
// (antes sueltos en Alineación), a petición explícita.
function renderCareerEstilo(c) {
  var style = careerPlayStyle(c);
  var mods = careerPlayStyleModifiers(c);
  function opts(map, current) {
    return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + map[k].name + '</option>'; }).join('');
  }
  function pctText(v) { var d = Math.round((v - 1) * 100); return (d > 0 ? '+' : '') + d + '%'; }
  var styleOptionsHtml = CAREER_PLAY_STYLES.map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === style.id ? ' selected' : '') + '>' + s.name + '</option>';
  }).join('');
  var redOn = c.redCardFreq !== 'desactivado', injOn = c.injuryFreq !== 'desactivado';
  var foul = CAREER_FOUL_BENEFIT[c.foulStyle || 'medio'], inten = CAREER_INTENSITY_BENEFIT[c.intensity || 'media'];
  var coach = coachById(c.coachId);
  var html = coach ? '<div class="panel style-card">' +
    '<h3 style="margin-bottom:2px">Entrenador</h3>' +
    '<div class="coach-card selected" style="cursor:default">' + coachAvatarHtml(coach) +
      '<span class="coach-info"><strong>' + escapeHtml(coach.nombre) + '</strong><span class="dim small">' + escapeHtml(coach.equipo) + '</span></span></div>' +
    '<p class="dim small" style="margin-top:8px">' + escapeHtml(coach.desc) + '</p>' +
    '<div class="style-stats"><div><span>Ataque</span><strong>+' + coach.atk + '</strong></div><div><span>Defensa</span><strong>+' + coach.def + '</strong></div><div><span>Intensidad</span><strong>' + escapeHtml(coachIntensityName(coach.intensidad)) + '</strong></div><div><span>Estilo</span><strong>' + escapeHtml(coachStyleName(coach.estilo)) + '</strong></div></div>' +
    '<p class="dim small">Si tu estilo de juego coincide con el suyo, sus puntos de ataque y defensa suben un 25%.</p>' +
  '</div>' : '';
  html += '<div class="panel style-card">' +
    '<h3 style="margin-bottom:2px">Estilo de juego</h3>' +
    '<p class="dim small">Cambia cuánto ataca y cuánto defiende tu equipo, en todos los partidos.</p>' +
    '<select class="select-field" onchange="actionSetCareerPlayStyle(this.value)">' + styleOptionsHtml + '</select>' +
    '<div class="style-stats"><div><span>Ataque</span><strong>' + pctText(mods.atk) + '</strong></div><div><span>Defensa</span><strong>' + pctText(mods.def) + '</strong></div></div>' +
  '</div>';
  if (redOn) {
    html += '<div class="panel style-card">' +
      '<h3 style="margin-bottom:2px">Estilo físico</h3>' +
      '<p class="dim small">Brusco: mejor defensa, pero más tarjetas (amarillas y rojas). Leve: menos tarjetas, algo peor defensa.</p>' +
      '<select class="select-field" onchange="actionSetCareerFoulStyle(this.value)">' + opts(CAREER_FOUL_STYLES, c.foulStyle || 'medio') + '</select>' +
      '<div class="style-stats"><div><span>Ataque</span><strong>' + pctText(foul.atk) + '</strong></div><div><span>Defensa</span><strong>' + pctText(foul.def) + '</strong></div><div><span>Tarjetas</span><strong>x' + careerFoulMult(c) + '</strong></div></div>' +
    '</div>';
  }
  if (injOn) {
    html += '<div class="panel style-card">' +
      '<h3 style="margin-bottom:2px">Intensidad</h3>' +
      '<p class="dim small">Alta: más ataque y algo más de defensa, pero más lesiones. Baja: menos lesiones, algo menos de rendimiento.</p>' +
      '<select class="select-field" onchange="actionSetCareerIntensity(this.value)">' + opts(CAREER_INTENSITIES, c.intensity || 'media') + '</select>' +
      '<div class="style-stats"><div><span>Ataque</span><strong>' + pctText(inten.atk) + '</strong></div><div><span>Defensa</span><strong>' + pctText(inten.def) + '</strong></div><div><span>Lesiones</span><strong>x' + careerIntensityMult(c) + '</strong></div></div>' +
    '</div>';
  }
  if (!redOn && !injOn) html += '<div class="panel center-text"><p class="dim small">Las lesiones y las rojas están desactivadas en esta carrera, así que el estilo físico y la intensidad no se pueden elegir.</p></div>';
  return html;
}
window.actionSetCareerClubTab = function (id) { G.career.clubTab = id; render(); };
function renderCareerClubGroup(c) {
  var valid = ['entrenamiento', 'mercado', 'patrocinadores'];
  var sub = valid.indexOf(c.clubTab) !== -1 ? c.clubTab : 'entrenamiento';
  return careerSubTabsHtml([
    { name: 'Entrenamiento', active: sub === 'entrenamiento', onclick: "actionSetCareerClubTab('entrenamiento')" },
    { name: 'Mercado', active: sub === 'mercado', onclick: "actionSetCareerClubTab('mercado')" },
    { name: 'Patrocinadores', active: sub === 'patrocinadores', onclick: "actionSetCareerClubTab('patrocinadores')" }
  ]) + (sub === 'mercado' ? renderCareerMercado(c) : sub === 'patrocinadores' ? renderCareerPatrocinadores(c) : renderCareerEntrenamiento(c));
}
window.actionSetCareerAjustesTab = function (id) { G.career.ajustesTab = id; render(); };
function renderCareerAjustesGroup(c) {
  var sub = c.ajustesTab === 'configuracion' ? 'configuracion' : 'gestion';
  return careerSubTabsHtml([
    { name: 'Gestión de partida', active: sub === 'gestion', onclick: "actionSetCareerAjustesTab('gestion')" },
    { name: 'Configuración', active: sub === 'configuracion', onclick: "actionSetCareerAjustesTab('configuracion')" }
  ]) + (sub === 'configuracion' ? renderCareerConfiguracion(c) : renderCareerGestion(c));
}

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
// Plantilla "Raimon": el once real de la temporada 1 (mismos ids que el
// Modo Mundial, pero aquí con su media REAL del roster, sin aplanar) más
// Jude Sharp, Bobby Shearer y Erik Eagle de banquillo (se unen más tarde
// en la historia real) -- a petición explícita ("si eliges raimon tienes
// al 11 del raimon, y a erik, bobby, jude... y empiezas con ellos y su
// puntuación real del roster").
var CAREER_MODE_RAIMON_STARTER_IDS = ['r01', 'r03', 'r06', 'r49', 'r12', 'r46', 'r47', 'r178', 'r48', 'r02', 'r05'];
var CAREER_MODE_RAIMON_BENCH_IDS = ['r41', 'r04', 'r16', 'r10', 'r40'];
var CAREER_MODE_DEFAULT_FORMATION = '433';
// Modo "Plantilla aleatoria" (selector en renderCareerSetup, a petición
// explícita: "un modo aleatorio, con un equipo de 16 aleatorio donde
// todos sean de 82 hacia abajo"): 16 jugadores del ROSTER con nota base
// <= este tope, sorteados al confirmar la carrera -- garantiza al menos
// un portero entre los titulares (si hay alguno disponible bajo el
// tope) para no dejar la portería vacía, el resto se reparte al azar
// entre titular/banquillo. assignFutDraftFormation ya sabe encajar
// cualquier reparto de posiciones en la formación 4-3-3 por defecto sin
// romperse, así que no hace falta forzar más equilibrio que ese.
var CAREER_RANDOM_SQUAD_MAX_SCORE = 82;
function careerRandomSquadIds() {
  var pool = ROSTER.filter(function (p) { return careerPlayerScore(p) <= CAREER_RANDOM_SQUAD_MAX_SCORE; });
  var keepers = pool.filter(function (p) { return p.posicion === 'Portero'; }).sort(function () { return Math.random() - 0.5; });
  var others = pool.filter(function (p) { return p.posicion !== 'Portero'; }).sort(function () { return Math.random() - 0.5; });
  var squad = keepers.slice(0, 2).concat(others).slice(0, 16);
  if (squad.length < 16) squad = squad.concat(ROSTER.filter(function (p) { return squad.indexOf(p) === -1; })).slice(0, 16);
  squad = squad.sort(function () { return Math.random() - 0.5; });
  var keeperInSquad = squad.find(function (p) { return p.posicion === 'Portero'; });
  var rest = squad.filter(function (p) { return p !== keeperInSquad; });
  var starters = (keeperInSquad ? [keeperInSquad] : []).concat(rest.slice(0, keeperInSquad ? 10 : 11));
  var bench = rest.slice(keeperInSquad ? 10 : 11);
  return { starterIds: starters.map(function (p) { return p.id; }), benchIds: bench.map(function (p) { return p.id; }) };
}
// Dos divisiones, a petición explícita: empiezas en Segunda (16 equipos:
// tú + 4 jefes + 11 "malos" de RIVAL_TEAM_NAMES) y, si asciendes, juegas
// en Primera (20 equipos: tú + 16 jefes + 3 "normales" -- 17 jefes + 3
// normales mientras es la división "en la sombra", sin ti). 36 equipos en
// total entre las dos divisiones (35 rivales + tú), SIEMPRE los mismos
// 35 durante toda la partida -- nunca se regeneran de una temporada a
// otra, solo se mueven entre divisiones por ascenso/descenso (a
// petición explícita: "esos rivales no van cambiando cada temporada por
// otros... cada 35 rivales son únicos en cada partida"). c.division (1
// o 2) y c.divisionTeams ({1:[...], 2:[...]}, los nombres reales de
// CADA división que NO eres tú, siempre) viven en el estado -- ver
// careerInitialDivisionTeams (arma el reparto una única vez, al crear la
// partida)/careerBuildLeague/careerComputePromotionRelegation (mueve
// nombres entre las dos listas, nunca los sustituye por otros).
var CAREER_DIVISION1_TEAM_COUNT = 20;
var CAREER_DIVISION2_TEAM_COUNT = 16;
// 17+3=20: la Primera inicial es la división "en la sombra" (arrancas en
// Segunda, ver careerInitialDivisionTeams), así que necesita sus 20
// reales completos -- en cuanto asciendas y ocupes un hueco, quedan 19
// reales ahí (16 jefes + 3 normales) de forma natural, sin tocar estas
// constantes: careerApplyPromotionRelegation ya lo resuelve solo (ver
// ese comentario para el porqué del 19/20 según si juegas ahí o no).
var CAREER_DIVISION1_BOSS_COUNT = 17;
var CAREER_DIVISION1_NORMAL_COUNT = 3;
// Bajado de 10 jefes/5 normales a 4/11, a petición explícita ("mete en
// segunda división, 4 jefes y 11 normales") -- Segunda mucho más
// asequible, en línea con bajar la dificultad general.
var CAREER_DIVISION2_BOSS_COUNT = 4;
var CAREER_DIVISION2_NORMAL_COUNT = 11;
// Cuántos ascienden/descienden cada temporada -- los 2 primeros de
// Segunda suben, los 2 últimos de Primera bajan, siempre.
var CAREER_PROMOTION_SPOTS = 2;
// Plazas de Champions League: quedar entre los CAREER_CHAMPIONS_QUALIFY_SPOTS
// primeros de PRIMERA división clasifica para jugarla la temporada
// SIGUIENTE ("como en la vida real" -- a petición explícita), nunca la
// misma en la que se logra. Solo existe estando en Primera.
var CAREER_CHAMPIONS_QUALIFY_SPOTS = 4;
function careerDivisionTeamCount(division) {
  return division === 1 ? CAREER_DIVISION1_TEAM_COUNT : CAREER_DIVISION2_TEAM_COUNT;
}
function careerDivisionName(division) {
  return division === 1 ? 'Primera División' : 'Segunda División';
}

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
// Tope de media en Modo Carrera: 120 (antes 99), con la subida muy frenada a
// partir de 95 (ver careerGrowthRoomFactor).
var CAREER_SCORE_MAX = 120;
function careerPlayerScore(p) {
  var c = G.career;
  var delta = (c && c.playerProgression && c.playerProgression[p.id]) || 0;
  return clamp(futDraftPlayerScore(p) + delta, 30, CAREER_SCORE_MAX);
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
  // Mismo cálculo que futDraftScoreBreakdown (el capitán cuenta doble en
  // vez de un bonus aparte por diferencia, a petición explícita -- ver
  // el comentario grande junto a esa función en futdraft-draft.js).
  var captainBonus = captainScore === null ? 0 : Math.round(clamp(((sum + captainScore) / (lineup.length + 1)) - base, -FUTDRAFT_CAPTAIN_BONUS_CAP, FUTDRAFT_CAPTAIN_BONUS_CAP) * 10) / 10;
  var synergyBonus = 0;
  Object.keys(typeCounts).forEach(function (t) {
    if (typeCounts[t] >= FUTDRAFT_SYNERGY_THRESHOLD) synergyBonus += FUTDRAFT_SYNERGY_BONUS;
  });
  var misplacedPenalty = misplaced * FUTDRAFT_OUT_OF_POSITION_PENALTY;
  var total = Math.round(clamp(base + captainBonus + synergyBonus - misplacedPenalty, 0, CAREER_SCORE_MAX));
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
// Bajados a petición explícita ("progresión mucho más lenta"): con el
// rate/variance de antes (0.25/2), el tirón hacia el ancla por sí solo
// ya daba +4/+6 puntos de golpe con el centro subido, tapando por
// completo la diferencia entre crecimiento Bajo/Normal/Alto (ver
// careerGrowthTierBonus más abajo, que antes quedaba diluido al lado de
// esto). Con 0.08/1 el tirón es mucho más discreto y el crecimiento fijo
// del jugador pasa a mandar de verdad en quién sube más.
var CAREER_PROGRESSION_ANCHOR = 80;
var CAREER_PROGRESSION_RATE = 0.08;
var CAREER_PROGRESSION_VARIANCE = 1;

// Centro de entrenamiento (pestaña Entrenamiento): arranca SIN construir
// (nivel 0, a petición explícita: "haz que construir el centro de
// entrenamiento valga dinero también"), hay que pagar para construirlo
// (nivel 0→1) y luego 9 niveles más, cada uno más caro que el anterior
// (CAREER_TRAINING_LEVEL_COSTS, índice = nivel actual -- construirlo
// cuesta el índice 0), que MEJORAN los parámetros de progresión de
// ABAJO para TODO ROSTER, a petición explícita ("para que tus jugadores
// suban en vez de bajar, suban más"): cada nivel sube el ancla (así
// hasta un crack casi tocando el 99 sigue teniendo margen para no
// bajar) y la velocidad de acercamiento, y baja el ruido (menos mala
// suerte, progresión más fiable). c.trainingLevel es infraestructura
// del club -- nunca se resetea entre temporadas, igual que el
// presupuesto.
var CAREER_TRAINING_MAX_LEVEL = 10;
// Bajados en la misma proporción que CAREER_PROGRESSION_RATE de arriba,
// para que el centro siga siendo notable pero no vuelva a disparar el
// tirón por encima del crecimiento fijo del jugador.
var CAREER_TRAINING_ANCHOR_PER_LEVEL = 1;
var CAREER_TRAINING_RATE_PER_LEVEL = 0.01;
var CAREER_TRAINING_VARIANCE_REDUCTION_PER_LEVEL = 0.03;
// Subida otra vez (a petición explícita, "más caro las mejoras del
// centro de entrenamiento"): índice 0 es CONSTRUIRLO desde cero (1M€,
// "por ejemplo" tal cual lo pidieron), los 9 siguientes son subir de
// nivel, con una curva bastante más empinada que antes (tope 40M€ para
// llegar al máximo, en vez de 23M€).
var CAREER_TRAINING_LEVEL_COSTS = [1, 2, 3.2, 4.8, 7, 10, 14.5, 21, 30, 40];
function careerTrainingEffectiveParams(level) {
  var lvl = typeof level === 'number' ? level : 0;
  return {
    anchor: CAREER_PROGRESSION_ANCHOR + lvl * CAREER_TRAINING_ANCHOR_PER_LEVEL,
    rate: CAREER_PROGRESSION_RATE + lvl * CAREER_TRAINING_RATE_PER_LEVEL,
    variance: Math.max(0.3, CAREER_PROGRESSION_VARIANCE - lvl * CAREER_TRAINING_VARIANCE_REDUCTION_PER_LEVEL)
  };
}
// Cuánto se diluye el crecimiento fijo del jugador (careerPlayerGrowthTier)
// cuanto más cerca esté del máximo (99) -- a petición explícita ("sin
// que suban tanto los que son muy alto de crecimiento, que baje un
// poco... tiene que ser progresivo, sube más rápido de 70 a 76 que de
// 84 a 90"). Subido a 1.3 (antes 0.8): con el tirón hacia el ancla ya
// muy rebajado arriba, el crecimiento fijo del jugador tiene que ser
// quien de verdad decida quién sube más -- antes, con el tirón fuerte
// de antes, dos jugadores de crecimiento distinto (Bajo/Normal/Alto)
// podían acabar subiendo prácticamente lo mismo (o hasta al revés) solo
// por su media de partida, a petición explícita ("no tiene sentido que
// crezca lo mismo uno bajo que uno normal que uno alto").
var CAREER_GROWTH_TIER_SCALE = 1.3;
var CAREER_GROWTH_ROOM_SPAN = 35;
var CAREER_GROWTH_ROOM_FLOOR = 0.3;
function careerGrowthRoomFactor(current) {
  // Hasta 95 igual que siempre; de 95 a 120 el crecimiento cae hasta casi
  // nada (0.3 en 95 -> ~0.03 en 120), a petición explícita ("suben mucho
  // mucho más lento a partir de 95").
  if (current > 95) return clamp(0.12 * (1 - (current - 95) / 30), 0.01, 0.12);
  return clamp((99 - current) / CAREER_GROWTH_ROOM_SPAN, CAREER_GROWTH_ROOM_FLOOR, 1);
}
// Los Prodigio (nivel 6) suben todavía más rápido que un Muy alto: cuentan
// como 9 tanto en el bonus anual como en el tope de subida por temporada.
var CAREER_PRODIGY_GROWTH_POWER = 9;
function careerGrowthTierPower(tier) { return tier === 6 ? CAREER_PRODIGY_GROWTH_POWER : tier; }
// Tirón hacia el ancla (techo natural, máx. 94). Por encima de 95 ya no
// empuja hacia abajo: la media puede seguir subiendo hasta 120, solo con el
// crecimiento propio del jugador y muy despacio (careerGrowthRoomFactor).
function careerProgressionPull(current, params) {
  var pull = (params.anchor - current) * params.rate;
  return current > 95 ? Math.max(0, pull) : pull;
}
function careerGrowthTierBonus(c, p, current) {
  var tier = careerGrowthTierPower(careerPlayerGrowthTier(c, p));
  return tier * CAREER_GROWTH_TIER_SCALE * careerGrowthRoomFactor(current);
}
// Tope DURO de subida en una sola temporada según el crecimiento fijo
// del jugador, a petición explícita ("alguien con crecimiento muy bajo
// nunca va a poder subir más de 2 puntos en una misma temporada"): sin
// esto, el tirón hacia el ancla + el ruido al azar todavía podían
// disparar la subida de un jugador "Muy bajo" por encima de lo que su
// crecimiento debería permitir. 2 puntos por nivel de crecimiento en el
// TOPE del centro de entrenamiento (Muy bajo=2, Bajo=4, Normal=6, Alto=8,
// Muy alto=10) -- solo pone techo a SUBIR, nunca a bajar (un veterano
// por encima del ancla sigue pudiendo declinar sin límite, eso no ha
// cambiado).
// El tope en sí ESCALA con el nivel del centro (mitad en nivel 0, el
// tope entero solo con el centro al máximo), a petición explícita: sin
// esto, para un jugador débil (muy por debajo del ancla) el tirón por sí
// solo ya llegaba casi al tope incluso en nivel 0, así que construir o
// mejorar el centro no cambiaba nada para los jugadores de crecimiento
// bajo -- "como sea con centro de entrenamiento nivel bajo me corto las
// pelotas". Con el tope también escalando, mejorar el centro sigue
// notándose en CUALQUIER jugador, del crecimiento que sea.
var CAREER_GROWTH_TIER_SEASON_CAP_PER_TIER = 2;
function careerGrowthSeasonCap(tier, level) {
  var lvl = typeof level === 'number' ? level : 0;
  var levelFactor = 0.5 + 0.5 * (lvl / CAREER_TRAINING_MAX_LEVEL);
  return careerGrowthTierPower(tier) * CAREER_GROWTH_TIER_SEASON_CAP_PER_TIER * levelFactor;
}
// Cuántas jornadas de LIGA ha sido titular un jugador de tu plantilla
// ESTA temporada (c.seasonAppearances, {playerId: nº de veces en
// c.lineup cuando se resolvió una jornada) -- ver careerRecordStarterAppearances,
// llamada desde actionSkipCareerMatchday/finishCareerMatchdayMatch. Se
// reinicia cada temporada nueva (actionStartNewCareerSeason), como
// lastPlayerProgressionDelta.
function careerPlayerAppearanceRatio(c, p) {
  var starts = (c.seasonAppearances && c.seasonAppearances[p.id]) || 0;
  var total = (c.league && c.league.schedule && c.league.schedule.length) || 1;
  return clamp(starts / total, 0, 1);
}
function careerRecordStarterAppearances(c) {
  c.seasonAppearances = c.seasonAppearances || {};
  c.lineup.forEach(function (s) {
    c.seasonAppearances[s.player.id] = (c.seasonAppearances[s.player.id] || 0) + 1;
  });
  careerApplySponsorElementPayout(c);
}
// Sanciones por roja de verdad, a petición explícita ("que haya rojas y
// funcionen los sancionados y haya que quitarlos del 11 inicial"): se
// llama al terminar CUALQUIER partido tuyo (Jornada/Copa/Champions/
// Supercopa, todos comparten c.lineup/c.bench). Las sanciones que ya
// venían de antes de este partido se dan por cumplidas (se han perdido
// este partido, sentados en el banquillo por la sanción anterior) y se
// liberan; las rojas de ESTE partido (live.sentOff, ver
// futDraftAdvancePossession en js/futdraft-match.js) se añaden nuevas y
// se apartan del once YA MISMO, con un suplente de la misma posición si
// lo hay (si no, cualquiera) -- así ya no pueden salir de titulares en el
// próximo partido hasta que se cumpla la sanción.
// Aparta a un titular al banquillo por sanción o lesión (mismo mecanismo
// para las dos, un suplente de su misma posición si lo hay, si no
// cualquiera) -- compartido entre careerApplyRedCardSuspensions
// (sanciones) y careerApplyInjuries (lesiones, ver más abajo).
function careerBenchPlayer(c, id) {
  var lineupIdx = c.lineup.findIndex(function (s) { return s.player.id === id; });
  if (lineupIdx === -1 || !c.bench.length) return;
  var pos = c.lineup[lineupIdx].pos;
  var benchIdx = c.bench.findIndex(function (p) { return p.posicion === pos; });
  if (benchIdx === -1) benchIdx = 0;
  var out = c.lineup[lineupIdx].player;
  c.lineup[lineupIdx].player = c.bench[benchIdx];
  c.bench[benchIdx] = out;
  if (c.captainId === out.id) c.captainId = null;
}
function careerApplyRedCardSuspensions(c, live) {
  c.suspendedIds = [];
  var newRed = (live && live.sentOff) || [];
  newRed.forEach(function (id) {
    c.suspendedIds.push(id);
    careerBenchPlayer(c, id);
  });
  careerApplyInjuries(c, live);
}
// Lesiones con consecuencia real, a petición explícita ("si hay rojas o
// lesiones, lógicamente luego tienes jugadores que no pueden jugar
// durante una o varias jornadas y tienes que hacer cambios en la
// plantilla"): a diferencia de la roja (siempre 1 partido), la lesión
// dura entre 1 y 3 partidos (careerInjuryDuration), sorteados al
// lesionarse -- se van descontando en cada partido tuyo que se juega
// (Jornada/Copa/Champions/Supercopa, todos llaman a esta función) hasta
// llegar a 0, momento en el que el jugador queda libre otra vez.
function careerInjuryDuration() { return 1 + Math.floor(Math.random() * 3); }
function careerApplyInjuries(c, live) {
  c.injuries = (c.injuries || []).map(function (inj) { return { id: inj.id, matchesLeft: inj.matchesLeft - 1 }; }).filter(function (inj) { return inj.matchesLeft > 0; });
  var newInjured = (live && live.injured) || [];
  newInjured.forEach(function (id) {
    if (c.injuries.some(function (inj) { return inj.id === id; })) return;
    c.injuries.push({ id: id, matchesLeft: careerInjuryDuration() });
    careerBenchPlayer(c, id);
  });
}
// Ids sancionados O lesionados ahora mismo -- no se pueden meter de
// titular (ver selectCareerPlayer) hasta que se cumpla lo que toque.
// Rojas y lesiones también en Simular y Saltar, a petición explícita
// ("rojas y lesiones también pasan por simular y saltar, avisándote
// cuando acaba el partido"): en Ver partido ya salen de la simulación
// jugada a jugada (live.sentOff/live.injured); en el resto se sortean aquí,
// un 2% por partido cada una (por el ajuste de frecuencia de la carrera,
// 0 = desactivado, x2.5 = alto). Se aplica todo y se deja un aviso
// (G.careerEventNotice) para enseñarlo en una ventana pequeña.
var CAREER_QUICK_EVENT_CHANCE = 0.02;
function careerFinishMatchEvents(c, live) {
  live = live || {};
  if (live.visualMode !== 'dots') {
    var starters = c.lineup.map(function (s) { return s.player; }).filter(function (p) { return careerUnavailableIds(c).indexOf(p.id) === -1; });
    if (starters.length && Math.random() < CAREER_QUICK_EVENT_CHANCE * careerRedCardFreqMult(c)) live.sentOff = [starters[Math.floor(Math.random() * starters.length)].id];
    var rest = starters.filter(function (p) { return (live.sentOff || []).indexOf(p.id) === -1; });
    if (rest.length && Math.random() < CAREER_QUICK_EVENT_CHANCE * careerInjuryFreqMult(c)) live.injured = [rest[Math.floor(Math.random() * rest.length)].id];
  }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  function nameOf(id) { var p = all.find(function (x) { return x.id === id; }); return p ? p.nombre : id; }
  var items = [];
  (live.sentOff || []).forEach(function (id) { items.push({ icon: '🟥', text: nameOf(id) + ' ve la roja: se pierde el próximo partido.' }); });
  var injuredBefore = (c.injuries || []).map(function (i) { return i.id; });
  careerApplyRedCardSuspensions(c, live);
  (c.injuries || []).forEach(function (inj) {
    if (injuredBefore.indexOf(inj.id) === -1) items.push({ icon: '🤕', text: nameOf(inj.id) + ' se lesiona: baja ' + inj.matchesLeft + ' partido' + (inj.matchesLeft === 1 ? '' : 's') + '.' });
  });
  if (items.length) G.careerEventNotice = items;
}
window.actionDismissCareerEventNotice = function () { G.careerEventNotice = null; render(); };
function renderCareerEventNotice() {
  return '<div class="modal-overlay" onclick="actionDismissCareerEventNotice()">' +
    '<div class="jugador-trophy-card" onclick="event.stopPropagation()">' +
      '<h3 style="margin-bottom:8px">Parte del partido</h3>' +
      G.careerEventNotice.map(function (it) { return '<p class="small">' + it.icon + ' ' + escapeHtml(it.text) + '</p>'; }).join('') +
      '<button class="btn btn-primary btn-block mt" onclick="actionDismissCareerEventNotice()">Entendido</button>' +
    '</div></div>';
}
function careerUnavailableIds(c) {
  return (c.suspendedIds || []).concat((c.injuries || []).map(function (inj) { return inj.id; }));
}
// A petición explícita ("que tus jugadores suban puntos en base a lo que
// van jugando, y no solo el entrenamiento... lo que está ahora de lo que
// suben, divídelo entre lo que juegan siendo titulares y lo que suban en
// un centro de entrenamiento"): para TU plantilla (lineup+bench), la
// mitad de la subida de siempre viene del centro de entrenamiento (como
// hasta ahora) y la otra mitad se escala según la ratio de jornadas
// jugadas de titular esta temporada (careerPlayerAppearanceRatio) -- un
// titular fijo toda la temporada sigue subiendo exactamente lo mismo que
// antes (nunca más), uno que no juega nada se queda solo con la mitad
// "de entrenamiento". El resto del ROSTER (rivales/mercado, sin datos de
// alineación) no se toca, sigue con la fórmula de siempre.
var CAREER_SQUAD_GROWTH_TRAINING_SHARE = 0.5;
function careerApplySquadGrowthSplit(c, p, delta) {
  var ratio = careerPlayerAppearanceRatio(c, p);
  return delta * CAREER_SQUAD_GROWTH_TRAINING_SHARE * (1 + ratio);
}
function careerIsSquadPlayer(c, playerId) {
  return c.lineup.some(function (s) { return s.player.id === playerId; }) || c.bench.some(function (p) { return p.id === playerId; });
}
// "Media esperada" de la pestaña Entrenamiento: la parte DETERMINISTA del
// cálculo de abajo (el tirón hacia el ancla + el crecimiento fijo del
// jugador ya diluido según lo cerca que esté del máximo, sin el ruido al
// azar, recortada al tope de la temporada), para poder enseñar una
// previsión antes de que pase la temporada.
function careerExpectedProgressionDelta(c, p) {
  var params = careerTrainingEffectiveParams(c.trainingLevel);
  var current = careerPlayerScore(p);
  var tier = careerPlayerGrowthTier(c, p);
  var tierBonus = careerGrowthTierBonus(c, p, current);
  var raw = careerProgressionPull(current, params) + tierBonus;
  var capped = Math.min(raw, careerGrowthSeasonCap(tier, c.trainingLevel));
  // Solo se enseña en Entrenamiento (siempre jugadores de tu plantilla),
  // así que aquí también se aplica el reparto entrenamiento/minutos
  // jugados -- ver careerApplySquadGrowthSplit.
  return Math.round(careerApplySquadGrowthSplit(c, p, capped) * 2) / 2;
}
// "Potencial" de la pestaña Entrenamiento: un rango (bajo-alto), no un
// único número, a petición explícita ("puede ser cualquiera de los 3
// valores al final... añade algo de aleatoriedad ahí"). El centro es la
// media esperada de arriba (careerExpectedProgressionDelta, la parte
// determinista, ya con el tope de temporada aplicado); los extremos son
// ± el ruido real que usa careerProgressAllPlayers (params.variance), sin
// dejar que el extremo alto se salte el tope de careerGrowthSeasonCap --
// así el rango mostrado SÍ es el rango real en el que puede caer la
// progresión de la próxima temporada, no un adorno inventado aparte.
function careerPlayerPotentialRange(c, p) {
  var params = careerTrainingEffectiveParams(c.trainingLevel);
  var current = careerPlayerScore(p);
  var tier = careerPlayerGrowthTier(c, p);
  var expected = current + careerExpectedProgressionDelta(c, p);
  // Redondeado también aquí (no solo el otro lado del Math.min) -- sin
  // esto, si "current" alguna vez no cae en un múltiplo de 0.5 (no
  // debería, pero por si acaso), el tope podía colarse como número no
  // entero en pantalla (ej. "72.33").
  var seasonCapScore = Math.round(current + careerApplySquadGrowthSplit(c, p, careerGrowthSeasonCap(tier, c.trainingLevel)));
  return {
    low: clamp(Math.round(expected - params.variance), 30, CAREER_SCORE_MAX),
    high: clamp(Math.min(Math.round(expected + params.variance), seasonCapScore), 30, CAREER_SCORE_MAX)
  };
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
    var tier = careerPlayerGrowthTier(c, p);
    var tierBonus = careerGrowthTierBonus(c, p, current);
    var pull = careerProgressionPull(current, params) + tierBonus;
    var noise = (Math.random() * 2 - 1) * params.variance;
    var delta = Math.round((pull + noise) * 2) / 2;
    delta = Math.min(delta, careerGrowthSeasonCap(tier, c.trainingLevel));
    // Solo para TU plantilla: la mitad de esta subida viene del centro de
    // entrenamiento (como siempre) y la otra mitad depende de cuánto haya
    // jugado de titular en Liga esta temporada que termina
    // (careerApplySquadGrowthSplit/careerRecordStarterAppearances) -- a
    // petición explícita. El resto del ROSTER (rivales/mercado) no se
    // toca, no hay datos de alineación suyos.
    if (careerIsSquadPlayer(c, p.id)) delta = Math.round(careerApplySquadGrowthSplit(c, p, delta) * 2) / 2;
    c.playerProgression[p.id] = (c.playerProgression[p.id] || 0) + delta;
    c.lastPlayerProgressionDelta[p.id] = delta;
  });
}


var CAREER_VALUE_ANCHOR_SCORE = 75;
var CAREER_VALUE_ANCHOR_MILLIONS = 1;
var CAREER_VALUE_DOUBLING_BELOW_ANCHOR = 10;
// Arreglo de economía (a petición explícita: "vendes un jugador de 99 y
// ya prácticamente eres rico... te quedas con 500 millones y no te vale
// para nada"). La curva de antes DOBLABA el precio cada 2.6 puntos por
// encima del ancla (75) sin ningún techo -- con el tope de media subido a
// 120 (ver CAREER_SCORE_MAX), un solo crack llegaba a valer CIENTOS de
// millones de golpe, muy por encima de cualquier presupuesto real de la
// carrera (CAREER_STARTING_BUDGET_OPTIONS va de 1 a 100), lo que
// reventaba de un plumazo toda la economía: un fichaje o una venta
// desequilibraba más que 10 temporadas enteras de sueldos y patrocinios.
// Ahora, por encima del ancla, el valor crece de forma mucho más plana
// (lineal + una curva suave, no exponencial): un jugador de 99 de media
// vale unos 12 M€ y uno de 120 (el tope físico posible) unos 23 M€ --
// caro de verdad, pero de una escala que sigue teniendo sentido al lado
// del presupuesto y de los ingresos por temporada. Por debajo del ancla
// se mantiene la curva de siempre (dobla cada 10 puntos hacia abajo).
function careerPlayerValue(p) {
  var score = careerPlayerScore(p);
  var excess = score - CAREER_VALUE_ANCHOR_SCORE;
  var millions;
  if (excess >= 0) {
    millions = CAREER_VALUE_ANCHOR_MILLIONS + excess * 0.35 + Math.pow(excess, 1.5) * 0.02;
  } else {
    millions = CAREER_VALUE_ANCHOR_MILLIONS * Math.pow(2, excess / CAREER_VALUE_DOUBLING_BELOW_ANCHOR);
  }
  return Math.max(0.1, Math.round(millions * 10) / 10);
}

// Saca `count` nombres distintos de `pool`, evitando los que ya estén en
// `used` (compartido entre llamadas para que las dos divisiones nunca se
// pisen equipos entre sí al arrancar la carrera).
function careerPickNamesFromPool(pool, count, used) {
  var names = [];
  var guard = 0;
  while (names.length < count && guard < 4000) {
    guard++;
    var name = choice(pool);
    if (!used[name]) { used[name] = true; names.push(name); }
  }
  return names;
}

// Reparto inicial de las dos divisiones al empezar una carrera nueva, a
// petición explícita: Segunda con 16 equipos (tú + 4 jefes + 11
// "normales"), Primera con 20 (17 jefes + 3 "normales", sin ti -- tú
// arrancas en Segunda, careerFreshState, así que de entrada Primera es
// la división "en la sombra" y necesita sus 20 rivales completos).
// Segunda solo necesita 15 nombres reales (el hueco 16 eres tú). Se
// llama UNA sola vez por partida nueva -- de ahí en adelante los mismos
// 35 nombres solo se mueven entre las dos listas por ascenso/descenso
// (careerApplyPromotionRelegation), nunca se vuelve a sortear nada
// nuevo.
// excludeName: el club real cuyo escudo hayas elegido como el tuyo (ver
// renderCareerSetup/c.clubShieldName) nunca puede aparecer TAMBIÉN como
// rival en la misma carrera -- a petición explícita ("si cogemos por
// ejemplo el escudo del Kirkwood, el Kirkwood no puede parecer durante
// ese modo carrera"). Se marca como "ya usado" desde el principio, antes
// de repartir nada, igual que el propio careerPickNamesFromPool evita
// que las dos divisiones se pisen equipos entre sí.
// Filtro de temporada/juego (c.seasonFilter, elegido al crear la
// carrera), a petición explícita: solo entran en el sorteo los equipos
// de las temporadas marcadas (TEAM_SEASON) -- los sin temporada conocida
// (p.ej. 'Tormenta de Géminis', hueco en la clasificación) NUNCA se
// filtran, para no perderlos por un olvido. Si el filtro deja muy pocos
// equipos para completar las dos divisiones (35 en total), se rellena
// con el resto del pool sin filtrar en vez de romper el reparto -- mejor
// algún equipo "de más" que una carrera con menos rivales de la cuenta.
function careerSeasonFilteredPool(pool, seasonFilter) {
  if (!seasonFilter || seasonFilter.length >= TEAM_SEASON_ORDER.length) return pool;
  var filtered = pool.filter(function (name) {
    var season = TEAM_SEASON[name];
    return !season || seasonFilter.indexOf(season) !== -1;
  });
  return filtered;
}
function careerInitialDivisionTeams(excludeName, seasonFilter) {
  var used = {};
  if (excludeName) used[excludeName] = true;
  var bossPool = careerSeasonFilteredPool(RIVAL_TEAM_BOSSES, seasonFilter);
  var namePool = careerSeasonFilteredPool(RIVAL_TEAM_NAMES, seasonFilter);
  function pick(pool, fallbackPool, count) {
    var picked = careerPickNamesFromPool(pool, Math.min(count, pool.length), used);
    if (picked.length < count) picked = picked.concat(careerPickNamesFromPool(fallbackPool, count - picked.length, used));
    return picked;
  }
  var div2 = pick(bossPool, RIVAL_TEAM_BOSSES, CAREER_DIVISION2_BOSS_COUNT)
    .concat(pick(namePool, RIVAL_TEAM_NAMES, CAREER_DIVISION2_NORMAL_COUNT));
  var div1 = pick(bossPool, RIVAL_TEAM_BOSSES, CAREER_DIVISION1_BOSS_COUNT)
    .concat(pick(namePool, RIVAL_TEAM_NAMES, CAREER_DIVISION1_NORMAL_COUNT));
  return { 1: div1, 2: div2 };
}

// Modo Carrera es IDA Y VUELTA (a diferencia de Liga, que es a una
// vuelta), a petición explícita ("si son 16 equipos, 30 partidos, si son
// 20, 38 partidos"): la vuelta usa el mismo círculo (generateRoundRobin)
// que la ida, con local/visitante invertido en cada partido -- así 16
// equipos dan 2×15=30 jornadas y 20 dan 2×19=38, exacto. No se toca
// generateRoundRobin en sí (es de Liga, que sigue siendo a una vuelta).
function careerGenerateDoubleRoundRobin(n) {
  var firstLeg = generateRoundRobin(n);
  var secondLeg = firstLeg.map(function (round) {
    return round.map(function (fx) { return [fx[1], fx[0]]; });
  });
  return firstLeg.concat(secondLeg);
}

// Calendario + tabla de LA DIVISIÓN QUE JUEGAS, construidos una sola vez:
// mismo método del círculo, a doble vuelta (careerGenerateDoubleRoundRobin)
// y misma forma de standing vacío (ligaEmptyStanding) que ya usa Liga.
// divisionTeams[division] son los nombres reales de esa división (sin
// ti); careerComputePromotionRelegation/careerApplyPromotionRelegation
// son quienes mueven nombres entre las dos listas de una temporada a otra.
function careerBuildLeague(division, divisionTeams) {
  var teamNames = [null].concat(divisionTeams[division]); // índice 0 = tú
  var schedule = careerGenerateDoubleRoundRobin(teamNames.length);
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
    stats: { scorers: {}, assists: {} },
    // Plantilla "fantasma" de cada rival, ver careerTeamGhostPool -- se
    // rellena la primera vez que ese equipo mete un gol y se queda fija
    // toda la temporada.
    ghostSquads: {},
    // Ver careerMaybeAwardLeagueFinish -- evita dar el premio de fin de
    // Liga más de una vez si se repasa la pantalla de Jornada.
    finishBonusAwarded: false
  };
}

// Presupuesto en M€, misma unidad que careerPlayerValue -- 2M€ de
// salida por defecto (elegible al crear la carrera, ver
// CAREER_STARTING_BUDGET_OPTIONS/renderCareerSetup), +50k/100k/150k al
// azar por cada partido tuyo ganado (ver careerAwardWinBonus), gastable
// en fichajes (Mercado) y repuesto al vender/ceder (Gestionar plantilla).
var CAREER_STARTING_BUDGET = 2;

// ===== Configuración inicial (pantalla previa a crear la carrera) =====
// A petición explícita ("antes de empezar partida en modo carrera,
// puedes elegir dificultad, dinero inicial, y negociaciones duras o
// blandas"): 3 elecciones independientes, guardadas en el estado
// (c.difficulty/c.negotiation) para que sigan aplicando toda la
// carrera -- careerRivalPower y careerNegotiationAccepts las leen de
// G.career directamente. El dinero inicial no necesita guardarse aparte
// porque solo afecta a c.budget en el momento de crear la partida.
// Bajados otra vez (a petición explícita, "baja la dificultad") -- eran
// 82/92/100, luego 77/87/95. "Fácil" bajado una tercera vez aparte ("baja
// más todavía el nivel de la dificultad fácil"), las otras dos se quedan.
// Normal y Difícil bajados 6 puntos cada uno (Fácil se queda igual, no
// se ha pedido tocarla), a petición explícita ("baja la dificultad de
// modo carrera en normal y dificil, unos 5-7 puntos cada una").
// "Muy difícil" añadido a petición explícita, por encima de "Difícil".
// Fácil y Normal un pelín más altos (antes 63/79), a petición explícita
// ("sube un pelin la dificultad de facil y normal") -- Difícil y Muy
// difícil se quedan igual.
// Difícil/Muy difícil subidos un poco más (antes 87/91), a petición
// explícita ("sube dificultad en dificil y muy dificil") -- Fácil/Normal
// sin tocar.
var CAREER_DIFFICULTY_TIERS = {
  facil: { name: 'Fácil', rivalLevelTarget: 67 },
  normal: { name: 'Normal', rivalLevelTarget: 82 },
  dificil: { name: 'Difícil', rivalLevelTarget: 90 },
  muy_dificil: { name: 'Muy difícil', rivalLevelTarget: 95 }
};
var CAREER_DIFFICULTY_ORDER = ['facil', 'normal', 'dificil', 'muy_dificil'];
var CAREER_NEGOTIATION_MODES = {
  blandas: { name: 'Blandas', moneyExponent: 3 },
  duras: { name: 'Duras', moneyExponent: 8 }
};
var CAREER_NEGOTIATION_ORDER = ['blandas', 'duras'];
var CAREER_STARTING_BUDGET_OPTIONS = [1, 2, 5, 10, 100];

// ===== Crecimiento por jugador (rasgo fijo de la carrera) =====
// A petición explícita ("no todos los jugadores suban igual... crecimiento
// muy bajo, bajo, normal, alto y muy alto... sube de 1 a 5 por temporada...
// es aleatorio antes de empezar el modo carrera, se genera cuando empieza
// el modo carrera, y ya no cambia durante las temporadas"): cada jugador
// de TODO ROSTER recibe un nivel 1-5 al crear la partida (careerInitialGrowthTiers,
// llamado una sola vez desde careerFreshState), diluido según lo cerca
// que esté cada jugador del máximo (careerGrowthTierBonus, no se suma
// tal cual) -- no depende del centro de entrenamiento, es un rasgo
// personal del jugador que se mantiene toda la carrera. Pesos
// 12/23/40/18/7 (careerRollGrowthTier) para que "Normal" sea lo más
// común y "Muy alto" sea de verdad raro de encontrar (7%, dentro del
// 5-10% pedido explícitamente) -- antes era 10/20/40/20/10 (10%). Por
// encima de todo eso, exactamente 2 jugadores de toda la carrera son
// "Prodigio" (nivel 6, ver careerInitialGrowthTiers más abajo), a
// petición explícita.
var CAREER_GROWTH_TIER_LABELS = { 1: 'Muy bajo', 2: 'Bajo', 3: 'Normal', 4: 'Alto', 5: 'Muy alto', 6: 'Prodigio' };
var CAREER_GROWTH_TIER_ARROWS = { 1: '▼▼', 2: '▼', 3: '►', 4: '▲', 5: '▲▲', 6: '★' };
var CAREER_GROWTH_TIER_COLORS = { 1: 'var(--danger)', 2: '#e08a1e', 3: 'var(--text-dim)', 4: 'var(--success)', 5: 'var(--accent-2)', 6: '#ff5fa8' };
var CAREER_GROWTH_TIER_WEIGHTS = [12, 23, 40, 18, 7];
function careerRollGrowthTier() {
  var r = Math.random() * 100;
  var cum = 0;
  for (var i = 0; i < CAREER_GROWTH_TIER_WEIGHTS.length; i++) {
    cum += CAREER_GROWTH_TIER_WEIGHTS[i];
    if (r < cum) return i + 1;
  }
  return 5;
}
// "Prodigio" (6): por encima de "Muy alto", a petición explícita ("haz
// que haya dos jugadores aleatorios durante la partida de cada modo
// carrera que sea más que muy alto, que suba más todavía"). Ni siquiera
// entra en el sorteo normal de CAREER_GROWTH_TIER_WEIGHTS -- son
// exactamente CAREER_PRODIGY_COUNT jugadores del MERCADO (fuera de tu
// plantilla inicial) más CAREER_PRODIGY_SQUAD_COUNT DENTRO de tu
// plantilla inicial, elegidos al azar DESPUÉS de repartir el resto, a
// petición explícita ("a partir de ahora hay 2 aleatorios en mercado,
// más alguien aleatorio en tu plantilla inicial") -- así siempre hay
// exactamente 3 prodigios por partida, y siempre al menos uno ya en tu
// equipo desde el primer día.
var CAREER_PRODIGY_COUNT = 2;
var CAREER_PRODIGY_SQUAD_COUNT = 1;
var CAREER_PRODIGY_MAX_SCORE = 84;
function careerInitialGrowthTiers(squadIds) {
  var tiers = {};
  ROSTER.forEach(function (p) { tiers[p.id] = careerRollGrowthTier(); });
  squadIds = squadIds || [];
  var isProdigyEligible = function (p) { return careerPlayerScore(p) <= CAREER_PRODIGY_MAX_SCORE; };
  var squadPool = ROSTER.filter(function (p) { return squadIds.indexOf(p.id) !== -1 && isProdigyEligible(p); });
  var marketPool = ROSTER.filter(function (p) { return squadIds.indexOf(p.id) === -1 && isProdigyEligible(p); });
  for (var i = 0; i < CAREER_PRODIGY_COUNT && marketPool.length; i++) {
    var idx = Math.floor(Math.random() * marketPool.length);
    tiers[marketPool[idx].id] = 6;
    marketPool.splice(idx, 1);
  }
  for (var j = 0; j < CAREER_PRODIGY_SQUAD_COUNT && squadPool.length; j++) {
    var idx2 = Math.floor(Math.random() * squadPool.length);
    tiers[squadPool[idx2].id] = 6;
    squadPool.splice(idx2, 1);
  }
  return tiers;
}
function careerPlayerGrowthTier(c, p) {
  return (c && c.playerGrowthTier && c.playerGrowthTier[p.id]) || 3;
}
// Flecha de color con el nivel de crecimiento -- a petición explícita
// ("puedes hacerlo con flechas de colores para decir lo que es cada
// uno"). Reutilizada en Entrenamiento, Gestionar plantilla y el filtro
// de Mercado.
// `hideProdigy` (c.hideProdigy, elegido en la creación de la carrera --
// "haz un modo donde no puedas ver si son prodigio o no") disfraza el
// nivel 6 de un nivel 5 normal SOLO a efectos visuales -- la progresión
// real de esos jugadores (careerProgressAllPlayers) sigue usando el
// nivel de verdad, esto solo cambia lo que se enseña en pantalla.
function careerGrowthArrowHtml(tier, hideProdigy) {
  var displayTier = (hideProdigy && tier === 6) ? 5 : tier;
  var arrow = CAREER_GROWTH_TIER_ARROWS[displayTier] || CAREER_GROWTH_TIER_ARROWS[3];
  var color = CAREER_GROWTH_TIER_COLORS[displayTier] || CAREER_GROWTH_TIER_COLORS[3];
  var label = CAREER_GROWTH_TIER_LABELS[displayTier] || CAREER_GROWTH_TIER_LABELS[3];
  return '<span class="career-growth-arrow" style="color:' + color + '" title="Crecimiento: ' + label + ' (+' + displayTier + ' de base cada temporada)">' + arrow + '</span>';
}
function careerGrowthLabel(c, p) {
  var tier = careerPlayerGrowthTier(c, p);
  var displayTier = (c && c.hideProdigy && tier === 6) ? 5 : tier;
  return CAREER_GROWTH_TIER_LABELS[displayTier];
}

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
// Actividad de mercado elegida en el setup (c.marketActivity), a petición
// explícita: 'baja' es el comportamiento de siempre (1-3 ofertas entrantes
// al día, 2 fichajes máximo al día), 'alta' sube ambas cosas.
var CAREER_MARKET_ACTIVITY = {
  baja: { name: 'Baja', offersMin: 1, offersMax: 3, maxSignings: 2 },
  alta: { name: 'Alta', offersMin: 3, offersMax: 5, maxSignings: 4 }
};
function careerMarketActivity(c) { return CAREER_MARKET_ACTIVITY[c.marketActivity] || CAREER_MARKET_ACTIVITY.baja; }
// Frecuencia de lesiones y de rojas, elegidas por separado al crear la
// carrera (c.injuryFreq/c.redCardFreq), a petición explícita ("el
// modificador de lesiones y de sanciones... dos ajustes separados"):
// multiplican la probabilidad base de cada suceso en cada tick del modo
// puntitos (ver futDraftAdvancePossession) -- 'desactivado' las quita
// del todo, 'alto' las hace bastante más frecuentes que hasta ahora
// ('bajo', el comportamiento de siempre).
var CAREER_EVENT_FREQ = {
  desactivado: { name: 'Desactivado', mult: 0 },
  bajo: { name: 'Bajo', mult: 1 },
  alto: { name: 'Alto', mult: 2.5 }
};
var CAREER_EVENT_FREQ_ORDER = ['desactivado', 'bajo', 'alto'];
// Estilo de juego "físico" y intensidad de entrenamiento/juego, elegidos en
// Mi equipo (solo si hay lesiones o rojas activadas), a petición explícita:
// un estilo más brusco te saca más tarjetas (amarillas y rojas), una
// intensidad más alta lesiona más. Multiplican la frecuencia elegida al
// crear la carrera (desactivado sigue siendo desactivado).
var CAREER_FOUL_STYLES = {
  leve: { name: 'Leve', mult: 0.5 },
  medio: { name: 'Medio', mult: 1 },
  brusco: { name: 'Brusco', mult: 1.8 }
};
var CAREER_INTENSITIES = {
  baja: { name: 'Baja', mult: 0.5 },
  media: { name: 'Media', mult: 1 },
  alta: { name: 'Alta', mult: 1.8 }
};
// Lo que das a cambio del riesgo, a petición explícita ("algo tendrán que
// dar"): intensidad alta = más ataque y algo más de defensa (jugadores a
// tope, pero más lesiones); baja = un poco menos. Estilo brusco = mejor
// defensa (más entradas, pero más tarjetas); leve = algo peor. Solo cuenta
// mientras el suceso correspondiente esté activado (con rojas o lesiones
// desactivadas el ajuste no existe ni da nada).
var CAREER_INTENSITY_BENEFIT = { baja: { atk: 0.96, def: 0.98 }, media: { atk: 1, def: 1 }, alta: { atk: 1.06, def: 1.03 } };
var CAREER_FOUL_BENEFIT = { leve: { atk: 1, def: 0.97 }, medio: { atk: 1, def: 1 }, brusco: { atk: 1.02, def: 1.06 } };
function careerRiskBenefit(c) {
  var atk = 1, def = 1;
  if (c.injuryFreq !== 'desactivado') { var i = CAREER_INTENSITY_BENEFIT[c.intensity] || CAREER_INTENSITY_BENEFIT.media; atk *= i.atk; def *= i.def; }
  if (c.redCardFreq !== 'desactivado') { var f = CAREER_FOUL_BENEFIT[c.foulStyle] || CAREER_FOUL_BENEFIT.medio; atk *= f.atk; def *= f.def; }
  return { atk: atk, def: def };
}
function careerFoulMult(c) { return (CAREER_FOUL_STYLES[c.foulStyle] || CAREER_FOUL_STYLES.medio).mult; }
function careerIntensityMult(c) { return (CAREER_INTENSITIES[c.intensity] || CAREER_INTENSITIES.media).mult; }
function careerInjuryFreqMult(c) { return (CAREER_EVENT_FREQ[c.injuryFreq] || CAREER_EVENT_FREQ.bajo).mult * careerIntensityMult(c); }
function careerRedCardFreqMult(c) { return (CAREER_EVENT_FREQ[c.redCardFreq] || CAREER_EVENT_FREQ.bajo).mult * careerFoulMult(c); }
function careerYellowFreqMult(c) { return careerFoulMult(c); }
window.actionSetCareerFoulStyle = function (id) { if (!CAREER_FOUL_STYLES[id]) return; G.career.foulStyle = id; render(); };
window.actionSetCareerIntensity = function (id) { if (!CAREER_INTENSITIES[id]) return; G.career.intensity = id; render(); };
function careerMaxSigningsPerDay(c) { return careerMarketActivity(c).maxSignings; }
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
// Rango por defecto ('baja'); careerGenerateIncomingOffers usa el rango de
// careerMarketActivity(c) en su lugar cuando hay carrera activa.
var CAREER_INCOMING_OFFERS_MIN_PER_DAY = 1;
var CAREER_INCOMING_OFFERS_MAX_PER_DAY = 3;
var CAREER_INCOMING_OFFER_VARIANCE = 0.2;
var CAREER_INCOMING_OFFER_DAYS = 2;
// Club que hace la oferta (un rival real de tu liga, con su escudo), a
// petición explícita ("que te diga de qué equipo te llegan las ofertas").
function careerOfferClub(c) {
  var rivals = c.league.teamNames.slice(1);
  return rivals.length ? choice(rivals) : null;
}
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
  var activity = careerMarketActivity(c);
  var target = activity.offersMin + Math.floor(Math.random() * (activity.offersMax - activity.offersMin + 1));
  shuffled.slice(0, target).forEach(function (p) {
    var mode = Math.random() < 0.25 ? 'loan' : 'buy';
    var asking = careerNegotiationAskingValue(p, mode);
    var variance = 1 + (Math.random() * 2 - 1) * CAREER_INCOMING_OFFER_VARIANCE;
    pending.push({
      id: uid(),
      playerId: p.id,
      mode: mode,
      club: careerOfferClub(c),
      amount: Math.max(0.1, Math.round(asking * variance * 10) / 10),
      dayReceived: w.dayIndex,
      expiresOnDay: w.dayIndex + CAREER_INCOMING_OFFER_DAYS
    });
  });
}

// choices ({difficulty, negotiation, budget}) viene de renderCareerSetup
// (la pantalla previa a crear la carrera, a petición explícita: "antes
// de empezar partida en modo carrera, puedes elegir dificultad, dinero
// inicial, y negociaciones duras o blandas") -- con valores por defecto
// razonables si se llama sin nada (compatibilidad con quien llamara a
// careerFreshState() a secas).
function careerFreshState(choices) {
  choices = choices || {};
  // Plantilla inicial: por defecto (siempre los mismos 16 elegidos a
  // mano) o aleatoria (careerRandomSquadIds, sorteada una vez aquí al
  // confirmar la carrera y ya fija para siempre, igual que el resto de
  // elecciones de creación).
  var squadIds = choices.squadMode === 'random' ? careerRandomSquadIds()
    : choices.squadMode === 'raimon' ? { starterIds: CAREER_MODE_RAIMON_STARTER_IDS, benchIds: CAREER_MODE_RAIMON_BENCH_IDS }
    : { starterIds: CAREER_MODE_STARTER_IDS, benchIds: CAREER_MODE_BENCH_IDS };
  var starters = careerModeRoster(squadIds.starterIds);
  // Arrancas en Segunda División por defecto, pero se puede elegir
  // Primera desde el principio (renderCareerSetup) -- a petición
  // explícita ("elegir si empiezas en Segunda o Primera").
  var division = choices.startDivision === 1 ? 1 : 2;
  // Nombre y escudo de TU club (elegidos en renderCareerSetup), a
  // petición explícita ("elige nombre de club (cualquiera) y escudo de
  // club entre los que hay desbloqueados"). clubShieldName es el club
  // REAL cuyo escudo tomas prestado (o null = escudo por defecto de
  // siempre); ese club real queda excluido de los rivales de esta
  // carrera (ver careerInitialDivisionTeams).
  var clubName = (choices.clubName || '').trim() || 'Tu Equipo';
  var clubShieldName = choices.clubShieldName || null;
  // Filtro de temporada/juego (ver careerSeasonFilteredPool): array de
  // claves de TEAM_SEASON_ORDER, todas seleccionadas por defecto (sin
  // filtro real). Fijo toda la partida, como el resto de opciones de
  // creación.
  var seasonFilter = (Array.isArray(choices.seasonFilter) && choices.seasonFilter.length) ? choices.seasonFilter.filter(function (s) { return TEAM_SEASON_ORDER.indexOf(s) !== -1; }) : TEAM_SEASON_ORDER.slice();
  var divisionTeams = careerInitialDivisionTeams(clubShieldName, seasonFilter);
  var state = {
    tab: 'equipo',
    season: 1,
    clubName: clubName,
    clubShieldName: clubShieldName,
    formation: CAREER_MODE_DEFAULT_FORMATION,
    // Estilo de juego (Gestionar plantilla), ver CAREER_PLAY_STYLES --
    // empieza "equilibrado" (sin efecto) hasta que se cambie a mano.
    playStyle: 'equilibrado',
    lineup: futDraftBuildLineup(starters, CAREER_MODE_DEFAULT_FORMATION),
    bench: careerModeRoster(squadIds.benchIds),
    captainId: null,
    pickingCaptain: false,
    swapSelectedId: null,
    // Dificultad y dureza de negociación elegidas al crear la carrera --
    // se quedan fijas toda la partida (careerRivalPower/careerNegotiationAccepts
    // las leen de G.career en cada partido/oferta, no solo aquí).
    difficulty: CAREER_DIFFICULTY_TIERS[choices.difficulty] ? choices.difficulty : 'normal',
    negotiation: CAREER_NEGOTIATION_MODES[choices.negotiation] ? choices.negotiation : 'duras',
    // "haz un modo donde no puedas ver si son prodigio o no": fijo toda
    // la partida igual que dificultad/negociación, ver careerGrowthArrowHtml.
    hideProdigy: !!choices.hideProdigy,
    // Estilo de directiva (exigente/normal/tranquila) e Ironman (si te
    // despiden, se borra el hueco de guardado para no poder recargar la
    // partida) -- a petición explícita, elegidos al crear la carrera y
    // fijos toda la partida.
    boardStyle: CAREER_BOARD_STYLES[choices.boardStyle] ? choices.boardStyle : 'normal',
    ironman: !!choices.ironman,
    // Actividad de mercado (baja/alta, ver CAREER_MARKET_ACTIVITY) -- igual
    // de fija toda la partida, elegida al crear la carrera.
    marketActivity: CAREER_MARKET_ACTIVITY[choices.marketActivity] ? choices.marketActivity : 'baja',
    // Mercado de invierno activable/desactivable al crear la carrera, a
    // petición explícita -- el de pretemporada siempre está activo.
    winterMarket: choices.winterMarket !== false,
    foulStyle: 'medio',
    intensity: 'media',
    coachId: COACHES[Math.floor(Math.random() * COACHES.length)].id,
    injuryFreq: CAREER_EVENT_FREQ[choices.injuryFreq] ? choices.injuryFreq : 'bajo',
    redCardFreq: CAREER_EVENT_FREQ[choices.redCardFreq] ? choices.redCardFreq : 'bajo',
    division: division,
    divisionTeams: divisionTeams,
    seasonFilter: seasonFilter,
    league: careerBuildLeague(division, divisionTeams),
    lastMatchdayResult: null,
    // A petición explícita ("deja el partido anterior con el resultado...
    // y ya le das a siguiente"): true justo después de jugar una jornada
    // (Saltar o Simular), hasta que se pulsa "Siguiente" -- mientras esté
    // así, Jornada enseña tu resultado + cómo ha quedado la ronda en vez
    // de saltar directo al siguiente partido. Ver actionAckCareerJornadaResult.
    jornadaAckPending: false,
    lastPromotionResult: null,
    loanedIds: [],
    // Jugadores TUYOS cedidos a un club rival (cesión de SALIDA, ver
    // actionLoanCareerPlayer) -- fuera de lineup/bench mientras dura,
    // vuelven solos en actionStartNewCareerSeason. No confundir con
    // loanedIds (cedidos ENTRANTES, de otro club al tuyo).
    loanedOutIds: [],
    // Sancionados por roja (careerApplyRedCardSuspensions): se apartan
    // solos del once nada más acabar el partido de la tarjeta, y no se
    // pueden volver a meter de titular hasta que se cumpla la sanción (un
    // partido, se libera solo al terminar el siguiente) -- a petición
    // explícita ("que haya rojas y funcionen los sancionados y haya que
    // quitarlos del 11 inicial").
    suspendedIds: [],
    // Lesionados (careerApplyInjuries), cada uno con los partidos que le
    // quedan de baja (1-3, sorteados al lesionarse) -- misma idea que las
    // sanciones pero con duración variable, a petición explícita.
    injuries: [],
    boostedIds: [],
    // Jugadores comprados (fichaje en propiedad) ESTA temporada: no se
    // pueden vender ni ceder hasta la que viene, a petición explícita --
    // se vacía en cada actionStartNewCareerSeason. Los cedidos entrantes
    // ya tenían su propia protección (loanedIds), esto es la misma idea
    // pero para compras.
    boughtThisSeasonIds: [],
    incomingOffers: [],
    budget: CAREER_STARTING_BUDGET_OPTIONS.indexOf(choices.budget) !== -1 ? choices.budget : CAREER_STARTING_BUDGET,
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
    // Crecimiento fijo por jugador (1-5, TODO ROSTER), sorteado una sola
    // vez aquí y nunca más -- ver careerInitialGrowthTiers.
    playerGrowthTier: careerInitialGrowthTiers(squadIds.starterIds.concat(squadIds.benchIds)),
    // Jornadas de titular esta temporada por jugador de tu plantilla, ver
    // careerRecordStarterAppearances/careerApplySquadGrowthSplit -- vacío
    // en una partida nueva, se reinicia cada actionStartNewCareerSeason.
    seasonAppearances: {},
    // Patrocinador de esta temporada (pestaña Patrocinadores): ninguno
    // firmado todavía, ofertas nuevas se generan la primera vez que se
    // abre la pestaña (renderCareerPatrocinadores).
    sponsorOffers: null,
    activeSponsor: null,
    sponsorMessage: null,
    // Historial de carrera: una entrada por temporada ya jugada (ver
    // careerRecordSeasonHistory/renderCareerHistorial) -- ACUMULADO de
    // toda la carrera, nunca se resetea, como bestPosition/careerStats.
    seasonHistory: [],
    autosave: true, autosaveMessage: null,
    equipoTab: 'alineacion', clubTab: 'entrenamiento', ajustesTab: 'gestion',
    // Centro de entrenamiento: arranca SIN construir (0), infraestructura
    // del club, nunca se resetea entre temporadas (como el presupuesto)
    // -- ver careerTrainingEffectiveParams/CAREER_TRAINING_LEVEL_COSTS.
    trainingLevel: 0,
    trainingMessage: null,
    // Academia/cantera: mismo patrón que el centro de entrenamiento,
    // infraestructura que nunca se resetea -- los candidatos sí se
    // renuevan cada temporada (actionStartNewCareerSeason), ver
    // careerGenerateAcademyCandidates.
    academyLevel: 0,
    academyCandidates: [],
    academyMessage: null,
    // Copa del Rey: cuadro nuevo cada temporada (careerNewCup), no
    // bloqueado por la ventana de fichajes ni por el calendario de Liga
    // -- se puede jugar cuando se quiera. cupsWon es ACUMULADO de toda la
    // carrera, como bestPosition/careerStats, nunca se resetea.
    cup: careerNewCup(),
    cupsWon: 0,
    lastCupResult: null,
    lastLeagueFinish: null,
    // Champions League: no se juega la primera temporada (hay que
    // clasificarse quedando entre los CAREER_CHAMPIONS_QUALIFY_SPOTS
    // primeros de Primera la temporada anterior, a petición explícita
    // "como en la vida real") -- ver careerNewChampions/actionStartNewCareerSeason.
    champions: null,
    qualifiedForChampionsNextSeason: false,
    championsWon: 0,
    lastChampionsResult: null,
    // Supercopa: eliminatoria de ida y vuelta contra un rival "de mucho
    // nivel", se crea sola en cuanto ganas la Champions esta temporada --
    // ver careerNewSupercopa/careerChampionsMaybeAwardChampion.
    supercopa: null,
    supercopasWon: 0,
    // Ligas ganadas (posición 1), para el palmarés de Estadísticas.
    ligaTitlesWon: 0
  };
  careerGenerateIncomingOffers(state);
  state.academyCandidates = careerGenerateAcademyCandidates(state);
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
var CAREER_SLOT_COUNT = 5;
function careerSlotKey(slot) { return 'inazumaRoguelike_career_slot_' + slot; }

function careerSerialize(c) {
  return {
    tab: c.tab, competicionesTab: c.competicionesTab || 'liga', ligaView: c.ligaView || 'resumida',
    season: c.season || 1, clubName: c.clubName || 'Tu Equipo', clubShieldName: c.clubShieldName || null,
    formation: c.formation, playStyle: c.playStyle || 'equilibrado', captainId: c.captainId, budget: c.budget,
    lineup: c.lineup.map(function (s) { return { pos: s.pos, id: s.player.id }; }),
    bench: c.bench.map(function (p) { return p.id; }),
    loanedIds: c.loanedIds || [],
    loanedOutIds: c.loanedOutIds || [],
    suspendedIds: c.suspendedIds || [], injuries: c.injuries || [], boostedIds: c.boostedIds || [],
    difficulty: c.difficulty || 'normal',
    negotiation: c.negotiation || 'duras',
    hideProdigy: !!c.hideProdigy, boardStyle: c.boardStyle || 'normal', ironman: !!c.ironman, marketActivity: c.marketActivity || 'baja', winterMarket: c.winterMarket !== false, injuryFreq: c.injuryFreq || 'bajo', foulStyle: c.foulStyle || 'medio', intensity: c.intensity || 'media', redCardFreq: c.redCardFreq || 'bajo', seasonFilter: c.seasonFilter || TEAM_SEASON_ORDER.slice(),
    division: c.division || 2,
    divisionTeams: c.divisionTeams,
    league: c.league,
    lastMatchdayResult: c.lastMatchdayResult,
    jornadaAckPending: !!c.jornadaAckPending,
    calendarView: c.calendarView,
    marketFilter: c.marketFilter, marketTypeFilter: c.marketTypeFilter, marketGrowthFilter: c.marketGrowthFilter, marketSearch: c.marketSearch, marketPriceMin: (typeof c.marketPriceMin === "number" ? c.marketPriceMin : null), marketPriceMax: (typeof c.marketPriceMax === "number" ? c.marketPriceMax : null),
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
    playerGrowthTier: c.playerGrowthTier || careerInitialGrowthTiers(),
    trainingLevel: typeof c.trainingLevel === 'number' ? c.trainingLevel : 0,
    academyLevel: typeof c.academyLevel === 'number' ? c.academyLevel : 0,
    academyCandidates: c.academyCandidates || [], academyPromotedIds: c.academyPromotedIds || [],
    cup: c.cup, cupsWon: c.cupsWon || 0, lastCupResult: c.lastCupResult || null,
    lastLeagueFinish: c.lastLeagueFinish || null,
    board: c.board || null,
    fired: c.fired || null,
    lastBoardReview: c.lastBoardReview || null,
    lastPromotionResult: c.lastPromotionResult || null,
    champions: c.champions || null,
    qualifiedForChampionsNextSeason: !!c.qualifiedForChampionsNextSeason,
    championsWon: c.championsWon || 0,
    lastChampionsResult: c.lastChampionsResult || null,
    supercopa: c.supercopa || null,
    supercopasWon: c.supercopasWon || 0,
    ligaTitlesWon: c.ligaTitlesWon || 0,
    seasonAppearances: c.seasonAppearances || {},
    sponsorOffers: c.sponsorOffers || null,
    activeSponsor: c.activeSponsor || null,
    seasonHistory: c.seasonHistory || [],
    autosave: !!c.autosave,
    equipoTab: c.equipoTab, clubTab: c.clubTab, ajustesTab: c.ajustesTab
  };
}
function careerDeserialize(data) {
  var lineup = (data.lineup || []).map(function (s) {
    var p = ROSTER.find(function (x) { return x.id === s.id; });
    return p ? { pos: s.pos, player: p } : null;
  }).filter(Boolean);
  var bench = (data.bench || []).map(function (id) { return ROSTER.find(function (x) { return x.id === id; }); }).filter(Boolean);
  // Partidas guardadas de ANTES de que Calendario/Liga/Copa del Rey se
  // fundieran en "Competiciones" podían tener c.tab en cualquiera de
  // esas 3 -- se traducen a la pestaña nueva (con la sub-pestaña que
  // corresponda) en vez de caer silenciosamente en "Mi equipo".
  var savedTab = data.tab;
  var migratedCompeticionesTab = data.competicionesTab || null;
  if (savedTab === 'calendario') { savedTab = 'competiciones'; migratedCompeticionesTab = migratedCompeticionesTab || 'liga'; }
  else if (savedTab === 'liga') { savedTab = 'competiciones'; migratedCompeticionesTab = migratedCompeticionesTab || 'liga'; }
  else if (savedTab === 'copa') { savedTab = 'competiciones'; migratedCompeticionesTab = migratedCompeticionesTab || 'copa'; }
  return {
    tab: savedTab || 'equipo',
    competicionesTab: migratedCompeticionesTab || 'liga',
    ligaView: data.ligaView || 'resumida',
    season: data.season || 1,
    // Partidas guardadas de antes de esta función (nombre/escudo de club
    // propio) no tienen estos campos -- valores de reserva razonables.
    clubName: data.clubName || 'Tu Equipo',
    clubShieldName: data.clubShieldName || null,
    formation: data.formation || CAREER_MODE_DEFAULT_FORMATION,
    playStyle: CAREER_PLAY_STYLES.some(function (s) { return s.id === data.playStyle; }) ? data.playStyle : 'equilibrado',
    lineup: lineup, bench: bench,
    captainId: data.captainId || null,
    pickingCaptain: false, swapSelectedId: null,
    // Partidas guardadas de ANTES de que existieran las dos divisiones no
    // tienen este campo -- se asume Primera (1), no Segunda, porque su
    // c.league ya guardado tiene 20 equipos (el formato de Primera), así
    // que es la continuidad más coherente hasta la próxima transición de
    // temporada (careerBuildLeague ya reconstruye todo bien a partir de
    // ahí).
    difficulty: CAREER_DIFFICULTY_TIERS[data.difficulty] ? data.difficulty : 'normal',
    negotiation: CAREER_NEGOTIATION_MODES[data.negotiation] ? data.negotiation : 'duras',
    hideProdigy: !!data.hideProdigy, boardStyle: data.boardStyle || 'normal', ironman: !!data.ironman, marketActivity: data.marketActivity || 'baja', winterMarket: data.winterMarket !== false, injuryFreq: data.injuryFreq || 'bajo', foulStyle: data.foulStyle || 'medio', intensity: data.intensity || 'media', coachId: (coachById(data.coachId) ? data.coachId : COACHES[Math.floor(Math.random() * COACHES.length)].id), redCardFreq: data.redCardFreq || 'bajo', seasonFilter: data.seasonFilter || TEAM_SEASON_ORDER.slice(),
    division: data.division || 1,
    divisionTeams: data.divisionTeams || careerInitialDivisionTeams(),
    league: data.league,
    lastMatchdayResult: data.lastMatchdayResult || null,
    jornadaAckPending: !!data.jornadaAckPending,
    budget: typeof data.budget === 'number' ? data.budget : CAREER_STARTING_BUDGET,
    loanedIds: data.loanedIds || [],
    loanedOutIds: data.loanedOutIds || [],
    suspendedIds: data.suspendedIds || [], injuries: data.injuries || [], boostedIds: data.boostedIds || [],
    calendarView: data.calendarView,
    marketFilter: data.marketFilter || null, marketTypeFilter: data.marketTypeFilter || null, marketGrowthFilter: data.marketGrowthFilter || null, marketSearch: data.marketSearch || '', marketPriceMin: (typeof data.marketPriceMin === "number" ? data.marketPriceMin : null), marketPriceMax: (typeof data.marketPriceMax === "number" ? data.marketPriceMax : null),
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
    // Partidas guardadas de antes de que existiera el crecimiento fijo
    // por jugador no tienen este campo -- se sortea una vez aquí y, al
    // guardar de nuevo, ya queda fijo para siempre como el resto.
    playerGrowthTier: data.playerGrowthTier || careerInitialGrowthTiers(),
    // Partidas guardadas de antes del centro "sin construir" ya tenían
    // trainingLevel >= 1 de verdad (nunca 0), así que se conserva tal
    // cual -- 0 aquí solo es de reserva para un guardado sin el campo.
    trainingLevel: typeof data.trainingLevel === 'number' ? data.trainingLevel : 0,
    academyLevel: typeof data.academyLevel === 'number' ? data.academyLevel : 0,
    academyCandidates: data.academyCandidates || [], academyPromotedIds: data.academyPromotedIds || [],
    academyMessage: null,
    trainingMessage: null,
    cup: careerCupRelinkWinners(data.cup) || careerNewCup(),
    cupsWon: data.cupsWon || 0,
    lastCupResult: data.lastCupResult || null,
    lastLeagueFinish: data.lastLeagueFinish || null,
    board: data.board || null,
    fired: data.fired || null,
    lastBoardReview: data.lastBoardReview || null,
    lastPromotionResult: data.lastPromotionResult || null,
    champions: careerCupRelinkWinners(data.champions) || null,
    qualifiedForChampionsNextSeason: !!data.qualifiedForChampionsNextSeason,
    championsWon: data.championsWon || 0,
    lastChampionsResult: data.lastChampionsResult || null,
    supercopa: data.supercopa || null,
    supercopasWon: data.supercopasWon || 0,
    ligaTitlesWon: data.ligaTitlesWon || 0,
    seasonAppearances: data.seasonAppearances || {},
    sponsorOffers: data.sponsorOffers || null,
    activeSponsor: data.activeSponsor || null,
    sponsorMessage: null,
    seasonHistory: data.seasonHistory || [],
    autosave: !!data.autosave,
    equipoTab: data.equipoTab || 'alineacion', clubTab: data.clubTab || 'entrenamiento', ajustesTab: data.ajustesTab || 'gestion'
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
      totalMatchdays: data.league ? data.league.schedule.length : CAREER_DIVISION2_TEAM_COUNT - 1,
      budget: typeof data.budget === 'number' ? data.budget : CAREER_STARTING_BUDGET,
      // Club/escudo propio y dificultad, a petición explícita ("ves el
      // nombre del equipo que usaste y su escudo... y también la
      // dificultad de esa partida").
      clubName: data.clubName || 'Tu Equipo',
      clubShieldName: data.clubShieldName || null,
      difficulty: CAREER_DIFFICULTY_TIERS[data.difficulty] ? data.difficulty : 'normal'
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
// "Nueva partida" ya no crea la carrera al momento -- primero pasa por
// una pantalla de configuración (dificultad/dinero inicial/negociaciones,
// ver renderCareerSetup) a petición explícita ("antes de empezar partida
// en modo carrera, puedes elegir dificultad, dinero inicial, y
// negociaciones duras o blandas"). G.careerSetupSlot/G.careerSetupChoices
// viven fuera de G.career porque todavía no existe ninguna partida en
// este punto.
window.actionNewCareerInSlot = function (slot) {
  G.careerSetupSlot = slot;
  G.careerSetupChoices = { difficulty: 'normal', budget: CAREER_STARTING_BUDGET, negotiation: 'duras', clubName: '', clubShieldName: null, hideProdigy: false, shieldsExpanded: false, squadMode: 'default', startDivision: 2, boardStyle: 'normal', ironman: false, marketActivity: 'baja', winterMarket: true, seasonFilter: TEAM_SEASON_ORDER.slice(), injuryFreq: 'bajo', redCardFreq: 'bajo' };
  G.screen = 'careerSetup';
  render();
};
// Plantilla inicial: "por defecto" (los mismos 16 de siempre) o
// "aleatoria" (careerRandomSquadIds, sorteada al confirmar), a petición
// explícita ("un equipo por defecto que es el que hay ahora, y un modo
// aleatorio... todo esto con desplegable junto al resto de opciones").
window.actionSetCareerSetupSquadMode = function (mode) {
  if (mode !== 'default' && mode !== 'random' && mode !== 'raimon') return;
  G.careerSetupChoices.squadMode = mode;
  render();
};
window.actionSetCareerSetupClubName = function (value) {
  G.careerSetupChoices.clubName = value;
};
window.actionSetCareerSetupClubShield = function (name) {
  G.careerSetupChoices.clubShieldName = name || null;
  render();
};
// Desplegable de escudos ("los escudos que puedas esconderlos o
// mostrarlos con un desplegable, antes de elegir uno"): empieza cerrado,
// solo enseña la lista larga si el usuario la pide.
window.actionToggleCareerSetupShields = function () {
  G.careerSetupChoices.shieldsExpanded = !G.careerSetupChoices.shieldsExpanded;
  render();
};
// "haz un modo donde no puedas ver si son prodigio o no": elegido antes
// de crear la carrera, se guarda en c.hideProdigy (careerFreshState) y
// disfraza el nivel 6 de un nivel 5 normal en toda la UI (careerGrowthArrowHtml/
// careerGrowthLabel/careerGrowthFilterBtnsHtml) sin tocar la progresión real.
window.actionSetCareerSetupHideProdigy = function (hide) {
  G.careerSetupChoices.hideProdigy = !!hide;
  render();
};
window.actionSetCareerSetupStartDivision = function (div) {
  G.careerSetupChoices.startDivision = div === 1 ? 1 : 2;
  render();
};
window.actionSetCareerSetupBoardStyle = function (id) {
  if (!CAREER_BOARD_STYLES[id]) return;
  G.careerSetupChoices.boardStyle = id;
  render();
};
window.actionSetCareerSetupIronman = function (on) {
  G.careerSetupChoices.ironman = !!on;
  render();
};
window.actionSetCareerSetupMarketActivity = function (id) {
  if (!CAREER_MARKET_ACTIVITY[id]) return;
  G.careerSetupChoices.marketActivity = id;
  render();
};
window.actionSetCareerSetupWinterMarket = function (on) {
  G.careerSetupChoices.winterMarket = !!on;
  render();
};
window.actionSetCareerSetupInjuryFreq = function (f) {
  if (!CAREER_EVENT_FREQ[f]) return;
  G.careerSetupChoices.injuryFreq = f;
  render();
};
window.actionSetCareerSetupRedCardFreq = function (f) {
  if (!CAREER_EVENT_FREQ[f]) return;
  G.careerSetupChoices.redCardFreq = f;
  render();
};
window.actionToggleCareerSetupSeason = function (s) {
  if (TEAM_SEASON_ORDER.indexOf(s) === -1) return;
  var ch = G.careerSetupChoices;
  var current = Array.isArray(ch.seasonFilter) ? ch.seasonFilter.slice() : TEAM_SEASON_ORDER.slice();
  var idx = current.indexOf(s);
  if (idx !== -1) {
    if (current.length === 1) return; // al menos 1 temporada seleccionada siempre
    current.splice(idx, 1);
  } else {
    current.push(s);
  }
  ch.seasonFilter = current;
  render();
};
window.actionSetCareerSetupDifficulty = function (tier) {
  if (!CAREER_DIFFICULTY_TIERS[tier]) return;
  G.careerSetupChoices.difficulty = tier;
  render();
};
window.actionSetCareerSetupNegotiation = function (mode) {
  if (!CAREER_NEGOTIATION_MODES[mode]) return;
  G.careerSetupChoices.negotiation = mode;
  render();
};
window.actionSetCareerSetupBudget = function (amount) {
  if (CAREER_STARTING_BUDGET_OPTIONS.indexOf(amount) === -1) return;
  G.careerSetupChoices.budget = amount;
  render();
};
window.actionCancelCareerSetup = function () {
  G.screen = 'careerSlots';
  render();
};
window.actionConfirmCareerSetup = function () {
  var slot = G.careerSetupSlot;
  if (!slot) return;
  G.career = careerFreshState(G.careerSetupChoices);
  G.careerActiveSlot = slot;
  saveCareerToSlot(slot);
  G.screen = 'careerMode';
  render();
};
// Dificultad/dinero inicial/negociaciones a elegir antes de crear la
// carrera -- fijas para toda la partida (careerRivalPower/
// careerNegotiationAccepts las leen de G.career en cada partido/oferta).
function renderCareerSetup() {
  var choices = G.careerSetupChoices || {};
  var difficulty = choices.difficulty || 'normal';
  var negotiation = choices.negotiation || 'duras';
  var budget = CAREER_STARTING_BUDGET_OPTIONS.indexOf(choices.budget) !== -1 ? choices.budget : CAREER_STARTING_BUDGET;
  var difficultyBtnsHtml = CAREER_DIFFICULTY_ORDER.map(function (id) {
    var tier = CAREER_DIFFICULTY_TIERS[id];
    return '<button class="btn btn-tiny' + (difficulty === id ? ' active' : '') + '" onclick="actionSetCareerSetupDifficulty(\'' + id + '\')">' + tier.name + '</button>';
  }).join('');
  var negotiationBtnsHtml = CAREER_NEGOTIATION_ORDER.map(function (id) {
    var mode = CAREER_NEGOTIATION_MODES[id];
    return '<button class="btn btn-tiny' + (negotiation === id ? ' active' : '') + '" onclick="actionSetCareerSetupNegotiation(\'' + id + '\')">' + mode.name + '</button>';
  }).join('');
  var budgetBtnsHtml = CAREER_STARTING_BUDGET_OPTIONS.map(function (amount) {
    return '<button class="btn btn-tiny' + (budget === amount ? ' active' : '') + '" onclick="actionSetCareerSetupBudget(' + amount + ')">' + amount + ' M€</button>';
  }).join('');
  var hideProdigy = !!choices.hideProdigy;
  var hideProdigyBtnsHtml =
    '<button class="btn btn-tiny' + (!hideProdigy ? ' active' : '') + '" onclick="actionSetCareerSetupHideProdigy(false)">Visible</button>' +
    '<button class="btn btn-tiny' + (hideProdigy ? ' active' : '') + '" onclick="actionSetCareerSetupHideProdigy(true)">Oculto</button>';
  // Plantilla inicial: botones como el resto de opciones (antes un
  // desplegable, a petición explícita: "haz que salga también con
  // botones para elegir, así").
  var squadMode = (choices.squadMode === 'random' || choices.squadMode === 'raimon') ? choices.squadMode : 'default';
  var squadModeBtnsHtml =
    '<button class="btn btn-tiny' + (squadMode === 'default' ? ' active' : '') + '" onclick="actionSetCareerSetupSquadMode(\'default\')">Por defecto</button>' +
    '<button class="btn btn-tiny' + (squadMode === 'random' ? ' active' : '') + '" onclick="actionSetCareerSetupSquadMode(\'random\')">Aleatoria</button>' +
    '<button class="btn btn-tiny' + (squadMode === 'raimon' ? ' active' : '') + '" onclick="actionSetCareerSetupSquadMode(\'raimon\')">Raimon</button>';
  var squadModeDesc = squadMode === 'random' ? '16 jugadores al azar, todos de 82 de nota o menos.'
    : squadMode === 'raimon' ? 'El once real de Inazuma Eleven 1, con Jude/Bobby/Erik de refuerzo en el banquillo.'
    : 'Los mismos 16 jugadores de siempre.';
  // Nombre/escudo de TU club, a petición explícita ("elige nombre de
  // club (cualquiera) y escudo de club entre los que hay desbloqueados"):
  // el escudo sale de los mismos que ya desbloqueas en la Máquina de
  // Premios (meta.unlockedShields, igual que "Equipar" en Mi Colección),
  // no una lista aparte -- + la opción de quedarte con el escudo por
  // defecto de siempre. El club real cuyo escudo elijas queda excluido
  // de los rivales de esta carrera (ver careerInitialDivisionTeams).
  var myShields = G.meta.unlockedShields || [];
  var clubShieldOptionsHtml =
    '<button class="shop-item" style="width:100%;text-align:left;border-color:' + (!choices.clubShieldName ? 'var(--accent-2)' : 'var(--border)') + '" onclick="actionSetCareerSetupClubShield(null)">' +
      '<img class="team-shield-inline" src="' + escapeHtml(PLAYER_SHIELD) + '" alt="">' +
      '<div style="flex:1"><strong>Escudo por defecto</strong></div>' +
      (!choices.clubShieldName ? '<span class="pill">Elegido</span>' : '') +
    '</button>' +
    myShields.map(function (name) {
      var selected = choices.clubShieldName === name;
      return '<button class="shop-item" style="width:100%;text-align:left;border-color:' + (selected ? 'var(--accent-2)' : 'var(--border)') + '" onclick="actionSetCareerSetupClubShield(\'' + escapeHtml(name).replace(/'/g, "\\'") + '\')">' +
        '<img class="team-shield-inline" src="' + escapeHtml(teamShieldPath(name)) + '" alt="">' +
        '<div style="flex:1"><strong>' + escapeHtml(name) + '</strong></div>' +
        (selected ? '<span class="pill">Elegido</span>' : '') +
      '</button>';
    }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionCancelCareerSetup()">Volver</button>' +
        '<h2 class="panel-title mt">Nueva partida, hueco ' + G.careerSetupSlot + '</h2>' +
        '<p class="dim small">Elige cómo quieres jugar esta carrera. No se puede cambiar después.</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Tu club</h3>' +
        '<label class="dim small">Nombre del club</label>' +
        '<input class="select-field" type="text" maxlength="24" data-focus-key="career-setup-clubname" placeholder="Tu Equipo" value="' + escapeHtml(choices.clubName || '') + '" oninput="actionSetCareerSetupClubName(this.value)">' +
        '<p class="dim small mt">Escudo' + (myShields.length ? '' : ' (aún no has desbloqueado ninguno, se usará el de por defecto)') + (myShields.length ? (choices.clubShieldName ? ': ' + escapeHtml(choices.clubShieldName) : ': por defecto') : '') + '</p>' +
        (myShields.length
          ? '<button class="btn btn-outline btn-block btn-tiny" onclick="actionToggleCareerSetupShields()">' + (choices.shieldsExpanded ? 'Ocultar ▲' : 'Elegir ▼') + '</button>'
          : '') +
        (choices.shieldsExpanded || !myShields.length ? clubShieldOptionsHtml : '') +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Jugadores Prodigio</h3>' +
        '<p class="dim small">Visible: se ve qué jugadores son Prodigio (nivel de crecimiento máximo) con su flecha especial. Oculto: se disfrazan como un jugador normal de crecimiento alto, no sabrás quién es Prodigio hasta ver cómo progresa.</p>' +
        '<div class="btn-row mt">' + hideProdigyBtnsHtml + '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Plantilla inicial</h3>' +
        '<p class="dim small">' + squadModeDesc + '</p>' +
        '<div class="btn-row mt">' + squadModeBtnsHtml + '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">División inicial</h3>' +
        '<p class="dim small">Segunda: empiezas desde abajo. Primera: arrancas ya en la máxima categoría, contra los mejores.</p>' +
        '<div class="btn-row mt">' +
          '<button class="btn btn-tiny' + ((choices.startDivision !== 1) ? ' active' : '') + '" onclick="actionSetCareerSetupStartDivision(2)">Segunda</button>' +
          '<button class="btn btn-tiny' + (choices.startDivision === 1 ? ' active' : '') + '" onclick="actionSetCareerSetupStartDivision(1)">Primera</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Estilo de directiva</h3>' +
        '<p class="dim small">Exigente: objetivo más alto y los resultados pesan más (para bien y para mal). Tranquila: más margen y menos castigo.</p>' +
        '<div class="btn-row mt">' +
          Object.keys(CAREER_BOARD_STYLES).map(function (id) {
            return '<button class="btn btn-tiny' + ((choices.boardStyle || 'normal') === id ? ' active' : '') + '" onclick="actionSetCareerSetupBoardStyle(\'' + id + '\')">' + CAREER_BOARD_STYLES[id].name + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Modo Ironman</h3>' +
        '<p class="dim small">Si te despiden, se borra este hueco de guardado -- no podrás recargar la partida desde antes del despido.</p>' +
        '<div class="btn-row mt">' +
          '<button class="btn btn-tiny' + (!choices.ironman ? ' active' : '') + '" onclick="actionSetCareerSetupIronman(false)">No</button>' +
          '<button class="btn btn-tiny' + (choices.ironman ? ' active' : '') + '" onclick="actionSetCareerSetupIronman(true)">Sí</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Actividad de mercado</h3>' +
        '<p class="dim small">Baja: llegan de ' + CAREER_MARKET_ACTIVITY.baja.offersMin + ' a ' + CAREER_MARKET_ACTIVITY.baja.offersMax + ' ofertas por tus jugadores al día, y puedes fichar hasta ' + CAREER_MARKET_ACTIVITY.baja.maxSignings + ' al día. Alta: de ' + CAREER_MARKET_ACTIVITY.alta.offersMin + ' a ' + CAREER_MARKET_ACTIVITY.alta.offersMax + ' ofertas, hasta ' + CAREER_MARKET_ACTIVITY.alta.maxSignings + ' fichajes al día.</p>' +
        '<div class="btn-row mt">' +
          Object.keys(CAREER_MARKET_ACTIVITY).map(function (id) {
            return '<button class="btn btn-tiny' + ((choices.marketActivity || 'baja') === id ? ' active' : '') + '" onclick="actionSetCareerSetupMarketActivity(\'' + id + '\')">' + CAREER_MARKET_ACTIVITY[id].name + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Temporadas de rivales</h3>' +
        '<p class="dim small">Qué temporadas/juegos pueden salir como equipos rivales (mínimo 1). Los equipos sin temporada conocida entran siempre igual.</p>' +
        '<div class="btn-row mt">' +
          TEAM_SEASON_ORDER.map(function (s) {
            var active = (choices.seasonFilter || TEAM_SEASON_ORDER).indexOf(s) !== -1;
            return '<button class="btn btn-tiny' + (active ? ' active' : '') + '" onclick="actionToggleCareerSetupSeason(\'' + s + '\')">' + TEAM_SEASON_LABELS[s] + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Frecuencia de lesiones</h3>' +
        '<p class="dim small">Un jugador lesionado se aparta del once una o varias jornadas, igual que uno expulsado.</p>' +
        '<div class="btn-row mt">' +
          CAREER_EVENT_FREQ_ORDER.map(function (f) {
            return '<button class="btn btn-tiny' + ((choices.injuryFreq || 'bajo') === f ? ' active' : '') + '" onclick="actionSetCareerSetupInjuryFreq(\'' + f + '\')">' + CAREER_EVENT_FREQ[f].name + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Frecuencia de rojas</h3>' +
        '<p class="dim small">El expulsado no puede jugar de titular hasta cumplir un partido de sanción.</p>' +
        '<div class="btn-row mt">' +
          CAREER_EVENT_FREQ_ORDER.map(function (f) {
            return '<button class="btn btn-tiny' + ((choices.redCardFreq || 'bajo') === f ? ' active' : '') + '" onclick="actionSetCareerSetupRedCardFreq(\'' + f + '\')">' + CAREER_EVENT_FREQ[f].name + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Mercado de invierno</h3>' +
        '<p class="dim small">Ventana de fichajes a mitad de temporada (jornada ' + CAREER_MIDSEASON_AT_MATCHDAY + '), aparte de la de pretemporada (que siempre está activa).</p>' +
        '<div class="btn-row mt">' +
          '<button class="btn btn-tiny' + (choices.winterMarket !== false ? ' active' : '') + '" onclick="actionSetCareerSetupWinterMarket(true)">Activado</button>' +
          '<button class="btn btn-tiny' + (choices.winterMarket === false ? ' active' : '') + '" onclick="actionSetCareerSetupWinterMarket(false)">Desactivado</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Dificultad</h3>' +
        '<p class="dim small">Cuánto se nivelan los rivales hacia arriba en Jornada y Copa (Fácil ' + CAREER_DIFFICULTY_TIERS.facil.rivalLevelTarget + ' · Normal ' + CAREER_DIFFICULTY_TIERS.normal.rivalLevelTarget + ' · Difícil ' + CAREER_DIFFICULTY_TIERS.dificil.rivalLevelTarget + ' · Muy difícil ' + CAREER_DIFFICULTY_TIERS.muy_dificil.rivalLevelTarget + ').</p>' +
        '<div class="btn-row mt">' + difficultyBtnsHtml + '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Dinero inicial</h3>' +
        '<div class="btn-row mt">' + budgetBtnsHtml + '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Negociaciones</h3>' +
        '<p class="dim small">Duras: cuesta más conseguir un descuento al fichar. Blandas: es más fácil regatear el precio.</p>' +
        '<div class="btn-row mt">' + negotiationBtnsHtml + '</div>' +
      '</div>' +
      '<div class="panel center-text">' +
        '<button class="btn btn-primary btn-block" onclick="actionConfirmCareerSetup()">Empezar carrera</button>' +
      '</div>' +
    '</div>'
  );
}
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
  // Marca de tiempo del último guardado, ver actionCareerBackToMenu -- si
  // se acaba de guardar, "Volver" no tiene por qué avisar de que se va a
  // perder nada.
  if (ok) G.careerLastSavedAt = Date.now();
  render();
};
// "Volver" de Modo Carrera, a petición explícita ("eso solo tiene que
// ser para el modo carrera y tienes que ver, si ha guardado en el
// último minuto no pongas nada"): el aviso de "vas a perder el
// progreso" solo tiene sentido aquí (una partida de Carrera de verdad
// se puede perder si no se guarda a mano) -- el resto de modos volvió a
// salir directo, sin confirmación (ver actionBackToMenu en state-nav.js,
// vuelto a su comportamiento de siempre). Y ni siquiera aquí hace falta
// preguntar si ya se guardó en el último minuto.
var CAREER_BACK_SKIP_CONFIRM_MS = 60000;
window.actionCareerBackToMenu = function () {
  if (G.careerLastSavedAt && (Date.now() - G.careerLastSavedAt) < CAREER_BACK_SKIP_CONFIRM_MS) { doBackToMenuNow(); return; }
  requestConfirmLeave('doBackToMenuNow');
};

function renderCareerSlots() {
  var rowsHtml = '';
  for (var i = 1; i <= CAREER_SLOT_COUNT; i++) {
    var summary = careerSlotSummary(i);
    var isActive = G.careerActiveSlot === i && G.career;
    rowsHtml += '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Hueco ' + i + (isActive ? ' · en curso' : '') + '</h3>' +
      (summary
        ? '<div class="btn-row" style="align-items:center;margin-top:2px">' +
            '<img class="team-shield-inline" src="' + escapeHtml(summary.clubShieldName ? teamShieldPath(summary.clubShieldName) : PLAYER_SHIELD) + '" alt="">' +
            '<strong>' + escapeHtml(summary.clubName) + '</strong>' +
          '</div>' +
          '<p class="dim small">Temporada ' + summary.season + ' · Jornada ' + summary.matchday + ' / ' + summary.totalMatchdays + ' · Presupuesto ' + summary.budget + ' M€ · ' + CAREER_DIFFICULTY_TIERS[summary.difficulty].name + '</p>' +
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
        '<button class="btn btn-outline btn-block" onclick="doBackToMenuNow()">Volver</button>' +
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
    var suspended = careerUnavailableIds(c);
    // Un sancionado por roja no se puede meter de titular -- a petición
    // explícita ("que haya que quitarlos del 11 inicial"). Se deja
    // seleccionado el otro (swapSelectedId ya apuntaba a él) para que se
    // note que el toque no ha hecho nada, en vez de fallar en silencio.
    if (lineupIdxA !== -1 && benchIdxB !== -1 && suspended.indexOf(id) !== -1) { render(); return; }
    if (lineupIdxB !== -1 && benchIdxA !== -1 && suspended.indexOf(otherId) !== -1) { c.swapSelectedId = null; render(); return; }
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
      return '<div class="' + cls + '" onclick="selectCareerPlayer(\'' + p.id + '\')">' + badge + careerPitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + careerAvatarHtml(c, p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + nameSuffix + '</span></div>';
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  var coach = coachById(c.coachId);
  var coachHtml = coach ? '<div class="pitch-coach" title="Entrenador: ' + escapeHtml(coach.nombre) + '">' + coachAvatarHtml(coach) + '<span class="pitch-player-name">' + escapeHtml(coach.nombre) + '</span></div>' : '';
  return '<div class="pitch pitch-11">' + rowsHtml + coachHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

// Mismo truco que futDraftElementCounts (FutDraft), pero sobre c.lineup
// -- cuántos titulares hay de cada tipo elemental, para la "Bonificación
// de atributo" de Mi equipo (careerScoreBreakdown ya usa este mismo
// umbral internamente para el synergyBonus, esto solo lo enseña en
// pantalla, a petición explícita: "añade lo de la bonificación de
// atributo en mi equipo").
function careerElementCounts(c) {
  var counts = {};
  TYPES.forEach(function (t) { counts[t] = 0; });
  c.lineup.forEach(function (slot) { counts[slot.player.tipo] = (counts[slot.player.tipo] || 0) + 1; });
  return counts;
}

// Menú de estilo físico e intensidad (solo aparece con rojas/lesiones
// activadas): cada desplegable actúa sobre su propio suceso.
function careerRiskPanelHtml(c) {
  var redOn = c.redCardFreq !== 'desactivado', injOn = c.injuryFreq !== 'desactivado';
  if (!redOn && !injOn) return '';
  function opts(map, current) {
    return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + map[k].name + '</option>'; }).join('');
  }
  return '<div class="panel">' +
    (redOn ? '<h3 style="margin-bottom:4px">Estilo físico</h3><p class="dim small">Brusco: mejor defensa, pero más tarjetas (amarillas y rojas). Leve: menos tarjetas, algo peor defensa.</p>' +
      '<select class="select-field" onchange="actionSetCareerFoulStyle(this.value)">' + opts(CAREER_FOUL_STYLES, c.foulStyle || 'medio') + '</select>' : '') +
    (injOn ? '<h3 style="margin:' + (redOn ? '12px' : '0') + ' 0 4px">Intensidad</h3><p class="dim small">Alta: más ataque y algo más de defensa, pero más lesiones. Baja: menos lesiones, algo menos de rendimiento.</p>' +
      '<select class="select-field" onchange="actionSetCareerIntensity(this.value)">' + opts(CAREER_INTENSITIES, c.intensity || 'media') + '</select>' : '') +
  '</div>';
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
  var suspendedIds = c.suspendedIds || [];
  var injuries = c.injuries || [];
  var benchHtml = c.bench.map(function (p) {
    var suspended = suspendedIds.indexOf(p.id) !== -1;
    var injury = injuries.find(function (inj) { return inj.id === p.id; });
    var tag = suspended ? ' 🚫' : (injury ? ' 🤕 (' + injury.matchesLeft + ')' : '');
    var cls = 'pitch-player futdraft-swappable' + (c.swapSelectedId === p.id ? ' selected' : '');
    return '<div class="' + cls + '" onclick="selectCareerPlayer(\'' + p.id + '\')">' + careerPitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + careerAvatarHtml(c, p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + tag + '</span></div>';
  }).join('');
  var formationOptionsHtml = FUTDRAFT_FORMATIONS.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === c.formation ? ' selected' : '') + '>' + f.name + '</option>';
  }).join('');
  var styleOptionsHtml = CAREER_PLAY_STYLES.map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === careerPlayStyle(c).id ? ' selected' : '') + '>' + s.name + '</option>';
  }).join('');
  var elementCounts = careerElementCounts(c);
  var elementCountsHtml = TYPES.map(function (t) {
    return '<span class="type-badge type-' + t.toLowerCase().replace('ñ', 'n') + '" style="margin:2px">' +
      'Bonificación atributo ' + getTypeSymbol(t) + ' ' + elementCounts[t] + '/' + FUTDRAFT_SYNERGY_THRESHOLD +
    '</span>';
  }).join(' ');
  return (
    '<div class="panel center-text">' +
      '<p class="dim small">Puntuación de equipo: <strong style="color:var(--accent-2)">' + breakdown.total + '</strong> / 100</p>' +
      '<p class="dim small">' + captainHint + '</p>' +
      '<button class="btn btn-tiny' + (c.pickingCaptain ? ' active' : '') + '" onclick="toggleCareerCaptainMode()">' + (c.pickingCaptain ? 'Toca un titular…' : 'Elegir capitán 👑') + '</button>' +
    '</div>' +
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Formación</h3>' +
      '<select class="select-field" onchange="setCareerFormation(this.value)">' + formationOptionsHtml + '</select>' +
    '</div>' +

    '<div class="panel">' + renderCareerLineupPitch(c) + '</div>' +
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Banquillo</h3>' +
      '<div class="pitch-row" style="justify-content:center">' + benchHtml + '</div>' +
    '</div>' +
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:8px">Bonificación de atributo (once titular)</h3>' +
      '<div>' + elementCountsHtml + '</div>' +
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

// Mismo patrón que careerPositionFilterBtnsHtml pero por afinidad
// elemental (TYPES: Fuego/Bosque/Viento/Montaña), con el símbolo de cada
// tipo (getTypeSymbol) en vez del icono de posición -- a petición
// explícita, para Mercado.
function careerTypeFilterBtnsHtml(filter, actionName) {
  return [null].concat(TYPES).map(function (tipo) {
    var active = filter === tipo;
    var arg = tipo ? "'" + tipo + "'" : 'null';
    var label = tipo ? getTypeSymbol(tipo) : 'Todos';
    return '<button class="btn btn-tiny' + (active ? ' active' : '') + '" onclick="' + actionName + '(' + arg + ')" title="' + (tipo || 'Todos') + '">' + label + '</button>';
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
// El mínimo de 14 es de jugadores TUYOS -- los cedidos entrantes no
// cuentan (se van solos al acabar la temporada, ver actionStartNewCareerSeason,
// así que no puedes depender de ellos para llegar al mínimo), a petición
// explícita. Se usa en vez de "c.lineup.length + c.bench.length" en todos
// los sitios que bloquean vender/ceder/aceptar una oferta por debajo del
// mínimo.
function careerOwnedSquadCount(c) {
  return c.lineup.length + c.bench.length - careerLoanCount(c);
}

// Venta rápida: se cobra al momento, pero por debajo del valor de
// mercado (85% -- "un poco menos", a petición explícita), ya que es una
// venta inmediata y no una negociación de verdad como al fichar (ver
// careerNegotiationAccepts). No hay forma de vender AL valor completo en
// esta pantalla -- para eso habría que negociar con alguien, y de
// momento (la base) solo se negocia para fichar, no para vender.
var CAREER_QUICK_SELL_FACTOR = 0.85;
window.actionSellCareerPlayer = function (id) {
  var c = G.career;
  if ((c.loanedIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes vender a un jugador cedido, no es tuyo. Puedes devolverlo cuando quieras.'; render(); return; }
  if ((c.boughtThisSeasonIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes vender a un jugador fichado esta temporada. Espera a la que viene.'; render(); return; }
  if (careerOwnedSquadCount(c) <= CAREER_MIN_SQUAD_SIZE) { c.plantillaMessage = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores tuyos en plantilla (los cedidos no cuentan).'; render(); return; }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var p = all.find(function (x) { return x.id === id; });
  if (!p) return;
  var payout = Math.round(careerPlayerValue(p) * CAREER_QUICK_SELL_FACTOR * 10) / 10;
  careerRemoveFromSquad(c, id);
  c.budget = Math.round((c.budget + payout) * 10) / 10;
  c.plantillaMessage = 'Venta rápida: ' + p.nombre + ' por ' + payout + ' M€ (algo por debajo de su valor de mercado).';
  render();
};

// Cesión (de salida): el jugador se va a un equipo rival cualquiera, sin
// cobrar nada (a diferencia de vender) -- SIGUE SIENDO TUYO mientras
// dura la cesión: no se puede volver a fichar en Mercado (ni por ti
// mismo ni por nadie más, ver c.loanedOutIds en el filtro de
// renderCareerMercado) y vuelve solo a tu plantilla (al banquillo) al
// empezar la temporada que viene (actionStartNewCareerSeason), igual
// que un cedido ENTRANTE se devuelve a SU club -- antes esto no se
// rastreaba (el jugador simplemente desaparecía para siempre y
// reaparecía fichable en Mercado como si no fuera tuyo), dos bugs
// corregidos a petición explícita ("cuanto cedo a un jugador, el
// jugador se devuelve a mi equipo al acabar esa temporada... si yo cedo
// a un jugador, aparece para fichar en el mercado... eso no tiene
// sentido, lo he cedido, me sigue perteneciendo"). No confundir con
// fichar cedido (entrante, ver actionStartCareerNegotiation con mode
// 'loan') -- esto es lo contrario.
// Cesiones de salida ahora sí cobran un fee (antes eran gratis, "sin
// cobrar nada") -- a petición explícita, idea de "cobrar un fee de cesión"
// para meter más formas de ganar dinero. Un porcentaje pequeño del valor
// del jugador, nada comparable a venderlo (que sigue siendo la opción
// grande), ya que el jugador vuelve solo al año que viene.
var CAREER_LOAN_OUT_FEE_RATE = 0.05;
window.actionLoanCareerPlayer = function (id) {
  var c = G.career;
  if ((c.loanedIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes ceder a un jugador que ya tienes cedido, no es tuyo. Puedes devolverlo cuando quieras.'; render(); return; }
  if ((c.boughtThisSeasonIds || []).indexOf(id) !== -1) { c.plantillaMessage = 'No puedes ceder a un jugador fichado esta temporada. Espera a la que viene.'; render(); return; }
  if (careerOwnedSquadCount(c) <= CAREER_MIN_SQUAD_SIZE) { c.plantillaMessage = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores tuyos en plantilla (los cedidos no cuentan).'; render(); return; }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var p = all.find(function (x) { return x.id === id; });
  if (!p) return;
  var destTeam = choice(Math.random() < 0.4 ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES);
  var loanFee = Math.max(0.1, Math.round(careerPlayerValue(p) * CAREER_LOAN_OUT_FEE_RATE * 10) / 10);
  careerRemoveFromSquad(c, id);
  c.loanedOutIds = c.loanedOutIds || [];
  c.loanedOutIds.push(id);
  c.budget = Math.round((c.budget + loanFee) * 10) / 10;
  c.plantillaMessage = 'Cedido ' + p.nombre + ' a ' + destTeam + '. Cobras un fee de cesión de ' + loanFee + ' M€.';
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

window.actionSetCareerPlayStyle = function (id) {
  var c = G.career;
  if (!CAREER_PLAY_STYLES.some(function (s) { return s.id === id; })) return;
  c.playStyle = id;
  render();
};
// ===== Potenciar jugadores =====
// A petición explícita: cuando un jugador llega a 100 de media, se le puede
// dar +5 por 20 M€ (máximo 5 jugadores potenciados en toda la carrera), y
// se le nota con un aura dorada alrededor del círculo. Se guarda en
// c.boostedIds y el +5 va a su progresión (c.playerProgression), así que
// cuenta en todo igual que lo que sube por entrenamiento.
var CAREER_BOOST_COST = 20;
var CAREER_BOOST_MIN_SCORE = 100;
var CAREER_BOOST_MAX_PLAYERS = 5;
var CAREER_BOOST_AMOUNT = 5;
function careerIsBoosted(c, p) { return (c.boostedIds || []).indexOf(p.id) !== -1; }
function careerAvatarHtml(c, p) { return avatarHtml(p, careerIsBoosted(c, p) ? 'avatar-boosted' : ''); }
function boostTagHtml(c, p) { return careerIsBoosted(c, p) ? ' <span class="player-tag player-tag-new" title="Potenciado +' + CAREER_BOOST_AMOUNT + '">⚡ +' + CAREER_BOOST_AMOUNT + '</span>' : ''; }
window.actionBoostCareerPlayer = function (id) {
  var c = G.career;
  c.boostedIds = c.boostedIds || [];
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var p = all.find(function (x) { return x.id === id; });
  if (!p || careerIsBoosted(c, p)) return;
  if (c.boostedIds.length >= CAREER_BOOST_MAX_PLAYERS) { c.plantillaMessage = 'Ya has potenciado a ' + CAREER_BOOST_MAX_PLAYERS + ' jugadores, el máximo.'; render(); return; }
  if (careerPlayerScore(p) < CAREER_BOOST_MIN_SCORE) { c.plantillaMessage = p.nombre + ' aún no llega a ' + CAREER_BOOST_MIN_SCORE + ' de media.'; render(); return; }
  if (c.budget < CAREER_BOOST_COST) { c.plantillaMessage = 'No tienes ' + CAREER_BOOST_COST + ' M€ para potenciarlo.'; render(); return; }
  c.budget = Math.round((c.budget - CAREER_BOOST_COST) * 10) / 10;
  c.playerProgression = c.playerProgression || {};
  c.playerProgression[p.id] = (c.playerProgression[p.id] || 0) + CAREER_BOOST_AMOUNT;
  c.boostedIds.push(p.id);
  c.plantillaMessage = p.nombre + ' potenciado: +' + CAREER_BOOST_AMOUNT + ' de media.';
  render();
};
function careerBoostPanelHtml(c) {
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var used = (c.boostedIds || []).length;
  var eligible = all.filter(function (p) { return !careerIsBoosted(c, p) && careerPlayerScore(p) >= CAREER_BOOST_MIN_SCORE; });
  var rows = eligible.map(function (p) {
    return '<div class="futdraft-timeline-row">' + careerAvatarHtml(c, p) + '<span>' + escapeHtml(p.nombre) + ' <span class="dim">' + Math.round(careerPlayerScore(p)) + '</span></span>' +
      '<button class="btn btn-tiny" style="margin-left:auto" ' + (used >= CAREER_BOOST_MAX_PLAYERS || c.budget < CAREER_BOOST_COST ? 'disabled' : '') + ' onclick="actionBoostCareerPlayer(\'' + p.id + '\')">+' + CAREER_BOOST_AMOUNT + ' por ' + CAREER_BOOST_COST + ' M€</button></div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:4px">Potenciar</h3>' +
    '<p class="dim small">Jugadores con ' + CAREER_BOOST_MIN_SCORE + ' o más de media: +' + CAREER_BOOST_AMOUNT + ' por ' + CAREER_BOOST_COST + ' M€. Potenciados: <strong>' + used + ' / ' + CAREER_BOOST_MAX_PLAYERS + '</strong>.</p>' +
    (rows ? '<div class="futdraft-timeline mt">' + rows + '</div>' : '<p class="dim small center-text">Nadie llega aún a ' + CAREER_BOOST_MIN_SCORE + '.</p>') + '</div>';
}
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
  var canRemove = careerOwnedSquadCount(c) > CAREER_MIN_SQUAD_SIZE;
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
    return '<div class="futdraft-timeline-row">' + careerMediaBadgeHtml(p) + careerAvatarHtml(c, p) +
      '<span>' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + ' ' + careerGrowthArrowHtml(careerPlayerGrowthTier(c, p), c.hideProdigy) + tagsHtml + boostTagHtml(c, p) + '</span>' +
      '<strong style="margin-left:auto;white-space:nowrap;color:var(--accent-2)">' + careerPlayerValue(p) + ' M€</strong>' +
      actionsHtml +
    '</div>';
  }).join('');
  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Gestionar plantilla</h3>' +
      '<p class="dim small">Valor total de la plantilla: <strong style="color:var(--accent-2)">' + total + ' M€</strong>. Presupuesto disponible: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong>. Cedidos: ' + loanedIds.length + ' / ' + CAREER_MAX_LOANS_IN + '.</p>' +
      (c.plantillaMessage ? '<p class="dim small">' + escapeHtml(c.plantillaMessage) + '</p>' : '') +
      '<input class="select-field" type="text" placeholder="Buscar por nombre…" data-focus-key="career-plantilla-search" value="' + escapeHtml(c.plantillaSearch || '') + '" oninput="actionSetCareerPlantillaSearch(this.value)">' +
      '<div class="btn-row mt">' + filterBtnsHtml + '</div>' +
      '<div class="btn-row mt" style="align-items:center">' +
        '<select class="select-field" style="width:auto;min-height:36px;padding:6px 10px" onchange="actionSetCareerPlantillaSort(this.value)">' + sortOptionsHtml + '</select>' +
        '<button class="btn btn-tiny" onclick="actionToggleCareerPlantillaSortDir()">' + (sortDir === -1 ? '⬇ Mayor a menor' : '⬆ Menor a mayor') + '</button>' +
      '</div>' +
      '<div class="futdraft-timeline mt">' + (rowsHtml || '<p class="dim small center-text">Nadie con ese filtro.</p>') + '</div>' +
    '</div>' + careerBoostPanelHtml(c)
  );
}

// ===== Entrenamiento =====
// Centro de entrenamiento (mejora los parámetros de careerProgressAllPlayers
// para TODO ROSTER, ver arriba), desde construirlo (nivel 0→1) hasta el
// máximo -- a petición explícita: "veas la progresión del jugador,
// cuánto ha subido, cuánto debería subir... y puedas gastarte dinero
// para mejorar las instalaciones". La subida rápida manual por jugador
// que había aquí se quitó del todo, a petición explícita ("subir uno de
// media a un jugador en especial no se pueda, eso desactivado, quítalo").
// No se puede mejorar/construir el último día de la temporada (cuando ya
// se ha dado la recompensa final de Liga), a petición explícita: "que no
// puedas mejorar el entrenamiento el último día de la temporada, justo
// cuando te dan la recompensa final, cierra tu entrenamiento" -- evita
// mejorar el centro "de gratis" justo antes de que la progresión de fin
// de temporada (careerProgressAllPlayers, en actionStartNewCareerSeason)
// ya vaya a usar ese nivel más alto sin haber tenido que currárselo
// durante la temporada.
function careerTrainingLocked(c) { return c.league.matchdayIndex >= c.league.schedule.length; }
window.actionUpgradeTrainingCenter = function () {
  var c = G.career;
  if (careerTrainingLocked(c)) return;
  var level = typeof c.trainingLevel === 'number' ? c.trainingLevel : 0;
  if (level >= CAREER_TRAINING_MAX_LEVEL) return;
  var cost = CAREER_TRAINING_LEVEL_COSTS[level];
  if (c.budget < cost) { c.trainingMessage = 'No tienes presupuesto para ' + (level === 0 ? 'construir' : 'mejorar') + ' el centro de entrenamiento (' + cost + ' M€).'; render(); return; }
  c.budget = Math.round((c.budget - cost) * 10) / 10;
  c.trainingLevel = level + 1;
  c.trainingMessage = level === 0 ? 'Centro de entrenamiento construido.' : ('Centro de entrenamiento mejorado a nivel ' + c.trainingLevel + '.');
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
// Estrellas de nivel del centro de entrenamiento (llenas = nivel actual,
// de CAREER_TRAINING_MAX_LEVEL) y de valoración por jugador (media 0-99
// repartida en 5 estrellas) -- a petición explícita ("entrenamiento
// tiene que verse mejor, algo así", con una captura de referencia de
// nivel en estrellas + valoración en estrellas por jugador). Puramente
// decorativas, el número real sigue siendo el nivel/la media de siempre.
function careerStarsHtml(filled, total, cls) {
  var html = '';
  for (var i = 1; i <= total; i++) html += '<span class="' + cls + (i <= filled ? ' filled' : '') + '">★</span>';
  return '<span class="career-stars">' + html + '</span>';
}
function careerPlayerStarRatingHtml(score) {
  var filled = clamp(Math.round((score / 99) * 5), 0, 5);
  return careerStarsHtml(filled, 5, 'career-star-sm');
}
function renderCareerEntrenamiento(c) {
  var level = typeof c.trainingLevel === 'number' ? c.trainingLevel : 0;
  var maxed = level >= CAREER_TRAINING_MAX_LEVEL;
  var nextCost = maxed ? null : CAREER_TRAINING_LEVEL_COSTS[level];
  var locked = careerTrainingLocked(c);
  var headerHtml =
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Nivel de Entrenamiento</h3>' +
      '<div class="career-training-level-row">' +
        careerStarsHtml(level, CAREER_TRAINING_MAX_LEVEL, 'career-star-lg') +
        '<span class="career-training-level-num">' + level + '/' + CAREER_TRAINING_MAX_LEVEL + '</span>' +
      '</div>' +
      (c.trainingMessage ? '<p class="dim small">' + escapeHtml(c.trainingMessage) + '</p>' : '') +
      (locked
        ? '<p class="dim small">Entrenamiento cerrado hasta la próxima temporada.</p>'
        : (maxed
          ? '<p class="dim small">Centro al máximo.</p>'
          : '<button class="btn btn-primary btn-block mt" ' + (c.budget < nextCost ? 'disabled' : '') + ' onclick="actionUpgradeTrainingCenter()">' + (level === 0 ? 'Construir' : 'Mejorar') + ' · ' + nextCost + ' M€</button>')) +
    '</div>';
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var rowsHtml = all.map(function (p) {
    var currentScore = careerPlayerScore(p);
    var lastDelta = (c.lastPlayerProgressionDelta || {})[p.id];
    var potential = careerPlayerPotentialRange(c, p);
    var starts = (c.seasonAppearances || {})[p.id] || 0;
    var totalMatchdays = (c.league && c.league.schedule && c.league.schedule.length) || 0;
    return '<div class="career-offer-card">' +
      '<div class="career-offer-head">' + avatarHtml(p) +
        '<span class="career-offer-name">' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + '</span>' +
        '<span style="margin-left:auto" title="' + escapeHtml(p.tipo) + '">' + getTypeSymbol(p.tipo).replace(/22px/g, '18px') + '</span>' +
      '</div>' +
      '<div class="career-training-valoracion">' + careerPlayerStarRatingHtml(currentScore) + '<span class="dim small">' + Math.round(currentScore) + '</span>' +
        '<span class="dim small" style="margin-left:auto">Crecimiento: ' + careerGrowthArrowHtml(careerPlayerGrowthTier(c, p), c.hideProdigy) + ' ' + careerGrowthLabel(c, p) + '</span>' +
      '</div>' +
      '<div class="career-offer-prices">' +
        '<span class="dim">Progresión temporada pasada: ' + careerDeltaHtml(lastDelta) + '</span>' +
        '<span class="dim">Potencial próxima temporada: <strong>' + (potential.low === potential.high ? potential.low : (potential.low + '-' + potential.high)) + '</strong></span>' +
      '</div>' +
      (totalMatchdays
        ? '<p class="dim small" style="margin-top:4px">Titular esta temporada: <strong>' + starts + ' de ' + totalMatchdays + '</strong></p>'
        : '') +
    '</div>';
  }).join('');
  return headerHtml + '<div class="panel">' + rowsHtml + '</div>' + renderCareerAcademia(c);
}

// ===== Cantera / Academia =====
// Alternativa a fichar siempre en el Mercado, a petición explícita
// ("promocionar jóvenes desde una academia propia en vez de fichar
// siempre del mercado"). Construyes/mejoras una academia (mismo patrón
// de niveles pero más barata que el centro de entrenamiento, a petición
// explícita: "tiene que valer menos mejorar la cantera") y cada
// temporada te da unos cuantos candidatos gratis -- jugadores del ROSTER
// que todavía no tienes (ni en plantilla ni cedidos fuera), con
// crecimiento Alto/Muy alto/Prodigio (careerPlayerGrowthTier >= 4) y
// nota igual o por debajo de la media actual de tu equipo (a petición
// explícita: "tienen que tener como máximo la media actual del equipo o
// menos") -- son canteranos de verdad, no cracks gratis para saltarte el
// Mercado. El número de candidatos por temporada es el propio nivel de
// la academia (nivel 3 = 3 candidatos).
var CAREER_ACADEMY_MAX_LEVEL = 5;
var CAREER_ACADEMY_LEVEL_COSTS = [1, 3, 5, 8, 12];
function careerAcademyLevel(c) { return typeof c.academyLevel === 'number' ? c.academyLevel : 0; }
// Aunque no se haya construido todavía (nivel 0), siempre hay como
// mínimo 1 candidato esperando para la temporada que viene, a petición
// explícita ("por defecto ya viene un jugador ahí para la siguiente
// temporada") -- construir/mejorar la academia sube ese mínimo.
function careerAcademyEligiblePool(c, exclude) {
  var teamAvg = careerTeamAvgScore(c);
  var owned = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; })).concat(c.loanedOutIds || []).concat(exclude || []);
  return ROSTER.filter(function (p) { return owned.indexOf(p.id) === -1 && careerPlayerGrowthTier(c, p) >= 4 && careerPlayerScore(p) <= teamAvg; });
}
function careerGenerateAcademyCandidates(c) {
  var count = Math.max(careerAcademyLevel(c), 1);
  var pool = careerAcademyEligiblePool(c).sort(function () { return Math.random() - 0.5; });
  return pool.slice(0, count).map(function (p) { return p.id; });
}
// Al mejorar la academia a mitad de temporada, los candidatos que ya
// había se quedan tal cual -- solo se añade UNO nuevo (a petición
// explícita: "al mejorar la cantera no cambies los jugadores que ya
// tenías, añade uno nuevo y ya está"), sin repetir a nadie que ya
// estuviera en la lista.
function careerAddOneAcademyCandidate(c) {
  c.academyCandidates = c.academyCandidates || [];
  var pool = careerAcademyEligiblePool(c, c.academyCandidates).sort(function () { return Math.random() - 0.5; });
  if (pool.length) c.academyCandidates.push(pool[0].id);
}
window.actionUpgradeAcademy = function () {
  var c = G.career;
  if (careerTrainingLocked(c)) return;
  var level = careerAcademyLevel(c);
  if (level >= CAREER_ACADEMY_MAX_LEVEL) return;
  var cost = CAREER_ACADEMY_LEVEL_COSTS[level];
  if (c.budget < cost) { c.academyMessage = 'No tienes presupuesto para ' + (level === 0 ? 'construir' : 'mejorar') + ' la academia (' + cost + ' M€).'; render(); return; }
  c.budget = Math.round((c.budget - cost) * 10) / 10;
  c.academyLevel = level + 1;
  c.academyMessage = level === 0 ? 'Academia construida.' : ('Academia mejorada a nivel ' + c.academyLevel + '.');
  careerAddOneAcademyCandidate(c);
  render();
};
window.actionPromoteAcademyPlayer = function (id) {
  var c = G.career;
  var candidates = c.academyCandidates || [];
  if (candidates.indexOf(id) === -1) return;
  if ((c.lineup.length + c.bench.length) >= CAREER_MAX_SQUAD_SIZE) { c.academyMessage = 'Plantilla al máximo (' + CAREER_MAX_SQUAD_SIZE + '). Vende o cede a alguien antes de promocionar.'; render(); return; }
  var p = ROSTER.find(function (x) { return x.id === id; });
  if (!p) return;
  c.bench.push(p);
  c.academyCandidates = candidates.filter(function (x) { return x !== id; });
  // Se recuerda qué jugadores llegaron por la cantera (para el objetivo
  // de directiva "usa jugadores de cantera", ver careerBoardObjectiveMet).
  c.academyPromotedIds = c.academyPromotedIds || [];
  c.academyPromotedIds.push(id);
  c.academyMessage = 'Promocionado desde la cantera: ' + p.nombre + '.';
  render();
};
// Cantera con más cuidado estético, a petición explícita ("pon mucho más
// estético y bonito lo de la cantera en el entrenamiento"): cabecera
// tipo tarjeta con icono grande (mismo lenguaje visual que .sponsor-card,
// pero en verde/crecimiento en vez de dorado) y una tarjeta con retrato
// real por candidato (avatarHtml, elemento, posición, flecha de
// crecimiento y estrellas de valoración) en vez de la fila de texto
// plano de antes.
function renderCareerAcademia(c) {
  var level = careerAcademyLevel(c);
  var maxed = level >= CAREER_ACADEMY_MAX_LEVEL;
  var nextCost = maxed ? null : CAREER_ACADEMY_LEVEL_COSTS[level];
  var locked = careerTrainingLocked(c);
  var candidates = (c.academyCandidates || []).map(function (id) { return ROSTER.find(function (x) { return x.id === id; }); }).filter(Boolean);
  var headerHtml =
    '<div class="academy-card">' +
      '<div class="academy-card-head">' +
        '<span class="academy-card-icon">🌱</span>' +
        '<div>' +
          '<div class="academy-card-title">Cantera</div>' +
          '<p class="dim small" style="margin:2px 0 0">Cada temporada regala candidatos para tu banquillo, según el nivel.</p>' +
        '</div>' +
      '</div>' +
      '<div class="career-training-level-row">' +
        careerStarsHtml(level, CAREER_ACADEMY_MAX_LEVEL, 'career-star-lg') +
        '<span class="career-training-level-num">' + level + '/' + CAREER_ACADEMY_MAX_LEVEL + '</span>' +
      '</div>' +
      (c.academyMessage ? '<p class="dim small">' + escapeHtml(c.academyMessage) + '</p>' : '') +
      (locked
        ? '<p class="dim small">Cerrada hasta la próxima temporada.</p>'
        : (maxed
          ? '<p class="dim small">Academia al máximo.</p>'
          : '<button class="btn btn-primary btn-block mt" ' + (c.budget < nextCost ? 'disabled' : '') + ' onclick="actionUpgradeAcademy()">' + (level === 0 ? '🏗️ Construir' : '⬆️ Mejorar') + ' · ' + nextCost + ' M€</button>')) +
    '</div>';
  var candidatesHtml = candidates.length
    ? '<div class="academy-candidates-grid">' + candidates.map(function (p) {
        var score = careerPlayerScore(p);
        return '<div class="academy-candidate-card">' +
          '<div class="academy-candidate-free">GRATIS</div>' +
          '<div class="academy-candidate-head">' + avatarHtml(p) +
            '<div class="academy-candidate-name-wrap">' +
              '<span class="academy-candidate-name">' + escapeHtml(p.nombre) + '</span>' +
              '<span class="dim small">' + positionIconHtml(p.posicion, 14) + ' ' + escapeHtml(p.posicion) + ' · ' + getTypeSymbol(p.tipo) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="academy-candidate-stats">' +
            careerPlayerStarRatingHtml(score) + '<span class="dim small">' + Math.round(score) + '</span>' +
            '<span style="margin-left:auto">' + careerGrowthArrowHtml(careerPlayerGrowthTier(c, p), c.hideProdigy) + ' ' + careerGrowthLabel(c, p) + '</span>' +
          '</div>' +
          '<button class="btn btn-primary btn-block mt" onclick="actionPromoteAcademyPlayer(\'' + p.id + '\')">Promocionar</button>' +
        '</div>';
      }).join('') + '</div>'
    : '<p class="dim small center-text">Sin candidatos este año, vuelve a mirar la próxima temporada.</p>';
  return headerHtml + candidatesHtml;
}

window.actionSetCareerMarketFilter = function (pos) {
  G.career.marketFilter = pos;
  G.career.marketPage = 0;
  render();
};
window.actionSetCareerMarketTypeFilter = function (tipo) {
  G.career.marketTypeFilter = tipo;
  G.career.marketPage = 0;
  render();
};
window.actionSetCareerMarketSearch = function (value) {
  G.career.marketSearch = value;
  G.career.marketPage = 0;
  render();
};
// Filtro de precio (min/max en M€), a petición explícita ("añade filtro de
// precio... para filtrar por un precio en concreto"). Dos campos numéricos,
// igual que la búsqueda por nombre -- vacío = sin límite en ese lado.
window.actionSetCareerMarketPriceMin = function (value) {
  var n = parseFloat(value);
  G.career.marketPriceMin = (value === '' || !isFinite(n)) ? null : Math.max(0, n);
  G.career.marketPage = 0;
  render();
};
window.actionSetCareerMarketPriceMax = function (value) {
  var n = parseFloat(value);
  G.career.marketPriceMax = (value === '' || !isFinite(n)) ? null : Math.max(0, n);
  G.career.marketPage = 0;
  render();
};
window.actionClearCareerMarketPriceFilter = function () {
  G.career.marketPriceMin = null;
  G.career.marketPriceMax = null;
  G.career.marketPage = 0;
  render();
};
// Filtro por crecimiento (1-5, ver careerPlayerGrowthTier) en vez del
// antiguo "Podrían unirse" -- a petición explícita ("quita el filtro de
// podrían unirse en el mercado, añade un filtro de crecimiento también").
window.actionSetCareerMarketGrowthFilter = function (tier) {
  G.career.marketGrowthFilter = tier;
  G.career.marketPage = 0;
  render();
};
// Mismo patrón que careerPositionFilterBtnsHtml/careerTypeFilterBtnsHtml,
// con la flecha de color de cada nivel (careerGrowthArrowHtml) en vez de
// un icono.
function careerGrowthFilterBtnsHtml(filter, actionName, hideProdigy) {
  var tiers = hideProdigy ? [null, 1, 2, 3, 4, 5] : [null, 1, 2, 3, 4, 5, 6];
  return tiers.map(function (tier) {
    var active = filter === tier;
    var arg = tier === null ? 'null' : tier;
    var label = tier === null ? 'Todos' : careerGrowthArrowHtml(tier);
    var title = tier === null ? 'Todos' : CAREER_GROWTH_TIER_LABELS[tier];
    return '<button class="btn btn-tiny' + (active ? ' active' : '') + '" onclick="' + actionName + '(' + arg + ')" title="' + title + '">' + label + '</button>';
  }).join('');
}

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
// 1) Dinero: si ofreces igual o más que su valor de mercado, seguro; por
//    debajo, la probabilidad cae con la proporción elevada a
//    CAREER_NEGOTIATION_MONEY_EXPONENT -- antes era un cubo (exponente 3),
//    demasiado blando: un jugador de 14.4M se podía llevar por 11.5M (20%
//    de descuento, ratio 0.8) más de la mitad de las veces (0.8^3 ≈ 51%),
//    "un poco falso" a petición explícita. Con exponente 8, ese mismo
//    0.8 baja a ≈17% -- un descuento pequeño (5%, ratio 0.95) sigue
//    siendo bastante probable (≈66%), pero uno grande ya es raro de
//    verdad, no la norma.
// 2) Prestigio: un jugador bastante mejor que la media de tu plantilla
//    no quiere bajar de nivel aunque pagues su precio -- a petición
//    explícita ("si la media del equipo es 70 e intentas fichar a uno
//    de 81/82, igual no quiere"). Cada punto por encima de tu media
//    resta un 8% de ganas, con un suelo del 5% (nunca es del todo
//    imposible, pero muy raro).
// El exponente depende de si elegiste negociaciones "duras" (8, el de
// arriba) o "blandas" (3, el original) al crear la carrera --
// c.negotiation, ver CAREER_NEGOTIATION_MODES/renderCareerSetup.
var CAREER_NEGOTIATION_MONEY_EXPONENT = 8;
// A partir de CAREER_INTERESTED_GAP (6) puntos por encima de tu media,
// a petición explícita ("que cuando vas a iniciar la negociación...
// diga: es probable que no se quiera unir a tu equipo. Realmente tienes
// un 5% de fichar a este tipo de gente, y siempre ofreciendo el dinero
// que valen o más"): 5% FIJO de ficharlo, pase lo que pase con el
// dinero -- ni siquiera pagar de más lo sube, a diferencia del resto de
// jugadores (fórmula normal de dinero+prestigio, sin cambios).
var CAREER_ELITE_SIGN_CHANCE = 0.05;
function careerNegotiationAccepts(offer, value, playerScore, teamAvgScore) {
  var gap = playerScore - teamAvgScore;
  if (gap > CAREER_INTERESTED_GAP) return Math.random() < CAREER_ELITE_SIGN_CHANCE;
  var c = G.career;
  var mode = c && CAREER_NEGOTIATION_MODES[c.negotiation];
  var exponent = mode ? mode.moneyExponent : CAREER_NEGOTIATION_MONEY_EXPONENT;
  var moneyFactor = offer >= value ? 1 : Math.pow(offer / value, exponent);
  var prestigeFactor = clamp(1 - Math.max(0, gap) * 0.08, 0.05, 1);
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
// BUG real encontrado tras el aviso de un usuario ("cuando cedes a un
// jugador tuyo... en realidad lo estás vendiendo y no lo recuperas al
// final de la temporada"): esto NO reproducía tocando "Ceder" en
// Gestionar plantilla (ya probado a fondo, con clic real + guardado +
// recarga + temporada completa) -- el fallo estaba aquí, en aceptar una
// OFERTA ENTRANTE de cesión (careerGenerateIncomingOffers, 25% de las
// ofertas de rivales por tus jugadores son 'loan' en vez de 'buy').
// careerResolveIncomingOffer trataba las dos igual (careerRemoveFromSquad
// + dinero, sin más), así que una cesión aceptada por Mercado se
// comportaba exactamente como una venta: el jugador desaparecía para
// siempre, nunca se apuntaba en c.loanedOutIds y por tanto nunca volvía
// en actionStartNewCareerSeason. Ahora si la oferta es de cesión, se
// apunta igual que si hubieras pulsado "Ceder" tú mismo.
function careerResolveIncomingOffer(c, offer, amount) {
  careerRemoveFromSquad(c, offer.playerId);
  if (offer.mode === 'loan') {
    c.loanedOutIds = c.loanedOutIds || [];
    c.loanedOutIds.push(offer.playerId);
  }
  c.budget = Math.round((c.budget + amount) * 10) / 10;
  c.incomingOffers = (c.incomingOffers || []).filter(function (o) { return o.id !== offer.id; });
}
window.actionAcceptIncomingOffer = function (offerId) {
  var c = G.career;
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === offerId; });
  if (!offer) return;
  if (careerOwnedSquadCount(c) <= CAREER_MIN_SQUAD_SIZE) { c.marketMessage = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores tuyos en plantilla. Vende o cede a otro primero.'; render(); return; }
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var p = all.find(function (x) { return x.id === offer.playerId; });
  var isLoan = offer.mode === 'loan';
  careerResolveIncomingOffer(c, offer, offer.amount);
  c.marketMessage = p
    ? ('Aceptada la ' + (isLoan ? 'cesión' : 'oferta') + ' por ' + p.nombre + ': ' + offer.amount + ' M€.')
    : 'Oferta aceptada.';
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
// Máximo de contraofertas por oferta entrante, a petición explícita
// ("que yo pueda negociar solo 2 veces... si pido 0.8 y rechazan, y pido
// 0.7 y rechazan, la oferta finaliza"): tras CAREER_MAX_COUNTER_ATTEMPTS
// intentos rechazados, la oferta se retira sola de c.incomingOffers (ver
// actionSendCounterOffer) -- no se puede seguir regateando indefinidamente.
var CAREER_MAX_COUNTER_ATTEMPTS = 2;
window.actionStartCounterNegotiation = function (offerId) {
  var c = G.career;
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === offerId; });
  if (!offer) return;
  // originalAmount/mode se guardan aparte porque, una vez agotados los
  // intentos o aceptada la contraoferta, la oferta ya no está en
  // c.incomingOffers (se quitó de ahí) -- así la pantalla de resultado
  // final puede seguir mostrando esos datos sin tener que volver a
  // buscarla.
  c.counterNegotiation = { offerId: offerId, playerId: offer.playerId, originalAmount: offer.amount, mode: offer.mode, counter: offer.amount, attempts: 0, lastResult: null };
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
  if (careerOwnedSquadCount(c) <= CAREER_MIN_SQUAD_SIZE) { cn.lastResult = 'plantillaMinima'; render(); return; }
  var accepted = careerCounterOfferAccepts(cn.counter, offer.amount);
  if (accepted) {
    careerResolveIncomingOffer(c, offer, cn.counter);
    cn.lastResult = 'accepted';
  } else {
    cn.attempts = (cn.attempts || 0) + 1;
    if (cn.attempts >= CAREER_MAX_COUNTER_ATTEMPTS) {
      c.incomingOffers = (c.incomingOffers || []).filter(function (o) { return o.id !== offer.id; });
      cn.lastResult = 'exhausted';
    } else {
      cn.lastResult = 'rejected';
    }
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
  // Oferta inicial sugerida al 90% del valor (antes 80%, muy optimista
  // ahora que el descuento cuesta mucho más de conseguir, ver
  // careerNegotiationAccepts) -- se puede seguir ajustando a mano.
  c.negotiation = { playerId: id, mode: mode, offer: Math.max(0.1, Math.round(asking * 0.9 * 10) / 10), lastResult: null };
  render();
};
window.actionCancelCareerNegotiation = function () {
  G.career.negotiation = null;
  render();
};
// Cantidad de la oferta/contraoferta: además de las flechas ◀▶ se puede
// escribir a mano (a petición explícita). Se guarda en el modelo mientras se
// teclea SIN volver a pintar (render() destruiría el input a cada tecla y
// se llevaría por delante el botón de enviar antes de que llegue el clic);
// al salir del campo solo se normaliza el valor mostrado.
function careerMoneyInputHtml(value, kind) {
  return '<span class="stepper-value stepper-value-input"><input class="stepper-input" type="text" inputmode="decimal" autocomplete="off" value="' + value + '" aria-label="Cantidad en millones" ' +
    'oninput="actionTypeCareerMoney(this.value, \'' + kind + '\', false, this)" ' +
    'onchange="actionTypeCareerMoney(this.value, \'' + kind + '\', true, this)"> M€</span>';
}
window.actionTypeCareerMoney = function (raw, kind, commit, input) {
  var target = kind === 'counter' ? G.career.counterNegotiation : G.career.negotiation;
  if (!target) return;
  var key = kind === 'counter' ? 'counter' : 'offer';
  var n = parseFloat(String(raw).replace(',', '.'));
  if (isFinite(n) && n > 0) { target[key] = Math.round(n * 10) / 10; target.lastResult = null; }
  if (commit) {
    if (!(isFinite(n) && n > 0)) target[key] = Math.max(0.1, target[key]);
    if (input) input.value = target[key];
  }
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
  if (w.signingsToday >= careerMaxSigningsPerDay(c)) { neg.lastResult = 'limiteFichajes'; render(); return; }
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
    ? '<p class="dim small" style="color:var(--danger)">Es probable que no se quiera unir a tu equipo (media ' + Math.round(teamAvg) + ' la tuya, ' + Math.round(careerPlayerScore(p)) + ' la suya), aunque ofrezcas su valor o más.</p>'
    : '';
  var w = c.marketWindow;
  var offersUsed = (w && w.offersToday[neg.playerId]) || 0;
  var offersLeft = CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY - offersUsed;
  var signingsLeft = w ? careerMaxSigningsPerDay(c) - w.signingsToday : 0;
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
      (neg.lastResult === 'limiteFichajes' ? '<p class="dim small" style="color:var(--danger)">Ya has fichado ' + careerMaxSigningsPerDay(c) + ' jugadores hoy, el máximo. Avanza el día para seguir.</p>' : '') +
      (neg.lastResult === 'mercadoCerrado' ? '<p class="dim small" style="color:var(--danger)">La ventana de fichajes se ha cerrado.</p>' : '') +
      '<p class="dim small">Ofertas a este jugador hoy: ' + offersUsed + ' / ' + CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY + '. Fichajes hoy: ' + (w ? w.signingsToday : 0) + ' / ' + careerMaxSigningsPerDay(c) + '.</p>' +
      '<div class="stepper-row">' +
        '<button class="btn stepper-arrow" onclick="actionAdjustCareerOffer(-0.1)">◀</button>' +
        careerMoneyInputHtml(neg.offer, 'offer') +
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
  var p = ROSTER.find(function (x) { return x.id === cn.playerId; });
  if (!p) { c.counterNegotiation = null; return renderCareerMercado(c); }
  // 'accepted'/'exhausted' ya quitaron la oferta de c.incomingOffers
  // (careerResolveIncomingOffer, o el propio actionSendCounterOffer al
  // agotar los intentos) -- se comprueban ANTES de buscarla ahí, o el
  // siguiente render la daría por perdida y cerraría la pantalla sin
  // mostrar el resultado final. cn.originalAmount/mode se guardaron
  // aparte en actionStartCounterNegotiation por lo mismo.
  if (cn.lastResult === 'accepted' || cn.lastResult === 'exhausted') {
    var finalMsg = cn.lastResult === 'accepted'
      ? '<p class="dim small" style="color:var(--accent-2)">¡Trato cerrado! ' + escapeHtml(p.nombre) + ' se va por ' + cn.counter + ' M€.</p>'
      : '<p class="dim small" style="color:var(--danger)">Sin acuerdo tras ' + CAREER_MAX_COUNTER_ATTEMPTS + ' intentos. La oferta por ' + escapeHtml(p.nombre) + ' ha terminado.</p>';
    return (
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:8px">Negociar la oferta por ' + escapeHtml(p.nombre) + '</h3>' +
        '<div style="display:flex;justify-content:center;margin-bottom:8px">' + careerMediaBadgeHtml(p) + avatarHtml(p) + '</div>' +
        finalMsg +
        '<button class="btn btn-primary btn-block mt" onclick="actionCancelCounterNegotiation()">Volver al mercado</button>' +
      '</div>'
    );
  }
  var offer = (c.incomingOffers || []).find(function (o) { return o.id === cn.offerId; });
  if (!offer) { c.counterNegotiation = null; return renderCareerMercado(c); }
  var attemptsLeft = CAREER_MAX_COUNTER_ATTEMPTS - (cn.attempts || 0);
  var resultHtml =
    (cn.lastResult === 'rejected' ? '<p class="dim small" style="color:var(--danger)">El club no acepta ' + cn.counter + ' M€ por ' + escapeHtml(p.nombre) + '. Te queda ' + attemptsLeft + ' intento' + (attemptsLeft === 1 ? '' : 's') + '.</p>' : '') +
    (cn.lastResult === 'plantillaMinima' ? '<p class="dim small" style="color:var(--danger)">No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores en plantilla.</p>' : '') +
    '<div class="stepper-row">' +
      '<button class="btn stepper-arrow" onclick="actionAdjustCounterOffer(-0.1)">◀</button>' +
      careerMoneyInputHtml(cn.counter, 'counter') +
      '<button class="btn stepper-arrow" onclick="actionAdjustCounterOffer(0.1)">▶</button>' +
    '</div>' +
    '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn btn-primary" onclick="actionSendCounterOffer()">Enviar contraoferta</button>' +
      '<button class="btn btn-outline" onclick="actionCancelCounterNegotiation()">Cancelar</button>' +
    '</div>';
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:8px">Negociar la oferta por ' + escapeHtml(p.nombre) + '</h3>' +
      '<div style="display:flex;justify-content:center;margin-bottom:8px">' + careerMediaBadgeHtml(p) + avatarHtml(p) + '</div>' +
      '<p class="dim small">Te ofrecían <strong style="color:var(--accent-2)">' + cn.originalAmount + ' M€</strong> (' + (cn.mode === 'loan' ? 'cesión' : 'compra') + '). Se resuelve al momento: pedir más de eso baja las probabilidades de que acepten. Intento ' + ((cn.attempts || 0) + 1) + ' de ' + CAREER_MAX_COUNTER_ATTEMPTS + '.</p>' +
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
  var atMinSquad = careerOwnedSquadCount(c) <= CAREER_MIN_SQUAD_SIZE;
  var blockedTitle = 'No puedes bajar de ' + CAREER_MIN_SQUAD_SIZE + ' jugadores tuyos en plantilla. Vende o cede a otro primero.';
  var rowsHtml = offers.map(function (o) {
    var p = ROSTER.find(function (x) { return x.id === o.playerId; });
    if (!p) return '';
    var daysLeft = o.expiresOnDay - (w ? w.dayIndex : o.expiresOnDay);
    var value = careerPlayerValue(p);
    if (!o.club) o.club = careerOfferClub(c);
    var clubHtml = o.club ? '<div class="dim small" style="display:flex;align-items:center;gap:6px;margin:2px 0"><img class="futdraft-timeline-shield" src="' + escapeHtml(teamShieldPath(o.club)) + '" alt="">Oferta de <strong>' + escapeHtml(o.club) + '</strong></div>' : '';
    return '<div class="career-offer-card">' +
      '<div class="career-offer-head">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
        // Posición + elemento junto al nombre, a petición explícita
        // ("cuando te hacen una oferta por un jugador que salga la
        // posición y el elemento que es, para no estar yendo a la
        // plantilla para verlo").
        '<span class="career-offer-name">' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + ' <span title="' + escapeHtml(p.tipo) + '">' + getTypeSymbol(p.tipo).replace(/22px/g, '16px') + '</span></span>' +
        '<span class="dim small">' + (o.mode === 'loan' ? 'cesión' : 'compra') + ' · caduca en ' + daysLeft + ' día' + (daysLeft === 1 ? '' : 's') + '</span>' +
      '</div>' +
      clubHtml +
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
    var closedMsg = (c.winterMarket === false && c.league.matchdayIndex < CAREER_MIDSEASON_AT_MATCHDAY)
      ? 'El mercado de invierno está desactivado en esta carrera. El mercado reabrirá al empezar la próxima temporada.'
      : c.league.matchdayIndex < CAREER_MIDSEASON_AT_MATCHDAY
        ? ('El mercado reabrirá tras la jornada ' + CAREER_MIDSEASON_AT_MATCHDAY + ' (llevas ' + c.league.matchdayIndex + ').')
        : 'El mercado reabrirá al empezar la próxima temporada.';
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Mercado cerrado</h3>' +
      '<p class="dim small">' + closedMsg + '</p>' +
    '</div>';
  }
  var windowBannerHtml = '<div class="panel center-text">' +
    '<h3 style="margin-bottom:4px">Ventana de fichajes: día ' + w.dayIndex + ' de ' + w.totalDays + ' (' + (w.phase === 'preseason' ? 'pretemporada' : 'mercado de invierno') + ')</h3>' +
    '<p class="dim small">Máximo ' + CAREER_MAX_OFFERS_PER_PLAYER_PER_DAY + ' ofertas por jugador y día, y ' + careerMaxSigningsPerDay(c) + ' fichajes confirmados al día. Fichajes hoy: ' + w.signingsToday + ' / ' + careerMaxSigningsPerDay(c) + '.</p>' +
    '<button class="btn btn-outline btn-block" onclick="actionAdvanceCareerMarketDay()">Avanzar día ▶</button>' +
  '</div>';
  var incomingOffersHtml = renderCareerIncomingOffers(c);
  // Los cedidos de SALIDA (c.loanedOutIds) siguen siendo tuyos aunque no
  // estén en lineup/bench mientras dura la cesión -- no pueden aparecer
  // como fichables, ni por ti ni (conceptualmente) por nadie más, a
  // petición explícita ("lo he cedido, me sigue perteneciendo").
  var owned = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; })).concat(c.loanedOutIds || []);
  var filter = c.marketFilter || null;
  var typeFilter = c.marketTypeFilter || null;
  var growthFilter = c.marketGrowthFilter || null;
  var search = (c.marketSearch || '').trim().toLowerCase();
  var priceMin = (typeof c.marketPriceMin === 'number') ? c.marketPriceMin : null;
  var priceMax = (typeof c.marketPriceMax === 'number') ? c.marketPriceMax : null;
  // Ya no se esconden los jugadores por encima de tu techo de media, a
  // petición explícita ("quiero que salgan en el mercado todos los
  // jugadores para poder fichar") -- antes careerMarketSignableCap los
  // filtraba del todo, ahora solo sirve como aviso (careerNegotiationAccepts
  // ya los hace casi imposibles de fichar de verdad, ver CAREER_ELITE_SIGN_CHANCE).
  var available = ROSTER.filter(function (p) {
    if (owned.indexOf(p.id) !== -1) return false;
    if (filter && p.posicion !== filter) return false;
    if (typeFilter && p.tipo !== typeFilter) return false;
    if (growthFilter && careerPlayerGrowthTier(c, p) !== growthFilter) return false;
    if (search && p.nombre.toLowerCase().indexOf(search) === -1) return false;
    if (priceMin !== null && careerPlayerValue(p) < priceMin) return false;
    if (priceMax !== null && careerPlayerValue(p) > priceMax) return false;
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
  var typeFilterBtnsHtml = careerTypeFilterBtnsHtml(typeFilter, 'actionSetCareerMarketTypeFilter');
  var growthFilterBtnsHtml = careerGrowthFilterBtnsHtml(growthFilter, 'actionSetCareerMarketGrowthFilter', c.hideProdigy);
  var sortOptionsHtml = CAREER_MARKET_SORT_FIELDS.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === sortField.id ? ' selected' : '') + '>' + f.name + '</option>';
  }).join('');
  var squadFull = (c.lineup.length + c.bench.length) >= CAREER_MAX_SQUAD_SIZE;
  var loansFull = careerLoanCount(c) >= CAREER_MAX_LOANS_IN;
  var rowsHtml = pageItems.map(function (p) {
    var value = careerPlayerValue(p);
    return '<div class="futdraft-timeline-row">' + careerMediaBadgeHtml(p) + avatarHtml(p) +
      '<span>' + escapeHtml(p.nombre) + ' ' + positionIconHtml(p.posicion, 16) + ' <span title="' + escapeHtml(p.tipo) + '">' + getTypeSymbol(p.tipo) + '</span> ' + careerGrowthArrowHtml(careerPlayerGrowthTier(c, p), c.hideProdigy) + '</span>' +
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
      '<p class="dim small">Presupuesto disponible: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong> · Cedidos: <strong>' + careerLoanCount(c) + ' / ' + CAREER_MAX_LOANS_IN + '</strong></p>' +
      '<p class="dim small">' + available.length + ' jugador' + (available.length === 1 ? '' : 'es') + ' con este filtro.</p>' +
      (squadFull ? '<p class="dim small" style="color:var(--danger)">Plantilla al máximo (' + CAREER_MAX_SQUAD_SIZE + '). Vende o cede a alguien antes de fichar.</p>' : '') +
      (loansFull ? '<p class="dim small" style="color:var(--danger)">Ya tienes ' + CAREER_MAX_LOANS_IN + ' cesiones, el máximo. Devuelve a alguna antes de fichar otra.</p>' : '') +
      (c.marketMessage ? '<p class="dim small">' + escapeHtml(c.marketMessage) + '</p>' : '') +
      '<input class="select-field" type="text" placeholder="Buscar por nombre…" data-focus-key="career-market-search" value="' + escapeHtml(c.marketSearch || '') + '" oninput="actionSetCareerMarketSearch(this.value)">' +
      '<div class="btn-row mt">' + filterBtnsHtml + '</div>' +
      '<div class="btn-row mt">' + typeFilterBtnsHtml + '</div>' +
      '<div class="btn-row mt">' + growthFilterBtnsHtml + '</div>' +
      '<div class="btn-row mt" style="align-items:center;gap:6px">' +
        '<input class="select-field" type="number" min="0" step="1" placeholder="Precio mín. M€" style="min-width:0" value="' + (priceMin === null ? '' : priceMin) + '" oninput="actionSetCareerMarketPriceMin(this.value)">' +
        '<span class="dim small">–</span>' +
        '<input class="select-field" type="number" min="0" step="1" placeholder="Precio máx. M€" style="min-width:0" value="' + (priceMax === null ? '' : priceMax) + '" oninput="actionSetCareerMarketPriceMax(this.value)">' +
        (priceMin !== null || priceMax !== null ? '<button class="btn btn-tiny" onclick="actionClearCareerMarketPriceFilter()">✕</button>' : '') +
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

// Nombre/escudo de TU club en Modo Carrera, a petición explícita ("elige
// nombre de club (cualquiera) y escudo de club entre los que hay
// desbloqueados"): si no se eligió nada (partidas de antes de esto, o
// c.clubShieldName a null = "escudo por defecto"), cae en el nombre/
// escudo de siempre (getPlayerShieldPath, el mismo que usa el resto de
// la app). c.clubShieldName es un club REAL (uno de los que ya tienes
// desbloqueados en la Máquina de Premios) cuyo escudo tomas prestado --
// ese club real queda excluido de los rivales de la carrera (ver
// careerInitialDivisionTeams).
function careerClubDisplayName(c) { return (c && c.clubName) || 'Tú'; }
function careerClubShieldPath(c) { return (c && c.clubShieldName) ? teamShieldPath(c.clubShieldName) : getPlayerShieldPath(); }
// Escudo real si el nombre coincide con alguno conocido (mismo criterio
// que toda la app, ver teamShieldPath), tu propio club si el hueco es
// el tuyo -- igual que las filas de la tabla de Liga.
function calendarTeamShield(league, idx) { return idx === 0 ? careerClubShieldPath(G.career) : teamShieldPath(league.teamNames[idx]); }
function calendarTeamLabel(league, idx) { return idx === 0 ? careerClubDisplayName(G.career) : league.teamNames[idx]; }

// Tarjeta "tu escudo VS el escudo del rival" en grande, a petición
// explícita ("antes de darle a simular o saltar, dime contra quien
// juego... pon mi escudo VS el escudo del equipo rival en grande") --
// se enseña justo antes de los botones Simular/Saltar en Jornada, Copa
// del Rey y Champions League (mismo componente en las 3, solo cambia el
// texto de contexto que se le pasa: jornada, o la ronda). youAreHome
// decide el ORDEN de los escudos -- si juegas fuera, tu escudo va a la
// derecha y el del rival a la izquierda (como en un marcador real,
// local-visitante), a petición explícita. Copa/Champions son sede
// neutral (sin local/visitante de verdad), así que se llaman sin este
// parámetro y se quedan con el orden de siempre (tú a la izquierda).
// Posición/puntos/forma de un equipo de la Liga para la tarjeta de
// emparejamiento, a petición explícita ("pon la posición actual en
// liga, los puntos actuales, y la forma de cada equipo"). Solo tiene
// sentido en Jornada (Liga, con tabla de verdad) -- Copa/Champions son
// de eliminación directa y llaman a careerMatchupCardHtml sin `league`,
// así que esto se queda vacío ahí sin romper nada.
function careerMatchupTeamStatsHtml(league, idx) {
  if (!league) return '';
  var sorted = ligaSortedTable(league.table);
  var rank = sorted.findIndex(function (t) { return t.idx === idx; }) + 1;
  var row = league.table[idx];
  return '<div class="matchup-stats">' +
    '<div class="matchup-stats-row">' +
      '<span class="matchup-stats-pos">' + rank + 'º</span>' +
      '<span class="matchup-stats-pts">' + row.pts + ' pts</span>' +
    '</div>' +
    ligaFormHtml(row.form) +
  '</div>';
}
function careerMatchupCardHtml(oppName, contextLabel, youAreHome, league, oppIdx) {
  var youSideHtml =
    '<div class="matchup-side">' +
      '<img class="matchup-shield" src="' + escapeHtml(careerClubShieldPath(G.career)) + '" alt="">' +
      '<div class="matchup-name">' + escapeHtml(careerClubDisplayName(G.career)) + '</div>' +
      careerMatchupTeamStatsHtml(league, 0) +
    '</div>';
  var oppSideHtml =
    '<div class="matchup-side">' +
      '<img class="matchup-shield" src="' + escapeHtml(teamShieldPath(oppName)) + '" alt="">' +
      '<div class="matchup-name">' + escapeHtml(oppName) + '</div>' +
      careerMatchupTeamStatsHtml(league, oppIdx) +
    '</div>';
  var sidesHtml = youAreHome === false ? (oppSideHtml + '<div class="matchup-vs">VS</div>' + youSideHtml) : (youSideHtml + '<div class="matchup-vs">VS</div>' + oppSideHtml);
  return '<div class="panel matchup-card">' +
    (contextLabel ? '<p class="dim small center-text">' + contextLabel + '</p>' : '') +
    '<div class="matchup-row">' + sidesHtml + '</div>' +
  '</div>';
}
// Tarjeta de resultado de TU partido (mismo lenguaje visual que
// careerMatchupCardHtml -- escudos grandes a cada lado -- pero con el
// marcador ya en medio en vez de "VS"), enseñada justo después de jugar
// una jornada, antes de preparar la siguiente -- ver renderCareerJornada/
// c.jornadaAckPending.
function careerMatchResultCardHtml(oppName, myGoals, oppGoals, winBonus, youAreHome) {
  var youSideHtml =
    '<div class="matchup-side">' +
      '<img class="matchup-shield" src="' + escapeHtml(careerClubShieldPath(G.career)) + '" alt="">' +
      '<div class="matchup-name">' + escapeHtml(careerClubDisplayName(G.career)) + '</div>' +
    '</div>';
  var oppSideHtml =
    '<div class="matchup-side">' +
      '<img class="matchup-shield" src="' + escapeHtml(teamShieldPath(oppName)) + '" alt="">' +
      '<div class="matchup-name">' + escapeHtml(oppName) + '</div>' +
    '</div>';
  // Mismo criterio que careerMatchupCardHtml (el escudo local a la
  // izquierda, el visitante a la derecha) -- también en el resultado, no
  // solo antes de jugar, a petición explícita ("antes de empezar el
  // partido soy visitante... cuando me pone el resultado... me reordena
  // el escudo a la izquierda, está mal"). El marcador (myGoals-oppGoals)
  // sigue siendo siempre "tú primero", va aparte del orden visual de los
  // escudos.
  var sidesHtml = youAreHome === false
    ? (oppSideHtml + '<div class="matchup-vs">' + oppGoals + ' - ' + myGoals + '</div>' + youSideHtml)
    : (youSideHtml + '<div class="matchup-vs">' + myGoals + ' - ' + oppGoals + '</div>' + oppSideHtml);
  return '<div class="panel matchup-card">' +
    '<p class="dim small center-text">Resultado de tu partido</p>' +
    '<div class="matchup-row">' + sidesHtml + '</div>' +
    (winBonus ? '<p class="dim small center-text mt">Presupuesto: <strong style="color:var(--accent-2)">+' + winBonus + ' M€</strong> por ganar.</p>' : '') +
  '</div>';
}
// Resultado de TODA la jornada que se acaba de jugar (no solo tu
// partido), a petición explícita ("en vez de poner esto así, pon
// directamente una captura del calendario diciendo como han quedado
// todos") -- misma fila que ya usa Calendario (calendarFixtureRowHtml),
// reutilizada tal cual para no duplicar ese diseño.
function careerLastRoundResultsHtml(league, r) {
  var playedIdx = league.matchdayIndex - 1;
  var playedFixtures = playedIdx >= 0 ? league.schedule[playedIdx] : null;
  var playedResults = playedIdx >= 0 ? league.results[playedIdx] : null;
  var roundRowsHtml = playedFixtures
    ? playedFixtures.map(function (fx, fi) { return calendarFixtureRowHtml(league, fx, playedResults[fi]); }).join('')
    : '';
  return '<div class="panel">' +
    '<h3 style="margin-bottom:4px" class="center-text">Cómo ha quedado la jornada ' + r.matchday + '</h3>' +
    roundRowsHtml +
  '</div>';
}
window.actionAckCareerJornadaResult = function () {
  G.career.jornadaAckPending = false;
  render();
};
// Encuentra tu partido de la próxima jornada de Liga sin jugarlo -- para
// poder enseñar el rival en la tarjeta de arriba antes de pulsar nada
// (mismo criterio de búsqueda que actionSkipCareerMatchday/
// actionSimulateCareerMatchday, aquí solo de lectura).
function careerNextFixtureInfo(league) {
  if (league.matchdayIndex >= league.schedule.length) return null;
  var fixtures = league.schedule[league.matchdayIndex];
  var myFixtureIdx = fixtures.findIndex(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var myFixture = fixtures[myFixtureIdx];
  var youAreHome = myFixture[0] === 0;
  var oppIdx = youAreHome ? myFixture[1] : myFixture[0];
  return { oppIdx: oppIdx, oppName: league.teamNames[oppIdx], youAreHome: youAreHome };
}

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

// Zona de la tabla de Modo Carrera: verde para ASCENSO (los
// CAREER_PROMOTION_SPOTS primeros de Segunda) o rojo para DESCENSO (los
// mismos últimos de Primera), a petición explícita ("los 2 primeros
// ascienden, tienen que estar en verde, como en la foto"). Se usa TANTO
// en la insignia de posición como en el borde izquierdo de la fila entera
// (careerLigaZoneRowClass), a petición explícita ("una barra de color en
// el borde izquierdo... se leería más rápido de un vistazo") -- la
// insignia se queda porque ya estaba y sigue aportando (el número en sí
// coloreado), la barra es solo un refuerzo visual más rápido de leer.
// Azul para plaza de CHAMPIONS (los CAREER_CHAMPIONS_QUALIFY_SPOTS
// primeros de Primera, a petición explícita: "pinta de color azul los 4
// primeros equipos de la liga") -- solo en Primera, nunca choca con la
// zona de descenso porque son los primeros puestos, no los últimos.
function careerLigaZoneClass(rank, totalTeams, division) {
  if (division === 2 && rank <= CAREER_PROMOTION_SPOTS) return 'liga-pos-top';
  if (division === 1 && rank > totalTeams - CAREER_PROMOTION_SPOTS) return 'liga-pos-bottom';
  if (division === 1 && rank <= CAREER_CHAMPIONS_QUALIFY_SPOTS) return 'liga-pos-champions';
  return '';
}
function careerLigaPosBadgeHtml(rank, totalTeams, division) {
  var zoneCls = careerLigaZoneClass(rank, totalTeams, division);
  return '<span class="liga-pos-badge' + (zoneCls ? ' ' + zoneCls : '') + '">' + rank + '</span>';
}
// Misma zona que arriba, pero como clase para la fila entera (borde
// izquierdo de color) en vez de la insignia -- distinto prefijo
// (liga-row-zone-*) para no arrastrar el fondo/color de texto que trae
// liga-pos-top/bottom/champions en la insignia, aquí solo hace falta el
// borde.
function careerLigaZoneRowClass(rank, totalTeams, division) {
  var zoneCls = careerLigaZoneClass(rank, totalTeams, division);
  if (zoneCls === 'liga-pos-top') return 'liga-row-zone-top';
  if (zoneCls === 'liga-pos-bottom') return 'liga-row-zone-bottom';
  if (zoneCls === 'liga-pos-champions') return 'liga-row-zone-champions';
  return '';
}

// Competiciones agrupa Liga (con Calendario dentro, como una vista más)
// y Copa del Rey en una sola pestaña con su propia sub-navegación, a
// petición explícita ("competiciones tiene que tener liga y copa del
// rey dentro"). c.competicionesTab ('liga'/'copa') es independiente de
// c.tab (la pestaña de arriba).
window.actionSetCareerCompeticionesTab = function (tab) {
  G.career.competicionesTab = tab;
  render();
};
// Cambia de pestaña de arriba a "Competiciones" Y de sub-pestaña a la
// vez -- para enlaces desde fuera de Competiciones (el aviso de "toca
// Copa del Rey" en Jornada, volver de un partido de Copa) que necesitan
// las dos cosas en un solo paso.
window.actionGoToCareerCompeticionesTab = function (subTab) {
  var c = G.career;
  c.tab = 'competiciones';
  c.competicionesTab = subTab;
  render();
};
// Todo en UNA sola fila deslizable (mismo .career-tabs-scroll de la
// cabecera de Modo Carrera), a petición explícita ("mete un segundo
// scrollbar con liga, copa del rey, clasificación resumida, completa,
// forma, y máximos goleadores en el mismo scroll bar") -- antes eran 2-3
// filas sueltas (competición / vista de Liga / botón de goleadores
// aparte). Los botones de vista y el de goleadores cambian
// automáticamente a la sub-pestaña Liga al tocarlos (tiene sentido: son
// conceptos solo de Liga), así que pueden convivir con Copa/Champions en
// la misma fila sin confundir -- puede haber más de un pill activo a la
// vez (p.ej. "Liga" + "Resumida" los dos en azul).
function renderCareerCompeticiones(c) {
  var hasSupercopa = !!c.supercopa;
  var sub = c.competicionesTab;
  // Copa del Rey y Champions son siempre accesibles (aunque no se puedan
  // jugar todavía) -- a petición explícita ("tengo que poder ver la copa
  // del rey aunque no pueda jugarla hasta la jornada x... igual con la
  // champions"). renderCareerChampions ya sabe enseñar un aviso de "no
  // clasificado esta temporada" cuando c.champions todavía no existe, así
  // que no hace falta esconder el botón -- antes SÍ se escondía
  // (`if (hasChampions)`), dejando ese aviso inalcanzable. La Supercopa
  // sigue condicionada: es un torneo corto de 2 partidos que solo existe
  // tras ganar la Champions esa temporada, no una competición de fondo
  // que siga la carrera.
  var validSubs = ['copa', 'liga', 'champions'].concat(hasSupercopa ? ['supercopa'] : []);
  if (validSubs.indexOf(sub) === -1) sub = 'liga';
  var view = c.ligaView && CAREER_LIGA_VIEWS.some(function (v) { return v.id === c.ligaView; }) ? c.ligaView : 'resumida';
  var items = [
    { name: 'Liga', active: sub === 'liga', onclick: "actionSetCareerCompeticionesTab('liga')" },
    { name: 'Copa del Rey', active: sub === 'copa', onclick: "actionSetCareerCompeticionesTab('copa')" },
    { name: 'Champions', active: sub === 'champions', onclick: "actionSetCareerCompeticionesTab('champions')" }
  ];
  if (hasSupercopa) items.push({ name: 'Supercopa', active: sub === 'supercopa', onclick: "actionSetCareerCompeticionesTab('supercopa')" });
  CAREER_LIGA_VIEWS.forEach(function (v) {
    items.push({ name: v.name, active: sub === 'liga' && view === v.id, onclick: "actionSetCareerLigaView('" + v.id + "')" });
  });
  items.push({ name: 'Máximos goleadores', active: !!c.showTopScorers, onclick: 'actionToggleCareerTopScorers()' });
  var scrollHtml = '<div class="career-tabs-scroll competiciones-scroll">' +
    items.map(function (it) { return '<button class="btn btn-tiny' + (it.active ? ' active' : '') + '" onclick="' + it.onclick + '">' + it.name + '</button>'; }).join('') +
  '</div>';
  var bodyHtml = sub === 'copa' ? renderCareerCopa(c) : (sub === 'champions' ? renderCareerChampions(c) : (sub === 'supercopa' ? renderCareerSupercopa(c) : renderCareerLigaSection(c)));
  return scrollHtml + bodyHtml;
}

window.actionSetCareerLigaView = function (view) {
  var c = G.career;
  c.competicionesTab = 'liga';
  c.ligaView = view;
  render();
};
var CAREER_LIGA_VIEWS = [
  { id: 'resumida', name: 'Resumida' },
  { id: 'completa', name: 'Completa' },
  { id: 'forma', name: 'Forma' },
  { id: 'calendario', name: 'Calendario' }
];
// Liga: tabla de clasificación en 3 "vistas" con menos columnas cada una
// (en vez de una sola tabla de 12 columnas con scroll horizontal, a
// petición explícita, "sin necesidad de scrollear... con los mismos 3
// botones... Resumida, Completa, o la Forma") + Calendario como cuarta
// vista (antes pestaña propia, ahora "dentro de Liga"), todo compartiendo
// la misma cabecera con la división/jornada actual.
function renderCareerLigaSection(c) {
  var league = c.league;
  var view = c.ligaView && CAREER_LIGA_VIEWS.some(function (v) { return v.id === c.ligaView; }) ? c.ligaView : 'resumida';
  var zoneHint = c.division === 2
    ? 'Verde: zona de ascenso a Primera (' + CAREER_PROMOTION_SPOTS + ' primeros).'
    : 'Azul: plaza de Champions League (' + CAREER_CHAMPIONS_QUALIFY_SPOTS + ' primeros). Rojo: zona de descenso a Segunda (' + CAREER_PROMOTION_SPOTS + ' últimos).';
  var headerHtml =
    '<div class="panel center-text">' +
      '<p class="dim small">' + escapeHtml(careerDivisionName(c.division)) + ', jornada ' + Math.min(league.matchdayIndex + 1, league.schedule.length) + ' de ' + league.schedule.length + '</p>' +
      (view !== 'calendario' ? '<p class="dim small">' + zoneHint + '</p>' : '') +
      (view === 'forma' ? '<p class="dim small">Una racha de 3 victorias o derrotas seguidas da un empujón (o un bajón) de forma al siguiente partido.</p>' : '') +
    '</div>';
  if (view === 'calendario') return headerHtml + renderCareerCalendario(c);
  var topScorersHtml = c.showTopScorers ? renderTopScorersAssistsPanel(league.stats, 'Goleadores y asistentes de esta temporada', true) : '';
  return headerHtml + (topScorersHtml || '') + renderCareerLigaTable(c, view);
}

// Construye la tabla de UNA vista concreta -- Resumida (#, equipo, J, DG,
// PTS), Completa (+ G/E/P y goles a favor-en contra) o Forma (#, equipo,
// últimos 5 resultados) -- todas comparten fila/insignia de posición,
// solo cambian las columnas de después del nombre.
function renderCareerLigaTable(c, view) {
  var league = c.league;
  var sorted = ligaSortedTable(league.table);
  var headCells, bodyCellsFor;
  if (view === 'completa') {
    headCells = '<th>#</th><th></th><th>Equipo</th><th>J</th><th>G</th><th>E</th><th>P</th><th>+/-</th><th>DG</th><th>PTS</th>';
    bodyCellsFor = function (t) {
      var dg = t.gf - t.gc;
      return '<td>' + t.pj + '</td><td>' + t.pg + '</td><td>' + t.pe + '</td><td>' + t.pp + '</td>' +
        '<td>' + t.gf + '-' + t.gc + '</td><td>' + (dg >= 0 ? '+' : '') + dg + '</td>' +
        '<td><strong>' + t.pts + '</strong></td>';
    };
  } else if (view === 'forma') {
    headCells = '<th>#</th><th></th><th>Equipo</th><th>Últimos partidos</th>';
    bodyCellsFor = function (t) { return '<td>' + ligaFormHtml(t.form) + '</td>'; };
  } else {
    headCells = '<th>#</th><th></th><th>Equipo</th><th>J</th><th>DG</th><th>PTS</th>';
    bodyCellsFor = function (t) {
      var dg = t.gf - t.gc;
      return '<td>' + t.pj + '</td><td>' + (dg >= 0 ? '+' : '') + dg + '</td><td><strong>' + t.pts + '</strong></td>';
    };
  }
  var rows = sorted.map(function (t, pos) {
    var isYou = t.idx === 0;
    var label = isYou ? careerClubDisplayName(c) : league.teamNames[t.idx];
    var shield = isYou ? careerClubShieldPath(c) : teamShieldPath(league.teamNames[t.idx]);
    var rowCls = ((isYou ? 'liga-you' : '') + ' ' + careerLigaZoneRowClass(pos + 1, sorted.length, c.division)).trim();
    return '<tr class="' + rowCls + '">' +
      '<td>' + careerLigaPosBadgeHtml(pos + 1, sorted.length, c.division) + '</td>' +
      '<td><img class="liga-row-shield" src="' + escapeHtml(shield) + '" alt=""></td>' +
      '<td>' + escapeHtml(label) + '</td>' +
      bodyCellsFor(t) +
    '</tr>';
  }).join('');
  return '<div class="panel">' +
    '<table class="career-liga-table"><thead><tr>' + headCells + '</tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
  '</div>';
}

window.actionToggleCareerTopScorers = function () {
  var c = G.career;
  c.competicionesTab = 'liga';
  c.showTopScorers = !c.showTopScorers;
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
// Como careerSimulateMatchGoals, pero con TU ataque y TU defensa por
// separado (careerMyAtkDef, formación + estilo de juego) en vez de un
// único "power" simétrico -- así el estilo de juego puede afectar a los
// goles a favor y en contra de forma distinta (más ofensivo, más goles
// en los dos sentidos; más defensivo, menos en los dos). El rival sigue
// siendo un único número para las dos cosas, como siempre -- no tiene
// formación ni estilo propios que romper esa simetría. Devuelve ya
// [golesLocal, golesVisitante] listo para ligaApplyResult, según toque
// jugar en casa o fuera.
function careerSimulateMyMatchGoals(myAtk, myDef, oppPower, youAreHome) {
  var myGoals = futDraftRandomGoals(futDraftExpectedGoals(myAtk, oppPower));
  var oppGoals = futDraftRandomGoals(futDraftExpectedGoals(oppPower, myDef));
  return youAreHome ? [myGoals, oppGoals] : [oppGoals, myGoals];
}

// Modo Carrera es más exigente que el resto de modos: TODOS los rivales
// se nivelan hacia arriba (a petición explícita: "aunque un equipo sea
// 70 que juegue como uno de 85, uno de 60 como uno de 80"), no solo los
// flojos -- la fórmula es la media entre su potencia real y este techo,
// y de paso también sube un poco a los equipos ya fuertes, en vez de
// solo aplanar por abajo. No se toca TEAM_POWER global porque eso
// afectaría también a FutDraft/Torneo/Liga estándar.
// El techo depende de la dificultad elegida al crear la carrera
// (c.difficulty, ver CAREER_DIFFICULTY_TIERS/renderCareerSetup) -- 87 es
// el de "Normal" (bajado dos veces el 15-09, de 100 a 92 y luego a 87,
// "baja la dificultad"); se mantiene como valor de reserva por si
// c.difficulty no existiera (partidas viejas).
var CAREER_RIVAL_LEVEL_TARGET = 87;
function careerRivalPower(name) {
  var c = G.career;
  var tier = c && CAREER_DIFFICULTY_TIERS[c.difficulty];
  var target = tier ? tier.rivalLevelTarget : CAREER_RIVAL_LEVEL_TARGET;
  var p = teamPower({ name: name });
  return Math.round((p + target) / 2);
}
// Copa/Champions/Supercopa un poco más duras que la Liga en las
// dificultades altas, a petición explícita ("haz que sea más complicado
// ganar la copa (solo un pelín) y la champions y la supercopa, al menos
// en difícil y muy difícil"): un extra sobre el rival SOLO en Difícil y
// Muy difícil (en Fácil/Normal no cambia nada), pequeño en Copa, más
// notable en Champions/Supercopa -- son las competiciones "de prestigio",
// tiene sentido que cueste más ganarlas cuanto más exigente sea la
// carrera.
var CAREER_KNOCKOUT_DIFFICULTY_BONUS = {
  cup: { facil: 0, normal: 0, dificil: 2, muy_dificil: 3 },
  champions: { facil: 0, normal: 0, dificil: 5, muy_dificil: 7 },
  supercopa: { facil: 0, normal: 0, dificil: 3, muy_dificil: 5 }
};
function careerKnockoutPower(basePower, competition) {
  var c = G.career;
  var bonusMap = CAREER_KNOCKOUT_DIFFICULTY_BONUS[competition];
  var bonus = (c && bonusMap && bonusMap[c.difficulty]) || 0;
  return Math.min(99, basePower + bonus);
}

// Estilo de juego de tu equipo (Gestionar plantilla), a petición
// explícita: 4 niveles de Muy defensiva a Ofensiva, cada uno con su
// propio multiplicador de ataque/defensa -- afecta a los goles que
// marcas Y a los que encajas (más ofensivo, más goles a favor pero
// también más en contra; más defensivo, al revés), nunca solo a un lado.
// "atk"/"def" siguen la misma escala que formation.atk/def de
// FUTDRAFT_FORMATIONS (1 = neutro), así que se pueden multiplicar entre
// sí sin más.
var CAREER_PLAY_STYLES = [
  { id: 'muy_defensiva', name: 'Muy defensiva', atk: 0.85, def: 1.18 },
  { id: 'defensiva', name: 'Defensiva', atk: 0.93, def: 1.09 },
  { id: 'equilibrado', name: 'Equilibrado', atk: 1, def: 1 },
  { id: 'ofensiva', name: 'Ofensiva', atk: 1.15, def: 0.88 },
  { id: 'muy_ofensiva', name: 'Muy ofensiva', atk: 1.28, def: 0.78 }
];
function careerPlayStyle(c) {
  return CAREER_PLAY_STYLES.find(function (s) { return s.id === c.playStyle; }) || CAREER_PLAY_STYLES[2];
}
// Sinergia con la formación, a petición explícita ("tiene que existir
// una sinergia y tener sentido con la formación, por si hay 4
// delanteros, 5 defensas"): si el estilo tira en la misma dirección que
// la formación (ambos ofensivos, o ambos defensivos -- comparando
// formation.atk-formation.def contra style.atk-style.def), el estilo se
// aplica entero. Si tira en la dirección CONTRARIA (p.ej. "Ofensiva" con
// una 5-3-2 muy defensiva, o "Muy defensiva" con una 3-3-4 muy
// ofensiva), no tiene mucho sentido de verdad -- once jugadores no
// cambian de sitio en el campo solo por una orden táctica -- así que el
// efecto se AMORTIGUA a la mitad en vez de aplicarse entero. Nunca se
// anula del todo ni se vuelve negativo, solo se nota menos.
var CAREER_PLAY_STYLE_CONTRADICTION_DAMPEN = 0.5;
function careerPlayStyleModifiers(c) {
  var style = careerPlayStyle(c);
  var formation = FUTDRAFT_FORMATIONS.find(function (ft) { return ft.id === c.formation; }) || FUTDRAFT_FORMATIONS[0];
  var styleLean = style.atk - style.def;
  var formationLean = formation.atk - formation.def;
  var aligned = styleLean === 0 || formationLean === 0 || (styleLean > 0) === (formationLean > 0);
  var blend = aligned ? 1 : CAREER_PLAY_STYLE_CONTRADICTION_DAMPEN;
  var risk = careerRiskBenefit(c);
  var cfx = coachEffect(coachById(c.coachId), style.id);
  return { atk: (1 + (style.atk - 1) * blend) * risk.atk * (1 + cfx.atkPts / 100) * cfx.atkMult, def: (1 + (style.def - 1) * blend) * risk.def * (1 + cfx.defPts / 100) * cfx.defMult, aligned: aligned };
}
// Ataque/defensa de TU equipo para resolver un partido de verdad
// (Jornada/Copa/Champions, camino "Saltar" -- el camino "Simular" hace
// lo mismo pero dentro de futDraftSimulateMatchCore, ver styleAtkMult/
// styleDefMult en los puentes a FutDraft): misma base que ya se usaba
// (ahora con la progresión de tus jugadores: careerMatchTeamScore, antes
// eran las stats crudas del roster y entrenar/crecer no ganaba partidos)
// multiplicada por la formación y por el estilo de juego.
// Puntuación de tu equipo para RESOLVER partidos: la misma que se ve en Mi
// equipo (careerScoreBreakdown, con c.playerProgression).
function careerMatchTeamScore(c) { return careerScoreBreakdown(c.lineup, c.captainId).total; }
function careerMyAtkDef(c) {
  var formation = FUTDRAFT_FORMATIONS.find(function (ft) { return ft.id === c.formation; }) || FUTDRAFT_FORMATIONS[0];
  var mods = careerPlayStyleModifiers(c);
  var base = careerMatchTeamScore(c);
  return { atk: base * formation.atk * mods.atk, def: base * formation.def * mods.def };
}

// Rachas de forma: los últimos CAREER_FORM_STREAK_LOOKBACK resultados de
// Liga de un equipo (table[idx].form, el mismo array que ya pinta
// ligaFormHtml en la vista "Forma" de Competiciones) dan un empujón
// pequeño de potencia al SIGUIENTE partido -- a petición explícita ("la
// Forma... podría afectar ligeramente el rendimiento en el próximo
// partido... un equipo en racha rinde un poco mejor"). Solo cuenta
// cuando ya hay 3 resultados de qué tirar (si no, 0, nada que premiar o
// castigar todavía); wins-losses va de -3 a 3, así que el modificador
// queda entre -2 y +2 -- "ligeramente", nunca decide un partido por sí
// solo. Se usa tanto para el rival (careerRivalPowerWithForm) como para
// TI (aplicado directo con table[0] donde se calcula myPower) en
// Jornada, la única competición con tabla/forma de verdad (Copa y
// Champions son de eliminación directa, sin rachas que mirar).
var CAREER_FORM_STREAK_LOOKBACK = 3;
var CAREER_FORM_STREAK_FACTOR = 0.6;
function careerFormPowerModifier(table, idx) {
  var form = (table[idx] && table[idx].form) || [];
  var recent = form.slice(-CAREER_FORM_STREAK_LOOKBACK);
  if (recent.length < CAREER_FORM_STREAK_LOOKBACK) return 0;
  var wins = recent.filter(function (r) { return r === 'V'; }).length;
  var losses = recent.filter(function (r) { return r === 'D'; }).length;
  return Math.round((wins - losses) * CAREER_FORM_STREAK_FACTOR);
}
function careerRivalPowerWithForm(name, table, idx) {
  return clamp(careerRivalPower(name) + careerFormPowerModifier(table, idx), 0, 100);
}

// Plantel "fantasma" para goleadores/asistentes de cualquier gol que no
// sea tuyo (mismo truco que futDraftUndraftedPool, pero excluyendo tus
// 16 del Modo Carrera en vez del draft de un FutDraft) -- así un rival
// nunca "marca" con el nombre de uno de tus propios jugadores.
function careerGhostPool(c) {
  var myIds = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; }));
  return ROSTER.filter(function (p) { return myIds.indexOf(p.id) === -1; });
}
// Plantilla fantasma FIJA por equipo rival, no todo el roster suelto de
// golpe -- a petición explícita ("haz que sea más complicado ganar el
// máximo goleador... eso no tiene sentido"). Antes cada gol rival salía
// de un sorteo entre TODO el roster (300+ jugadores) sin ninguna
// continuidad, así que ningún rival concreto acumulaba goles de verdad
// en toda la temporada y tu delantero (que juega y marca cada semana)
// ganaba el Pichichi casi seguro, quedases donde quedases en la tabla.
// Ahora cada equipo tiene sus 16 jugadores fantasma fijos para toda la
// temporada (elegidos una vez, cacheados en league.ghostSquads), así que
// un rival de verdad puede tener su propio máximo goleador consistente
// semana a semana y hacerte competencia real.
function careerTeamGhostPool(c, league, teamIdx) {
  league.ghostSquads = league.ghostSquads || {};
  if (league.ghostSquads[teamIdx]) return league.ghostSquads[teamIdx];
  var myIds = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; }));
  // BUG REAL arreglado: cada equipo elegía sus 16 fantasma con un sorteo
  // INDEPENDIENTE del resto de rivales, así que el mismo jugador (p.ej. un
  // delantero real) podía tocarle en el sorteo a DOS equipos rivales
  // distintos a la vez -- sus goles se repartían entre ambos y su "equipo"
  // en el ranking de goleadores cambiaba de un partido a otro sin sentido
  // ("el máximo goleador... lleva 15 goles con el Wild, pues si mete otro
  // gol, cambia de equipo"). Ahora se lleva la cuenta de TODOS los ids ya
  // usados por cualquier equipo esta temporada (league.ghostUsedIds) y se
  // excluyen también, así que cada jugador pertenece a un único equipo
  // fantasma fijo toda la temporada.
  var usedIds = league.ghostUsedIds || (league.ghostUsedIds = myIds.slice());
  // Jugadores REALES del equipo (campo equipo del roster), a petición
  // explícita ("que los rivales de Carrera empiecen a usar sus jugadores
  // reales por equipo"): un rival con plantilla propia marca con los suyos
  // (Genesis con Xene, Nero...). Los que no llegan a los 16 se rellenan
  // con jugadores de equipos que NO juegan esta liga (así nunca se le
  // roba a otro rival un jugador suyo) y con la misma forma de once.
  var teamName = league.teamNames[teamIdx];
  var realPlayers = ROSTER.filter(function (p) { return p.equipo === teamName && usedIds.indexOf(p.id) === -1; }).slice(0, 16);
  var leagueTeams = {};
  league.teamNames.forEach(function (n) { leagueTeams[n] = true; });
  var pool = ROSTER.filter(function (p) { return usedIds.indexOf(p.id) === -1 && !leagueTeams[p.equipo] && realPlayers.indexOf(p) === -1; });
  // BUG REAL arreglado: los 16 fantasma salían de un sorteo TOTALMENTE
  // libre por posición (podía tocarle a un rival 0 delanteros, o 8), así
  // que sus goles se repartían entre muchos más jugadores de los que le
  // tocaría a un once de verdad -- eso diluía mucho a su máximo goleador
  // frente al tuyo (con solo 2 delanteros de verdad, concentras tus goles
  // en menos gente), y explica que "me vuelvo a llevar todos los
  // premios" incluso quedando lejos en Liga. Ahora cada plantilla
  // fantasma tiene una forma realista (2 porteros, 5 defensas, 5
  // centrocampistas, 4 delanteros), así que un rival concentra sus goles
  // en sus pocos delanteros reales, como haría un equipo de verdad.
  var squad = careerFillGhostSquad(realPlayers, pool);
  squad.forEach(function (p) { usedIds.push(p.id); });
  league.ghostSquads[teamIdx] = squad;
  return squad;
}
// Completa una plantilla fantasma a 16 con la forma de un once (2 porteros,
// 5 defensas, 5 centrocampistas, 4 delanteros) descontando los jugadores
// reales que ya trae; si el pool se queda corto, rellena con lo que quede.
function careerFillGhostSquad(real, pool) {
  var GHOST_SHAPE = { Portero: 2, Defensa: 5, Centrocampista: 5, Delantero: 4 };
  var byPos = { Portero: [], Defensa: [], Centrocampista: [], Delantero: [] };
  pool.forEach(function (p) { if (byPos[p.posicion]) byPos[p.posicion].push(p); });
  Object.keys(byPos).forEach(function (pos) { byPos[pos].sort(function () { return Math.random() - 0.5; }); });
  var squad = real.slice();
  Object.keys(GHOST_SHAPE).forEach(function (pos) {
    var have = real.filter(function (p) { return p.posicion === pos; }).length;
    squad = squad.concat(byPos[pos].slice(0, Math.max(0, GHOST_SHAPE[pos] - have)));
  });
  if (squad.length < 16) {
    var chosenIds = squad.map(function (p) { return p.id; });
    var leftovers = pool.filter(function (p) { return chosenIds.indexOf(p.id) === -1; }).sort(function () { return Math.random() - 0.5; });
    squad = squad.concat(leftovers.slice(0, 16 - squad.length));
  }
  return squad;
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
// Estadísticas de goleadores/asistentes de la Liga: los rivales cuentan el
// DOBLE (cada gol/asistencia se apunta dos veces), a petición explícita
// ("que tengan prácticamente el doble de estadísticas... siempre gano la
// bota de oro y de asistencias") -- los tuyos, una vez.
// ===== Goleadores y asistentes de Copa y Champions =====
// A petición explícita ("que también haya máximos goleadores y asistentes
// en copa y champions y se pueda ver"): cada competición guarda sus
// propias estadísticas de la temporada (cup.stats/champions.stats, se
// reinician con la competición cada año). Tus goles salen de tus partidos
// (jugados o saltados); los de los rivales, de su plantilla real por
// equipo (campo equipo) + relleno, y los cruces entre CPU reparten goles
// coherentes con quien pasa de ronda.
function careerCompStats(comp) {
  comp.stats = comp.stats || { scorers: {}, assists: {} };
  return comp.stats;
}
function careerCompNames(comp) {
  var names = [];
  if (comp.rounds && comp.rounds[0]) comp.rounds[0].forEach(function (m) { names.push(m.a.name, m.b.name); });
  if (comp.groups) comp.groups.forEach(function (g) { g.forEach(function (t) { names.push(t.name); }); });
  return names;
}
function careerCompGhostSquad(c, comp, teamName) {
  comp.ghosts = comp.ghosts || {};
  if (comp.ghosts[teamName]) return comp.ghosts[teamName];
  var myIds = c.lineup.map(function (s) { return s.player.id; }).concat(c.bench.map(function (p) { return p.id; }));
  var used = comp.ghostUsed || (comp.ghostUsed = myIds.slice());
  var inComp = {};
  careerCompNames(comp).forEach(function (n) { inComp[n] = true; });
  var real = ROSTER.filter(function (p) { return p.equipo === teamName && used.indexOf(p.id) === -1; }).slice(0, 16);
  var pool = ROSTER.filter(function (p) { return used.indexOf(p.id) === -1 && !inComp[p.equipo] && real.indexOf(p) === -1; });
  var squad = careerFillGhostSquad(real, pool);
  // Con 64 equipos el roster no da para plantillas sin repetir: si se queda
  // corto, se repite relleno de cualquier equipo (solo afecta a estas stats).
  if (squad.length < 8) squad = careerFillGhostSquad(real, ROSTER.filter(function (p) { return myIds.indexOf(p.id) === -1 && real.indexOf(p) === -1; }));
  squad.forEach(function (p) { used.push(p.id); });
  comp.ghosts[teamName] = squad;
  return squad;
}
// Goles de un equipo CPU en un cruce de Copa/Champions -> sus goleadores.
function careerRecordCompTeamGoals(c, comp, team, goals) {
  if (!c || !team || team.isPlayer || !goals) return;
  var pool = careerCompGhostSquad(c, comp, team.name);
  var events = [];
  for (var i = 0; i < goals; i++) events.push(futDraftGoalEvent(pool));
  careerRecordLeagueStats(careerCompStats(comp), events, team.name, false);
}
// Cruce entre dos equipos CPU: marcador coherente con el ganador ya decidido.
function careerCompCpuGoals(comp, m, winner) {
  var c = G.career;
  if (!c || m.a.isPlayer || m.b.isPlayer) return;
  var g = simulateCpuMatchGoals(m.a, m.b);
  if (winner === m.a && g[0] <= g[1]) g[0] = g[1] + 1;
  if (winner === m.b && g[1] <= g[0]) g[1] = g[0] + 1;
  careerRecordCompTeamGoals(c, comp, m.a, g[0]);
  careerRecordCompTeamGoals(c, comp, m.b, g[1]);
}
// Tu partido (jugado o saltado): tus goles + los del rival con su plantilla.
function careerRecordMyCompMatch(c, comp, oppName, myEvents, oppEvents, oppGoals) {
  var stats = careerCompStats(comp);
  careerRecordLeagueStats(stats, myEvents, 'Tu equipo', true);
  if (!oppEvents) {
    var pool = careerCompGhostSquad(c, comp, oppName);
    oppEvents = [];
    for (var i = 0; i < oppGoals; i++) oppEvents.push(futDraftGoalEvent(pool));
  }
  careerRecordLeagueStats(stats, oppEvents, oppName, false);
}
function careerRecordLeagueStats(stats, events, label, isMine) {
  futDraftRecordGoalEvents(stats, events, label);
  if (!isMine) futDraftRecordGoalEvents(stats, events, label);
}
function careerRecordMatchGoals(c, league, homeIdx, awayIdx, homeGoals, awayGoals) {
  var homeLabel = homeIdx === 0 ? 'Tu equipo' : league.teamNames[homeIdx];
  var awayLabel = awayIdx === 0 ? 'Tu equipo' : league.teamNames[awayIdx];
  var myPlayers = c.lineup.map(function (s) { return s.player; });
  var homePool = homeIdx === 0 ? myPlayers : careerTeamGhostPool(c, league, homeIdx);
  var awayPool = awayIdx === 0 ? myPlayers : careerTeamGhostPool(c, league, awayIdx);
  var homeEvents = [], awayEvents = [];
  for (var i = 0; i < homeGoals; i++) homeEvents.push(futDraftGoalEvent(homePool));
  for (var j = 0; j < awayGoals; j++) awayEvents.push(futDraftGoalEvent(awayPool));
  careerRecordLeagueStats(league.stats, homeEvents, homeLabel, homeIdx === 0);
  careerRecordLeagueStats(league.stats, awayEvents, awayLabel, awayIdx === 0);
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
  // totalTeams se guarda junto a la posición (no solo el número) porque
  // las dos divisiones tienen tamaños distintos (16/20) -- sin esto no
  // se podría enseñar "Xº de Y" con el Y correcto en Estadísticas.
  if (!c.bestPosition || position < c.bestPosition.position) c.bestPosition = { position: position, totalTeams: c.league.teamNames.length };
}
// Tu puesto final en la tabla (1 = primero), null si por lo que sea no
// se encuentra (no debería pasar, "Tú" siempre está en la tabla).
function careerFinalLeaguePosition(c) {
  var sorted = ligaSortedTable(c.league.table);
  var idx = sorted.findIndex(function (t) { return t.idx === 0; });
  return idx === -1 ? null : idx + 1;
}
// Premio de fin de Liga según la posición final, a petición explícita.
// Primera: 1º 25M€, 2º 20M€, 3º 15M€, 4º 10M€, 5º 5M€, y desde el 6º baja
// 0.1M€ por puesto. Segunda paga bastante menos (división menor): 1º
// 6.5M€, 2º 4M€, 3º 3M€, y desde el 4º baja 0.1M€ por puesto (4º 2.9M€,
// 5º 2.8M€...).
// Ingresos de competición/patrocinio recortados un 40% (a petición explícita:
// "que se gane menos dinero en cada temporada"): premio de Liga, victorias,
// Copa/Champions/Supercopa, Federación y patrocinadores.
var CAREER_INCOME_SCALE = 0.6;
function careerLeaguePositionBonus(position, division) {
  return Math.round(careerLeaguePositionBonusBase(position, division) * CAREER_INCOME_SCALE * careerPrizeSeasonFactor() * 10) / 10;
}
function careerLeaguePositionBonusBase(position, division) {
  if (division === 2) {
    if (position <= 1) return 6.5;
    if (position === 2) return 4;
    if (position === 3) return 3;
    return Math.round((3 - (position - 3) * 0.1) * 10) / 10;
  }
  if (position <= 1) return 25;
  if (position === 2) return 20;
  if (position === 3) return 15;
  if (position === 4) return 10;
  if (position === 5) return 5;
  return Math.round((5 - (position - 5) * 0.1) * 10) / 10;
}
// Se concede UNA sola vez, justo al jugar la última jornada de la
// temporada (mismo patrón que careerCupMaybeAwardChampion con su propio
// flag -- aquí league.finishBonusAwarded -- para no darlo dos veces si
// se repasa la pantalla de Jornada antes de pulsar "Empezar temporada").
// c.lastLeagueFinish queda guardado para el resumen de temporada
// (careerSeasonSummaryHtml), que se sigue viendo hasta que se pulsa ese
// botón (actionStartNewCareerSeason reconstruye la liga de cero).
// ===== Directiva =====
// Objetivos de la directiva con riesgo de despido (a petición explícita).
// Cada temporada la directiva marca una posición MÁXIMA en la Liga según lo
// fuerte que sea tu equipo frente al resto (careerBoardComputeTarget: tu
// puesto esperado + un margen de 2). Tienes una "confianza" de 0 a 100
// (empieza en 100): a mitad de temporada hay una revisión (si vas peor que el
// objetivo + 2 baja un poco) y al acabar la Liga se evalúa el puesto final.
// Cumplir sube la confianza, quedarte cerca la baja algo y fallar por mucho
// la hunde un poco más. Es difícil que te echen a propósito: fallando TODO cada
// temporada (peor caso, -23) hacen falta 5 temporadas para llegar a 0 (c.fired).
var CAREER_BOARD_START_CONFIDENCE = 100;
var CAREER_BOARD_TARGET_MARGIN = 2;
// Estilo de directiva (elegido al crear la carrera, renderCareerSetup):
// cambia el margen del objetivo (más margen = objetivo más fácil de
// cumplir) y cuánto duelen los malos resultados -- a petición explícita
// ("elegir el estilo de directiva, exigente/tranquila").
var CAREER_BOARD_STYLES = {
  tranquila: { name: 'Tranquila', marginBonus: 2, deltaMult: 0.6 },
  normal: { name: 'Normal', marginBonus: 0, deltaMult: 1 },
  exigente: { name: 'Exigente', marginBonus: -2, deltaMult: 1.5 }
};
function careerBoardStyle(c) { return CAREER_BOARD_STYLES[c.boardStyle] || CAREER_BOARD_STYLES.normal; }
function careerBoardComputeTarget(c) {
  var league = c.league;
  var n = league.teamNames.length;
  var mine = careerMatchTeamScore(c);
  var rank = 1;
  for (var i = 1; i < n; i++) {
    if (careerRivalPower(league.teamNames[i]) > mine) rank++;
  }
  var margin = CAREER_BOARD_TARGET_MARGIN + careerBoardStyle(c).marginBonus;
  return clamp(rank + margin, 2, n - 3);
}
function careerEnsureBoard(c) {
  if (!c.board) {
    c.board = { targetPosition: careerBoardComputeTarget(c), confidence: CAREER_BOARD_START_CONFIDENCE, midWarning: false, startBudget: c.budget, objectives: [] };
    careerRollBoardObjectives(c);
  } else if (!c.board.objectives) {
    // Partidas de antes: el objetivo extra único pasa a la lista nueva.
    c.board.objectives = c.board.extraObjective ? [Object.assign({ reward: 5, penalty: 5 }, c.board.extraObjective)] : [];
    c.board.extraObjective = null;
    if (c.board.startBudget === undefined) c.board.startBudget = c.budget;
  }
  return c.board;
}
// La confianza de la directiva SOLO se mueve al acabar la temporada (no
// partido a partido, a petición explícita): los trofeos ganados durante
// el año se apuntan aquí y suman al hacer la revisión final
// (careerBoardSeasonReview), junto con los objetivos extra.
function careerBoardNoteTrophy(c, kind) {
  var board = careerEnsureBoard(c);
  board.trophies = (board.trophies || []).concat([kind]);
}
var CAREER_BOARD_TROPHY_BOOST = { cup: 4, champions: 8, supercopa: 3 };
function careerBoardMidseasonReview(c) {
  var board = careerEnsureBoard(c);
  var half = Math.floor(c.league.schedule.length / 2);
  if (c.league.matchdayIndex !== half || board.midWarning) return;
  var position = careerCurrentLeaguePosition(c);
  if (position !== null && position > board.targetPosition + 2) {
    board.confidence = Math.max(0, board.confidence - 3 * careerBoardStyle(c).deltaMult);
    board.midWarning = true;
    if (board.confidence <= 0) careerBoardFire(c, position);
  }
}
function careerCurrentLeaguePosition(c) {
  var sorted = ligaSortedTable(c.league.table);
  var idx = sorted.findIndex(function (t) { return t.idx === 0; });
  return idx === -1 ? null : idx + 1;
}
// Ironman (elegido al crear la carrera): si te despiden, se borra el
// hueco de guardado -- no puedes recargar la partida desde antes del
// despido, a petición explícita ("un modo ironman sin poder cargar
// partida tras una derrota importante").
function careerBoardFire(c, position) {
  c.fired = { season: c.season || 1, position: position, target: careerEnsureBoard(c).targetPosition, division: c.division };
  if (c.ironman && G.careerActiveSlot) { try { localStorage.removeItem(careerSlotKey(G.careerActiveSlot)); } catch (e) {} }
}
// Evalúa el puesto final. Devuelve y guarda el resumen para enseñarlo.
function careerBoardSeasonReview(c, position) {
  var board = careerEnsureBoard(c);
  var before = board.confidence;
  var diff = position - board.targetPosition;
  var style = careerBoardStyle(c);
  var delta = diff <= 0 ? Math.round(10 / style.deltaMult) : Math.round((diff <= 2 ? -3 : (diff <= 5 ? -8 : -15)) * style.deltaMult);
  var n = c.league.teamNames.length;
  if (c.division === 1 && position > n - CAREER_PROMOTION_SPOTS) delta -= Math.round(5 * style.deltaMult);
  // Objetivos extra: los ya cobrados a mitad de temporada no se cuentan dos
  // veces; los cumplidos ahora suman su premio, los fallados restan.
  var objectiveResults = careerBoardObjectivesStatus(c, board);
  objectiveResults.forEach(function (r) {
    delta += r.met ? r.obj.reward : -r.obj.penalty;
  });
  var trophyBoost = (board.trophies || []).reduce(function (sum, k) { return sum + (CAREER_BOARD_TROPHY_BOOST[k] || 0); }, 0);
  delta += trophyBoost;
  board.confidence = clamp(before + delta, 0, 100);
  c.lastBoardReview = { position: position, target: board.targetPosition, delta: delta, before: before, after: board.confidence, fired: board.confidence <= 0, objectives: objectiveResults.map(function (r) { return { met: r.met, label: r.label, type: r.obj.type, reward: r.obj.reward }; }), trophyBoost: trophyBoost };
  if (board.confidence <= 0) careerBoardFire(c, position);
  return c.lastBoardReview;
}
// Información de presentación de cada objetivo extra (título, detalle y
// porcentaje de progreso) para el panel de la directiva.
function careerObjectiveInfo(c, r) {
  var o = r.obj, n = r.count;
  function pct(v, g) { return g > 0 ? Math.max(0, Math.min(100, Math.round(v / g * 100))) : 0; }
  var total = c.cup ? Math.log2(c.cup.size) : 1;
  var reached = c.cup ? (c.cup.eliminated ? c.cup.eliminatedRound : c.cup.rounds.length - 1) : 0;
  var roundText = c.cup ? roundNameForIndex(reached, total) : '';
  switch (o.type) {
    case 'element': return { title: 'Titulares de tipo ' + o.element, detail: 'Llevas ' + n + ' de ' + o.required, pct: pct(n, o.required) };
    case 'academy': return { title: 'Titulares de cantera', detail: 'Llevas ' + n + ' de ' + o.required, pct: pct(n, o.required) };
    case 'goals': return { title: 'Goles en Liga', detail: 'Llevas ' + n + ' de ' + o.target, pct: pct(n, o.target) };
    case 'wins': return { title: 'Victorias en Liga', detail: 'Llevas ' + n + ' de ' + o.target, pct: pct(n, o.target) };
    case 'defense': return { title: 'Goles encajados', detail: 'Llevas ' + n + ', el límite es ' + o.target, pct: pct(n, o.target), inverse: true };
    case 'savings': return { title: 'Ahorro de presupuesto', detail: 'Ahora tienes ' + c.budget + ' M€, el mínimo es ' + (c.board.startBudget !== undefined ? c.board.startBudget : c.budget) + ' M€', pct: pct(c.budget, c.board.startBudget || 1) };
    case 'scorer': return { title: 'Máximo goleador de la Liga', detail: 'Tu mejor goleador lleva ' + n, pct: r.met ? 100 : Math.min(95, n * 8) };
    case 'cup': return { title: 'Ganar la Copa del Rey', detail: c.cup && c.cup.eliminated ? 'Eliminado en ' + roundText : 'Ronda actual: ' + roundText, pct: r.met ? 100 : pct(reached, total) };
    case 'cupSemi': return { title: 'Semifinales de la Copa', detail: c.cup && c.cup.eliminated ? 'Eliminado en ' + roundText : 'Ronda actual: ' + roundText, pct: r.met ? 100 : pct(reached + 1, total - 1) };
    case 'championsKO': return { title: 'Pasar la fase de grupos', detail: r.met ? 'Superada' : (c.champions ? 'En fase de grupos' : 'Sin clasificar'), pct: r.met ? 100 : (c.champions ? 45 : 0) };
    case 'champions': return { title: 'Ganar la Champions League', detail: r.met ? 'Campeón' : (c.champions ? (c.champions.phase === 'knockout' ? 'En eliminatorias' : 'En fase de grupos') : 'Sin clasificar'), pct: r.met ? 100 : (c.champions ? (c.champions.phase === 'knockout' ? 70 : 30) : 0) };
  }
  return { title: r.label, detail: '', pct: r.met ? 100 : 0 };
}
var CAREER_TROPHY_NAMES = { cup: 'Copa del Rey', champions: 'Champions League', supercopa: 'Supercopa' };
function careerBoardTier(conf) {
  if (conf >= 70) return { name: 'Segura', cls: 'tier-safe' };
  if (conf >= 40) return { name: 'Estable', cls: 'tier-ok' };
  if (conf >= 20) return { name: 'Vulnerable', cls: 'tier-warn' };
  return { name: 'Crítica', cls: 'tier-bad' };
}
function renderCareerBoardPanel(c) {
  var board = careerEnsureBoard(c);
  var position = careerCurrentLeaguePosition(c);
  var n = c.league.teamNames.length;
  var conf = Math.round(board.confidence);
  var tier = careerBoardTier(conf);
  var onTarget = position !== null && position <= board.targetPosition;
  var status = position === null ? 'Sin clasificación todavía' : (onTarget ? 'Cumpliendo el objetivo' : (position <= board.targetPosition + 2 ? 'Ligeramente por debajo' : 'Por debajo del objetivo'));
  var span = Math.max(1, n - board.targetPosition);
  var posPct = position === null ? 0 : Math.max(0, Math.min(100, Math.round((n - position) / span * 100)));
  var objectives = careerBoardObjectivesStatus(c, board).map(function (r) {
    var info = careerObjectiveInfo(c, r);
    var stateCls = r.met ? 'board-obj-done' : (info.inverse && info.pct >= 85 ? 'board-obj-risk' : '');
    return '<div class="board-obj ' + stateCls + '">' +
      '<div class="board-obj-top"><span class="board-obj-title">' + escapeHtml(info.title) + '</span>' +
        '<span class="board-pill ' + (r.met ? 'pill-done' : 'pill-run') + '">' + (r.met ? 'Cumplido' : 'En curso') + '</span></div>' +
      '<div class="board-bar"><span style="width:' + info.pct + '%"></span></div>' +
      '<div class="board-obj-bottom"><span>' + escapeHtml(info.detail) + '</span><span class="board-obj-reward">+' + r.obj.reward + ' o -' + r.obj.penalty + '</span></div>' +
    '</div>';
  }).join('');
  var trophies = (board.trophies || []).map(function (k) { return '<span class="board-chip">' + escapeHtml(CAREER_TROPHY_NAMES[k] || k) + ' +' + (CAREER_BOARD_TROPHY_BOOST[k] || 0) + '</span>'; }).join('');
  return '<div class="board-card">' +
    '<div class="board-head">' +
      '<div><div class="board-kicker">Directiva</div><div class="board-title">Confianza ' + tier.name.toLowerCase() + '</div></div>' +
      '<div class="board-score ' + tier.cls + '">' + conf + '<small>/100</small></div>' +
    '</div>' +
    '<div class="board-meter ' + tier.cls + '"><span style="width:' + conf + '%"></span><i style="left:20%"></i><i style="left:40%"></i><i style="left:70%"></i></div>' +
    '<div class="board-scale"><span>Crítica</span><span>Vulnerable</span><span>Estable</span><span>Segura</span></div>' +
    '<p class="board-note">Si la confianza llega a 0, te despiden. Solo se actualiza al acabar la temporada.</p>' +
    '<div class="board-section">Objetivo de liga</div>' +
    '<div class="board-obj ' + (onTarget ? 'board-obj-done' : '') + '">' +
      '<div class="board-obj-top"><span class="board-obj-title">Acabar ' + board.targetPosition + 'º o mejor</span><span class="board-pill ' + (onTarget ? 'pill-done' : 'pill-run') + '">' + (position === null ? 'Sin datos' : 'Ahora ' + position + 'º') + '</span></div>' +
      '<div class="board-bar"><span style="width:' + posPct + '%"></span></div>' +
      '<div class="board-obj-bottom"><span>' + status + '</span><span class="board-obj-reward">Puesto ' + board.targetPosition + ' de ' + n + '</span></div>' +
    '</div>' +
    (objectives ? '<div class="board-section">Objetivos extra</div>' + objectives : '') +
    (trophies ? '<div class="board-section">Trofeos de la temporada</div><div class="board-chips">' + trophies + '</div>' : '') +
  '</div>';
}
function renderCareerFired(c) {
  var f = c.fired;
  return '<div class="screen">' +
    '<div class="panel center-text">' +
      '<h2 class="panel-title mb0">Despedido</h2>' +
      '<p style="font-size:2.4rem;margin:8px 0">📦</p>' +
      '<p class="dim small">La directiva ha perdido la confianza en ti al final de la temporada ' + f.season + ': acabaste ' + f.position + 'º en ' + escapeHtml(careerDivisionName(f.division)) + ' y el objetivo era el ' + f.target + 'º.</p>' +
      '<p class="dim small">Títulos en tu palmarés: Ligas ' + (c.ligaTitlesWon || 0) + ', Copas ' + (c.cupsWon || 0) + ', Champions ' + (c.championsWon || 0) + '.</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionGoCareerMode()">Nueva carrera</button>' +
      '<button class="btn btn-outline btn-block mt" onclick="actionBackToMenu()">Volver al menú</button>' +
    '</div>' +
  '</div>';
}

// ===== Patrocinadores =====
// Pestaña propia (sustituye al viejo sistema automático de "objetivos de
// patrocinador"). 5 ofertas al empezar cada temporada, firmas como mucho
// una. Nombres graciosos + icono propio por tipo, a petición explícita
// ("estéticamente más chulos, con nombres graciosos"). Balanceadas para
// que el ingreso ESPERADO en toda la temporada sea parecido entre las 5
// (unos ~10 M€ en Primera), contando cuánto se cobra de verdad en una
// temporada típica -- perWin con ~18 victorias, perTrophy con ~0.2
// títulos de media (paga mucho de golpe porque es raro que toque),
// element con ~75% de posibilidades de cumplirse, perMatch con las 38
// jornadas de la Liga. División 2 cobra bastante menos que División 1
// (careerSponsorScale), igual que el resto de premios de la carrera.
var CAREER_SPONSOR_ELEMENT_REQUIRED_COUNT = 4;
var CAREER_SPONSOR_ELEMENT_REQUIRED_MATCHES = 15;
var CAREER_SPONSOR_NAMES = {
  fixed: ['Churrería El Golazo', 'Bocadillos Media Parte', 'Neumáticos Rayo Azul', 'Colchones El Meta'],
  perWin: ['Energéticas Trueno FC', 'Suplementos Victoria Total', 'Gimnasio Músculo de Acero', 'Zapatillas Rayo Veloz'],
  perTrophy: ['Joyería Copa de Oro', 'Relojería El Campeón', 'Champán Final Feliz', 'Trofeos Dorado & Cía'],
  perMatch: ['Taxis Media Parte', 'Pizzería El Once Inicial', 'Autobuses Gradas Llenas', 'Palomitas Estadio Lleno']
};
var CAREER_SPONSOR_ELEMENT_NAMES = {
  Fuego: ['Salsas Picantes Volcán', 'Barbacoas Brasa Eterna'],
  Bosque: ['Herbolario Hoja Sagrada', 'Viveros Raíz Verde'],
  Viento: ['Aerolíneas Ráfaga', 'Ventiladores Huracán'],
  Montaña: ['Cementos Peña Alta', 'Mochilas Cumbre Firme']
};
var CAREER_SPONSOR_ICONS = { fixed: '💰', perWin: '🏋️', perTrophy: '🏆', element: '🧪', perMatch: '🚌' };
// Patrocinadores bajos la primera temporada y subiendo poco a poco, y
// premios (Liga, victorias, títulos) que también crecen progresivamente, a
// petición explícita ("baja patrocinadores la primera temporada, y haz que
// vaya subiendo progresivamente los premios").
function careerSponsorSeasonFactor(c) { return Math.min(1.3, 0.5 + 0.1 * ((c.season || 1) - 1)); }
function careerPrizeSeasonFactor() { var c = G.career; return Math.min(1.3, 0.75 + 0.06 * (((c && c.season) || 1) - 1)); }
function careerSponsorScale(c) { return (c.division === 2 ? 0.4 : 1) * CAREER_INCOME_SCALE * careerSponsorSeasonFactor(c); }
// Rebalanceado a petición explícita ("no tiene sentido que el que te
// paga por toda la temporada dé más que el que te exige 4 jugadores de
// una afinidad"): el de elemento es el más exigente de los 5 (necesita
// tener y MANTENER una composición de plantilla concreta 15 jornadas
// seguidas o no), así que ahora es el que más paga de media; fijo y por
// título (todo o nada, dependen de suerte/logro puntual) quedan en
// medio; por victoria y, sobre todo, partido a partido (el más fácil de
// cumplir, cobras juegues como juegues) quedan los más bajos.
function careerGenerateSponsorOffers(c) {
  var scale = careerSponsorScale(c);
  var round1 = function (n) { return Math.round(n * 10) / 10; };
  var fixedAmount = round1((9 + Math.random() * 4) * scale);
  var perWin = round1((0.3 + Math.random() * 0.2) * scale);
  var perTrophy = round1((45 + Math.random() * 25) * scale);
  var element = choice(TYPES);
  var elementReward = round1((16 + Math.random() * 8) * scale);
  var perMatch = Math.round((0.1 + Math.random() * 0.1) * scale * 100) / 100;
  return [
    { id: 'fixed', kind: 'fixed', label: choice(CAREER_SPONSOR_NAMES.fixed), icon: CAREER_SPONSOR_ICONS.fixed, amount: fixedAmount,
      desc: fixedAmount + ' M€ de golpe al firmar.' },
    { id: 'perWin', kind: 'perWin', label: choice(CAREER_SPONSOR_NAMES.perWin), icon: CAREER_SPONSOR_ICONS.perWin, perWin: perWin,
      desc: perWin + ' M€ por cada victoria de Liga.' },
    { id: 'perTrophy', kind: 'perTrophy', label: choice(CAREER_SPONSOR_NAMES.perTrophy), icon: CAREER_SPONSOR_ICONS.perTrophy, perTrophy: perTrophy,
      desc: perTrophy + ' M€ por cada título que ganes (Liga, Copa, Champions o Supercopa).' },
    { id: 'element', kind: 'element', label: choice(CAREER_SPONSOR_ELEMENT_NAMES[element]), icon: CAREER_SPONSOR_ICONS.element, element: element,
      requiredCount: CAREER_SPONSOR_ELEMENT_REQUIRED_COUNT, requiredMatches: CAREER_SPONSOR_ELEMENT_REQUIRED_MATCHES, reward: elementReward,
      desc: elementReward + ' M€ de golpe si juegas ' + CAREER_SPONSOR_ELEMENT_REQUIRED_MATCHES + ' jornadas con ' + CAREER_SPONSOR_ELEMENT_REQUIRED_COUNT + '+ jugadores ' + element + ' en el once inicial.' },
    { id: 'perMatch', kind: 'perMatch', label: choice(CAREER_SPONSOR_NAMES.perMatch), icon: CAREER_SPONSOR_ICONS.perMatch, perMatch: perMatch,
      desc: perMatch + ' M€ cada jornada de Liga que juegues, ganes o no.' }
  ];
}
window.actionSignCareerSponsor = function (offerId) {
  var c = G.career;
  if (c.activeSponsor) return;
  var offer = (c.sponsorOffers || []).find(function (o) { return o.id === offerId; });
  if (!offer) return;
  c.activeSponsor = Object.assign({ totalEarned: 0, matchesWithElement: 0, rewardClaimed: false }, offer);
  c.sponsorOffers = null;
  if (offer.kind === 'fixed') {
    c.budget = Math.round((c.budget + offer.amount) * 10) / 10;
    c.activeSponsor.totalEarned = offer.amount;
  }
  c.sponsorMessage = 'Firmado: ' + offer.label + '.';
  render();
};
// Por victoria/por partido: se cobra en el momento, mismo sitio que el
// bono de victoria de Primera (careerAwardWinBonus, llamado una vez por
// cada jornada de Liga jugada de verdad -- ni Copa, ni Champions, ni
// Supercopa cuentan).
function careerApplySponsorMatchPayout(c, myGoals, oppGoals) {
  var s = c.activeSponsor;
  if (!s) return;
  var earned = 0;
  if (s.kind === 'perWin' && myGoals > oppGoals) earned = s.perWin;
  else if (s.kind === 'perMatch') earned = s.perMatch;
  if (earned > 0) {
    c.budget = Math.round((c.budget + earned) * 10) / 10;
    s.totalEarned = Math.round((s.totalEarned + earned) * 100) / 100;
  }
}
// Por título: se llama desde las 4 funciones que conceden un trofeo de
// verdad (Liga/Copa/Champions/Supercopa), justo cuando lo ganas.
function careerApplySponsorTrophyPayout(c) {
  var s = c.activeSponsor;
  if (!s || s.kind !== 'perTrophy') return;
  c.budget = Math.round((c.budget + s.perTrophy) * 10) / 10;
  s.totalEarned = Math.round((s.totalEarned + s.perTrophy) * 100) / 100;
}
// Por elemento: se llama junto a careerRecordStarterAppearances (mismo
// sitio, una vez por jornada de Liga jugada de verdad) -- cuenta la
// jornada si el once inicial de ESE partido (c.lineup, todavía sin
// cambiar) tiene suficientes jugadores del elemento pedido, y paga el
// premio de golpe en cuanto se llega al número de jornadas necesario.
function careerApplySponsorElementPayout(c) {
  var s = c.activeSponsor;
  if (!s || s.kind !== 'element' || s.rewardClaimed) return;
  var countInLineup = c.lineup.filter(function (slot) { return slot.player.tipo === s.element; }).length;
  if (countInLineup >= s.requiredCount) s.matchesWithElement = (s.matchesWithElement || 0) + 1;
  if (s.matchesWithElement >= s.requiredMatches) {
    s.rewardClaimed = true;
    c.budget = Math.round((c.budget + s.reward) * 10) / 10;
    s.totalEarned = Math.round((s.totalEarned + s.reward) * 100) / 100;
  }
}
function renderCareerPatrocinadores(c) {
  var all = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var squadValue = Math.round(all.reduce(function (sum, p) { return sum + careerPlayerValue(p); }, 0) * 10) / 10;
  var headerHtml =
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Patrocinadores</h3>' +
      '<p class="dim small">Presupuesto: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong> · Plantilla: <strong style="color:var(--accent-2)">' + squadValue + ' M€</strong></p>' +
      (c.sponsorMessage ? '<p class="dim small">' + escapeHtml(c.sponsorMessage) + '</p>' : '') +
    '</div>';
  if (c.activeSponsor) {
    var s = c.activeSponsor;
    var progressHtml = s.kind === 'element'
      ? '<div class="sponsor-progress-track"><div class="sponsor-progress-fill" style="width:' + Math.round(clamp((s.matchesWithElement || 0) / s.requiredMatches, 0, 1) * 100) + '%"></div></div>' +
        '<p class="dim small">' + (s.matchesWithElement || 0) + ' / ' + s.requiredMatches + ' jornadas' + (s.rewardClaimed ? ' · premio cobrado' : '') + '</p>'
      : '';
    return headerHtml +
      '<div class="sponsor-card sponsor-card-active">' +
        '<div class="sponsor-card-head"><span class="sponsor-card-icon">' + s.icon + '</span><span class="sponsor-card-name">' + escapeHtml(s.label) + '</span></div>' +
        '<p class="sponsor-card-desc">' + escapeHtml(s.desc) + '</p>' +
        progressHtml +
        '<p class="dim small">Ganado esta temporada: <strong style="color:var(--accent-2)">' + s.totalEarned + ' M€</strong></p>' +
        '<p class="dim small">Se renueva al empezar la próxima temporada.</p>' +
      '</div>';
  }
  var offers = c.sponsorOffers || (c.sponsorOffers = careerGenerateSponsorOffers(c));
  var offersHtml = offers.map(function (offer) {
    return '<div class="sponsor-card">' +
      '<div class="sponsor-card-head"><span class="sponsor-card-icon">' + offer.icon + '</span><span class="sponsor-card-name">' + escapeHtml(offer.label) + '</span></div>' +
      '<p class="sponsor-card-desc">' + escapeHtml(offer.desc) + '</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionSignCareerSponsor(\'' + offer.id + '\')">Firmar</button>' +
    '</div>';
  }).join('');
  return headerHtml +
    '<div class="panel center-text"><p class="dim small">Elige un patrocinador para la temporada.</p></div>' +
    '<div class="sponsor-offers-grid">' + offersHtml + '</div>';
}

// Premios de la Federación ("Premios de la propia Federación... Bota de
// Oro, mejor jugador joven, etc."): al final de temporada, si un jugador
// TUYO es el máximo goleador o asistente de TODA la liga (entre todos los
// goles/asistencias registrados con futDraftRecordGoalEvents, propios y
// rivales), gana un premio individual con recompensa en dinero.
var CAREER_FEDERATION_AWARDS = [
  { key: 'topScorer', bucket: 'scorers', title: 'Bota de Oro', reward: 3 },
  { key: 'topAssist', bucket: 'assists', title: 'Máximo Asistente', reward: 2 }
];
function careerEvaluateFederationAwards(c) {
  var stats = c.league.stats;
  var won = [];
  CAREER_FEDERATION_AWARDS.forEach(function (award) {
    var bucket = stats[award.bucket] || {};
    var entries = Object.keys(bucket).map(function (id) { return bucket[id]; });
    if (!entries.length) return;
    var best = entries.reduce(function (a, b) { return b.count > a.count ? b : a; });
    var mine = entries.filter(function (e) { return e.team === 'Tu equipo'; });
    var myBest = mine.reduce(function (a, b) { return (!a || b.count > a.count) ? b : a; }, null);
    if (myBest && myBest.count === best.count && myBest.count > 0) {
      won.push({ title: award.title, playerName: myBest.nombre, count: myBest.count, reward: award.reward });
    }
  });
  return won;
}
function careerMaybeAwardLeagueFinish(c) {
  var league = c.league;
  if (league.matchdayIndex < league.schedule.length || league.finishBonusAwarded) return;
  league.finishBonusAwarded = true;
  var position = careerFinalLeaguePosition(c);
  if (position === null) return;
  var bonus = careerLeaguePositionBonus(position, c.division);
  c.budget = Math.round((c.budget + bonus) * 10) / 10;
  var federationAwards = careerEvaluateFederationAwards(c);
  federationAwards.forEach(function (award) { c.budget = Math.round((c.budget + award.reward) * 10) / 10; });
  // Puntos de Espíritu por acabar top 3 (ver CAREER_LEAGUE_TOP3_POINTS),
  // doble en Primera -- guardados en lastLeagueFinish.spiritPoints para
  // enseñarlos en el resumen de temporada aunque no sea el campeón (solo
  // el campeón se lleva el popup de trofeo, 2º y 3º no).
  var top3Points = CAREER_LEAGUE_TOP3_POINTS[position];
  var leaguePoints = top3Points ? careerAwardSpiritPoints(top3Points * (c.division === 1 ? 2 : 1)) : 0;
  c.lastLeagueFinish = { position: position, bonus: bonus, federationAwards: federationAwards, spiritPoints: leaguePoints };
  careerBoardSeasonReview(c, position);
  if (position === 1) {
    c.ligaTitlesWon = (c.ligaTitlesWon || 0) + 1;
    careerTriggerTrophyPopup(careerDivisionName(c.division), leaguePoints);
    careerApplySponsorTrophyPayout(c);
  }
  // Clasificación a la Champions (solo desde Primera): entre los
  // CAREER_CHAMPIONS_QUALIFY_SPOTS primeros de Primera esta temporada ->
  // se juega la próxima, "como en la vida real" (se decide un año y se
  // juega al siguiente). Se guarda en c.qualifiedForChampionsNextSeason,
  // aplicado de verdad (creando c.champions) en actionStartNewCareerSeason.
  c.qualifiedForChampionsNextSeason = c.division === 1 && position <= CAREER_CHAMPIONS_QUALIFY_SPOTS;
  // Ascensos/descensos se calculan YA (para poder enseñarlos en el
  // resumen de temporada, ver careerSeasonSummaryHtml) pero no se
  // aplican hasta actionStartNewCareerSeason (careerApplyPromotionRelegation),
  // igual que el resto de la transición de temporada.
  c.lastPromotionResult = careerComputePromotionRelegation(c);
}

// Historial de carrera navegable (pestaña Estadísticas), a petición
// explícita ("una pantalla con la línea temporal de todas las temporadas
// jugadas... ya se guarda casi todo en careerStats/bestPosition, falta
// la vista"): una entrada por temporada, capturada justo al pulsar
// "Empezar temporada X+1" (actionStartNewCareerSeason, ANTES de resetear
// c.cup/c.champions/c.lastPromotionResult para la temporada nueva) con
// los mismos datos que ya enseña el resumen de esa temporada
// (careerSeasonSummaryHtml) -- así la vista de historial es solo una
// lista de esos mismos resúmenes ya vividos, no un cálculo aparte.
function careerRecordSeasonHistory(c) {
  var position = careerFinalLeaguePosition(c);
  var cup = c.cup;
  var cupChampion = careerCupChampion(cup);
  var cupResult = cupChampion && cupChampion.isPlayer ? 'champion' : (cup.eliminated ? 'eliminated' : 'unfinished');
  var champions = c.champions;
  var championsResult = null;
  if (champions) {
    var championsChampion = careerChampionsChampion(champions);
    championsResult = championsChampion && championsChampion.isPlayer ? 'champion' : (champions.eliminated ? 'eliminated' : 'unfinished');
  }
  var pr = c.lastPromotionResult;
  var promotion = pr ? (pr.youPromoted ? 'promoted' : (pr.youRelegated ? 'relegated' : 'stayed')) : 'stayed';
  c.seasonHistory = c.seasonHistory || [];
  c.seasonHistory.push({
    season: c.season, division: c.division,
    position: position, totalTeams: c.league.teamNames.length,
    bonus: c.lastLeagueFinish ? c.lastLeagueFinish.bonus : null,
    cupResult: cupResult, championsResult: championsResult,
    promotion: promotion
  });
}

// Simula la temporada COMPLETA de la división en la que NO juegas (nunca
// se ve partido a partido, solo hace falta el resultado final para saber
// quién asciende/desciende) -- mismas fórmulas de potencia/gol que el
// resto de Modo Carrera (careerRivalPower/careerSimulateMatchGoals), así
// que un equipo más fuerte tiene más opciones de quedar arriba, igual
// que en tu propia división. Devuelve los nombres ordenados de mejor a
// peor puesto.
function careerSimulateOtherDivisionOrder(teamNames) {
  var schedule = careerGenerateDoubleRoundRobin(teamNames.length);
  var table = teamNames.map(function () { return ligaEmptyStanding(); });
  schedule.forEach(function (round) {
    round.forEach(function (fx) {
      var powerA = careerRivalPower(teamNames[fx[0]]);
      var powerB = careerRivalPower(teamNames[fx[1]]);
      var goles = careerSimulateMatchGoals(powerA, powerB);
      ligaApplyResult(table, fx[0], fx[1], goles[0], goles[1]);
    });
  });
  return ligaSortedTable(table).map(function (t) { return teamNames[t.idx]; });
}

// Ascensos/descensos de fin de temporada, a petición explícita: los
// CAREER_PROMOTION_SPOTS primeros de Segunda suben, los mismos últimos
// de Primera bajan, SIEMPRE -- tanto si juegas esa división como si es
// la "en la sombra" (careerSimulateOtherDivisionOrder). null en
// promotedNames/relegatedNames representa "tú" mientras se calcula --
// nunca sale así en el resultado final (se filtra).
function careerComputePromotionRelegation(c) {
  var myDivision = c.division;
  var otherDivision = myDivision === 1 ? 2 : 1;
  var mySorted = ligaSortedTable(c.league.table).map(function (t) {
    return t.idx === 0 ? null : c.league.teamNames[t.idx];
  });
  var otherSorted = careerSimulateOtherDivisionOrder(c.divisionTeams[otherDivision]);
  var promotedNames, relegatedNames;
  if (myDivision === 2) {
    promotedNames = mySorted.slice(0, CAREER_PROMOTION_SPOTS);
    relegatedNames = otherSorted.slice(-CAREER_PROMOTION_SPOTS);
  } else {
    relegatedNames = mySorted.slice(-CAREER_PROMOTION_SPOTS);
    promotedNames = otherSorted.slice(0, CAREER_PROMOTION_SPOTS);
  }
  var youPromoted = promotedNames.indexOf(null) !== -1;
  var youRelegated = relegatedNames.indexOf(null) !== -1;
  return {
    promotedNames: promotedNames.filter(function (n) { return n !== null; }),
    relegatedNames: relegatedNames.filter(function (n) { return n !== null; }),
    youPromoted: youPromoted,
    youRelegated: youRelegated,
    newDivision: youPromoted ? 1 : (youRelegated ? 2 : myDivision)
  };
}

// Aplica de verdad un resultado ya calculado (c.lastPromotionResult):
// mueve los nombres reales entre las dos listas de divisionTeams y
// actualiza c.division si te toca a ti. Llamado solo desde
// actionStartNewCareerSeason, antes de construir la liga de la temporada
// que empieza.
function careerApplyPromotionRelegation(c) {
  var r = c.lastPromotionResult;
  if (!r) return;
  var newDiv1 = c.divisionTeams[1].filter(function (n) { return r.relegatedNames.indexOf(n) === -1; }).concat(r.promotedNames);
  var newDiv2 = c.divisionTeams[2].filter(function (n) { return r.promotedNames.indexOf(n) === -1; }).concat(r.relegatedNames);
  c.divisionTeams = { 1: newDiv1, 2: newDiv2 };
  c.division = r.newDivision;
  // Objetivo extra de directiva al ascender (a petición explícita, "mete
  // más objetivos en directiva al ascender, como usar jugadores de algún
  // elemento, usar jugadores de la cantera"): se sortea al ascender y se
  // renueva cada temporada mientras sigas en Primera.
  // (los objetivos extra ya se sortean solos cada temporada, ver careerEnsureBoard)
}
// Objetivos extra de la directiva, a petición explícita ("que no siempre sea
// quedar en una posición, que haya más, como ganar trofeos, hacer jugar a
// gente de la cantera... y más que se te ocurran"): cada temporada salen 2
// en Segunda y 3 en Primera, de tipos distintos. Cada uno tiene premio de
// confianza si se cumple y castigo si no (obj.reward/obj.penalty). Todos se
// evalúan al acabar la Liga (careerBoardSeasonReview): la confianza solo se
// mueve al final de la temporada, no partido a partido.
function careerObjectiveIcon(type) {
  return { element: '🔥', academy: '🌱', cup: '🏆', cupSemi: '🏅', champions: '⭐', championsKO: '🌍', goals: '⚽', wins: '💪', defense: '🧱', scorer: '👟', savings: '💰' }[type] || '🎯';
}
function careerRollBoardObjectives(c) {
  var board = c.board;
  var n = c.league.schedule.length;
  var squadTypes = (c.lineup.map(function (s) { return s.player; }).concat(c.bench)).map(function (p) { return p.tipo; });
  var tipo = choice(TYPES.filter(function (t) { return squadTypes.indexOf(t) !== -1; })) || choice(TYPES);
  var pool = [
    { type: 'element', element: tipo, required: 4, reward: 5, penalty: 5 },
    { type: 'academy', required: 2, reward: 5, penalty: 5 },
    { type: 'cup', reward: 8, penalty: 3 },
    { type: 'cupSemi', reward: 4, penalty: 3 },
    { type: 'goals', target: Math.round(n * 1.6), reward: 5, penalty: 4 },
    { type: 'wins', target: Math.round(n * 0.5), reward: 5, penalty: 4 },
    { type: 'defense', target: Math.round(n * 1.0), reward: 5, penalty: 4 },
    { type: 'scorer', reward: 5, penalty: 3 },
    { type: 'savings', reward: 4, penalty: 3 }
  ];
  if (c.division === 1 && (c.champions || c.qualifiedForChampionsNextSeason)) {
    pool.push({ type: 'championsKO', reward: 6, penalty: 4 });
    pool.push({ type: 'champions', reward: 10, penalty: 3 });
  }
  pool.sort(function () { return Math.random() - 0.5; });
  board.objectives = pool.slice(0, c.division === 1 ? 3 : 2);
}
// Estado de cada objetivo AHORA MISMO (para el panel, la revisión de fin
// de temporada y el cobro anticipado).
function careerBoardObjectivesStatus(c, board) {
  return (board.objectives || []).map(function (obj) { return careerBoardObjectiveMet(c, obj); });
}
function careerBoardObjectiveMet(c, obj) {
  var me = c.league.table[0];
  if (obj.type === 'element') {
    var count = c.lineup.filter(function (s) { return s.player.tipo === obj.element; }).length;
    return { obj: obj, count: count, met: count >= obj.required, label: 'usar ' + obj.required + '+ titulares de tipo ' + obj.element + ' (llevas ' + count + ')' };
  }
  if (obj.type === 'academy') {
    var academyIds = c.academyPromotedIds || [];
    var count2 = c.lineup.filter(function (s) { return academyIds.indexOf(s.player.id) !== -1; }).length;
    return { obj: obj, count: count2, met: count2 >= obj.required, label: 'usar ' + obj.required + '+ titulares de cantera (llevas ' + count2 + ')' };
  }
  if (obj.type === 'goals') return { obj: obj, count: me.gf, met: me.gf >= obj.target, label: 'marcar ' + obj.target + ' goles en Liga (llevas ' + me.gf + ')' };
  if (obj.type === 'wins') return { obj: obj, count: me.pg, met: me.pg >= obj.target, label: 'ganar ' + obj.target + ' partidos de Liga (llevas ' + me.pg + ')' };
  if (obj.type === 'defense') return { obj: obj, count: me.gc, met: me.gc <= obj.target && me.pj >= c.league.schedule.length, label: 'encajar ' + obj.target + ' goles o menos en Liga (llevas ' + me.gc + ')' };
  if (obj.type === 'savings') {
    var start = c.board && c.board.startBudget !== undefined ? c.board.startBudget : c.budget;
    return { obj: obj, count: c.budget, met: c.budget >= start, label: 'acabar la temporada con al menos ' + start + ' M€ (ahora ' + c.budget + ')' };
  }
  if (obj.type === 'scorer') {
    var scorers = Object.keys(c.league.stats.scorers).map(function (k) { return c.league.stats.scorers[k]; });
    var best = scorers.reduce(function (a, b) { return b.count > a ? b.count : a; }, 0);
    var mine = scorers.filter(function (e) { return e.team === 'Tu equipo'; }).reduce(function (a, b) { return b.count > a ? b.count : a; }, 0);
    return { obj: obj, count: mine, met: mine > 0 && mine >= best, label: 'que un jugador tuyo sea el máximo goleador de la Liga (el tuyo lleva ' + mine + ', el mejor ' + best + ')' };
  }
  var totalRounds = Math.log2(c.cup.size);
  var reached = c.cup.eliminated ? c.cup.eliminatedRound : c.cup.rounds.length - 1;
  var champ = careerCupChampion(c.cup);
  if (obj.type === 'cup') return { obj: obj, count: 0, met: !!(champ && champ.isPlayer), label: 'ganar la Copa del Rey' };
  if (obj.type === 'cupSemi') return { obj: obj, count: reached, met: reached >= totalRounds - 2 || !!(champ && champ.isPlayer), label: 'llegar a semifinales de la Copa del Rey' };
  var ch = c.champions;
  if (obj.type === 'championsKO') return { obj: obj, count: 0, met: !!(ch && ch.phase === 'knockout' && !ch.eliminatedInGroup), label: 'pasar la fase de grupos de la Champions' };
  if (obj.type === 'champions') { var cc = ch && careerChampionsChampion(ch); return { obj: obj, count: 0, met: !!(cc && cc.isPlayer), label: 'ganar la Champions League' }; }
  return { obj: obj, count: 0, met: false, label: obj.type };
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
    var powerHome = careerRivalPowerWithForm(league.teamNames[fx[0]], league.table, fx[0]);
    var powerAway = careerRivalPowerWithForm(league.teamNames[fx[1]], league.table, fx[1]);
    var goles = careerSimulateMatchGoals(powerHome, powerAway);
    ligaApplyResult(league.table, fx[0], fx[1], goles[0], goles[1]);
    league.results[league.matchdayIndex][fi] = goles;
    careerRecordMatchGoals(c, league, fx[0], fx[1], goles[0], goles[1]);
  });
}

// Bonus de presupuesto por ganar TU partido de la jornada -- nunca por
// empatar ni perder. Se llama una sola vez por jornada, tanto desde
// "Saltar" como al terminar de ver tu partido con "Simular" (ver
// finishCareerMatchdayMatch). En Primera es más (0.15-0.5 M€ seguido, a
// petición explícita: "en primera división, por cada partido ganado
// suba, te puedan dar, de 0.15 a 0.5M aleatoriamente") -- en Segunda se
// queda como estaba (50k/100k/150k al azar).
var CAREER_WIN_BONUSES = [0.05, 0.1, 0.15];
var CAREER_WIN_BONUS_PRIMERA_MIN = 0.15;
var CAREER_WIN_BONUS_PRIMERA_MAX = 0.5;
function careerAwardWinBonus(c, myGoals, oppGoals) {
  if (myGoals <= oppGoals) return 0;
  var bonus = c.division === 1
    ? Math.round((CAREER_WIN_BONUS_PRIMERA_MIN + Math.random() * (CAREER_WIN_BONUS_PRIMERA_MAX - CAREER_WIN_BONUS_PRIMERA_MIN)) * 100) / 100
    : choice(CAREER_WIN_BONUSES);
  bonus = Math.round(bonus * CAREER_INCOME_SCALE * careerPrizeSeasonFactor() * 100) / 100;
  c.budget = Math.round((c.budget + bonus) * 100) / 100;
  return bonus;
}

// Si tocaba abrir la ventana de mitad de temporada (justo tras jugar la
// jornada CAREER_MIDSEASON_AT_MATCHDAY), la abre -- se llama después de
// cada jornada jugada, en los dos caminos (Saltar y Simular).
function careerMaybeOpenMidseasonWindow(c) {
  // Mercado de invierno opcional (c.winterMarket, elegido al crear la
  // carrera), a petición explícita -- si está desactivado, la ventana de
  // mitad de temporada simplemente no se abre (el de pretemporada, al
  // empezar cada año, sigue igual siempre).
  if (c.winterMarket === false) return;
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
  if (careerCupPending(c) || careerChampionsPending(c)) return;
  var league = c.league;
  if (league.matchdayIndex >= league.schedule.length) return;
  var myFixtureIdx = league.schedule[league.matchdayIndex].findIndex(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var myFixture = league.schedule[league.matchdayIndex][myFixtureIdx];
  var youAreHome = myFixture[0] === 0;
  var oppIdx = youAreHome ? myFixture[1] : myFixture[0];
  var myAtkDef = careerMyAtkDef(c);
  var formMod = careerFormPowerModifier(league.table, 0);
  var myAtk = clamp(myAtkDef.atk + formMod, 0, 100);
  var myDef = clamp(myAtkDef.def + formMod, 0, 100);
  var oppPower = careerRivalPowerWithForm(league.teamNames[oppIdx], league.table, oppIdx);
  var goles = careerSimulateMyMatchGoals(myAtk, myDef, oppPower, youAreHome);
  ligaApplyResult(league.table, myFixture[0], myFixture[1], goles[0], goles[1]);
  league.results[league.matchdayIndex][myFixtureIdx] = goles;
  careerRecordMatchGoals(c, league, myFixture[0], myFixture[1], goles[0], goles[1]);
  careerResolveOtherFixtures(c, league, myFixtureIdx);
  var myGoals = youAreHome ? goles[0] : goles[1];
  var oppGoals = youAreHome ? goles[1] : goles[0];
  var winBonus = careerAwardWinBonus(c, myGoals, oppGoals);
  careerApplySponsorMatchPayout(c, myGoals, oppGoals);
  c.lastMatchdayResult = {
    matchday: league.matchdayIndex + 1,
    oppName: league.teamNames[oppIdx],
    myGoals: myGoals,
    oppGoals: oppGoals,
    winBonus: winBonus,
    youAreHome: youAreHome
  };
  c.jornadaAckPending = true;
  careerRecordStarterAppearances(c);
  careerFinishMatchEvents(c, null);
  league.matchdayIndex++;
  careerUpdateBestPosition(c);
  careerMaybeOpenMidseasonWindow(c);
  careerBoardMidseasonReview(c);
  careerMaybeAwardLeagueFinish(c);
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
window.actionSimulateCareerMatchday = function (visualMode) {
  var c = G.career;
  if (c.marketWindow && c.marketWindow.open) return;
  if (careerCupPending(c) || careerChampionsPending(c)) return;
  var league = c.league;
  if (league.matchdayIndex >= league.schedule.length) return;
  var fixtures = league.schedule[league.matchdayIndex];
  var myFixtureIdx = fixtures.findIndex(function (fx) { return fx[0] === 0 || fx[1] === 0; });
  var myFixture = fixtures[myFixtureIdx];
  var youAreHome = myFixture[0] === 0;
  var oppIdx = youAreHome ? myFixture[1] : myFixture[0];
  var oppName = league.teamNames[oppIdx];

  c.savedFutdraft = G.futdraft;
  // f.squad (no solo f.lineup) hace falta para que futDraftUndraftedPool
  // (el "plantel fantasma" de goles del rival) excluya TODA tu plantilla,
  // titulares y banquillo -- sin esto, quedaba vacío (undefined) y el
  // rival podía "marcar" con el nombre de un jugador tuyo de verdad, a
  // petición explícita ("no puede meter gol alguien en el equipo
  // contrario al que estoy jugando, un jugador que yo tengo en mi equipo").
  var careerStyleMods = careerPlayStyleModifiers(c);
  // oppGhostPool: el rival anota SIEMPRE con su misma plantilla fantasma
  // de toda la temporada (careerTeamGhostPool), no un sorteo distinto
  // entre todo el roster cada partido -- para que su máximo goleador
  // pueda hacerte competencia real por la Bota de Oro.
  G.futdraft = { lineup: c.lineup, squad: c.lineup.map(function (s) { return s.player; }).concat(c.bench), captainId: c.captainId, formation: c.formation, condition: 'ninguna', styleAtkMult: careerStyleMods.atk, styleDefMult: careerStyleMods.def, teamScoreOverride: careerMatchTeamScore(c), oppGhostPool: careerTeamGhostPool(c, league, oppIdx) };
  var sim = futDraftSimulateMatchCore(careerRivalPowerWithForm(oppName, league.table, oppIdx));
  G.futdraft.live = {
    oppSide: { name: oppName }, modifier: sim.modifier,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    inExtraTime: false, allowDraw: true, onFinish: finishCareerMatchdayMatch,
    careerFixture: { idx: myFixtureIdx, youAreHome: youAreHome, oppIdx: oppIdx },
    isCareer: true, youAreHome: youAreHome, redCardFreqMult: careerRedCardFreqMult(c), injuryFreqMult: careerInjuryFreqMult(c), yellowFreqMult: careerYellowFreqMult(c),
    visualMode: visualMode || 'avatars',
    done: false
  };
  G.screen = 'futdraftLive';
  playKickoffSound();
  render();
  futDraftLiveTick();
};

// "Jugar partido": mismo motor y mismos datos que "Simular partido", pero
// se ve con un mini campo de puntitos (con su dorsal) en vez de escudos y
// avatares -- a petición explícita ("no quiero que enseñes los
// personajes, quiero que enseñes puntitos con los dorsales... y también
// el balón"). Ver live.visualMode y renderFutDraftLive/futDraftPitchDotsHtml
// en js/futdraft-match.js.
window.actionPlayCareerMatchday = function () { actionSimulateCareerMatchday('dots'); };

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
  careerRecordLeagueStats(league.stats, live.revealed.filter(function (e) { return e.side === 'opp'; }), oppName, false);
  futDraftRecordGoalEvents(c.careerStats, myEvents, 'Tu equipo');
  careerResolveOtherFixtures(c, league, fi);
  var winBonus = careerAwardWinBonus(c, myGoals, oppGoals);
  careerApplySponsorMatchPayout(c, myGoals, oppGoals);
  c.lastMatchdayResult = { matchday: league.matchdayIndex + 1, oppName: oppName, myGoals: myGoals, oppGoals: oppGoals, winBonus: winBonus, youAreHome: youAreHome };
  c.jornadaAckPending = true;
  careerRecordStarterAppearances(c);
  careerFinishMatchEvents(c, live);
  league.matchdayIndex++;
  careerUpdateBestPosition(c);
  careerMaybeOpenMidseasonWindow(c);
  careerBoardMidseasonReview(c);
  careerMaybeAwardLeagueFinish(c);

  G.futdraft.lastMatchResult = {
    oppName: oppName, oppShield: teamShieldPath(oppName), oppPower: careerRivalPower(oppName),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals,
    timeline: live.revealed, modifier: live.modifier, isCareer: true, youAreHome: live.youAreHome
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
  actionGoToCareerCompeticionesTab('copa');
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
  if (c.fired) return;
  if (c.league.matchdayIndex < c.league.schedule.length) return;
  careerRecordSeasonHistory(c);
  c.season = (c.season || 1) + 1;
  // El patrocinador dura solo 1 temporada -- toca elegir uno nuevo cada
  // vez (renderCareerPatrocinadores genera ofertas frescas la próxima
  // vez que se entre en la pestaña).
  c.activeSponsor = null;
  c.sponsorOffers = null;
  c.sponsorMessage = null;
  // Candidatos nuevos de la cantera cada temporada (careerGenerateAcademyCandidates),
  // según el nivel de la academia -- los del año pasado que no se
  // promocionaron se pierden, mismo criterio que las ofertas de
  // patrocinador.
  c.academyCandidates = careerGenerateAcademyCandidates(c);
  c.academyMessage = null;
  // Las cesiones ENTRANTES duran 1 temporada -- al empezar la siguiente,
  // todos los cedidos que te quedaran vuelven solos a su club (no son
  // tuyos), a petición explícita ("los jugadores cedidos se van de tu
  // equipo al acabar la temporada"). careerRemoveFromSquad ya sabe subir
  // a alguien del banquillo si el cedido era titular.
  var returningLoans = (c.loanedIds || []).slice();
  if (returningLoans.length) {
    var returnedNames = returningLoans.map(function (id) {
      var p = c.lineup.map(function (s) { return s.player; }).concat(c.bench).find(function (x) { return x.id === id; });
      careerRemoveFromSquad(c, id);
      return p ? p.nombre : null;
    }).filter(Boolean);
    c.loanedIds = [];
    if (returnedNames.length) c.plantillaMessage = 'Fin de la cesión: ' + returnedNames.join(', ') + ', vuelven a su club.';
  }
  // Cesiones de SALIDA (tus jugadores en otro club, ver actionLoanCareerPlayer):
  // igual que las de entrada, duran 1 temporada -- vuelven solos a tu
  // banquillo al empezar la siguiente, a petición explícita ("el jugador
  // se devuelve a mi equipo al acabar esa temporada vigente").
  var returningOutLoans = (c.loanedOutIds || []).slice();
  if (returningOutLoans.length) {
    var returnedOutNames = returningOutLoans.map(function (id) {
      var p = ROSTER.find(function (x) { return x.id === id; });
      if (p) c.bench.push(p);
      return p ? p.nombre : null;
    }).filter(Boolean);
    c.loanedOutIds = [];
    if (returnedOutNames.length) c.plantillaMessage = 'Vuelven de la cesión: ' + returnedOutNames.join(', ') + ', ya están en tu banquillo.';
  }
  careerProgressAllPlayers(c);
  // Ascensos/descensos: careerComputePromotionRelegation ya calculó el
  // resultado al terminar la última jornada (careerMaybeAwardLeagueFinish,
  // para poder enseñarlo en el resumen de temporada) -- aquí es donde se
  // APLICA de verdad, moviendo nombres reales entre divisiones y
  // actualizando c.division si te toca a ti, justo antes de construir la
  // liga de la temporada que empieza (para que ya salga en la división
  // correcta).
  careerApplyPromotionRelegation(c);
  c.lastPromotionResult = null;
  c.league = careerBuildLeague(c.division, c.divisionTeams);
  var prevConfidence = c.board ? c.board.confidence : CAREER_BOARD_START_CONFIDENCE;
  c.board = null;
  careerEnsureBoard(c).confidence = prevConfidence;
  c.lastBoardReview = null;
  c.marketWindow = careerNewMarketWindow('preseason', CAREER_PRESEASON_DAYS);
  c.incomingOffers = [];
  c.boughtThisSeasonIds = []; // temporada nueva: ya se pueden volver a mover
  careerGenerateIncomingOffers(c);
  c.lastMatchdayResult = null;
  c.jornadaAckPending = false;
  c.calendarView = null;
  c.cup = careerNewCup();
  c.lastCupResult = null;
  c.lastLeagueFinish = null;
  // Champions: se juega esta temporada si te clasificaste la temporada
  // ANTERIOR (c.qualifiedForChampionsNextSeason, calculado al terminar la
  // liga en careerMaybeAwardLeagueFinish) -- "como en la vida real", el
  // resultado de este año decide si se juega el año que viene, nunca el
  // mismo. Se recalcula de cero cada temporada según lo que pase en Liga.
  c.champions = c.qualifiedForChampionsNextSeason ? careerNewChampions() : null;
  c.qualifiedForChampionsNextSeason = false;
  c.lastChampionsResult = null;
  // Supercopa: se crea sola en cuanto ganas la Champions esta temporada
  // (careerChampionsMaybeAwardChampion) -- si no se llegó a jugar/acabar
  // antes de que termine la temporada, no se arrastra a la siguiente.
  c.supercopa = null;
  // Minutos jugados de la temporada que empieza, de cero -- careerProgressAllPlayers
  // (arriba, en la temporada que acaba de terminar) ya leyó los de la
  // temporada anterior antes de este reset.
  c.seasonAppearances = {};
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
// 32 equipos (antes 16), a petición explícita ("la copa tiene que tener
// 32 equipos") -- son 5 rondas (32→16→8→4→2→1). Cada ronda se juega en
// SU PROPIA jornada, repartidas a lo largo de toda la temporada como en
// el fútbol de verdad (Copa y Liga intercaladas, no la Copa entera de
// golpe si vas ganando), a petición explícita ("que no juegues 4
// partidos de copa seguidos si los ganas, si no que se separe en más...
// tiene que ser como se hace en la vida real"). Encajan dentro de las
// 30 jornadas de Segunda (donde también se juega ahora) con margen.
// Ver careerCupLocked, que mira en qué ronda va la Copa (cup.rounds.length)
// para saber qué jornada le toca.
// Copa de 64 equipos (6 rondas: dieciseisavos... hasta la final), a petición
// explícita; una jornada por ronda, repartidas para no chocar con la Champions.
var CAREER_CUP_SIZE = 64;
var CAREER_CUP_ROUND_MATCHDAYS = [3, 8, 13, 18, 23, 28];
// Bajado (antes 3/12/9), a petición explícita ("baja premios por
// títulos"): ganar era demasiado rentable en dinero además de en
// prestigio -- se mantiene la insignia/Puntos de Espíritu igual, solo el
// presupuesto en M€ baja.
var CAREER_CUP_WIN_BONUS = 2;
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
// La Copa se juega en las dos divisiones (a petición explícita: "que la
// juegas también en segunda división a partir de ahora" -- antes solo se
// desbloqueaba en Primera). CADA RONDA tiene su propia jornada
// (CAREER_CUP_ROUND_MATCHDAYS, indexado por cup.rounds.length-1 = la
// ronda en la que va ahora mismo) en vez de un único umbral para toda la
// Copa -- a petición explícita ("que no juegues 4 partidos de copa
// seguidos si los ganas, si no que se separe en más... como en la vida
// real"): en cuanto resuelves tu partido de una ronda, careerCupAdvanceRound
// arma la siguiente ronda de golpe (cup.rounds.length sube), así que
// careerCupLocked se vuelve a bloquear sola hasta la jornada de la ronda
// siguiente sin tener que tocar nada más -- la Liga sigue jugándose
// mientras tanto, normal, hasta llegar a esa jornada.
function careerCupLocked(c) {
  var roundIdx = c.cup.rounds.length - 1;
  var matchday = CAREER_CUP_ROUND_MATCHDAYS[roundIdx] !== undefined ? CAREER_CUP_ROUND_MATCHDAYS[roundIdx] : CAREER_CUP_ROUND_MATCHDAYS[CAREER_CUP_ROUND_MATCHDAYS.length - 1];
  return c.league.matchdayIndex < matchday;
}
function careerCupPending(c) { return !careerCupLocked(c) && !careerCupFinished(c.cup); }
// Resuelve cualquier partido pendiente de la ronda actual que no sea el
// tuyo (CPU vs CPU, igual que careerResolveOtherFixtures en Liga) y, si
// ya está completa, arma la siguiente ronda con los ganadores -- si la
// ronda actual era la Final, no hay ronda siguiente, el campeón sale de
// careerCupChampion.
function careerCupAdvanceRound(cup) {
  var round = cup.rounds[cup.rounds.length - 1];
  round.forEach(function (m) {
    if (m.winner === null) { m.winner = simulateCpuMatch(m.a, m.b); careerCompCpuGoals(cup, m, m.winner); }
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
  if (G.futdraft && G.futdraft.live && G.futdraft.live.penaltyResult) return G.futdraft.live.penaltyResult;
  var myScore = careerMatchTeamScore(c);
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
    c.budget = Math.round((c.budget + CAREER_CUP_WIN_BONUS * careerPrizeSeasonFactor()) * 10) / 10;
    c.cupsWon = (c.cupsWon || 0) + 1;
    careerBoardNoteTrophy(c, 'cup');
    var cupPoints = careerAwardSpiritPoints(CAREER_CUP_WIN_POINTS * (c.division === 1 ? 2 : 1));
    careerTriggerTrophyPopup('Copa del Rey', cupPoints);
    careerApplySponsorTrophyPayout(c);
  }
}
window.actionSimulateCareerCupMatch = function (visualMode) {
  var c = G.career;
  var cup = c.cup;
  var match = careerCupMyMatch(cup);
  if (!match) return;
  c.lastCupResult = null;
  var opp = careerCupOpponent(match);
  c.savedFutdraft = G.futdraft;
  // f.squad (no solo f.lineup) hace falta para que futDraftUndraftedPool
  // (el "plantel fantasma" de goles del rival) excluya TODA tu plantilla,
  // titulares y banquillo -- sin esto, quedaba vacío (undefined) y el
  // rival podía "marcar" con el nombre de un jugador tuyo de verdad, a
  // petición explícita ("no puede meter gol alguien en el equipo
  // contrario al que estoy jugando, un jugador que yo tengo en mi equipo").
  var careerStyleMods = careerPlayStyleModifiers(c);
  G.futdraft = { lineup: c.lineup, squad: c.lineup.map(function (s) { return s.player; }).concat(c.bench), captainId: c.captainId, formation: c.formation, condition: 'ninguna', styleAtkMult: careerStyleMods.atk, styleDefMult: careerStyleMods.def, teamScoreOverride: careerMatchTeamScore(c), oppGhostPool: careerCompGhostSquad(c, cup, opp.name) };
  var sim = futDraftSimulateMatchCore(careerKnockoutPower(careerRivalPower(opp.name), 'cup'));
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
    isCareer: true, youAreHome: true, redCardFreqMult: careerRedCardFreqMult(c), injuryFreqMult: careerInjuryFreqMult(c), yellowFreqMult: careerYellowFreqMult(c),
    visualMode: visualMode || 'avatars',
    done: false
  };
  G.screen = 'futdraftLive';
  if (typeof playKickoffSound === 'function') playKickoffSound();
  render();
  futDraftLiveTick();
};
// "Jugar partido" (puntitos en vivo) en la Copa del Rey, que antes solo
// tenía Simular/Saltar -- a petición explícita ("el jugar partido,
// mételo también en todos los partidos del modo carrera, ahora no está
// en la copa ni champions").
window.actionPlayCareerCupMatch = function () { actionSimulateCareerCupMatch('dots'); };
function finishCareerCupMatch() {
  var c = G.career;
  var cup = c.cup;
  var live = G.futdraft.live;
  var match = live.careerCupMatch;
  var opp = careerCupOpponent(match);
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  if (futDraftLivePenaltyGate(live, opp.name, careerMatchTeamScore(c) - careerRivalPower(opp.name), myGoals === oppGoals, finishCareerCupMatch)) return;
  var penalty = myGoals === oppGoals ? careerCupPenaltyShootout(c, opp.name) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : myGoals > oppGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);

  var myEvents = live.revealed.filter(function (e) { return e.side === 'me'; });
  futDraftRecordGoalEvents(c.careerStats, myEvents, 'Tu equipo');
  careerRecordMyCompMatch(c, cup, opp.name, myEvents, live.revealed.filter(function (e) { return e.side === 'opp'; }), oppGoals);
  careerFinishMatchEvents(c, live);

  var roundIdxAtElimination = cup.rounds.length - 1;
  careerCupAdvanceRound(cup);
  if (!playerWon) { cup.eliminated = true; cup.eliminatedRound = roundIdxAtElimination; careerCupSettleRemaining(cup); }
  careerCupMaybeAwardChampion(c);
  c.lastCupResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, penalty: penalty };

  G.futdraft.lastMatchResult = {
    oppName: opp.name, oppShield: teamShieldPath(opp.name), oppPower: careerKnockoutPower(careerRivalPower(opp.name), 'cup'),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon,
    timeline: live.revealed, modifier: live.modifier, isCareer: true, isCup: true, penalty: penalty, youAreHome: live.youAreHome
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
  c.lastCupResult = null;
  var opp = careerCupOpponent(match);
  var myAtkDef = careerMyAtkDef(c);
  var oppPower = careerKnockoutPower(careerRivalPower(opp.name), 'cup');
  var goles = careerSimulateMyMatchGoals(myAtkDef.atk, myAtkDef.def, oppPower, true);
  var myGoals = goles[0], oppGoals = goles[1];
  var penalty = myGoals === oppGoals ? careerCupPenaltyShootout(c, opp.name) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : myGoals > oppGoals;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);

  var myPlayers = c.lineup.map(function (s) { return s.player; });
  var events = [];
  for (var i = 0; i < myGoals; i++) events.push(futDraftGoalEvent(myPlayers));
  futDraftRecordGoalEvents(c.careerStats, events, 'Tu equipo');
  careerRecordMyCompMatch(c, cup, opp.name, events, null, oppGoals);
  careerFinishMatchEvents(c, null);

  var roundIdxAtElimination = cup.rounds.length - 1;
  careerCupAdvanceRound(cup);
  if (!playerWon) { cup.eliminated = true; cup.eliminatedRound = roundIdxAtElimination; careerCupSettleRemaining(cup); }
  careerCupMaybeAwardChampion(c);
  c.lastCupResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, penalty: penalty };
  render();
};
// Resultado del último cruce jugado (Jugar/Simular/Saltar): se enseña
// SIEMPRE que exista, incluso con la Copa bloqueada hasta la próxima
// ronda -- antes, al saltar un partido, la ronda avanzaba de golpe
// (careerCupAdvanceRound) y la pestaña se quedaba bloqueada sin más,
// sin enseñar nunca el resultado que se acababa de jugar, un bug real
// ("le doy a saltar partido, no me dice el resultado... quiero que me
// lo muestres"). Se limpia solo al jugar el siguiente cruce tuyo.
// BUG REAL arreglado: al saltar un partido de Copa/Champions (sin
// jugarlo en vivo ni verlo simulado), el resultado se enseñaba en texto
// plano ("5 - 3", sin escudos ni tarjeta) en vez de la misma tarjeta
// bonita con escudos que ya usa Liga (careerMatchResultCardHtml) -- a
// petición explícita ("pone directamente 5-3 con números así feos, no
// sale chulo como cuando juegas un partido de liga"). Reutiliza esa misma
// función; la Copa siempre se juega en casa (youAreHome true, fijo).
function careerCupResultBannerHtml(c) {
  var r = c.lastCupResult;
  if (!r) return '';
  var label = r.playerWon ? '🏆 Ganaste' : '❌ Perdiste';
  var penaltyText = r.penalty ? ' (penaltis ' + r.penalty.myGoals + '-' + r.penalty.oppGoals + ')' : '';
  return '<div class="panel center-text"><h3 style="margin-bottom:4px">' + label + ' contra ' + escapeHtml(r.oppName) + '</h3></div>' +
    careerMatchResultCardHtml(r.oppName, r.myGoals, r.oppGoals, null, true) +
    (penaltyText ? '<p class="dim small center-text">' + penaltyText + '</p>' : '');
}
function renderCareerCopa(c) {
  var cup = c.cup;
  var totalRounds = Math.log2(cup.size);
  var champion = careerCupChampion(cup);
  var locked = careerCupLocked(c);
  // Aunque esté bloqueada hasta la próxima ronda, se puede seguir viendo
  // el cuadro entero con los resultados que ya ha habido -- a petición
  // explícita ("aún así quiero ir viendo la Copa del Rey, aunque no lo
  // pueda jugar. Quiero ver los resultados que ha habido").
  var myMatch = locked ? null : careerCupMyMatch(cup);
  var headerHtml = '<div class="panel center-text"><h3 style="margin-bottom:4px">Copa del Rey</h3></div>';
  var resultBannerHtml = careerCupResultBannerHtml(c);
  var actionHtml;
  if (champion) {
    actionHtml = '<div class="panel center-text"><p class="dim small">' + (champion.isPlayer ? '¡Campeón de la Copa!' : 'Campeón: ' + escapeHtml(champion.name)) + '</p></div>';
  } else if (cup.eliminated) {
    actionHtml = '<div class="panel center-text"><p class="dim small">Eliminado en ' + roundNameForIndex(cup.eliminatedRound, totalRounds) + '.</p></div>';
  } else if (myMatch) {
    var opp = careerCupOpponent(myMatch);
    actionHtml =
      careerMatchupCardHtml(opp.name, roundNameForIndex(cup.rounds.length - 1, totalRounds)) +
      '<div class="panel center-text">' +
        '<div class="match-mode-picker">' +
          '<button class="match-mode-card" onclick="actionPlayCareerCupMatch()"><span class="match-mode-icon">⚽</span><strong>Ver partido</strong><span class="dim small">Partido en vivo</span></button>' +
          '<button class="match-mode-card" onclick="actionSimulateCareerCupMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
          '<button class="match-mode-card" onclick="actionSkipCareerCupMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
        '</div>' +
      '</div>';
  } else if (locked) {
    var roundIdx = cup.rounds.length - 1;
    var nextMatchday = CAREER_CUP_ROUND_MATCHDAYS[roundIdx] !== undefined ? CAREER_CUP_ROUND_MATCHDAYS[roundIdx] : CAREER_CUP_ROUND_MATCHDAYS[CAREER_CUP_ROUND_MATCHDAYS.length - 1];
    actionHtml = '<div class="panel center-text"><p class="dim small">La próxima ronda de la Copa del Rey se juega en la jornada ' + nextMatchday + '. Llevas jugadas ' + c.league.matchdayIndex + '.</p></div>';
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
        '<div class="bracket-champion-name">' + (champion ? (champion.isPlayer ? escapeHtml(careerClubDisplayName(c)) : escapeHtml(champion.name)) : '?') + '</div></div></div>' +
    '</div></div>';
  return headerHtml + resultBannerHtml + actionHtml + bracketHtml;
}

// ===== Champions League =====
// A petición explícita: "en primera añade champions si quedas entre los
// 4 primeros puestos en primera división del año anterior, con un
// formato como en la vida real". Mismo motor de cuadro de eliminación
// directa que la Copa del Rey (generateTournamentBracket, roundNameForIndex,
// bracketMatchHtml de tournament.js), pero como competición INDEPENDIENTE
// (c.champions, no c.cup): solo se crea al empezar una temporada para la
// que te clasificaste el año anterior (careerMaybeAwardLeagueFinish
// guarda c.qualifiedForChampionsNextSeason, actionStartNewCareerSeason es
// quien de verdad la crea o no) y solo existe estando en Primera.
// Rediseñado a "fase de grupos de 32 equipos y luego rondas
// eliminatorias, como en la vida real" (antes era un cuadro de
// eliminación directa de 16 desde el principio). 32 equipos (tú + 31
// rivales) repartidos en 8 grupos de 4 (`generateTournamentBracket`
// coloca a "Tú" en una casilla al azar de las 32, igual que en la Copa/
// el Torneo de Modo Jugador); tu grupo juega liguilla a una vuelta (3
// jornadas -- ida y vuelta real, de 6 jornadas, alargaría demasiado la
// temporada) y los otros 7 grupos se resuelven solos jornada a jornada
// en paralelo (`careerChampionsResolveGroupRoundOthers`, mismo patrón
// que careerResolveOtherFixtures en Liga). Quedan primero o segundo de
// grupo -> pasas a octavos (16 equipos, cuadro de eliminación directa
// de toda la vida, igual que antes); si no, quedas eliminado ahí mismo
// (`champions.eliminatedInGroup`). CADA jornada de grupo o ronda
// eliminatoria tiene su propia jornada de Liga asignada
// (CAREER_CHAMPIONS_ROUND_MATCHDAYS, 7 entradas: 3 de grupos + 4 de
// octavos/cuartos/semis/final), mismo mecanismo de auto-bloqueo que la
// Copa del Rey (careerChampionsLocked mira en qué punto va,
// careerChampionsRoundIndex).
var CAREER_CHAMPIONS_SIZE = 32;
var CAREER_CHAMPIONS_GROUP_SIZE = 4;
var CAREER_CHAMPIONS_GROUP_ROUNDS = 3;
var CAREER_CHAMPIONS_KNOCKOUT_SIZE = 16;
// Calendario fijo de una liguilla de 4 equipos a una vuelta (3 jornadas,
// 2 partidos cada una) -- mismos índices relativos dentro de cada grupo,
// no hace falta un algoritmo de círculo para un grupo tan pequeño.
var CAREER_CHAMPIONS_GROUP_FIXTURE_PATTERN = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
// Octavos, cuartos y semis a ida y vuelta (dos jornadas cada una), solo la
// final es a partido único -- a petición explícita ("en champions tiene
// que haber partidos de ida y vuelta para todo menos la final"): 3 de
// grupos + 2x3 de eliminatorias + la final = 10 entradas.
var CAREER_CHAMPIONS_ROUND_MATCHDAYS = [5, 10, 15, 20, 22, 25, 27, 29, 31, 34];
var CAREER_CHAMPIONS_WIN_BONUS = 8;
function careerNewChampions() {
  var bracket = generateTournamentBracket(CAREER_CHAMPIONS_SIZE);
  var teams = bracket.slots.map(function (s) { return { isPlayer: s.isPlayer, name: s.name, tier: s.tier, pts: 0, gf: 0, ga: 0, played: 0 }; });
  var groups = [];
  for (var i = 0; i < teams.length; i += CAREER_CHAMPIONS_GROUP_SIZE) groups.push(teams.slice(i, i + CAREER_CHAMPIONS_GROUP_SIZE));
  var myGroupIndex = groups.findIndex(function (g) { return g.some(function (t) { return t.isPlayer; }); });
  return {
    phase: 'group', size: CAREER_CHAMPIONS_SIZE,
    groups: groups, myGroupIndex: myGroupIndex, groupRoundIndex: 0,
    rounds: [], eliminated: false, eliminatedRound: null, eliminatedInGroup: false,
    rewardClaimed: false
  };
}
function careerChampionsGroupStanding(group) {
  return group.slice().sort(function (a, b) { return (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf); });
}
function careerChampionsMyGroupMatch(champions) {
  if (champions.phase !== 'group') return null;
  var group = champions.groups[champions.myGroupIndex];
  var pattern = CAREER_CHAMPIONS_GROUP_FIXTURE_PATTERN[champions.groupRoundIndex];
  if (!pattern) return null;
  var pair = pattern.find(function (p) { return group[p[0]].isPlayer || group[p[1]].isPlayer; });
  if (!pair) return null;
  return { a: group[pair[0]], b: group[pair[1]] };
}
function careerChampionsRecordGroupResult(team, gf, ga) {
  team.played++; team.gf += gf; team.ga += ga;
  team.pts += gf > ga ? 3 : (gf === ga ? 1 : 0);
}
// Resuelve TODOS los partidos de la ronda de grupos actual que no sean
// el tuyo (el otro partido de tu propio grupo, y los 2 de cada uno de
// los otros 7 grupos) -- se llama justo después de aplicar tu resultado,
// antes de pasar a la siguiente jornada de grupo.
function careerChampionsResolveGroupRoundOthers(champions) {
  var pattern = CAREER_CHAMPIONS_GROUP_FIXTURE_PATTERN[champions.groupRoundIndex];
  champions.groups.forEach(function (group) {
    pattern.forEach(function (pair) {
      var a = group[pair[0]], b = group[pair[1]];
      if (a.isPlayer || b.isPlayer) return; // tu partido, ya resuelto aparte
      var goles = simulateCpuMatchGoals(a, b);
      careerChampionsRecordGroupResult(a, goles[0], goles[1]);
      careerChampionsRecordGroupResult(b, goles[1], goles[0]);
      careerRecordCompTeamGoals(G.career, champions, a, goles[0]);
      careerRecordCompTeamGoals(G.career, champions, b, goles[1]);
    });
  });
}
function careerChampionsPlayMyGroupMatch(c, myGoals, oppGoals) {
  var champions = c.champions;
  var match = careerChampionsMyGroupMatch(champions);
  var me = match.a.isPlayer ? match.a : match.b;
  var opp = match.a.isPlayer ? match.b : match.a;
  careerChampionsRecordGroupResult(me, myGoals, oppGoals);
  careerChampionsRecordGroupResult(opp, oppGoals, myGoals);
  careerChampionsResolveGroupRoundOthers(champions);
  champions.groupRoundIndex++;
  if (champions.groupRoundIndex >= CAREER_CHAMPIONS_GROUP_ROUNDS) careerChampionsFinishGroupStage(c);
}
// Fin de la liguilla: 1º y 2º de cada uno de los 8 grupos (16 en total)
// pasan a un cuadro de octavos de eliminación directa, emparejados al
// azar (como el sorteo real de octavos). Si no quedaste entre los 2
// primeros de tu grupo, quedas eliminado aquí mismo -- el resto del
// cuadro (sin ti) se resuelve solo para poder enseñarlo completo.
function careerChampionsFinishGroupStage(c) {
  var champions = c.champions;
  var qualifiers = [];
  champions.groups.forEach(function (group) {
    var standing = careerChampionsGroupStanding(group);
    qualifiers.push(standing[0], standing[1]);
  });
  var myQualified = qualifiers.some(function (t) { return t.isPlayer; });
  qualifiers = qualifiers.sort(function () { return Math.random() - 0.5; });
  var round1 = [];
  for (var i = 0; i < qualifiers.length; i += 2) round1.push({ a: qualifiers[i], b: qualifiers[i + 1], winner: null });
  champions.rounds = [round1];
  champions.phase = 'knockout';
  if (!myQualified) {
    champions.eliminated = true;
    champions.eliminatedInGroup = true;
    careerChampionsSettleRemaining(champions);
  }
}
function careerChampionsMyMatch(champions) {
  if (champions.phase !== 'knockout' || !champions.rounds.length) return null;
  var round = champions.rounds[champions.rounds.length - 1];
  return round.find(function (m) { return (m.a.isPlayer || m.b.isPlayer) && m.winner === null; }) || null;
}
function careerChampionsOpponent(match) { return match.a.isPlayer ? match.b : match.a; }
function careerChampionsChampion(champions) {
  if (!champions.rounds.length) return null;
  var round = champions.rounds[champions.rounds.length - 1];
  return (round.length === 1 && round[0].winner) ? round[0].winner : null;
}
function careerChampionsFinished(champions) { return champions.eliminated || !!careerChampionsChampion(champions); }
// Índice combinado dentro de CAREER_CHAMPIONS_ROUND_MATCHDAYS: 0-2 =
// jornadas de grupo, 3-6 = octavos/cuartos/semis/final.
function careerChampionsRoundIndex(c) {
  var champions = c.champions;
  if (!champions) return 0;
  if (champions.phase === 'group') return champions.groupRoundIndex;
  var r = champions.rounds.length - 1;
  var round = champions.rounds[r];
  if (round && round.length === 1) return CAREER_CHAMPIONS_GROUP_ROUNDS + 2 * r; // final, partido único
  var m = careerChampionsMyMatch(champions);
  return CAREER_CHAMPIONS_GROUP_ROUNDS + 2 * r + ((m && m.leg1) ? 1 : 0);
}
// Ida (1) o vuelta (2) del cruce actual; la final no tiene (0).
function careerChampionsLeg(champions, match) {
  var round = champions.rounds[champions.rounds.length - 1];
  if (!round || round.length === 1) return 0;
  return match && match.leg1 ? 2 : 1;
}
// La ida se juega en casa, la vuelta fuera; la final, en casa (campo neutral).
function careerChampionsYouAreHome(champions, match) { return careerChampionsLeg(champions, match) !== 2; }
// Resuelve tu partido de eliminatoria (Ver partido, Simular o Saltar): si es
// la ida, solo la apunta y deja el cruce abierto; si es la vuelta o la
// final, decide por global (o penaltis si sigue empatado) y avanza la ronda.
function careerChampionsResolveKnockout(c, match, opp, myGoals, oppGoals) {
  var champions = c.champions;
  var leg = careerChampionsLeg(champions, match);
  if (leg === 1) {
    match.leg1 = { myGoals: myGoals, oppGoals: oppGoals };
    c.lastChampionsResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals, leg: 1 };
    return { playerWon: myGoals > oppGoals, penalty: null, leg: 1, agg: null };
  }
  var totMy = myGoals + (match.leg1 ? match.leg1.myGoals : 0);
  var totOpp = oppGoals + (match.leg1 ? match.leg1.oppGoals : 0);
  var penalty = totMy === totOpp ? careerCupPenaltyShootout(c, opp.name) : null;
  var playerWon = penalty ? penalty.myGoals > penalty.oppGoals : totMy > totOpp;
  match.winner = playerWon ? (match.a.isPlayer ? match.a : match.b) : (match.a.isPlayer ? match.b : match.a);
  var roundIdxAtElimination = champions.rounds.length - 1;
  careerChampionsAdvanceRound(champions);
  if (!playerWon) { champions.eliminated = true; champions.eliminatedRound = roundIdxAtElimination; careerChampionsSettleRemaining(champions); }
  careerChampionsMaybeAwardChampion(c);
  var agg = leg === 2 ? { my: totMy, opp: totOpp } : null;
  c.lastChampionsResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon, penalty: penalty, leg: leg, agg: agg };
  return { playerWon: playerWon, penalty: penalty, leg: leg, agg: agg };
}
// Solo existe (y se puede jugar) estando en Primera con c.champions creada
// -- si desciendes a mitad de temporada, se queda bloqueada hasta volver
// a subir (no se destruye, igual que la Copa del Rey con la división) --
// y, ronda a ronda, solo a partir de la jornada que le toque (mismo
// mecanismo que careerCupLocked: en cuanto se resuelve tu partido de una
// ronda, careerChampionsAdvanceRound/careerChampionsPlayMyGroupMatch
// arma la siguiente y esto se vuelve a bloquear solo hasta la jornada
// que corresponda).
function careerChampionsLocked(c) {
  if (c.division !== 1 || !c.champions) return true;
  var roundIdx = careerChampionsRoundIndex(c);
  var matchday = CAREER_CHAMPIONS_ROUND_MATCHDAYS[roundIdx] !== undefined ? CAREER_CHAMPIONS_ROUND_MATCHDAYS[roundIdx] : CAREER_CHAMPIONS_ROUND_MATCHDAYS[CAREER_CHAMPIONS_ROUND_MATCHDAYS.length - 1];
  return c.league.matchdayIndex < matchday;
}
// Igual que careerCupPending: si ya está desbloqueada pero no resuelta,
// la Liga no deja jugar la jornada siguiente hasta que se resuelva.
function careerChampionsPending(c) { return !careerChampionsLocked(c) && !careerChampionsFinished(c.champions); }
function careerChampionsAdvanceRound(champions) {
  var round = champions.rounds[champions.rounds.length - 1];
  round.forEach(function (m) {
    if (m.winner === null) { m.winner = simulateCpuMatch(m.a, m.b); careerCompCpuGoals(champions, m, m.winner); }
  });
  if (round.length === 1) return;
  var winners = round.map(function (m) { return m.winner; });
  var nextRound = [];
  for (var i = 0; i < winners.length; i += 2) nextRound.push({ a: winners[i], b: winners[i + 1], winner: null });
  champions.rounds.push(nextRound);
}
function careerChampionsSettleRemaining(champions) {
  while (!careerChampionsChampion(champions)) careerChampionsAdvanceRound(champions);
}
// Premio de la Champions: bastante más que la Copa del Rey (competición
// europea), presupuesto + contador acumulado de toda la carrera
// (c.championsWon, nunca se resetea, mismo patrón que cupsWon).
function careerChampionsMaybeAwardChampion(c) {
  var champions = c.champions;
  if (!champions || champions.rewardClaimed) return;
  var champion = careerChampionsChampion(champions);
  if (!champion) return;
  champions.rewardClaimed = true;
  if (champion.isPlayer) {
    c.budget = Math.round((c.budget + CAREER_CHAMPIONS_WIN_BONUS * careerPrizeSeasonFactor()) * 10) / 10;
    c.championsWon = (c.championsWon || 0) + 1;
    careerBoardNoteTrophy(c, 'champions');
    var championsPoints = careerAwardSpiritPoints(CAREER_CHAMPIONS_WIN_POINTS);
    careerTriggerTrophyPopup('Champions League', championsPoints);
    careerApplySponsorTrophyPayout(c);
    // Supercopa: se crea sola en cuanto ganas la Champions esta
    // temporada, a petición explícita ("añade una supercopa también si
    // ganas la champions, con mucho nivel, que es con partido de ida y
    // vuelta"). Se juega ya mismo, no bloquea la Liga (competición corta
    // de 2 partidos, no hace falta repartirla en jornadas como Copa/
    // Champions).
    c.supercopa = careerNewSupercopa();
  }
}
window.actionSimulateCareerChampionsMatch = function (visualMode) {
  var c = G.career;
  var champions = c.champions;
  if (!champions) return;
  var match = champions.phase === 'group' ? careerChampionsMyGroupMatch(champions) : careerChampionsMyMatch(champions);
  if (!match) return;
  var opp = careerChampionsOpponent(match);
  c.savedFutdraft = G.futdraft;
  // f.squad (no solo f.lineup) hace falta para que futDraftUndraftedPool
  // (el "plantel fantasma" de goles del rival) excluya TODA tu plantilla,
  // titulares y banquillo -- sin esto, quedaba vacío (undefined) y el
  // rival podía "marcar" con el nombre de un jugador tuyo de verdad, a
  // petición explícita ("no puede meter gol alguien en el equipo
  // contrario al que estoy jugando, un jugador que yo tengo en mi equipo").
  var careerStyleMods = careerPlayStyleModifiers(c);
  G.futdraft = { lineup: c.lineup, squad: c.lineup.map(function (s) { return s.player; }).concat(c.bench), captainId: c.captainId, formation: c.formation, condition: 'ninguna', styleAtkMult: careerStyleMods.atk, styleDefMult: careerStyleMods.def, teamScoreOverride: careerMatchTeamScore(c), oppGhostPool: careerCompGhostSquad(c, champions, opp.name) };
  var sim = futDraftSimulateMatchCore(careerKnockoutPower(careerRivalPower(opp.name), 'champions'));
  G.futdraft.live = {
    oppSide: { name: opp.name }, modifier: sim.modifier,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    // En fase de grupos el empate cuenta como resultado válido (1 punto
    // cada uno, sin penaltis) -- en eliminatorias sigue haciendo falta
    // desempatar sí o sí, ver finishCareerChampionsMatch.
    inExtraTime: false, allowDraw: true, onFinish: finishCareerChampionsMatch,
    careerChampionsMatch: match, careerChampionsPhase: champions.phase,
    isCareer: true, youAreHome: champions.phase === 'group' ? true : careerChampionsYouAreHome(champions, match), redCardFreqMult: careerRedCardFreqMult(c), injuryFreqMult: careerInjuryFreqMult(c), yellowFreqMult: careerYellowFreqMult(c),
    visualMode: visualMode || 'avatars',
    done: false
  };
  G.screen = 'futdraftLive';
  if (typeof playKickoffSound === 'function') playKickoffSound();
  render();
  futDraftLiveTick();
};
// "Jugar partido" en la Champions, que antes solo tenía un botón de
// Simular (ni siquiera picker de 3) -- a petición explícita.
window.actionPlayCareerChampionsMatch = function () { actionSimulateCareerChampionsMatch('dots'); };
function finishCareerChampionsMatch() {
  var c = G.career;
  var champions = c.champions;
  var live = G.futdraft.live;
  var match = live.careerChampionsMatch;
  var opp = careerChampionsOpponent(match);
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  if (live.careerChampionsPhase !== 'group' && careerChampionsLeg(champions, match) === 2) {
    var champTied = (myGoals + (match.leg1 ? match.leg1.myGoals : 0)) === (oppGoals + (match.leg1 ? match.leg1.oppGoals : 0));
    if (futDraftLivePenaltyGate(live, opp.name, careerMatchTeamScore(c) - careerRivalPower(opp.name), champTied, finishCareerChampionsMatch)) return;
  }

  var myEvents = live.revealed.filter(function (e) { return e.side === 'me'; });
  futDraftRecordGoalEvents(c.careerStats, myEvents, 'Tu equipo');
  careerRecordMyCompMatch(c, champions, opp.name, myEvents, live.revealed.filter(function (e) { return e.side === 'opp'; }), oppGoals);
  careerFinishMatchEvents(c, live);

  if (live.careerChampionsPhase === 'group') {
    careerChampionsPlayMyGroupMatch(c, myGoals, oppGoals);
    c.lastChampionsResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals, isGroup: true };
    G.futdraft.lastMatchResult = {
      oppName: opp.name, oppShield: teamShieldPath(opp.name), oppPower: careerKnockoutPower(careerRivalPower(opp.name), 'champions'),
      myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals,
      timeline: live.revealed, modifier: live.modifier, isCareer: true, isChampions: true, isChampionsGroup: true, youAreHome: live.youAreHome
    };
    G.futdraft.live = null;
    G.screen = 'futdraftMatchResult';
    render();
    return;
  }

  var res = careerChampionsResolveKnockout(c, match, opp, myGoals, oppGoals);
  var penalty = res.penalty, playerWon = res.playerWon;

  G.futdraft.lastMatchResult = {
    oppName: opp.name, oppShield: teamShieldPath(opp.name), oppPower: careerKnockoutPower(careerRivalPower(opp.name), 'champions'),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: playerWon,
    timeline: live.revealed, modifier: live.modifier, isCareer: true, isChampions: true, penalty: penalty, youAreHome: live.youAreHome
  };
  G.futdraft.live = null;
  G.screen = 'futdraftMatchResult';
  render();
}
window.actionSkipCareerChampionsMatch = function () {
  var c = G.career;
  var champions = c.champions;
  if (!champions) return;
  var match = champions.phase === 'group' ? careerChampionsMyGroupMatch(champions) : careerChampionsMyMatch(champions);
  if (!match) return;
  var opp = careerChampionsOpponent(match);
  var myAtkDef = careerMyAtkDef(c);
  var oppPower = careerKnockoutPower(careerRivalPower(opp.name), 'champions');
  var skipHome = champions.phase === 'group' ? true : careerChampionsYouAreHome(champions, match);
  var goles = careerSimulateMyMatchGoals(myAtkDef.atk, myAtkDef.def, oppPower, skipHome);
  var myGoals = skipHome ? goles[0] : goles[1], oppGoals = skipHome ? goles[1] : goles[0];

  var myPlayers = c.lineup.map(function (s) { return s.player; });
  var events = [];
  for (var i = 0; i < myGoals; i++) events.push(futDraftGoalEvent(myPlayers));
  futDraftRecordGoalEvents(c.careerStats, events, 'Tu equipo');
  careerRecordMyCompMatch(c, champions, opp.name, events, null, oppGoals);
  careerFinishMatchEvents(c, null);

  if (champions.phase === 'group') {
    careerChampionsPlayMyGroupMatch(c, myGoals, oppGoals);
    c.lastChampionsResult = { oppName: opp.name, myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals, isGroup: true };
    render();
    return;
  }

  careerChampionsResolveKnockout(c, match, opp, myGoals, oppGoals);
  render();
};
window.continueCareerChampionsMatch = function () {
  var c = G.career;
  G.futdraft = c.savedFutdraft;
  c.savedFutdraft = null;
  G.screen = 'careerMode';
  actionGoToCareerCompeticionesTab('champions');
};
function careerChampionsStageLabel(c) {
  var champions = c.champions;
  if (!champions) return '';
  if (champions.phase === 'group') return 'fase de grupos, jornada ' + (champions.groupRoundIndex + 1) + '/' + CAREER_CHAMPIONS_GROUP_ROUNDS;
  var stageMatch = careerChampionsMyMatch(champions);
  var stageLeg = careerChampionsLeg(champions, stageMatch);
  return roundNameForIndex(champions.rounds.length - 1, Math.log2(CAREER_CHAMPIONS_KNOCKOUT_SIZE)) + (stageLeg === 1 ? ' (ida)' : stageLeg === 2 ? ' (vuelta)' : '');
}
function renderCareerChampions(c) {
  // Mismo arreglo que la Copa (careerCupResultBannerHtml): tarjeta con
  // escudos en vez de texto plano al saltar el partido -- calculada ANTES
  // del check de bloqueo, porque resolver tu partido (sobre todo si era
  // el último de esta ronda) deja la pestaña bloqueada hasta la próxima
  // jornada de Champions AL INSTANTE, y el resultado se quedaba sin
  // enseñarse nunca (se saltaba entero el resto de esta función) -- bug
  // real ("cuando simulo o salto, no me da el resultado, me va ya a la
  // siguiente jornada de liga").
  var lastResultHtml = '';
  if (c.lastChampionsResult) {
    var lr = c.lastChampionsResult;
    var lrLabel = lr.playerWon ? '🏆 Ganaste' : (lr.isGroup && lr.myGoals === lr.oppGoals ? '🤝 Empate' : '❌ Perdiste');
    lastResultHtml = '<p class="dim small">Último resultado: ' + lrLabel + ' contra ' + escapeHtml(lr.oppName) + '</p>' +
      careerMatchResultCardHtml(lr.oppName, lr.myGoals, lr.oppGoals, null, lr.leg !== 2) +
      (lr.leg === 1 ? '<p class="dim small center-text">Ida. Falta la vuelta.</p>' : '') +
      (lr.agg ? '<p class="dim small center-text">Global: ' + lr.agg.my + ' - ' + lr.agg.opp + '</p>' : '') +
      (lr.penalty ? '<p class="dim small center-text">(penaltis ' + lr.penalty.myGoals + '-' + lr.penalty.oppGoals + ')</p>' : '');
  }
  if (careerChampionsLocked(c)) {
    var championsRoundIdx = c.champions ? careerChampionsRoundIndex(c) : 0;
    var nextChampionsMatchday = CAREER_CHAMPIONS_ROUND_MATCHDAYS[championsRoundIdx] !== undefined ? CAREER_CHAMPIONS_ROUND_MATCHDAYS[championsRoundIdx] : CAREER_CHAMPIONS_ROUND_MATCHDAYS[CAREER_CHAMPIONS_ROUND_MATCHDAYS.length - 1];
    var lockedMsg = c.division !== 1
      ? 'La Champions League solo se juega en Primera División. Ahora mismo estás en ' + careerDivisionName(c.division) + '.'
      : !c.champions
        ? 'No te has clasificado para la Champions League esta temporada. Termina entre los ' + CAREER_CHAMPIONS_QUALIFY_SPOTS + ' primeros de Primera para jugarla la que viene.'
        : 'La próxima jornada de la Champions League (' + careerChampionsStageLabel(c) + ') se juega en la jornada ' + nextChampionsMatchday + '. Llevas jugadas ' + c.league.matchdayIndex + '.';
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Champions League</h3>' +
      '<p class="dim small">' + lockedMsg + '</p>' +
    '</div>' + lastResultHtml;
  }
  var champions = c.champions;
  var headerHtml =
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Champions League</h3>' +
      '<p class="dim small">32 equipos, 8 grupos de 4 y luego octavos de eliminación directa, como en la vida real. Champions ganadas en la carrera: <strong style="color:var(--accent-2)">' + (c.championsWon || 0) + '</strong>.</p>' +
    '</div>' + lastResultHtml;

  // Fase de grupos: tabla de tu grupo (mismo estilo que la tabla de Liga)
  // + tu partido de esta jornada de grupo si toca.
  if (champions.phase === 'group') {
    var group = champions.groups[champions.myGroupIndex];
    var standing = careerChampionsGroupStanding(group);
    var tableHtml = '<div class="panel">' +
      '<h3 style="margin-bottom:4px">Tu grupo, jornada ' + Math.min(champions.groupRoundIndex + 1, CAREER_CHAMPIONS_GROUP_ROUNDS) + '/' + CAREER_CHAMPIONS_GROUP_ROUNDS + '</h3>' +
      '<table class="career-liga-table"><thead><tr><th>#</th><th></th><th>Equipo</th><th>J</th><th>DG</th><th>PTS</th></tr></thead><tbody>' +
      standing.map(function (t, i) {
        var shield = t.isPlayer ? careerClubShieldPath(c) : teamShieldPath(t.name);
        var label = t.isPlayer ? careerClubDisplayName(c) : t.name;
        return '<tr class="' + (t.isPlayer ? 'liga-you' : '') + '">' +
          '<td>' + (i + 1) + '</td>' +
          '<td><img class="liga-row-shield" src="' + escapeHtml(shield) + '" alt=""></td>' +
          '<td>' + escapeHtml(label) + '</td>' +
          '<td>' + t.played + '</td>' +
          '<td>' + ((t.gf - t.ga) >= 0 ? '+' : '') + (t.gf - t.ga) + '</td>' +
          '<td><strong>' + t.pts + '</strong></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<p class="dim small mt">Pasan a octavos el 1º y el 2º de cada uno de los 8 grupos.</p>' +
    '</div>';
    var myGroupMatch = careerChampionsMyGroupMatch(champions);
    var groupActionHtml = '';
    if (myGroupMatch) {
      var groupOpp = careerChampionsOpponent(myGroupMatch);
      groupActionHtml =
        careerMatchupCardHtml(groupOpp.name, 'Fase de grupos') +
        '<div class="panel center-text">' +
          '<div class="match-mode-picker">' +
            '<button class="match-mode-card" onclick="actionPlayCareerChampionsMatch()"><span class="match-mode-icon">⚽</span><strong>Ver partido</strong><span class="dim small">Partido en vivo</span></button>' +
            '<button class="match-mode-card" onclick="actionSimulateCareerChampionsMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
            '<button class="match-mode-card" onclick="actionSkipCareerChampionsMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
          '</div>' +
        '</div>';
    }
    return headerHtml + tableHtml + groupActionHtml;
  }

  // Fase eliminatoria: mismo cuadro de toda la vida (octavos en adelante,
  // 16 clasificados de los grupos).
  var totalRounds = Math.log2(CAREER_CHAMPIONS_KNOCKOUT_SIZE);
  var champion = careerChampionsChampion(champions);
  var myMatch = careerChampionsMyMatch(champions);
  var actionHtml;
  if (champion) {
    actionHtml = '<div class="panel center-text"><p class="dim small">' + (champion.isPlayer ? '¡Campeón de la Champions League!' : 'Campeón: ' + escapeHtml(champion.name)) + '</p></div>';
  } else if (champions.eliminated) {
    actionHtml = '<div class="panel center-text"><p class="dim small">' + (champions.eliminatedInGroup ? 'Eliminado en la fase de grupos.' : 'Eliminado en ' + roundNameForIndex(champions.eliminatedRound, totalRounds) + '.') + '</p></div>';
  } else if (myMatch) {
    var opp = careerChampionsOpponent(myMatch);
    actionHtml =
      careerMatchupCardHtml(opp.name, roundNameForIndex(champions.rounds.length - 1, totalRounds) + (careerChampionsLeg(champions, myMatch) ? (careerChampionsLeg(champions, myMatch) === 1 ? ' · Ida' : ' · Vuelta (ida ' + myMatch.leg1.myGoals + '-' + myMatch.leg1.oppGoals + ')') : ''), careerChampionsYouAreHome(champions, myMatch)) +
      '<div class="panel center-text">' +
        '<div class="match-mode-picker">' +
          '<button class="match-mode-card" onclick="actionPlayCareerChampionsMatch()"><span class="match-mode-icon">⚽</span><strong>Ver partido</strong><span class="dim small">Partido en vivo</span></button>' +
          '<button class="match-mode-card" onclick="actionSimulateCareerChampionsMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
          '<button class="match-mode-card" onclick="actionSkipCareerChampionsMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
        '</div>' +
      '</div>';
  } else {
    actionHtml = '';
  }
  var bracketHtml =
    '<div class="panel bracket-panel"><div class="bracket-tree">' +
      champions.rounds.map(function (round, ri) {
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
        '<div class="bracket-champion-name">' + (champion ? (champion.isPlayer ? escapeHtml(careerClubDisplayName(c)) : escapeHtml(champion.name)) : '?') + '</div></div></div>' +
    '</div></div>';
  return headerHtml + actionHtml + bracketHtml;
}

// ===== Supercopa =====
// Se crea sola en cuanto ganas la Champions esta temporada
// (careerChampionsMaybeAwardChampion), a petición explícita ("añade una
// supercopa también si ganas la champions, con mucho nivel, que es con
// partido de ida y vuelta"): 2 partidos (ida y vuelta) contra el rival
// "jefe" más fuerte del juego (por TEAM_POWER), a una potencia FIJA muy
// alta (CAREER_SUPERCOPA_POWER) que no depende de la dificultad elegida
// -- "con mucho nivel" tiene que notarse siempre. Por encima de eso, en
// Difícil/Muy difícil se le suma el mismo extra que a la Champions
// (careerKnockoutPower), a petición explícita. Si empatáis a agregado,
// se decide a penaltis (careerCupPenaltyShootout, genérica, no
// específica de la Copa). No bloquea la Liga -- son solo 2 partidos, se
// juegan cuando se quiera tras ganarla.
var CAREER_SUPERCOPA_POWER = 96;
function careerSupercopaPower() { return careerKnockoutPower(CAREER_SUPERCOPA_POWER, 'supercopa'); }
var CAREER_SUPERCOPA_WIN_BONUS = 6;
function careerNewSupercopa() {
  var opponent = RIVAL_TEAM_BOSSES.slice().sort(function (a, b) { return teamPower({ name: b }) - teamPower({ name: a }); })[0];
  return { opponentName: opponent, legIndex: 0, legResults: [null, null], finished: false, won: false, rewardClaimed: false };
}
function careerSupercopaAggregate(sc) {
  var myAgg = 0, oppAgg = 0;
  sc.legResults.forEach(function (r) { if (r) { myAgg += r.myGoals; oppAgg += r.oppGoals; } });
  return { myAgg: myAgg, oppAgg: oppAgg };
}
function careerSupercopaMaybeAwardChampion(c) {
  var sc = c.supercopa;
  if (!sc || !sc.finished || sc.rewardClaimed) return;
  sc.rewardClaimed = true;
  if (sc.won) {
    c.budget = Math.round((c.budget + CAREER_SUPERCOPA_WIN_BONUS * careerPrizeSeasonFactor()) * 10) / 10;
    c.supercopasWon = (c.supercopasWon || 0) + 1;
    careerBoardNoteTrophy(c, 'supercopa');
    careerTriggerTrophyPopup('Supercopa');
    careerApplySponsorTrophyPayout(c);
  }
}
// Resuelve el resultado del leg actual (ida o vuelta) -- si era la ida,
// pasa a la vuelta; si era la vuelta, decide el agregado (a penaltis si
// hay empate) y da la Supercopa por terminada.
function careerSupercopaResolveLeg(c, myGoals, oppGoals) {
  var sc = c.supercopa;
  sc.legResults[sc.legIndex] = { myGoals: myGoals, oppGoals: oppGoals };
  if (sc.legIndex === 0) {
    sc.legIndex = 1;
  } else {
    var agg = careerSupercopaAggregate(sc);
    var won;
    if (agg.myAgg !== agg.oppAgg) {
      won = agg.myAgg > agg.oppAgg;
    } else {
      var penalty = careerCupPenaltyShootout(c, sc.opponentName);
      sc.penalty = penalty;
      won = penalty.myGoals > penalty.oppGoals;
    }
    sc.finished = true;
    sc.won = won;
    careerSupercopaMaybeAwardChampion(c);
  }
}
window.actionSimulateCareerSupercopaMatch = function (visualMode) {
  var c = G.career;
  var sc = c.supercopa;
  if (!sc || sc.finished) return;
  var youAreHome = sc.legIndex === 0;
  c.savedFutdraft = G.futdraft;
  var careerStyleMods = careerPlayStyleModifiers(c);
  G.futdraft = { lineup: c.lineup, squad: c.lineup.map(function (s) { return s.player; }).concat(c.bench), captainId: c.captainId, formation: c.formation, condition: 'ninguna', styleAtkMult: careerStyleMods.atk, styleDefMult: careerStyleMods.def, teamScoreOverride: careerMatchTeamScore(c) };
  var sim = futDraftSimulateMatchCore(careerSupercopaPower());
  G.futdraft.live = {
    oppSide: { name: sc.opponentName }, modifier: sim.modifier,
    minute: 0, pending: sim.timeline.slice(), revealed: [],
    myGoals: 0, oppGoals: 0, finalMyGoals: sim.myGoals, finalOppGoals: sim.oppGoals,
    myAtk: sim.myAtk, myDef: sim.myDef, effectiveOppPower: sim.effectiveOppPower,
    inExtraTime: false, allowDraw: true, onFinish: finishCareerSupercopaMatch,
    careerSupercopaYouAreHome: youAreHome,
    isCareer: true, youAreHome: youAreHome, redCardFreqMult: careerRedCardFreqMult(c), injuryFreqMult: careerInjuryFreqMult(c), yellowFreqMult: careerYellowFreqMult(c),
    visualMode: visualMode || 'avatars',
    done: false
  };
  G.screen = 'futdraftLive';
  if (typeof playKickoffSound === 'function') playKickoffSound();
  render();
  futDraftLiveTick();
};
// "Jugar partido" en la Supercopa, misma petición que Copa/Champions.
window.actionPlayCareerSupercopaMatch = function () { actionSimulateCareerSupercopaMatch('dots'); };
function finishCareerSupercopaMatch() {
  var c = G.career;
  var live = G.futdraft.live;
  var myGoals = live.finalMyGoals, oppGoals = live.finalOppGoals;
  var scPrev = c.supercopa.legResults[0];
  if (c.supercopa.legIndex === 1 && scPrev && futDraftLivePenaltyGate(live, c.supercopa.opponentName, careerMatchTeamScore(c) - careerSupercopaPower(), (myGoals + scPrev.myGoals) === (oppGoals + scPrev.oppGoals), finishCareerSupercopaMatch)) return;
  var myEvents = live.revealed.filter(function (e) { return e.side === 'me'; });
  futDraftRecordGoalEvents(c.careerStats, myEvents, 'Tu equipo');
  careerFinishMatchEvents(c, live);
  careerSupercopaResolveLeg(c, myGoals, oppGoals);
  G.futdraft.lastMatchResult = {
    oppName: c.supercopa.opponentName, oppShield: teamShieldPath(c.supercopa.opponentName), oppPower: careerSupercopaPower(),
    myGoals: myGoals, oppGoals: oppGoals, playerWon: myGoals > oppGoals,
    timeline: live.revealed, modifier: live.modifier, isCareer: true, isSupercopa: true, youAreHome: live.youAreHome, penalty: c.supercopa.penalty || null
  };
  G.futdraft.live = null;
  G.screen = 'futdraftMatchResult';
  render();
}
window.continueCareerSupercopaMatch = function () {
  var c = G.career;
  G.futdraft = c.savedFutdraft;
  c.savedFutdraft = null;
  G.screen = 'careerMode';
  actionGoToCareerCompeticionesTab('supercopa');
};
window.actionSkipCareerSupercopaMatch = function () {
  var c = G.career;
  var sc = c.supercopa;
  if (!sc || sc.finished) return;
  var myAtkDef = careerMyAtkDef(c);
  var youAreHome = sc.legIndex === 0;
  var goles = careerSimulateMyMatchGoals(myAtkDef.atk, myAtkDef.def, careerSupercopaPower(), true);
  var myGoals = goles[0], oppGoals = goles[1];
  var myPlayers = c.lineup.map(function (s) { return s.player; });
  var events = [];
  for (var i = 0; i < myGoals; i++) events.push(futDraftGoalEvent(myPlayers));
  futDraftRecordGoalEvents(c.careerStats, events, 'Tu equipo');
  careerFinishMatchEvents(c, null);
  careerSupercopaResolveLeg(c, myGoals, oppGoals);
  render();
};
function renderCareerSupercopa(c) {
  var sc = c.supercopa;
  if (!sc) {
    return '<div class="panel center-text"><h3 style="margin-bottom:4px">Supercopa</h3><p class="dim small">Gana la Champions League esta temporada para jugarla.</p></div>';
  }
  var headerHtml =
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Supercopa</h3>' +
      '<p class="dim small">Ida y vuelta contra <strong>' + escapeHtml(sc.opponentName) + '</strong>, con mucho nivel. Supercopas ganadas en la carrera: <strong style="color:var(--accent-2)">' + (c.supercopasWon || 0) + '</strong>.</p>' +
    '</div>';
  var legsHtml = '<div class="panel">' +
    [0, 1].map(function (i) {
      var r = sc.legResults[i];
      var label = i === 0 ? 'Ida' : 'Vuelta';
      return '<p class="dim small">' + label + ': ' + (r ? ('Tú ' + r.myGoals + ' - ' + r.oppGoals + ' ' + escapeHtml(sc.opponentName)) : 'Sin jugar') + '</p>';
    }).join('') +
    (sc.penalty ? '<p class="dim small">Penaltis: ' + sc.penalty.myGoals + ' - ' + sc.penalty.oppGoals + '</p>' : '') +
  '</div>';
  var actionHtml;
  if (sc.finished) {
    actionHtml = '<div class="panel center-text"><p class="dim small">' + (sc.won ? '¡Campeón de la Supercopa!' : 'Perdida la Supercopa contra ' + escapeHtml(sc.opponentName) + '.') + '</p></div>';
  } else {
    actionHtml = careerMatchupCardHtml(sc.opponentName, (sc.legIndex === 0 ? 'Ida' : 'Vuelta'), sc.legIndex === 0) +
      '<div class="panel center-text">' +
        '<div class="match-mode-picker">' +
          '<button class="match-mode-card" onclick="actionPlayCareerSupercopaMatch()"><span class="match-mode-icon">⚽</span><strong>Ver partido</strong><span class="dim small">Partido en vivo</span></button>' +
          '<button class="match-mode-card" onclick="actionSimulateCareerSupercopaMatch()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
          '<button class="match-mode-card" onclick="actionSkipCareerSupercopaMatch()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
        '</div>' +
      '</div>';
  }
  return headerHtml + legsHtml + actionHtml;
}

// Resumen de temporada, a petición explícita ("quiero un resumen de mi
// temporada al acabar, donde diga mi posición en copa, en liga, que
// jugadores cedidos se van"): se lee de c.league/c.cup/c.loanedIds
// TAL CUAL están al terminar la última jornada, todavía sin tocar --
// actionStartNewCareerSeason (el botón de abajo) es quien de verdad
// reconstruye la liga/copa y devuelve los cedidos, así que este resumen
// sigue viéndose exactamente igual hasta que se pulsa ese botón.
// Tarjeta con icono en vez de un párrafo suelto (careerSeasonBadgeHtml),
// a petición explícita ("un tratamiento tipo tarjeta/insignia... se
// leería más rápido que texto corrido").
function careerSeasonBadgeHtml(icon, label, text, cls) {
  return '<div class="season-badge' + (cls ? ' ' + cls : '') + '">' +
    '<div class="season-badge-icon">' + icon + '</div>' +
    '<div><div class="season-badge-label">' + escapeHtml(label) + '</div><div class="season-badge-text">' + text + '</div></div>' +
  '</div>';
}
function careerSeasonSummaryHtml(c) {
  var position = careerFinalLeaguePosition(c);
  var finish = c.lastLeagueFinish;
  var bonus = (finish && finish.position === position) ? finish.bonus : (position ? careerLeaguePositionBonus(position, c.division) : null);
  var positionText = position ? (position + 'º de ' + c.league.teamNames.length) : 'Sin datos';
  var cup = c.cup;
  var champion = careerCupChampion(cup);
  var cupBadge;
  if (champion && champion.isPlayer) {
    cupBadge = careerSeasonBadgeHtml('🏆', 'Copa del Rey', 'Campeón', 'season-badge-good');
  } else if (cup.eliminated) {
    cupBadge = careerSeasonBadgeHtml('❌', 'Copa del Rey', 'Eliminado en ' + roundNameForIndex(cup.eliminatedRound, Math.log2(cup.size)), 'season-badge-bad');
  } else {
    cupBadge = careerSeasonBadgeHtml('⏳', 'Copa del Rey', 'Sin completar', '');
  }
  var loanedIds = c.loanedIds || [];
  var allPlayers = c.lineup.map(function (s) { return s.player; }).concat(c.bench);
  var loanedNames = loanedIds.map(function (id) {
    var p = allPlayers.find(function (x) { return x.id === id; });
    return p ? p.nombre : null;
  }).filter(Boolean);
  // Ascensos/descensos: careerMaybeAwardLeagueFinish ya calculó el
  // resultado (c.lastPromotionResult) al terminar la última jornada --
  // aquí solo se enseña, la aplicación real (mover nombres, cambiar
  // c.division) pasa al pulsar "Empezar temporada" (actionStartNewCareerSeason).
  var boardReview = c.lastBoardReview;
  var boardBadge = boardReview
    ? careerSeasonBadgeHtml('🧑‍💼', 'Directiva, objetivo ' + boardReview.target + 'º', (boardReview.delta >= 0 ? 'Cumplido' : 'No cumplido') + ' · confianza ' + boardReview.after + ' (' + (boardReview.delta >= 0 ? '+' : '') + boardReview.delta + ')', boardReview.delta >= 0 ? 'season-badge-good' : 'season-badge-bad')
    : '';
  // Objetivo extra de la directiva (elemento/cantera), solo en Primera --
  // a petición explícita ("mete más objetivos en directiva al ascender").
  var objectiveBadge = (boardReview && boardReview.objectives ? boardReview.objectives : []).map(function (o) {
    return careerSeasonBadgeHtml(careerObjectiveIcon(o.type), 'Objetivo extra', (o.met ? 'Cumplido' : 'No cumplido') + ': ' + o.label, o.met ? 'season-badge-good' : 'season-badge-bad');
  }).join('');
  var sponsorBadges = c.activeSponsor
    ? careerSeasonBadgeHtml('🤝', 'Patrocinador: ' + c.activeSponsor.label, '+' + c.activeSponsor.totalEarned + ' M€', 'season-badge-gold')
    : '';
  // Puntos de Espíritu por top 3 (careerMaybeAwardLeagueFinish); el
  // campeón ya los ve en el popup de trofeo, así que esta insignia solo
  // se enseña para 2º/3º -- que no se pierda ese premio en el resumen.
  var spiritBadge = (finish && finish.spiritPoints && finish.position !== 1)
    ? careerSeasonBadgeHtml('✨', 'Puntos de Espíritu', 'Top 3 de ' + careerDivisionName(c.division) + ' · +' + finish.spiritPoints, 'season-badge-gold')
    : '';
  var federationAwards = finish && finish.federationAwards || [];
  var federationBadges = federationAwards.map(function (award) {
    return careerSeasonBadgeHtml('🏅', award.title, escapeHtml(award.playerName) + ' (' + award.count + ') · +' + award.reward + ' M€', 'season-badge-gold');
  }).join('');
  var pr = c.lastPromotionResult;
  var promotionBadge = '';
  if (pr) {
    var moveText;
    if (pr.youPromoted) moveText = careerSeasonBadgeHtml('⬆️', 'Ascenso', 'A Primera División', 'season-badge-good');
    else if (pr.youRelegated) moveText = careerSeasonBadgeHtml('⬇️', 'Descenso', 'A Segunda División', 'season-badge-bad');
    else moveText = careerSeasonBadgeHtml('➡️', 'Sigues en', escapeHtml(careerDivisionName(c.division)), '');
    var movementsText = '';
    if (pr.promotedNames.length) movementsText += '<p class="dim small">Ascienden: ' + pr.promotedNames.map(escapeHtml).join(', ') + '.</p>';
    if (pr.relegatedNames.length) movementsText += '<p class="dim small">Descienden: ' + pr.relegatedNames.map(escapeHtml).join(', ') + '.</p>';
    promotionBadge = moveText + movementsText;
  }
  return '<div class="panel center-text">' +
    '<h3 style="margin-bottom:4px">Resumen de la temporada ' + c.season + '</h3>' +
    '<p class="dim small">' + escapeHtml(careerDivisionName(c.division)) + '</p>' +
    '<div class="season-summary-badges">' +
      careerSeasonBadgeHtml('📊', 'Posición final', positionText, '') +
      (bonus ? careerSeasonBadgeHtml('💰', 'Premio de Liga', '+' + bonus + ' M€', 'season-badge-gold') : '') +
      spiritBadge +
      boardBadge +
      objectiveBadge +
      sponsorBadges +
      federationBadges +
      promotionBadge +
      cupBadge +
      (c.qualifiedForChampionsNextSeason
        ? careerSeasonBadgeHtml('⭐', 'Champions League', 'Clasificado para la próxima temporada', 'season-badge-gold')
        : '') +
      (loanedNames.length
        ? careerSeasonBadgeHtml('🔁', 'Fin de cesión, vuelven a su club', loanedNames.map(escapeHtml).join(', '), '')
        : '') +
    '</div>' +
  '</div>';
}

function renderCareerJornada(c) {
  var league = c.league;
  var seasonOver = league.matchdayIndex >= league.schedule.length;
  var r = c.lastMatchdayResult;
  // Justo después de jugar una jornada (Saltar o Simular), primero se
  // enseña TU resultado + cómo ha quedado toda la ronda -- solo al
  // pulsar "Siguiente" se prepara el próximo partido (escudos,
  // Simular/Saltar), a petición explícita ("deja el partido anterior con
  // el resultado... y ya le das a siguiente, y te carga lo de jornada x
  // de 30, los escudos, simular o saltar"). c.jornadaAckPending es lo que
  // distingue "acabo de jugar, toca confirmar" de "ya confirmado, toca
  // preparar el siguiente". Comprobado ANTES que la ventana de fichajes/
  // Copa/Champions pendientes (que pueden engancharse justo en la
  // siguiente jornada, p.ej. jornada 10) -- a petición explícita ("cuando
  // juego un partido y la siguiente jornada hay mercado o copa, ni
  // siquiera veo el resultado de ese partido, quiero verlo y luego ya
  // que me lleve"): así el resultado se ve siempre primero, y solo al
  // pulsar "Siguiente" aparece el aviso de mercado/Copa/Champions que
  // toque.
  if (!seasonOver && c.jornadaAckPending && r) {
    return (
      careerMatchResultCardHtml(r.oppName, r.myGoals, r.oppGoals, r.winBonus, r.youAreHome) +
      '<div class="panel center-text"><button class="btn btn-primary btn-block" onclick="actionAckCareerJornadaResult()">Siguiente ▶</button></div>' +
      careerLastRoundResultsHtml(league, r)
    );
  }
  var w = c.marketWindow;
  if (w && w.open) {
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Ventana de fichajes abierta</h3>' +
      '<p class="dim small">Día ' + w.dayIndex + ' de ' + w.totalDays + ' (' + (w.phase === 'preseason' ? 'pretemporada' : 'mercado de invierno') + '). Ve a Mercado para negociar o avanzar el día.</p>' +
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
      '<button class="btn btn-primary btn-block mt" onclick="actionGoToCareerCompeticionesTab(\'copa\')">Ir a la Copa del Rey</button>' +
    '</div>';
  }
  // La Champions se cuela ronda a ronda en sus propias jornadas
  // (CAREER_CHAMPIONS_ROUND_MATCHDAYS) -- hasta que no esté resuelta la
  // ronda en curso, la Liga no sigue, mismo patrón que la Copa del Rey.
  // Antes no tenía ningún bloqueo de jornada (se podía jugar entera de
  // golpe en cualquier momento), un bug real corregido a petición
  // explícita.
  if (careerChampionsPending(c)) {
    return '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Toca Champions League</h3>' +
      '<p class="dim small">Antes de seguir con la jornada ' + (league.matchdayIndex + 1) + ' hay que resolver la Champions League.</p>' +
      '<button class="btn btn-primary btn-block mt" onclick="actionGoToCareerCompeticionesTab(\'champions\')">Ir a la Champions League</button>' +
    '</div>';
  }
  var matchupHtml = '';
  if (!seasonOver) {
    var info = careerNextFixtureInfo(league);
    if (info) {
      var contextLabel = 'Jornada ' + (league.matchdayIndex + 1) + ' de ' + league.schedule.length;
      matchupHtml = careerMatchupCardHtml(info.oppName, contextLabel, info.youAreHome, league, info.oppIdx);
    }
  }
  return (
    matchupHtml +
    '<div class="panel center-text">' +
      (seasonOver ? '<h3 style="margin-bottom:4px">Temporada ' + c.season + ' terminada</h3>' : '') +
      (seasonOver
        ? '<button class="btn btn-primary btn-block mt" onclick="actionStartNewCareerSeason()">Empezar temporada ' + (c.season + 1) + '</button>'
        : '<div class="match-mode-picker">' +
            '<button class="match-mode-card" onclick="actionPlayCareerMatchday()"><span class="match-mode-icon">⚽</span><strong>Ver partido</strong><span class="dim small">Partido en vivo</span></button>' +
            '<button class="match-mode-card" onclick="actionSimulateCareerMatchday()"><span class="match-mode-icon">▶️</span><strong>Simular</strong><span class="dim small">Minuto a minuto</span></button>' +
            '<button class="match-mode-card" onclick="actionSkipCareerMatchday()"><span class="match-mode-icon">⏭️</span><strong>Saltar</strong><span class="dim small">Resultado al momento</span></button>' +
          '</div>') +
    '</div>' +
    (seasonOver ? careerSeasonSummaryHtml(c) : '')
  );
}

// Estadísticas de toda la carrera (todas las temporadas, no solo la
// actual) -- mejor posición en liga alcanzada nunca (careerUpdateBestPosition)
// y máximos goleadores/asistentes acumulados (c.careerStats, solo de TUS
// jugadores, ver careerRecordMatchGoals), a petición explícita.
// A petición explícita ("quiero un máximo histórico de goleadores y
// asistentes del club, y el de esta temporada"): dos paneles separados
// en vez de uno solo -- c.league.stats (esta temporada, se reinicia en
// cada careerBuildLeague) y c.careerStats (histórico del club, ACUMULADO
// de toda la carrera, nunca se resetea). Antes solo se enseñaba el
// histórico, con el título genérico compartido "...del torneo" (pensado
// para FutDraft/Torneo), que no pintaba nada en Modo Carrera.
// Icono compacto por temporada para el historial (careerSeasonHistoryHtml):
// mismo lenguaje visual que careerSeasonBadgeHtml (resumen de temporada),
// pero en una fila por temporada en vez de una tarjeta grande -- para que
// la línea temporal completa quepa sin ocupar toda la pantalla.
function careerSeasonHistoryRowHtml(entry) {
  var positionText = entry.position ? (entry.position + 'º de ' + entry.totalTeams) : 'Sin datos';
  var cupIcon = entry.cupResult === 'champion' ? '🏆' : (entry.cupResult === 'eliminated' ? '❌' : '⏳');
  var championsIcon = entry.championsResult === null ? '' : (entry.championsResult === 'champion' ? ' · Champions 🏆' : (entry.championsResult === 'eliminated' ? ' · Champions ❌' : ' · Champions ⏳'));
  var moveIcon = entry.promotion === 'promoted' ? ' ⬆️' : (entry.promotion === 'relegated' ? ' ⬇️' : '');
  var rowCls = entry.promotion === 'promoted' ? 'season-badge-good' : (entry.promotion === 'relegated' ? 'season-badge-bad' : '');
  return '<div class="season-badge' + (rowCls ? ' ' + rowCls : '') + '">' +
    '<div class="season-badge-icon">📅</div>' +
    '<div>' +
      '<div class="season-badge-label">Temporada ' + entry.season + ', ' + escapeHtml(careerDivisionName(entry.division)) + '</div>' +
      '<div class="season-badge-text">' + positionText + moveIcon + (entry.bonus ? ' · +' + entry.bonus + ' M€' : '') + '</div>' +
      '<div class="dim small">Copa del Rey ' + cupIcon + championsIcon + '</div>' +
    '</div>' +
  '</div>';
}
// Historial de carrera navegable, a petición explícita ("una pantalla
// con la línea temporal de todas las temporadas jugadas... en vez de
// solo el resumen de la última"): lista TODAS las entradas de
// c.seasonHistory (careerRecordSeasonHistory, una por temporada ya
// completada), más reciente primero.
function careerSeasonHistoryHtml(c) {
  var history = c.seasonHistory || [];
  if (!history.length) {
    return '<div class="panel center-text"><h3 style="margin-bottom:4px">Historial de la carrera</h3><p class="dim small">Todavía no has completado ninguna temporada.</p></div>';
  }
  var rows = history.slice().reverse().map(careerSeasonHistoryRowHtml).join('');
  return '<div class="panel center-text"><h3 style="margin-bottom:4px">Historial de la carrera</h3></div>' +
    '<div class="panel"><div class="season-summary-badges">' + rows + '</div></div>';
}
// Palmarés: todos los títulos ganados en la carrera en un apartado
// propio, a petición explícita ("en estadísticas, que salgan todos tus
// trofeos en un pequeño apartado, como un palmarés") -- mismo estilo de
// tarjeta con icono que ya usa el resto de la app (.season-badge).
function careerPalmaresHtml(c) {
  var items = [
    { count: c.ligaTitlesWon || 0, label: 'Liga' },
    { count: c.cupsWon || 0, label: 'Copa del Rey' },
    { count: c.championsWon || 0, label: 'Champions League' },
    { count: c.supercopasWon || 0, label: 'Supercopa' }
  ];
  var total = items.reduce(function (sum, it) { return sum + it.count; }, 0);
  var rows = items.map(function (it) {
    return '<div class="season-badge' + (it.count > 0 ? ' season-badge-gold' : '') + '">' +
      '<div class="season-badge-icon">🏆</div>' +
      '<div><div class="season-badge-label">' + escapeHtml(it.label) + '</div><div class="season-badge-text">' + it.count + '</div></div>' +
    '</div>';
  }).join('');
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Palmarés (' + total + ')</h3><div class="season-summary-badges">' + rows + '</div></div>';
}
// Menú de goleadores y asistentes (Liga / Copa / Champions / histórico del
// club), a petición explícita ("más mono y mejor el menú para ver máximos
// goleadores y asistentes de copa, liga y champions"): pestañas arriba, la
// Bota de Oro y el máximo asistente destacados, y el top 10 de cada uno con
// medallas, escudo y barra proporcional.
var CAREER_SCORERS_VIEWS = [
  { id: 'liga', name: '🏟️ Liga' }, { id: 'copa', name: '🏆 Copa' },
  { id: 'champions', name: '⭐ Champions' }, { id: 'historico', name: '📜 Histórico' }
];
window.actionSetCareerScorersView = function (id) { G.career.scorersView = id; render(); };
function careerScorersStats(c, view) {
  if (view === 'copa') return c.cup ? careerCompStats(c.cup) : null;
  if (view === 'champions') return c.champions ? careerCompStats(c.champions) : null;
  if (view === 'historico') return c.careerStats;
  return c.league.stats;
}
function careerScorersColumnHtml(c, list, kind) {
  var top = list.length ? list[0].count : 1;
  var medals = ['🥇', '🥈', '🥉'];
  return list.slice(0, 10).map(function (e, i) {
    var shield = e.team === 'Tu equipo' ? careerClubShieldPath(c) : teamShieldPath(e.team);
    return '<div class="scorer-row' + (i < 3 ? ' scorer-row-top' : '') + (e.team === 'Tu equipo' ? ' scorer-row-mine' : '') + '">' +
      '<span class="scorer-rank">' + (i < 3 ? medals[i] : (i + 1)) + '</span>' +
      avatarHtml(e.player) +
      '<div class="scorer-main"><div class="scorer-name">' + escapeHtml(e.nombre) + '</div>' +
        '<div class="scorer-team"><img src="' + escapeHtml(shield) + '" alt="">' + escapeHtml(e.team === 'Tu equipo' ? careerClubDisplayName(c) : e.team) + '</div>' +
        '<div class="scorer-bar"><span style="width:' + Math.max(6, Math.round(e.count / top * 100)) + '%"></span></div></div>' +
      '<span class="scorer-count">' + e.count + '</span>' +
    '</div>';
  }).join('');
}
function careerScorersMenuHtml(c) {
  var view = c.scorersView || 'liga';
  var tabs = CAREER_SCORERS_VIEWS.map(function (v) {
    return '<button class="btn btn-tiny' + (view === v.id ? ' active' : '') + '" onclick="actionSetCareerScorersView(\'' + v.id + '\')">' + v.name + '</button>';
  }).join('');
  var stats = careerScorersStats(c, view);
  var body;
  if (!stats) {
    body = '<p class="dim small center-text">Esta competición no se juega esta temporada.</p>';
  } else {
    var scorers = sortedStatsList(stats.scorers), assists = sortedStatsList(stats.assists);
    if (!scorers.length && !assists.length) {
      body = '<p class="dim small center-text">Todavía no hay goles registrados aquí.</p>';
    } else {
      var boot = scorers[0], ast = assists[0];
      body = '<div class="scorer-hero">' +
        (boot ? '<div class="scorer-hero-card"><div class="scorer-hero-title">⚽ Bota de Oro</div><div class="scorer-hero-name">' + escapeHtml(boot.nombre) + '</div><div class="scorer-hero-sub">' + escapeHtml(boot.team === 'Tu equipo' ? careerClubDisplayName(c) : boot.team) + ' · <strong>' + boot.count + '</strong> goles</div></div>' : '') +
        (ast ? '<div class="scorer-hero-card"><div class="scorer-hero-title">🅰️ Máximo asistente</div><div class="scorer-hero-name">' + escapeHtml(ast.nombre) + '</div><div class="scorer-hero-sub">' + escapeHtml(ast.team === 'Tu equipo' ? careerClubDisplayName(c) : ast.team) + ' · <strong>' + ast.count + '</strong> asistencias</div></div>' : '') +
      '</div>' +
      '<div class="scorer-cols">' +
        '<div><h4 class="scorer-col-title">Goleadores</h4>' + careerScorersColumnHtml(c, scorers, 'g') + '</div>' +
        '<div><h4 class="scorer-col-title">Asistentes</h4>' + careerScorersColumnHtml(c, assists, 'a') + '</div>' +
      '</div>';
    }
  }
  return '<div class="panel"><h3 style="margin-bottom:8px" class="center-text">Goleadores y asistentes</h3>' +
    '<div class="btn-row" style="justify-content:center;flex-wrap:wrap">' + tabs + '</div>' + body + '</div>';
}
function renderCareerEstadisticas(c) {
  var bestPosText = c.bestPosition ? (c.bestPosition.position + 'º de ' + c.bestPosition.totalTeams) : 'Todavía sin datos.';
  return (
    '<div class="panel center-text">' +
      '<h3 style="margin-bottom:4px">Estadísticas de la carrera</h3>' +
      '<p class="dim small">Temporada actual: <strong>' + (c.season || 1) + '</strong> · ' + escapeHtml(careerDivisionName(c.division)) + '</p>' +
      '<p class="dim small">Mejor posición en liga: <strong style="color:var(--accent-2)">' + bestPosText + '</strong></p>' +
    '</div>' +
    careerPalmaresHtml(c) +
    careerScorersMenuHtml(c) +
    careerSeasonHistoryHtml(c)
  );
}

// "Gestión de partida": guardado manual + cambiar de hueco, antes fijo
// en la cabecera de toda la pantalla, ahora su propia pestaña (ver
// CAREER_TABS) -- el resumen de temporada/división/presupuesto se
// repite aquí porque este es ahora el sitio "administrativo" de la
// partida, a petición explícita.
function renderCareerGestion(c) {
  return '<div class="panel center-text">' +
    '<h3 style="margin-bottom:4px">Gestión de partida</h3>' +
    '<p class="dim small">Temporada <strong>' + (c.season || 1) + '</strong> · <strong>' + escapeHtml(careerDivisionName(c.division)) + '</strong> (' + careerDivisionTeamCount(c.division) + ' equipos) · Presupuesto: <strong style="color:var(--accent-2)">' + c.budget + ' M€</strong> · Hueco ' + G.careerActiveSlot + '</p>' +
    (c.saveMessage ? '<p class="dim small">' + escapeHtml(c.saveMessage) + '</p>' : '') +
    '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn btn-tiny" onclick="actionSaveCareerNow()">Guardar</button>' +
      '<button class="btn btn-tiny" onclick="actionGoCareerMode()">Cambiar partida</button>' +
    '</div>' +
    '<button class="btn btn-outline btn-block mt" onclick="actionCareerBackToMenu()">Volver</button>' +
  '</div>';
}

// Apartado Configuración de Modo Carrera: autoguardado (cada 3 minutos,
// en el hueco activo, además del botón "Guardar" manual de Gestión de
// partida) y sonido (comparte el mismo interruptor que el resto de la
// app, ver js/sound-version.js). A petición explícita.
function renderCareerConfiguracion(c) {
  return '<div class="panel">' +
    '<h3 style="margin-bottom:8px">Configuración</h3>' +
    '<div class="btn-row" style="justify-content:space-between;align-items:center">' +
      '<div><strong>Autoguardado</strong><div class="dim small">Guarda la partida sola cada 3 minutos en el hueco ' + (G.careerActiveSlot || '-') + '.</div></div>' +
      '<button class="btn btn-tiny' + (c.autosave ? ' active' : '') + '" onclick="actionToggleCareerAutosave()">' + (c.autosave ? 'Activado' : 'Desactivado') + '</button>' +
    '</div>' +
    (c.autosaveMessage ? '<p class="dim small mt">' + escapeHtml(c.autosaveMessage) + '</p>' : '') +
    '<div class="btn-row mt" style="justify-content:space-between;align-items:center">' +
      '<div><strong>Sonido</strong><div class="dim small">Sonido de gol y de inicio de partido.</div></div>' +
      '<button class="btn btn-tiny' + (soundEnabled() ? ' active' : '') + '" onclick="actionToggleSound()">' + (soundEnabled() ? 'Activado' : 'Desactivado') + '</button>' +
    '</div>' +
    '<div class="btn-row mt" style="justify-content:space-between;align-items:center">' +
      '<div><strong>Ocultar prodigios</strong><div class="dim small">No avisa qué jugadores son Prodigio (crecimiento máximo) en el Mercado.</div></div>' +
      '<button class="btn btn-tiny' + (c.hideProdigy ? ' active' : '') + '" onclick="actionToggleCareerHideProdigy()">' + (c.hideProdigy ? 'Activado' : 'Desactivado') + '</button>' +
    '</div>' +
    '<div class="btn-row mt" style="justify-content:space-between;align-items:center">' +
      '<div><strong>Animaciones</strong><div class="dim small">Fundido al cambiar de pantalla.</div></div>' +
      '<button class="btn btn-tiny' + (!G.meta.reduceMotion ? ' active' : '') + '" onclick="actionToggleReduceMotion()">' + (!G.meta.reduceMotion ? 'Activado' : 'Desactivado') + '</button>' +
    '</div>' +
    '<p class="dim small mt">Versión ' + escapeHtml(APP_VERSION) + '.</p>' +
  '</div>';
}
window.actionToggleCareerHideProdigy = function () {
  var c = G.career;
  if (!c) return;
  c.hideProdigy = !c.hideProdigy;
  render();
};
// Animaciones: además del "sin repetir el fundido al re-renderizar la
// misma pantalla" que ya había, este interruptor las quita del todo
// (incluida la entrada a una pantalla nueva) para quien prefiera un
// cambio instantáneo -- guardado en meta, no por partida, como el sonido.
window.actionToggleReduceMotion = function () {
  G.meta.reduceMotion = !G.meta.reduceMotion;
  saveMeta(G.meta);
  render();
};

// Animación de trofeo al ganar cualquier título de Modo Carrera (Liga,
// Copa del Rey, Champions League, Supercopa), a petición explícita
// ("quiero animaciones al ganar cada trofeo también") -- mismo overlay
// con rebote + brillo ya usado en Modo Jugador (.jugador-trophy-card/
// jugadorTrophyPop/jugadorTrophyShine en style.css), reaprovechado tal
// cual para no duplicar la animación.
function careerTriggerTrophyPopup(title, points) {
  G.careerTrophyPopup = { title: title, points: points || 0 };
}
// Puntos de Espíritu por títulos/puestos de Modo Carrera (para gastar en
// la Máquina de Premios), a petición explícita ("que me den fichas o
// puntos de juego al ganar una liga/copa/champions o quedar top 3 en
// liga"): en Segunda 50/75/100 M€ (3º/2º/campeón), doble en Primera; Copa
// del Rey igual que ser campeón de liga en tu división; Champions un
// escalón más (siempre se juega desde Primera).
var CAREER_LEAGUE_TOP3_POINTS = { 3: 50, 2: 75, 1: 100 };
var CAREER_CUP_WIN_POINTS = 100;
var CAREER_CHAMPIONS_WIN_POINTS = 300;
function careerAwardSpiritPoints(amount) {
  if (!amount) return 0;
  G.meta.points += amount;
  saveMeta(G.meta);
  return amount;
}
window.actionDismissCareerTrophyPopup = function () {
  G.careerTrophyPopup = null;
  render();
};
function renderCareerTrophyPopup() {
  return '<div class="modal-overlay" onclick="actionDismissCareerTrophyPopup()">' +
    '<div class="jugador-trophy-card" onclick="event.stopPropagation()">' +
      '<div class="jugador-trophy-icon">🏆</div>' +
      '<h3 style="margin-bottom:4px">¡Campeón!</h3>' +
      '<p class="dim small">' + escapeHtml(G.careerTrophyPopup.title) + '</p>' +
      (G.careerTrophyPopup.points ? '<p class="dim small" style="color:var(--accent-2)">' + spiritIcon() + ' +' + G.careerTrophyPopup.points + ' Puntos de Espíritu</p>' : '') +
      '<button class="btn btn-primary btn-block mt" onclick="actionDismissCareerTrophyPopup()">Seguir</button>' +
    '</div>' +
  '</div>';
}
function renderCareerMode() {
  var c = G.career;
  if (c.fired) return renderCareerFired(c);
  // Fila de pestañas ÚNICA que se desliza en horizontal (career-tabs-scroll)
  // en vez de partirse en dos líneas cuando no caben todas, a petición
  // explícita ("tanto en móvil como en web, tiene que ser una única fila
  // que se pueda ir deslizando... y pinchar tú en uno de ellos").
  var tabsHtml = CAREER_TABS.map(function (t) {
    return '<button class="btn btn-tiny' + (c.tab === t.id ? ' active' : '') + '" onclick="actionSetCareerTab(\'' + t.id + '\')">' + t.name + '</button>';
  }).join('');
  var bodyHtml;
  if (c.tab === 'club') bodyHtml = renderCareerClubGroup(c);
  else if (c.tab === 'competiciones') bodyHtml = renderCareerCompeticiones(c);
  else if (c.tab === 'jornada') bodyHtml = renderCareerBoardPanel(c) + renderCareerJornada(c);
  else if (c.tab === 'estadisticas') bodyHtml = renderCareerEstadisticas(c);
  else if (c.tab === 'ajustes') bodyHtml = renderCareerAjustesGroup(c);
  else bodyHtml = renderCareerEquipoGroup(c);
  // "Volver" ya no vive aquí (fijo en todas las pestañas) -- ahora está
  // SOLO en "Gestión de partida" (renderCareerGestion), a petición
  // explícita ("volver ahí está mal, en modo carrera, déjalo en gestión
  // de partida solo").
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mb0">Modo Carrera</h2>' +
      '</div>' +
      '<div class="career-tabs-scroll">' + tabsHtml + '</div>' +
      bodyHtml +
      (G.careerTrophyPopup ? renderCareerTrophyPopup() : '') +
      (G.careerEventNotice ? renderCareerEventNotice() : '') +
    '</div>'
  );
}
