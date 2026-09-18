/* ---------------------------------------------------------------------
   13. SISTEMA DE PARTIDO
   --------------------------------------------------------------------- */

function startMatch(nodeId, isBoss) {
  var depth = mapDepth(nodeId, G.run.map);
  var maxDepth = G.run.map.rows.length - 1;
  var isFinalBoss = isBoss && depth === maxDepth; // jefe en la última fila es el final (normal o difícil)
  // La progresión de dificultad está calibrada sobre el mapa normal (11 filas,
  // profundidad máxima 10). El Modo Difícil tiene un mapa más corto (8 filas),
  // así que aquí se normaliza la profundidad a esa misma escala 0-10 para que
  // sus jefes reciban un bonus comparable en vez de uno artificialmente bajo
  // solo por aparecer en una fila más temprana.
  var normDepth = maxDepth > 0 ? (depth / maxDepth) * 10 : depth;
  var oppSquad = generateOpponentSquad(normDepth, isBoss, isFinalBoss);
  var oppTeamName = randomTeamName(isBoss);
  var oppName = oppTeamName;
  G.match = {
    weather: rollWeather(),
    isBoss: isBoss,
    oppName: oppName,
    oppShield: teamShieldPath(oppTeamName),
    oppSquad: oppSquad,
    turn: 1,
    order: buildTurnOrder(),
    playerScore: 0,
    oppScore: 0,
    // La Especial ya no depende de un medidor de carga lenta: se rige por un
    // cooldown aleatorio de 2 o 3 ataques propios (ver specialStatus), que se
    // vuelve a sortear cada vez que se usa. El Pase adelanta la recarga un
    // ataque extra (su motivo de ser ahora que ya no existe el medidor).
    // Cada jugador (delantero/centrocampista) puede usar SU técnica de
    // ataque 1 sola vez por partido -- igual que la técnica defensiva de
    // portero/defensa, no solo "no repetir dos veces seguidas" como antes.
    playerAtkCount: 0,
    playerLastSpecialAt: 0,
    playerCooldownNeeded: rand(2, 3),
    playerCooldownBoost: 0,
    playerUsedSpecialByPlayer: {},
    oppAtkCount: 0,
    oppLastSpecialAt: 0,
    oppCooldownNeeded: rand(2, 3),
    oppCooldownBoost: 0,
    oppLastSpecialMove: null,
    pendingOpp: null,
    // Técnica defensiva: 1 vez por partido POR POSICIÓN -- si tienes portero
    // y defensa, cada uno tiene su propio uso independiente (antes era un
    // único flag global que bloqueaba ambas técnicas con solo usar una).
    defenseTechniqueUsedByPos: { Portero: false, Defensa: false },
    log: [],
    selectedAttackerId: null,
    lastEvent: null,
    lastEventClass: '',
    finished: false,
    suddenDeath: false,
    sdRound: 0,
    sdStage: 'jugador'
  };
  G.screen = 'match';
  render();
}

function buildTurnOrder() {
  var startsPlayer = Math.random() < 0.5;
  var order = [];
  for (var i = 0; i < MATCH_TURNS; i++) {
    var playerAttacks = (i % 2 === 0) ? startsPlayer : !startsPlayer;
    order.push(playerAttacks ? 'jugador' : 'rival');
  }
  return order;
}

function currentAttacker() {
  if (G.match.suddenDeath) return G.match.sdStage;
  return G.match.order[G.match.turn - 1];
}

// Cooldown de la Especial: lista tras "needed" ataques propios (2 o 3,
// sorteado al azar cada vez que se usa), con el Pase adelantando el
// contador un ataque extra ("boost") como su razón de ser en este sistema.
function specialStatus(atkCount, lastSpecialAt, boost, needed) {
  var need = needed || 2;
  var atkNum = atkCount + 1; // número del próximo ataque de este bando
  var since = (atkNum - lastSpecialAt) + (boost || 0);
  var ready = since >= need;
  return {
    ready: ready,
    turnsLeft: ready ? 0 : (need - since),
    pct: clamp(Math.round((Math.min(since, need) / need) * 100), 0, 100)
  };
}

// Elige quién defiende según la jugada: Tiro y Especial (disparos a puerta)
// los enfrenta el Portero rival si el equipo tiene uno; Pase prefiere un
// Defensa; si esa posición no está en la plantilla, cae a una elección
// aleatoria. Esto es lo que hace que tener portero/defensas importe de verdad.
function pickDefender(squad, action) {
  // .filter + choice() en vez de .find(): con .find() el primer defensa del
  // array salía SIEMPRE si había 2, y el segundo nunca aparecía. Ahora se
  // elige al azar entre todos los que cumplen la posición (máx. 1 portero,
  // máx. 2 defensas por equipo, así que normalmente son 1-2 candidatos).
  if (action === 'tiro' || action === 'especial') {
    var gks = squad.filter(function (p) { return p.posicion === 'Portero'; });
    if (gks.length) return choice(gks);
  } else if (action === 'regate') {
    var defs = squad.filter(function (p) { return p.posicion === 'Defensa'; });
    if (defs.length) return choice(defs);
  }
  return choice(squad);
}

// ¿Tiene este plantel un especialista real (portero para tiro/especial,
// defensa para pase) para la acción dada? Se usa para saber si el equipo
// del JUGADOR está jugando "desnudo" de portero/defensa, y compensarlo.
function hasDefensiveSpecialist(squad, action) {
  if (action === 'tiro' || action === 'especial') {
    return squad.some(function (p) { return p.posicion === 'Portero'; });
  }
  if (action === 'regate') {
    return squad.some(function (p) { return p.posicion === 'Defensa'; });
  }
  return true;
}

var FIELD_EVENT_ICONS = { goal: '⚽', save: '🧤', defense: '🛡️', block: '✋' };
function fieldIconHtml(eventClass) {
  if (!eventClass || !FIELD_EVENT_ICONS[eventClass]) return '';
  return '<div class="field-icon">' + FIELD_EVENT_ICONS[eventClass] + '</div>';
}

