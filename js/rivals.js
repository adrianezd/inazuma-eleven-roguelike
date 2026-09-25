/* ---------------------------------------------------------------------
   3. GENERACIÓN DE RIVALES (equipos genéricos, no personajes reales)
   --------------------------------------------------------------------- */

function generateRivalPlayer(depth, forcedPosition) {
  var posicion = forcedPosition || choice(POSITIONS);
  var tipo = choice(TYPES);
  var t = POSITION_TEMPLATES[posicion];
  var scale = 1 + (depth || 0) * 0.015;
  function s(base) { return clamp(Math.round((base + rand(-t.variance, t.variance)) * scale), 15, 99); }
  return {
    id: uid(),
    nombre: posicion + ' rival',
    posicion: posicion,
    tipo: tipo,
    tiro: s(t.tiro),
    pase: s(t.pase),
    defensa: s(t.defensa),
    especial: s(t.especial),
    hissatsu: null,
    fatigado: false
  };
}

function generateOpponentSquad(depth, isBoss, isFinalBoss) {
  var squad = [];
  var bonus = bossBonusRange(depth);
  var finalMultiplier = isFinalBoss ? 1.5 : 1; // jefe final 50% más fuerte
  for (var i = 0; i < 4; i++) {
    // Slot 0 se fuerza siempre a Portero: antes cada jugador rival tenía una
    // posición 100% aleatoria e independiente, así que un equipo rival podía
    // (por azar) no tener NINGÚN portero. Eso rompía la mecánica de que los
    // tiros y especiales del jugador siempre se enfrenten al portero rival
    // (ver pickDefender), así que garantizamos exactamente 1 portero por equipo.
    // Las plazas 1-3 NUNCA pueden salir Portero (antes usaban choice(POSITIONS)
    // sin restricción, así que un equipo podía acabar con 2, 3 o hasta 4
    // porteros por azar -- nada realista, y hacía que "Portero rival ataca"
    // saliera muchísimo más de lo que debería).
    var p = generateRivalPlayer(depth, i === 0 ? 'Portero' : choice(['Defensa', 'Centrocampista', 'Delantero']));
    if (isBoss) {
      p.tiro = clamp(Math.round((p.tiro + rand(bonus.statMin, bonus.statMax)) * finalMultiplier), 15, 99);
      p.pase = clamp(Math.round((p.pase + rand(bonus.statMin, bonus.statMax)) * finalMultiplier), 15, 99);
      p.defensa = clamp(Math.round((p.defensa + rand(bonus.statMin, bonus.statMax)) * finalMultiplier), 15, 99);
      p.especial = clamp(Math.round((p.especial + rand(bonus.specialMin, bonus.specialMax)) * finalMultiplier), 15, 99);
    }
    squad.push(p);
  }
  return squad;
}

function randomTeamName(isBoss) { return choice(isBoss ? RIVAL_TEAM_BOSSES : RIVAL_TEAM_NAMES); }