function renderMatch() {
  var m = G.match;
  if (!m) return '';
  var isPlayerTurn = currentAttacker() === 'jugador' && !m.finished;
  var fieldClass = 'field' + (m.lastEventClass ? ' ' + m.lastEventClass : '');
  var pStatus = specialStatus(m.playerAtkCount, m.playerLastSpecialAt, m.playerCooldownBoost, m.playerCooldownNeeded);

  var body = '';
  if (m.penalty) {
    body = renderPenalty();
  } else if (m.finished) {
    body = renderMatchEnd();
  } else if (isPlayerTurn) {
    body = renderPlayerTurn();
  } else {
    var pend = prepareOpponentTurn();
    var defender = pend.defenderRaw;
    if (pend.defHasSpecialist) {
      // 3 opciones reales: no hacer nada, defensa activa (genérica, se puede
      // repetir cada turno, retrasa 1 turno tu Especial), o la técnica
      // defensiva de verdad (hissatsu real del portero/defensa, solo 1 vez
      // por partido, mucho más fuerte -- casi garantiza que no te marquen).
      var defTechnique = defender.hissatsu ? defender.hissatsu[0] : 'técnica defensiva';
      var techUsed = m.defenseTechniqueUsedByPos[defender.posicion];
      body = '<div class="panel center-text">' +
        '<p>' + escapeHtml(pend.attackerRaw.nombre) + ' (rival) se prepara para atacar.</p>' +
        '<button class="btn btn-block" onclick="resolveOpponentTurn(\'normal\')">No hacer nada</button>' +
        '<button class="btn btn-primary btn-block mt" onclick="resolveOpponentTurn(\'activa\')">Defensa activa de ' + escapeHtml(defender.nombre) + ' (' + defender.posicion + ')<small>Baja la probabilidad de gol rival; retrasa tu Especial 1 turno. Se puede repetir.</small></button>' +
        '<button class="btn btn-block mt" ' + (techUsed ? 'disabled' : '') + ' onclick="resolveOpponentTurn(\'tecnica\')" style="' + (techUsed ? '' : 'background:#7a3b12;color:#fff;') + '">' + (techUsed ? 'Técnica defensiva ya usada esta partida' : ('Usar ' + escapeHtml(defTechnique) + ' de ' + escapeHtml(defender.nombre))) + '<small>' + (techUsed ? '' : 'Su técnica especial EN DEFENSA: casi garantiza que no te marquen. Solo 1 vez por partido.') + '</small></button>' +
      '</div>';
    } else {
      var neededPos = pend.action === 'regate' ? 'Defensa' : 'Portero';
      body = '<div class="panel center-text"><p>El rival está atacando… (no tienes un ' + neededPos + ' real en el campo, así que no puedes defender activamente esta jugada)</p><button class="btn btn-primary btn-block" onclick="resolveOpponentTurn(\'normal\')">Continuar</button></div>';
    }
  }

  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><img class="team-shield" src="' + getPlayerShieldPath() + '" alt=""><div class="score-name">Tu equipo</div><div class="score-num">' + m.playerScore + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><img class="team-shield" src="' + escapeHtml(m.oppShield) + '" alt=""><div class="score-name">' + escapeHtml(m.oppName) + '</div><div class="score-num">' + m.oppScore + '</div></div>' +
      '</div>' +
      '<div class="turn-indicator">' + (m.suddenDeath ? 'Muerte súbita — ronda ' + m.sdRound : 'Turno ' + Math.min(m.turn, MATCH_TURNS) + ' de ' + MATCH_TURNS) + (m.finished ? '' : (isPlayerTurn ? ' · Tu ataque' : ' · Ataque rival')) + '</div>' +
      (m.weather ? '<p class="dim small center-text">🌦️ ' + WEATHER_CONDITIONS[m.weather].label + ': ' + WEATHER_CONDITIONS[m.weather].desc + '</p>' : '') +
      (m.suddenDeath && !m.finished ? '<p class="dim small center-text">Gol de oro: gana quien marque primero. Si nadie marca esta ronda, continúa otra.</p>' : '') +
      '<div class="' + fieldClass + '">' + fieldIconHtml(m.lastEventClass) + '<div class="field-event">' + (m.lastEvent || (isPlayerTurn ? 'Elige a tu jugador y tu jugada' : '')) + '</div></div>' +
      '<div class="meter-wrap">' +
        '<div class="meter-label"><span>Especial</span><span>' + (pStatus.ready ? '¡Lista!' : 'Disponible en ' + pStatus.turnsLeft + ' turno' + (pStatus.turnsLeft === 1 ? '' : 's')) + '</span></div>' +
        '<div class="meter-track"><div class="meter-fill' + (pStatus.ready ? ' full' : '') + '" style="width:' + pStatus.pct + '%"></div></div>' +
      '</div>' +
      body +
      '<div class="log-panel">' + m.log.slice(-6).map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   CADENA DE REGATE: Tiro y Regate del jugador ya no se resuelven en una
   sola tirada (esto empezó como "Modo Alternativo", opcional; ahora es el
   estándar en todos los modos de Jugar). El jugador puede encadenar
   regates dentro del MISMO turno: cada uno sube su probabilidad de gol
   (rendimientos decrecientes, escalados por su Regate/pase) y la de
   perder el balón (crece cada vez más), hasta que decide tirar o se lo
   roban. Defensa y Especial no cambian nada -- esto solo toca el par
   Tiro/Regate del propio jugador; el rival sigue atacando con el modelo
   de una sola tirada de siempre (ver prepareOpponentTurn).
   --------------------------------------------------------------------- */
var ALT_CHAIN_BASE_GAIN = 20;
var ALT_CHAIN_SHOOT_DECAY = 0.55;   // cada regate adicional suma bastante menos gol
var ALT_CHAIN_STEAL_GROWTH = 1.35;  // cada regate adicional arriesga bastante más

// Cuánto ayuda (o estorba) a robar el balón la posición REAL de quien
// defiende el regate, por encima de su stat de Defensa -- antes el % de
// robo solo miraba el número plano, así que un Delantero puesto a
// defender por no haber otro sitio (ver pickDefender: si el equipo
// rival no tiene ningún Defensa en sus 3 huecos no-portero, cae en
// cualquiera) paraba regates exactamente igual que un Defensa de verdad
// con la misma Defensa. Un Defensa de posición suma un extra por
// oficio; un Portero también se defiende algo mejor de lo normal (no es
// su sitio, pero tiene reflejos); un Delantero puesto a defender es el
// que más sufre. Centrocampista se queda neutro. Resta directamente del
// % de ÉXITO del regateador (ver más abajo), así que un valor positivo
// aquí sube el % de robo y uno negativo lo baja.
var REGATE_DEFENDER_POS_BONUS = { Defensa: 8, Portero: 4, Centrocampista: 0, Delantero: -6 };

// Probabilidad BASE (sin encadenar nada todavía) de un tiro o un regate,
// replicando la misma fórmula que resolveAttack usa cuando ataca el
// jugador -- ventaja elemental, clima y Modo Difícil incluidos -- pero
// sin tirar el dado ni resolver nada.
function alternativoBaseChance(action, attackerRaw, defenderRaw) {
  var attacker = effectiveStats(attackerRaw);
  var defender = effectiveStats(defenderRaw);
  var adv = typeAdvantage(attacker.tipo, defender.tipo);
  var atkStat, chance;
  // El % de Tiro base (antes de encadenar ningún regate) lo da directamente
  // el Tiro del jugador, no un "50 fijo para todos": con Tiro 100 y ventaja
  // elemental ya se ronda un 88% de gol de partida (contra un portero
  // fuerte), en vez de quedar siempre encajado cerca del 50% -- a petición
  // explícita, para que la estadística de Tiro se note de verdad.
  // El Regate (para el riesgo de robo) parte de una base más generosa
  // (58, no 30): con un 30 de base, en cuanto se sumaba el ajuste de
  // posición de arriba el riesgo de robo del PRIMER regate (antes de
  // encadenar nada) ya rondaba el 80% -- más que el propio % de gol de un
  // Tiro normal, lo que rompía la sensación de "riesgo progresivo" que
  // debía dar la cadena (ver alternativoGrowChain, que sigue subiendo el
  // riesgo con cada regate adicional): con equipos parejos y un defensa
  // neutro (Centrocampista) el riesgo de robo del primer regate ronda
  // ahora el 40-50%, y solo se dispara según se van encadenando más.
  if (action === 'tiro') { atkStat = attacker.tiro; chance = atkStat - defender.defensa * 0.25; }
  else {
    atkStat = attacker.pase;
    chance = 58 + (atkStat - defender.defensa) * 0.5;
    chance -= REGATE_DEFENDER_POS_BONUS[defenderRaw.posicion] || 0;
  }
  chance += adv * 10;
  chance += weatherChanceDelta(G.match.weather, action, attacker.tipo);
  if (G.run && G.run.hardMode) chance -= 5;
  var isOwnGoalkeeperShot = action === 'tiro' && attackerRaw.posicion === 'Portero';
  var maxChance = isOwnGoalkeeperShot ? 8 : 95;
  return clamp(Math.round(chance), 5, maxChance);
}

// Crea la cadena de regate del atacante elegido -- una por jugador,
// guardadas todas en m.regateChains (se reinicia entero al terminar el
// turno, ver resolveAlternativoShot/resolveAlternativoRegate), no una
// sola "la del atacante actual": antes, con un solo slot compartido,
// mirar a un jugador, cambiar a otro y volver al primero recalculaba su
// cadena de cero -- y pickDefender elige al azar entre los defensas
// reales del rival si hay más de uno, así que el % de robo mostrado
// podía cambiar solo por mirar a otro jugador y volver, sin haber
// regateado nada todavía. Ahora cada jugador conserva SU % exacto
// mientras dure el turno, se mire lo que se mire mientras tanto.
function ensureAlternativoChain(selectedPlayer) {
  var m = G.match;
  m.regateChains = m.regateChains || {};
  var existing = m.regateChains[selectedPlayer.instanceId];
  if (existing) { m.regateChain = existing; return; }
  var keeperRaw = pickDefender(m.oppSquad, 'tiro');
  var defenderRaw = pickDefender(m.oppSquad, 'regate');
  var chain = {
    attackerId: selectedPlayer.instanceId,
    keeperRaw: keeperRaw,
    defenderRaw: defenderRaw,
    step: 0,
    shootChance: alternativoBaseChance('tiro', selectedPlayer, keeperRaw),
    stealChance: clamp(100 - alternativoBaseChance('regate', selectedPlayer, defenderRaw), 5, 95)
  };
  m.regateChains[selectedPlayer.instanceId] = chain;
  m.regateChain = chain;
}

// Al completar un regate con éxito: sube el % de gol (cada vez menos) y el
// % de robo (cada vez más), tope 100 en ambos. Cuánto sube el % de gol
// depende del Regate (stat "pase") del jugador -- uno con Regate alto
// aprovecha mucho mejor cada regate limpio para mejorar su ángulo de tiro
// que uno con Regate bajo, a petición explícita (antes la subida era fija
// para cualquier jugador). 70 de Regate es el punto neutro (factor x1).
function alternativoGrowChain(chain, attackerRaw) {
  chain.step++;
  var n = chain.step;
  var pase = effectiveStats(attackerRaw).pase;
  var paseFactor = clamp(pase / 70, 0.4, 1.6);
  var shootGain = ALT_CHAIN_BASE_GAIN * Math.pow(ALT_CHAIN_SHOOT_DECAY, n - 1) * paseFactor;
  var stealGain = ALT_CHAIN_BASE_GAIN * Math.pow(ALT_CHAIN_STEAL_GROWTH, n - 1);
  chain.shootChance = clamp(Math.round(chain.shootChance + shootGain), 0, 100);
  chain.stealChance = clamp(Math.round(chain.stealChance + stealGain), 0, 100);
}

// Resuelve el disparo final con el % acumulado de la cadena (no la
// fórmula normal de Tiro): mismo tratamiento de gol/fallo que un Tiro
// normal, y cuenta como el único "ataque" de todo este turno.
function resolveAlternativoShot(attackerRaw) {
  var m = G.match;
  var chain = m.regateChain;
  m.playerAtkCount++;
  var success = rand(1, 100) <= chain.shootChance;
  var actorLabel = escapeHtml(attackerRaw.nombre);
  if (success) {
    m.playerScore++;
    recordRunGoalScorer(attackerRaw, true);
    m.lastEvent = actorLabel + ': ¡GOL' + (chain.step > 0 ? (' tras ' + chain.step + ' regate' + (chain.step === 1 ? '' : 's')) : '') + '!';
    m.lastEventClass = 'goal';
  } else {
    m.lastEvent = actorLabel + ': el tiro es bloqueado.';
    m.lastEventClass = '';
  }
  m.log.push(m.lastEvent);
  m.regateChain = null;
  m.regateChains = null;
  m.selectedAttackerId = null;
  advanceTurn();
}

// Intenta otro regate dentro de la misma cadena: si te la roban, el turno
// pasa igual que un fallo normal (sin penalización extra, a petición
// explícita); si no, sube el riesgo/recompensa y sigue el mismo turno (no
// se llama a advanceTurn -- se puede seguir eligiendo). El Regate YA NO
// adelanta el cooldown de tu Especial (eso era del viejo Modo Normal de
// una sola tirada, antes de que este mecanismo pasara a ser el estándar
// en todos los modos) -- ahora el Regate solo sirve para construir la
// cadena, ver alternativoGrowChain.
function resolveAlternativoRegate(attackerRaw) {
  var m = G.match;
  var chain = m.regateChain;
  var actorLabel = escapeHtml(attackerRaw.nombre);
  var stolen = rand(1, 100) <= chain.stealChance;
  if (stolen) {
    m.playerAtkCount++;
    m.lastEvent = actorLabel + ': ¡le quitan el balón al intentar otro regate!';
    m.lastEventClass = '';
    m.log.push(m.lastEvent);
    m.regateChain = null;
    m.regateChains = null;
    m.selectedAttackerId = null;
    advanceTurn();
    return;
  }
  alternativoGrowChain(chain, attackerRaw);
  // Los % ya se ven en los propios botones de Tirar/Regatear (ver
  // renderPlayerTurn), así que aquí no hace falta repetirlos -- a
  // petición explícita, solo el chispazo corto.
  m.lastEvent = actorLabel + ': ¡Regatea!';
  m.lastEventClass = '';
  m.log.push(m.lastEvent);
  render();
}

function renderPlayerTurn() {
  var m = G.match;
  var squad = G.run.squad;
  var selected = m.selectedAttackerId;
  var cards = squad.map(function (p) {
    return playerCardHtml(p, 'selectAttacker(\'' + p.instanceId + '\')', selected === p.instanceId, false);
  }).join('');

  var pStatus = specialStatus(m.playerAtkCount, m.playerLastSpecialAt, m.playerCooldownBoost, m.playerCooldownNeeded);
  var selectedPlayer = selected ? squad.find(function (p) { return p.instanceId === selected; }) : null;
  var specialLabel = selectedPlayer && selectedPlayer.hissatsu ? selectedPlayer.hissatsu[0] : 'Especial';
  // Cada jugador puede usar su técnica de ataque 1 sola vez por partido
  // (igual que la técnica defensiva de portero/defensa) -- antes solo se
  // bloqueaba repetirla dos veces SEGUIDAS, así que rotando entre jugadores
  // se podía volver a usar la misma técnica más adelante en el mismo partido.
  var alreadyUsed = selectedPlayer && !!m.playerUsedSpecialByPlayer[selectedPlayer.instanceId];
  // Las técnicas de Portero y Defensa son defensivas: solo sirven para la
  // "defensa activa" cuando ataca el rival (ver prepareOpponentTurn), NUNCA
  // para tirar a puerta. Solo Delantero y Centrocampista pueden usar su
  // Especial en su propio turno de ataque.
  var canAttackWithSpecial = selectedPlayer && (selectedPlayer.posicion === 'Delantero' || selectedPlayer.posicion === 'Centrocampista');
  var canSpecial = pStatus.ready && selected && !alreadyUsed && canAttackWithSpecial;
  var specialHint = (selectedPlayer && !canAttackWithSpecial) ? 'Su técnica es defensiva, no de ataque' :
    (alreadyUsed ? 'Ya usada esta partida' : (pStatus.ready ? (selectedPlayer.tipoTecnica === 'regate' ? '¡Lista! Regate asegurado' : '¡Lista!') : ('Disponible en ' + pStatus.turnsLeft + ' turno' + (pStatus.turnsLeft === 1 ? '' : 's'))));

  var matchupHtml = '';
  if (selectedPlayer) {
    var oppGk = m.oppSquad.find(function (p) { return p.posicion === 'Portero'; }) || m.oppSquad[0];
    var adv = typeAdvantage(selectedPlayer.tipo, oppGk.tipo);
    var advWord = adv === 1 ? 'ventaja elemental' : (adv === -1 ? 'desventaja elemental' : 'sin ventaja elemental');
    matchupHtml = '<p class="dim small matchup-info">' + selectedPlayer.tipo + ' vs ' + oppGk.tipo + ' (portero rival): ' + advWord + '</p>';
  }

  // Tiro y Regate ya no se resuelven en una sola tirada en ningún modo: se
  // puede encadenar regate sobre regate en el mismo turno, subiendo el % de
  // gol (cada vez menos, según el Regate del jugador -- ver
  // alternativoGrowChain) a cambio de un % de robo creciente, hasta decidir
  // tirar o hasta que te la quiten. Especial funciona igual que siempre
  // (ver canSpecial/specialHint arriba, sin tocar). Esto era antes exclusivo
  // del "Modo Alternativo"; ahora es el estándar en Normal/Difícil/Torneo/
  // Supervivencia/Diario, a petición explícita.
  var actions;
  if (selectedPlayer) {
    ensureAlternativoChain(selectedPlayer);
    var chain = m.regateChain;
    var regateLabel = chain.step === 0 ? 'Regatear' : 'Regatear otra vez';
    actions = (
      '<div class="action-row">' +
        '<button class="btn action-btn" onclick="playAction(\'tiro\')">Tirar<small>Gol al ' + chain.shootChance + '%</small></button>' +
        '<button class="btn action-btn" onclick="playAction(\'regate\')">' + regateLabel + '<small>Riesgo de robo: ' + chain.stealChance + '%</small></button>' +
        '<button class="btn action-btn btn-primary" ' + (canSpecial ? '' : 'disabled') + ' onclick="playAction(\'especial\')">' + escapeHtml(specialLabel) + '<small>' + specialHint + '</small></button>' +
      '</div>'
    );
  } else {
    actions = (
      '<div class="action-row">' +
        '<button class="btn action-btn" disabled>Tirar<small>Elige jugador</small></button>' +
        '<button class="btn action-btn" disabled>Regatear<small>Elige jugador</small></button>' +
        '<button class="btn action-btn btn-primary" disabled>' + escapeHtml(specialLabel) + '<small>Elige jugador</small></button>' +
      '</div>'
    );
  }

  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Elige jugador</h3>' +
      '<div class="card-grid">' + cards + '</div>' +
      matchupHtml +
      actions +
    '</div>'
  );
}

function selectAttacker(instanceId) { G.match.selectedAttackerId = instanceId; render(); }

function effectiveStats(p) {
  if (!p.fatigado) return p;
  return {
    tiro: Math.max(5, p.tiro - 10),
    pase: Math.max(5, p.pase - 10),
    defensa: Math.max(5, p.defensa - 10),
    especial: Math.max(5, p.especial - 10),
    tipo: p.tipo,
    nombre: p.nombre,
    hissatsu: p.hissatsu
  };
}

function playAction(action) {
  var m = G.match;
  var attackerRaw = G.run.squad.find(function (p) { return p.instanceId === m.selectedAttackerId; });
  if (!attackerRaw) return;
  // Tiro/Regate del jugador siempre pasan por la cadena de regate (ver
  // renderPlayerTurn) en todos los modos; Especial sigue resolviéndose como
  // siempre, sin tocar.
  if (m.regateChain && (action === 'tiro' || action === 'regate')) {
    if (action === 'tiro') resolveAlternativoShot(attackerRaw);
    else resolveAlternativoRegate(attackerRaw);
    return;
  }
  // Especial de una técnica de tipo REGATE (roster-data.js, tipoTecnica): no
  // es un remate a puerta, es un regate asegurado. Sube la cadena de regate
  // como un Regatear con éxito pero SIN tirar el dado de robo, y el turno
  // sigue (se puede rematar o seguir regateando).
  if (action === 'especial' && m.regateChain && attackerRaw.tipoTecnica === 'regate') {
    resolveEspecialRegateAsegurado(attackerRaw);
    return;
  }
  var defenderRaw = pickDefender(m.oppSquad, action);
  resolveAttack(attackerRaw, defenderRaw, action, true);
  advanceTurn();
}
function resolveEspecialRegateAsegurado(attackerRaw) {
  var m = G.match;
  alternativoGrowChain(m.regateChain, attackerRaw);
  m.playerUsedSpecialByPlayer[attackerRaw.instanceId] = true;
  m.playerLastSpecialAt = m.playerAtkCount;
  m.playerCooldownNeeded = rand(2, 3);
  var moveName = attackerRaw.hissatsu ? attackerRaw.hissatsu[0] : 'su técnica';
  m.lastEvent = escapeHtml(attackerRaw.nombre) + ' usa ' + escapeHtml(moveName) + ': ¡regate asegurado!';
  m.lastEventClass = '';
  m.log.push(m.lastEvent);
  render();
}