// Escudos de equipo (assets/escudos): solo unos pocos equipos rivales de las
// listas de arriba tienen escudo propio hecho. Si el nombre del rival no
// coincide con ninguno, NO se muestra ningún escudo (nada de genérico de
// relleno) -- ese equipo se queda tal cual estaba, solo texto. Las claves se
// normalizan (minúsculas, sin tildes) para no fallar por acentos
// ("Épsilon"/"Géminis") al comparar con el nombre generado.
var TEAM_SHIELD_FILES = {
  'Royal Academy': 'royal-academy.png',
  'Zeus': 'zeus.png',
  'Occult': 'occult.png',
  'Alpino': 'alpino.png',
  'Genesis': 'genesis.png',
  'Prominence': 'prominence.png',
  'Tormenta de Géminis': 'tormenta-de-geminis.png',
  'Pequeños Gigantes': 'pequeños-gigantes.png',
  'Épsilon': 'epsilon.png',
  'Big Waves': 'big-waves.png',
  'Caos': 'caos.png',
  'Chrono Storm': 'chrono-storm.png',
  'Dragon Link': 'dragon-link.png',
  'El Dorado 01': 'eldorado01.png',
  'Farm': 'farm.png',
  'Fauxshore': 'fauxshore.png',
  'Gar': 'gar.png',
  'Gir': 'gir.png',
  'Mar de Árboles': 'mar-de-arboles.png',
  'Mary Times': 'mary-times.png',
  'Neo Japón': 'neo-japon.png',
  'Orfeo': 'orfeo.png',
  'Os Reis': 'osreis.png',
  'Polvo de Diamante': 'polvo-de-diamantes.png',
  'Protocolo Omega': 'protocolo-omega.png',
  'Protocolo Omega 2.0': 'protocolo-omega2-0.png',
  'Protocolo Omega 3.0': 'protocolo-omega-3.0.png',
  'Ragnah': 'ragnah.png',
  'Shuriken': 'shuriken.png',
  'Zanark Domain': 'zanark-domain.png',
  'Equipo Zero': 'zero.png',
  'Desesperdidos': 'desesperados.png',
  'Kirkwood': 'kirkwood.png',
  'Equipo Ogro': 'ogro.png',
  'Cala Pirata': 'cala-pirata.png',
  'Flota Ixar': 'flota-ixar.png',
  'Dragones de Fuego': 'dragones-de-fuego.png',
  'Earth Eleven': 'earth-eleven.png',
  'Eclipse de Orión': 'eclipse-de-orion.png',
  'Guardianes de La Reina': 'guardianes-de-la-reina.png',
  'Inazuma Japon': 'inazuma-japon.png',
  'Leones del desierto': 'leones-del-desierto.png',
  'Academia Ogre': 'ogro.png',
  'Otaku': 'otaku.png',
  'Instituto Plenilunio': 'plenilunio.png',
  'Resistencia Japón GO': 'resistencia-japon-go.png',
  'Umbrella': 'umbrella.png',
  'Inazuma Kids': 'inazuma-kids.webp',
  'Veteranos Inazuma': 'veteranos-inazuma.png',
  'Alius Masters': 'alius-masters.webp',
  'Los arions': 'arions.webp',
  'Brain': 'brain.webp',
  'Dinastía Galáctica': 'dinastia-galactica.webp',
  'El Dorado 02': 'eldorado02.webp',
  'El Dorado 03': 'eldorado03.webp',
  'Emperadores Oscuros': 'emperadores-oscuros.webp',
  'Los Emperadores': 'emperadores.webp',
  'Falam Medius': 'falam-medius.webp',
  'Raimon Inakuni': 'inakuni.webp',
  'Ángeles Oscuros': 'angeles-oscuros.webp',
  'FFI Estrellas': 'ffi-all-stars.webp',
  'Neo Raimon': 'neo-raimon.webp',
  'Raimon GO': 'raimon-go.webp',
  'Zoolan Team': 'zoolan-team.webp',
  'Claustro Sagrado': 'claustro-sagrado.webp',
  'Royal Academy GO': 'royal-academy-go.webp',
  'Instituto Espejismo': 'espejismo.webp',
  'Poderosa Fe': 'poderosa-fe.webp',
  'Inazuma Japon GO': 'inazuma-japon-go.webp',
  'Instituto Alius': 'instituto-alius.webp',
  'Mar de Luna': 'mar-de-luna.webp',
  'Resistencia Japon': 'resistencia-japon.png',
  'Sallys': 'sallys.webp',
  'Tarjeteros': 'tarjeteros.webp',
  'Unicorn': 'unicorn.webp',
  'Academia Universal': 'universal.webp',
  'Wild': 'wild.webp',
  'Élite Omega': 'elite-omega.webp',
  'Galanes Electrizantes': 'galanes-electrizantes.webp',
  'Los Cuatro Magníficos': 'cuatro-magnificos.webp',
  'Fertilia': 'fertilia.webp',
  'Magmavis': 'magmavis.webp',
  'Colina Verde': 'colina-verde.webp',
  'Barcelona Orb': 'barcelona-orb.webp',
  'Chispas Perfectas': 'chispas-perfectas.webp',
  'Artemisa de Mr.YI': 'artemisa.webp',
  'Twinford': 'twinford.webp',
  'Northbright': 'northbright.webp',
  'Campeones Raimon': 'Campeones-Raimon.webp'
};
// team1.png es el escudo del propio jugador ("Tu equipo"), no un relleno
// genérico para rivales sin escudo -- por eso vive fuera de TEAM_SHIELD_FILES.
var PLAYER_SHIELD = 'assets/escudos/team1.png';
// Escudo de relleno para cualquier rival (normal o jefe) que no tenga uno
// propio en TEAM_SHIELD_FILES -- antes no se mostraba nada, ahora se usa
// siempre este por defecto en cualquier partido.
var SECRET_SHIELD = 'assets/escudos/secret.png';
function normalizeTeamKey(name) {
  return String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
var TEAM_SHIELDS = {};
Object.keys(TEAM_SHIELD_FILES).forEach(function (name) {
  TEAM_SHIELDS[normalizeTeamKey(name)] = 'assets/escudos/' + TEAM_SHIELD_FILES[name];
});
function teamShieldPath(name) {
  var bare = String(name).replace(/^Jefe:\s*/, '');
  return TEAM_SHIELDS[normalizeTeamKey(bare)] || SECRET_SHIELD;
}

// Escudo que se muestra como "el tuyo" en cualquier marcador/línea temporal:
// por defecto PLAYER_SHIELD (team1.png), pero si el jugador ha desbloqueado
// algún escudo en la Máquina de Premios (ver 15d) y lo ha equipado, se
// muestra ese en su lugar.
function getPlayerShieldPath() {
  var meta = G.meta;
  if (meta && meta.equippedShield) return teamShieldPath(meta.equippedShield);
  return PLAYER_SHIELD;
}