// Decide la jugada rival SIN resolverla todavía, para poder ofrecerle al
// jugador la opción de defensa activa antes de saber el resultado.
function prepareOpponentTurn() {
  var m = G.match;
  if (m.pendingOpp) return m.pendingOpp;
  // El portero rival nunca ataca (en fútbol real el guardameta no remata a
  // puerta): se elige siempre entre el resto del equipo.
  var attackers = m.oppSquad.filter(function (p) { return p.posicion !== 'Portero'; });
  var attackerRaw = choice(attackers.length ? attackers : m.oppSquad);
  // La ventaja elemental para decidir la jugada se calcula contra el rival
  // "probable" (el portero del jugador, ya que tiro/especial siempre lo
  // enfrentan) para que la IA decida con la misma info que se le mostraría al jugador.
  var likelyDefender = G.run.squad.find(function (p) { return p.posicion === 'Portero'; }) || choice(G.run.squad);
  var adv = typeAdvantage(attackerRaw.tipo, likelyDefender.tipo);
  var oppStatus = specialStatus(m.oppAtkCount, m.oppLastSpecialAt, m.oppCooldownBoost, m.oppCooldownNeeded);
  var oppMoveName = attackerRaw.hissatsu ? attackerRaw.hissatsu[0] : null;
  var oppIsRepeat = oppMoveName && oppMoveName === m.oppLastSpecialMove;
  // Mismo criterio que para el jugador: solo Delantero/Centrocampista pueden
  // rematar con su técnica; Defensa (Portero ya está excluido de atacar) solo
  // ataca con Tiro/Regate normales.
  var oppCanSpecial = attackerRaw.posicion === 'Delantero' || attackerRaw.posicion === 'Centrocampista';
  var action;
  if (oppCanSpecial && oppStatus.ready && !oppIsRepeat && (adv >= 0 || Math.random() < 0.6)) {
    action = 'especial';
  } else {
    action = Math.random() < 0.65 ? 'tiro' : 'regate';
  }
  var defenderRaw = pickDefender(G.run.squad, action);
  var defHasSpecialist = hasDefensiveSpecialist(G.run.squad, action);
  m.pendingOpp = { attackerRaw: attackerRaw, action: action, defenderRaw: defenderRaw, defHasSpecialist: defHasSpecialist };
  return m.pendingOpp;
}

// Resuelve la jugada rival ya decidida. Si el jugador tiene un especialista
// real (portero para tiro/especial, defensa para regate) puede activar una
// "defensa activa": baja bastante la probabilidad de que le marquen esta
// jugada, a cambio de retrasar un turno la recarga de su propia Especial.
// mode: 'normal' (sin hacer nada especial), 'activa' (defensa activa,
// repetible, retrasa la Especial 1 turno) o 'tecnica' (técnica defensiva del
// portero/defensa real, solo 1 vez por partido, mucho más fuerte que "activa").
function resolveOpponentTurn(mode) {
  var m = G.match;
  var p = m.pendingOpp || prepareOpponentTurn();
  m.pendingOpp = null;
  var useActiveDefense = mode === 'activa';
  var useTechnique = mode === 'tecnica';
  if (useActiveDefense) m.playerCooldownBoost -= 1;
  if (useTechnique) m.defenseTechniqueUsedByPos[p.defenderRaw.posicion] = true;
  resolveAttack(p.attackerRaw, p.defenderRaw, p.action, false, p.defHasSpecialist, useActiveDefense, useTechnique);
  advanceTurn();
}

function resolveAttack(attackerRaw, defenderRaw, action, isPlayerAttacking, defenderHasSpecialist, activeDefense, defenseTechnique) {
  var m = G.match;
  var attacker = effectiveStats(attackerRaw);
  var defender = effectiveStats(defenderRaw);
  var adv = typeAdvantage(attacker.tipo, defender.tipo);

  var atkStat, chance;
  if (action === 'tiro') { atkStat = attacker.tiro; chance = 50 + (atkStat - defender.defensa) * 0.5; }
  else if (action === 'regate') { atkStat = attacker.pase; chance = 30 + (atkStat - defender.defensa) * 0.5; }
  else if (isPlayerAttacking) {
    // Tu Especial es un gol casi garantizado: base muy alta y el estatus
    // defensivo del rival solo la penaliza levemente (peso 0.25 ahora: más
    // relevancia de tu Especial stat), así que ni un portero legendario la
    // baja de ~85% con un Especial medio-alto.
    atkStat = attacker.especial;
    chance = 94 + (atkStat - defender.defensa) * 0.25;
  } else {
    // La Especial rival es peligrosa pero NO casi-garantizada como la tuya:
    // si no fuera así, un equipo rival podía marcar en prácticamente todos
    // sus turnos contra un equipo sin portero/defensa reales (reportado:
    // 7 goles rivales en 7 turnos). Ahora con peso 0.45 (subido de 0.35).
    atkStat = attacker.especial;
    chance = 68 + (atkStat - defender.defensa) * 0.45;
  }

  chance += adv * (action === 'especial' ? 8 : 10);
  chance += weatherChanceDelta(m.weather, action, attacker.tipo);

  // El equipo rival marca muchos menos goles en general (bajado a petición
  // explícita tras varias partidas injustamente duras para el jugador).
  if (!isPlayerAttacking) chance -= 10;
  // Defensa activa: el jugador ha elegido defender con su portero/defensa
  // real (solo posible si tiene uno de verdad), a cambio de retrasar un
  // turno la recarga de su propia Especial (ver resolveOpponentTurn).
  if (!isPlayerAttacking && activeDefense) chance -= 20;

  // Modo Difícil: un ajuste pequeño y exclusivo de este modo (no toca el
  // modo normal, que ya está bien equilibrado). El rival mete algún gol
  // más y para algo más al jugador -- "un pelín", nada más.
  if (G.run && G.run.hardMode) chance += isPlayerAttacking ? -5 : 5;

  // Tu propio portero casi nunca mete gol de tiro (es su portero, no un
  // rematador) -- solo se aplica a TU equipo, el del rival da igual porque
  // ya está excluido de atacar por completo (ver prepareOpponentTurn).
  var isOwnGoalkeeperShot = isPlayerAttacking && action === 'tiro' && attackerRaw.posicion === 'Portero';

  // Técnica defensiva (1 sola vez por partido, ver resolveOpponentTurn): un
  // parón/entrada decisivo, mucho más fuerte que la "defensa activa" normal
  // -- por eso ignora incluso el suelo mínimo del rival (30).
  var maxChance = defenseTechnique ? 5 : (isOwnGoalkeeperShot ? 8 : ((action === 'especial' && isPlayerAttacking) ? 99 : (isPlayerAttacking ? 95 : 80)));
  // El suelo del rival sube de 5 a 18: con un portero muy fuerte (88-99 de
  // defensa) el cálculo podía dejarlo casi imbatible (~5% constante). Un
  // suelo más alto asegura que siempre tenga una posibilidad real de marcar.
  var minChance = defenseTechnique ? 1 : ((action === 'especial' && isPlayerAttacking) ? 85 : (isPlayerAttacking ? 5 : 30));
  chance = clamp(Math.round(chance), minChance, maxChance);

  var roll = rand(1, 100);
  var success = roll <= chance;

  var scoreKey = isPlayerAttacking ? 'playerScore' : 'oppScore';
  var actorLabel = isPlayerAttacking ? escapeHtml(attackerRaw.nombre) : escapeHtml(attackerRaw.nombre) + ' (rival)';
  var advText = adv === 1 ? (' ¡Ventaja elemental (' + attacker.tipo + ' vs ' + defender.tipo + ')!') :
    (adv === -1 ? (' Desventaja elemental (' + attacker.tipo + ' vs ' + defender.tipo + ').') : '');
  var moveName = action === 'especial' && attacker.hissatsu ? attacker.hissatsu[0] : null;

  // Cooldown de la Especial (ver specialStatus): se reinicia y se vuelve a
  // sortear (2 o 3 ataques) al usarla, sea gol o parada. El Tiro/Regate del
  // jugador ya no llega aquí (van por la cadena de regate, ver playAction),
  // así que esta rama de isPlayerAttacking solo se usa para su Especial.
  if (isPlayerAttacking) {
    m.playerAtkCount++;
    if (action === 'especial') {
      m.playerLastSpecialAt = m.playerAtkCount;
      m.playerCooldownBoost = 0;
      m.playerCooldownNeeded = rand(2, 3);
      m.playerUsedSpecialByPlayer[attackerRaw.instanceId] = true;
    }
  } else {
    m.oppAtkCount++;
    if (action === 'regate') m.oppCooldownBoost++;
    if (action === 'especial') {
      m.oppLastSpecialAt = m.oppAtkCount;
      m.oppCooldownBoost = 0;
      m.oppCooldownNeeded = rand(2, 3);
      m.oppLastSpecialMove = moveName;
    }
  }

  // (Se probó a nombrar al defensor SIEMPRE aquí, pero el jugador pidió
  // quitarlo porque salía en cada jugada rival, no solo cuando importaba.)
  // Solo se nombra la TÉCNICA (el hissatsu real, 1 vez por partido) cuando el
  // jugador la usó de verdad. "Defensa activa" es una acción genérica y
  // repetible, no el hissatsu -- antes mostraba igualmente el nombre de la
  // técnica real (p.ej. "Muro Dimensional de Nero") aunque el jugador solo
  // hubiera elegido "Defensa activa", dando a entender que había gastado su
  // único uso de la técnica cuando no era así.
  var defenderTag = '';
  if (!isPlayerAttacking && defenseTechnique) {
    defenderTag = ' (' + escapeHtml(defender.hissatsu ? defender.hissatsu[0] : 'técnica defensiva') + ' de ' + escapeHtml(defender.nombre) + ')';
  } else if (!isPlayerAttacking && activeDefense) {
    defenderTag = ' (defensa activa de ' + escapeHtml(defender.nombre) + ')';
  }

  // La "ventaja/desventaja elemental" solo se muestra en el resumen pequeño
  // de abajo (el log), no en el mensaje grande de arriba bajo el turno.
  if (success) {
    m[scoreKey]++;
    recordRunGoalScorer(attackerRaw, isPlayerAttacking);
    var verb = action === 'especial' ? ('¡' + escapeHtml(moveName || 'jugada especial') + ' imparable!') : (action === 'tiro' ? '¡GOL!' : '¡Gol tras un gran pase!');
    m.lastEvent = actorLabel + ': ' + verb + defenderTag;
    m.lastEventClass = 'goal';
    m.log.push(m.lastEvent + advText);
  } else {
    var missVerb = action === 'regate' ? 'el regate es cortado.' : (action === 'especial' ? (escapeHtml(moveName || 'la jugada especial') + ' es bloqueada.') : 'el tiro es bloqueado.');
    m.lastEvent = actorLabel + ': ' + missVerb + defenderTag;
    // El icono/animación de la jugada fallida distingue quién la para: el
    // Portero (parada) del Defensa (entrada/defensa) -- así "tiro", "parada"
    // y "defensa" se ven y se sienten como tres eventos distintos, no un
    // único "bloqueo" genérico.
    m.lastEventClass = defenderRaw.posicion === 'Portero' ? 'save' : (defenderRaw.posicion === 'Defensa' ? 'defense' : 'block');
    m.log.push(m.lastEvent + advText);
  }
  m.selectedAttackerId = null;
}

// El partido sigue (no ha terminado en este mismo cambio de turno): antes de
// pintar la pantalla, se sortea si toca un penalti-bonus (ver
// maybeTriggerPenalty). Se hace aquí y no dentro de render() porque render()
// se puede volver a llamar sin que haya pasado turno de verdad (p.ej. al
// redimensionar), y un sorteo ahí lo repetiría cada vez.
function continueMatch() {
  maybeTriggerPenalty();
  render();
}

function advanceTurn() {
  var m = G.match;
  if (m.suddenDeath) {
    // Gol de oro real: el partido termina en cuanto CUALQUIERA de los dos
    // marca, sin esperar a que el otro responda (antes solo se comprobaba
    // tras el turno rival, así que un gol tuyo nunca acababa el partido en
    // el momento -- siempre le daba al rival una respuesta gratis antes de
    // poder ganar).
    if (m.playerScore !== m.oppScore) { finishMatch(); return; }
    if (m.sdStage === 'jugador') { m.sdStage = 'rival'; continueMatch(); return; }
    m.sdRound++;
    if (m.sdRound > 5) {
      if (Math.random() < 0.5) m.playerScore++; else m.oppScore++;
      finishMatch();
      return;
    }
    m.sdStage = 'jugador';
    continueMatch();
    return;
  }

  m.turn++;
  if (m.turn > MATCH_TURNS) {
    if (m.playerScore === m.oppScore) {
      m.suddenDeath = true;
      m.sdRound = 1;
      m.sdStage = 'jugador';
      m.log.push('Empate — ¡muerte súbita!');
      continueMatch();
      return;
    }
    finishMatch();
    return;
  }
  continueMatch();
}

// Penalti-bonus: evento aleatorio (2% cada vez que el partido sigue tras un
// cambio de turno) que interrumpe brevemente el flujo normal para un
// mini-juego de 3 zonas -- no consume el turno en curso, solo se resuelve
// antes de él y luego el partido sigue exactamente donde iba.
function maybeTriggerPenalty() {
  var m = G.match;
  if (!m || m.finished || m.penalty) return;
  if (Math.random() >= 0.02) return;
  var playerShoots = Math.random() < 0.5;
  var shooterSquad = playerShoots ? G.run.squad : m.oppSquad;
  var keeperSquad = playerShoots ? m.oppSquad : G.run.squad;
  var shooterPool = shooterSquad.filter(function (p) { return p.posicion !== 'Portero'; });
  var shooter = choice(shooterPool.length ? shooterPool : shooterSquad);
  var keeper = keeperSquad.find(function (p) { return p.posicion === 'Portero'; }) || choice(keeperSquad);
  m.penalty = { playerShoots: playerShoots, shooterName: shooter.nombre, keeperName: keeper.nombre };
}

function renderPenalty() {
  var m = G.match;
  var p = m.penalty;
  if (p.result) {
    var resultTitle = p.result === 'goal' ? '⚽ ¡Gol!' : '🧤 ¡Parada!';
    return (
      '<div class="panel center-text penalty-panel">' +
        '<h3>' + resultTitle + '</h3>' +
        '<p class="dim small">' + p.resultText + '</p>' +
        '<button class="btn btn-primary btn-block" onclick="continuePenalty()">Continuar</button>' +
      '</div>'
    );
  }
  var title = p.playerShoots ? '⚽ ¡Penalti a tu favor!' : '🧤 ¡Penalti en contra!';
  var subtitle = p.playerShoots
    ? escapeHtml(p.shooterName) + ' se planta ante ' + escapeHtml(p.keeperName) + ' (rival). Elige dónde tirar.'
    : escapeHtml(p.shooterName) + ' (rival) se planta ante ' + escapeHtml(p.keeperName) + '. Elige dónde tirarte a parar.';
  return (
    '<div class="panel center-text penalty-panel">' +
      '<h3>' + title + '</h3>' +
      '<p class="dim small">' + subtitle + '</p>' +
      '<div class="penalty-goal">' +
        '<img class="penalty-goal-img" src="assets/otros/penaltis.png" alt="">' +
        '<div class="penalty-zones">' +
          '<button class="penalty-zone" onclick="resolvePenalty(0)" aria-label="Izquierda"></button>' +
          '<button class="penalty-zone" onclick="resolvePenalty(1)" aria-label="Centro"></button>' +
          '<button class="penalty-zone" onclick="resolvePenalty(2)" aria-label="Derecha"></button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

window.resolvePenalty = function (zone) {
  var m = G.match;
  var p = m && m.penalty;
  if (!p || p.result) return;
  var otherZone = rand(0, 2);
  // "zone" es siempre la zona que cubre el portero (elegida por la CPU si
  // disparas tú, elegida por ti si defiendes) y "otherZone" la del disparo
  // (al azar si defiendes tú, elegida por la CPU si disparas tú). Si
  // coinciden, para; si no, gol -- la misma fórmula sirve para ambos casos.
  var saved = zone === otherZone;
  var scoringSide = p.playerShoots ? 'playerScore' : 'oppScore';
  var shooterLabel = p.playerShoots ? escapeHtml(p.shooterName) : escapeHtml(p.shooterName) + ' (rival)';

  if (!saved) {
    m[scoringSide]++;
    m.lastEvent = shooterLabel + ': ¡penalti anotado!';
    m.lastEventClass = 'goal';
    p.result = 'goal';
    p.resultText = shooterLabel + ' marca el penalti.';
  } else {
    m.lastEvent = shooterLabel + ': penalti detenido por ' + escapeHtml(p.keeperName) + '.';
    m.lastEventClass = 'save';
    p.result = 'save';
    p.resultText = escapeHtml(p.keeperName) + ' detiene el penalti de ' + shooterLabel + '.';
  }
  m.log.push(m.lastEvent);
  // El resultado se muestra en pantalla (ver renderPenalty) antes de volver
  // al partido -- eso ocurre al pulsar "Continuar" (ver continuePenalty).
  render();
};

window.continuePenalty = function () {
  var m = G.match;
  if (!m || !m.penalty) return;
  m.penalty = null;

  // Si esto pasa en muerte súbita y ya decide el partido, hay que cerrarlo
  // aquí mismo: no va a haber otra llamada a advanceTurn para este evento.
  if (m.suddenDeath && m.playerScore !== m.oppScore) {
    finishMatch();
    return;
  }
  render();
};

function finishMatch() {
  var m = G.match;
  m.finished = true;
  var won = m.playerScore > m.oppScore;
  if (won) {
    G.run.matchesWon++;
    var reward = SPIRIT_PER_MATCH + (m.isBoss ? SPIRIT_PER_BOSS : 0);
    G.run.spiritEarned += reward;
    var candidate = choice(G.run.squad);
    candidate.fatigado = true;
    m.log.push('¡Victoria! +' + reward + ' Puntos de Espíritu (se sumarán al terminar la partida).');
    // El bonus de +5 se calcula AQUÍ (antes de la primera renderización de la
    // pantalla de victoria), no en afterMatchWin: esa función solo se dispara
    // al pulsar "Continuar" y ya navega fuera de esta pantalla, así que si el
    // bonus se calculaba ahí el mensaje nunca llegaba a verse.
    var howMany = Math.random() < 0.6 ? 1 : 2;
    var shuffled = G.run.squad.slice().sort(function () { return Math.random() - 0.5; });
    m.bonusesApplied = [];
    shuffled.slice(0, howMany).forEach(function (p) {
      var stats = ['tiro', 'pase', 'defensa', 'especial'];
      var stat = choice(stats);
      var oldVal = p[stat];
      applyStatChange(p, stat, 5);
      m.bonusesApplied.push({ nombre: p.nombre, stat: stat, oldVal: oldVal, newVal: p[stat] });
    });
  } else {
    m.log.push('Derrota. Tu temporada termina aquí.');
  }
  render();
}

function renderMatchEnd() {
  var m = G.match;
  var won = m.playerScore > m.oppScore;
  var html = '<div class="panel center-text">';
  if (won) {
    html += '<h3>Victoria ' + m.playerScore + ' - ' + m.oppScore + '</h3>';
    if (m.bonusesApplied && m.bonusesApplied.length > 0) {
      html += '<div style="background:#1a3a1a;border-radius:8px;padding:8px;margin:8px 0;text-align:left;">';
      html += '<p style="margin:0 0 6px;color:#7cfc00;font-weight:bold;text-align:center;">Bonificación post-victoria:</p>';
      m.bonusesApplied.forEach(function (b) {
        var statLabel = b.stat === 'pase' ? 'Regate' : (b.stat.charAt(0).toUpperCase() + b.stat.slice(1));
        html += '<p style="margin:4px 0;color:#7cfc00;font-size:0.9em;">' + escapeHtml(b.nombre) + ': ' + statLabel + ' +5 (' + b.oldVal + '→' + b.newVal + ')</p>';
      });
      html += '</div>';
    }
    html += '<p class="dim">Tu equipo avanza en el mapa.</p>';
    html += '<button class="btn btn-primary btn-block" onclick="afterMatchWin()">Continuar</button>';
  } else {
    html += '<h3>Derrota ' + m.playerScore + ' - ' + m.oppScore + '</h3>';
    html += '<p class="dim">La partida ha terminado.</p>';
    html += '<button class="btn btn-danger btn-block" onclick="afterMatchLoss()">Ver resumen</button>';
  }
  html += '</div>';
  return html;
}

function afterMatchWin() {
  if (G.run.mode === 'torneo') { afterTournamentMatchEnd(true); return; }
  if (G.run.mode === 'supervivencia') {
    if (G.match.isBoss) G.run.squad.forEach(function (p) { p.fatigado = false; });
    G.match = null;
    // Cada SURVIVAL_CASHOUT_EVERY partidos ganados se ofrece la opción de
    // retirarse con los Puntos de Espíritu ya acumulados en esta partida,
    // en vez de forzar a seguir hasta perder para poder cobrarlos.
    if (G.run.matchesWon > 0 && G.run.matchesWon % SURVIVAL_CASHOUT_EVERY === 0) {
      G.screen = 'survivalCashout';
      render();
      return;
    }
    advanceSurvivalStage();
    return;
  }
  if (G.run.mode === 'diario') {
    if (G.match.isBoss) G.run.squad.forEach(function (p) { p.fatigado = false; });
    G.match = null;
    if (G.run.dailyStep >= DAILY_SEQUENCE.length) {
      G.run.victory = true;
      G.run.spiritEarned += SPIRIT_PER_BOSS;
      finishRun();
    } else {
      advanceDailyStage();
    }
    return;
  }
  // ---- Modo Normal / Difícil: mapa ramificado de siempre ----
  var wasFinalBoss = mapDepth(G.run.currentNodeId, G.run.map) === G.run.map.rows.length - 1;
  if (G.match.isBoss) {
    // Vencer a un jefe (cualquiera de los 3) quita la fatiga a todo el equipo.
    G.run.squad.forEach(function (p) { p.fatigado = false; });
  }
  // El bonus de +5 ya se calculó y aplicó en finishMatch(), para que el
  // mensaje se vea en la pantalla de victoria antes de pulsar "Continuar".
  G.match = null;
  clearCurrentNode();
  if (wasFinalBoss) {
    G.run.victory = true;
    G.run.spiritEarned += SPIRIT_PER_BOSS;
    finishRun();
    return;
  }
  G.screen = 'map';
  render();
}

function afterMatchLoss() {
  if (G.run.mode === 'torneo') { afterTournamentMatchEnd(false); return; }
  G.run.victory = false;
  finishRun();
}

function finishRun() {
  var meta = G.meta;
  meta.points += G.run.spiritEarned;
  meta.runsPlayed++;
  // Solo el Modo Normal cuenta para desbloquear el Modo Difícil -- Torneo,
  // Supervivencia y Diario no deben contar como "victoria en normal".
  if (G.run.victory && G.run.mode === 'normal') meta.normalWins = (meta.normalWins || 0) + 1;
  if (G.run.victory && G.run.mode === 'torneo') meta.tournamentsWon = (meta.tournamentsWon || 0) + 1;
  if (G.run.mode === 'supervivencia' && (G.run.survivalWave || 0) > (meta.bestSurvivalWave || 0)) {
    meta.bestSurvivalWave = G.run.survivalWave;
  }
  if (G.run.mode === 'diario') {
    meta.dailyLastDate = todayKey();
    meta.dailyLastResult = { victory: G.run.victory, nodes: G.run.dailyStep };
  }
  var depthReached = G.run.clearedCount;
  if (depthReached > meta.bestNode) meta.bestNode = depthReached;
  if (G.run.matchesWon > meta.bestWins) meta.bestWins = G.run.matchesWon;
  saveMeta(meta);
  G.meta = meta;
  showEndAnimation(G.run.victory, G.run.mode, G.run.retired);
  // Tirada gratis en la Máquina de Premios: al ganar cualquier modo de
  // Jugar (Normal/Difícil/Torneo/Diario), y siempre al acabar una partida
  // de Supervivencia -- ahí no existe "ganar" de verdad (es un modo sin
  // final), así que se premia terminarla, tanto si te retiras como si
  // acabas cayendo.
  if (G.run.victory || G.run.mode === 'supervivencia') {
    triggerRewardMachine('summary');
    return;
  }
  G.screen = 'summary';
  render();
}

function showEndAnimation(victory, mode, retired) {
  var div = document.createElement('div');
  if (retired) {
    div.className = 'victory-animation';
    div.textContent = '💰';
  } else if (mode === 'torneo' && victory) {
    div.className = 'tournament-victory';
    div.innerHTML = '<div class="trophy-icon">🏆</div><div class="victory-text">¡CAMPEÓN!</div>';
  } else if (victory) {
    div.className = 'victory-animation';
    div.textContent = '✨';
  } else {
    div.className = 'defeat-animation';
    div.textContent = '💔';
  }
  document.body.appendChild(div);
  setTimeout(function() { div.remove(); }, mode === 'torneo' ? 2500 : 1500);
}

