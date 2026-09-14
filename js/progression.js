/* ---------------------------------------------------------------------
   14. RESUMEN
   --------------------------------------------------------------------- */

function renderSummary() {
  var run = G.run;
  var title = run.retired ? 'Te retiras con tus puntos a salvo' : (run.victory ? '¡Campeones de la temporada!' : 'Resumen de la temporada');
  var scorers = sortedStatsList((run.goalStats || { scorers: {} }).scorers).slice(0, 8);
  var scorersHtml = scorers.length
    ? '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Goleadores de la partida</h3>' +
        scorers.map(function (s, i) {
          return '<div class="futdraft-timeline-row"><span>' + (i + 1) + '.</span><span style="flex:1;text-align:left">' + escapeHtml(s.nombre) + '</span><span class="dim">' + s.count + '</span></div>';
        }).join('') +
      '</div>'
    : '';
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">' + title + '</h2>' +
        (run.retired ? '<p class="dim">Te llevas todo lo ganado en esta partida sin arriesgarte a más.</p>' : (run.victory ? '<p class="dim">Has superado todo el bracket sin perder ni un partido. ¡Enhorabuena!</p>' : '')) +
        '<div class="stats-summary">' +
          '<div class="stat-tile"><div class="num">' + run.clearedCount + '</div><div class="label">Nodos superados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.matchesWon + '</div><div class="label">Partidos ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.spiritEarned + '</div><div class="label">Puntos de Espíritu ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + G.meta.points + '</div><div class="label">Total acumulado</div></div>' +
        '</div>' +
      '</div>' +
      scorersHtml +
      '<div class="panel center-text">' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionBackToMenu()">Volver al menú</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   15. VESTUARIO (desbloqueos de meta-progreso)
   --------------------------------------------------------------------- */

// Comprar un personaje concreto (antes una pantalla propia, "Vestuario")
// vive ahora como una sección plegable dentro de Fichajes, junto a las dos
// tiradas al azar -- las 3 formas de conseguir personajes/escudos
// unificadas en un único sitio, a petición explícita. Colapsada por
// defecto (la lista de bloqueados puede ser larga) para no tapar las
// máquinas de gachapon nada más entrar.
function fichajesCompraCollapsed() {
  return G.fichajesCompraCollapsed === undefined ? true : G.fichajesCompraCollapsed;
}
function actionToggleFichajesCompra() {
  G.fichajesCompraCollapsed = !fichajesCompraCollapsed();
  render();
}

function fichajesCompraHtml() {
  var meta = G.meta;
  var collapsed = fichajesCompraCollapsed();
  var filter = G.vestuarioFilter || { tipo: null, posicion: null };
  var locked = ROSTER.filter(function (p) { return p.locked && p.cost !== 99999; });

  var filtered = locked.filter(function (c) {
    if (filter.tipo && c.tipo !== filter.tipo) return false;
    if (filter.posicion && c.posicion !== filter.posicion) return false;
    return true;
  });

  var items = collapsed ? '' : filtered.map(function (c) {
    var unlocked = meta.unlocked.indexOf(c.id) !== -1;
    var right = unlocked
      ? '<span class="dim">Desbloqueado</span>'
      : '<button class="btn btn-primary" ' + (meta.points >= c.cost ? '' : 'disabled') + ' onclick="buyCaptain(\'' + c.id + '\')">Desbloquear</button>';
    return (
      '<div class="shop-item">' +
        '<div>' +
          avatarHtml(c) + ' <strong>' + escapeHtml(c.nombre) + '</strong> ' + typeBadge(c.tipo) + '<br>' +
          '<span class="dim small">' + escapeHtml(c.desc) + '</span>' +
        '</div>' +
        '<div class="cost">' + (unlocked ? '' : c.cost + ' pts. ') + right + '</div>' +
      '</div>'
    );
  }).join('');

  var filterBtns = collapsed ? '' : (
    '<div class="btn-row">' +
    (filter.tipo ? '<button class="btn btn-outline" onclick="vestuarioFilterChange(\'tipo\', null)">Tipo: ' + filter.tipo + ' ✕</button>' : TYPES.map(function (t) { return '<button class="btn" onclick="vestuarioFilterChange(\'tipo\', \'' + t + '\')">' + t + '</button>'; }).join('')) +
    '</div><div class="btn-row">' +
    (filter.posicion ? '<button class="btn btn-outline" onclick="vestuarioFilterChange(\'posicion\', null)">Pos: ' + filter.posicion + ' ✕</button>' : POSITIONS.map(function (p) { return '<button class="btn" onclick="vestuarioFilterChange(\'posicion\', \'' + p + '\')">' + p + '</button>'; }).join('')) +
    '</div>'
  );

  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Comprar personaje concreto</h3>' +
      '<p class="dim small">Elige tú a quién desbloquear (a precio fijo, distinto para cada uno) en vez de dejarlo al azar.</p>' +
      '<button class="btn btn-outline btn-block" onclick="actionToggleFichajesCompra()">' + (collapsed ? 'Mostrar' : 'Ocultar') + ' (' + filtered.length + ' de ' + locked.length + ')</button>' +
      filterBtns +
    '</div>' +
    items
  );
}

function vestuarioFilterChange(filterType, value) {
  G.vestuarioFilter = G.vestuarioFilter || { tipo: null, posicion: null };
  G.vestuarioFilter[filterType] = value;
  render();
}

function buyCaptain(playerId) {
  var meta = G.meta;
  var entry = ROSTER.find(function (p) { return p.id === playerId; });
  if (!entry) return;
  if (meta.unlocked.indexOf(playerId) !== -1) return;
  if (meta.points < entry.cost) return;
  meta.points -= entry.cost;
  meta.unlocked.push(playerId);
  saveMeta(meta);
  render();
}

/* ---------------------------------------------------------------------
   15b. FICHAJE DE BOLAS: máquina gachapon -- tirada al azar (no eliges a
   quién) que desbloquea un jugador real cualquiera que aún no tengas, a
   cambio de Puntos de Espíritu. Complementa al Vestuario (ahí SÍ eliges a
   quién desbloquear, pero jugador por jugador y a precios variables).
   --------------------------------------------------------------------- */

var GACHA_COST = 120;
var GACHA_SPIN_MS = 1600;
// Segunda tirada, independiente, en la misma pantalla de Fichaje de Bolas:
// da un escudo de equipo rival al azar (de los que aún no tienes) a cambio
// de puntos, igual que la Máquina de Premios puede darte de gratis (ver
// 15b-bis) pero aquí SÍ puedes elegir gastar puntos para intentarlo cuando
// quieras, no solo esperar a ganar algo.
var SHIELD_GACHA_COST = 200;

function actionGoGacha() {
  G.gacha = { spinning: false, resultId: null };
  G.shieldGacha = { spinning: false, resultName: null };
  G.screen = 'gacha';
  render();
}

function gachaLockedPool() {
  var meta = G.meta;
  return ROSTER.filter(function (p) { return p.locked && meta.unlocked.indexOf(p.id) === -1; });
}

function shieldGachaLockedPool() {
  var meta = G.meta;
  var owned = meta.unlockedShields || [];
  return REWARD_SHIELD_POOL.filter(function (name) { return owned.indexOf(name) === -1; });
}

function spinGacha() {
  var meta = G.meta;
  if (G.gacha.spinning) return;
  if (meta.points < GACHA_COST) return;
  var pool = gachaLockedPool();
  if (!pool.length) return;
  meta.points -= GACHA_COST;
  saveMeta(meta);
  G.gacha.spinning = true;
  G.gacha.resultId = null;
  render();
  setTimeout(function () {
    var won = choice(pool);
    meta.unlocked.push(won.id);
    saveMeta(meta);
    G.gacha.spinning = false;
    G.gacha.resultId = won.id;
    render();
  }, GACHA_SPIN_MS);
}

function spinShieldGacha() {
  var meta = G.meta;
  if (G.shieldGacha.spinning) return;
  if (meta.points < SHIELD_GACHA_COST) return;
  var pool = shieldGachaLockedPool();
  if (!pool.length) return;
  meta.points -= SHIELD_GACHA_COST;
  saveMeta(meta);
  G.shieldGacha.spinning = true;
  G.shieldGacha.resultName = null;
  render();
  setTimeout(function () {
    var won = choice(pool);
    meta.unlockedShields = meta.unlockedShields || [];
    meta.unlockedShields.push(won);
    saveMeta(meta);
    G.shieldGacha.spinning = false;
    G.shieldGacha.resultName = won;
    render();
  }, GACHA_SPIN_MS);
}

function gachaMachineHtml(spinning) {
  return (
    '<div class="gacha-machine' + (spinning ? ' spinning' : '') + '">' +
      '<div class="gacha-dome">' +
        '<span class="gacha-ball" style="--c1:#e94560;--c2:#ff8fa3;left:16%;top:52%;"></span>' +
        '<span class="gacha-ball" style="--c1:#4ecdc4;--c2:#a8f5ee;left:42%;top:30%;"></span>' +
        '<span class="gacha-ball" style="--c1:#44b78b;--c2:#a8f0cf;left:66%;top:55%;"></span>' +
        '<span class="gacha-ball" style="--c1:#ffd166;--c2:#fff0c2;left:28%;top:68%;"></span>' +
        '<span class="gacha-ball" style="--c1:#8c4fd1;--c2:#d6bdf5;left:54%;top:72%;"></span>' +
        '<span class="gacha-ball" style="--c1:#3a8fd9;--c2:#a9d4f5;left:78%;top:36%;"></span>' +
      '</div>' +
      '<div class="gacha-body">' +
        '<div class="gacha-slot"></div>' +
        '<div class="gacha-crank"><span class="gacha-crank-arm"></span><span class="gacha-crank-knob"></span></div>' +
      '</div>' +
    '</div>'
  );
}

function renderGacha() {
  var meta = G.meta;
  var pool = gachaLockedPool();
  var g = G.gacha || { spinning: false, resultId: null };
  var resultPlayer = g.resultId ? ROSTER.find(function (p) { return p.id === g.resultId; }) : null;

  var resultHtml = '';
  if (g.spinning) {
    resultHtml = '<p class="dim small center-text mt">Girando la máquina…</p>';
  } else if (resultPlayer) {
    resultHtml =
      '<div class="panel gacha-result mt">' +
        '<p class="center-text" style="color:var(--accent-2);font-weight:700;">¡Fichaje conseguido!</p>' +
        '<div class="player-card-head" style="justify-content:center;">' +
          avatarHtml(resultPlayer) +
          '<div class="player-head-text"><span class="player-name">' + escapeHtml(resultPlayer.nombre) + '</span>' +
          (resultPlayer.original ? '<span class="player-original">(' + escapeHtml(resultPlayer.original) + ')</span>' : '') + '</div>' +
          typeBadge(resultPlayer.tipo) +
        '</div>' +
        '<p class="dim small center-text">' + escapeHtml(resultPlayer.desc) + '</p>' +
      '</div>';
  } else if (!pool.length) {
    resultHtml = '<p class="dim small center-text mt">Ya tienes a todo el plantel disponible. ¡No queda nadie más por fichar!</p>';
  }

  var canSpin = !g.spinning && pool.length > 0 && meta.points >= GACHA_COST;
  var spinLabel = g.spinning ? 'Girando…' : ('Girar (' + GACHA_COST + ' pts.)');

  var shieldPool = shieldGachaLockedPool();
  var sg = G.shieldGacha || { spinning: false, resultName: null };
  var shieldResultHtml = '';
  if (sg.spinning) {
    shieldResultHtml = '<p class="dim small center-text mt">Girando la máquina…</p>';
  } else if (sg.resultName) {
    shieldResultHtml =
      '<div class="panel gacha-result mt center-text">' +
        '<p style="color:var(--accent-2);font-weight:700;">¡Nuevo escudo!</p>' +
        '<img class="team-shield-inline" style="width:64px;height:64px" src="' + escapeHtml(teamShieldPath(sg.resultName)) + '" alt="">' +
        '<p class="dim small">' + escapeHtml(sg.resultName) + '. Puedes equipártelo desde Mi Colección.</p>' +
      '</div>';
  } else if (!shieldPool.length) {
    shieldResultHtml = '<p class="dim small center-text mt">Ya tienes todos los escudos disponibles.</p>';
  }
  var canSpinShield = !sg.spinning && shieldPool.length > 0 && meta.points >= SHIELD_GACHA_COST;
  var shieldSpinLabel = sg.spinning ? 'Girando…' : ('Girar (' + SHIELD_GACHA_COST + ' pts.)');

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Fichajes</h2>' +
        '<p class="dim small">Las 3 formas de conseguir personajes y escudos: comprar uno concreto a precio fijo, o probar suerte con una tirada al azar de jugador o de escudo.</p>' +
        '<p class="currency-display">' + spiritIcon() + ' ' + meta.points + ' Puntos de Espíritu</p>' +
      '</div>' +
      fichajesCompraHtml() +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:8px">Tirada de jugador al azar</h3>' +
        gachaMachineHtml(g.spinning) +
        '<button class="btn btn-primary btn-block mt" ' + (canSpin ? '' : 'disabled') + ' onclick="spinGacha()">' + spinLabel + '</button>' +
        resultHtml +
      '</div>' +
      '<div class="panel center-text">' +
        '<h3 style="margin-bottom:8px">Tirada de escudo al azar</h3>' +
        gachaMachineHtml(sg.spinning) +
        '<button class="btn btn-primary btn-block mt" ' + (canSpinShield ? '' : 'disabled') + ' onclick="spinShieldGacha()">' + shieldSpinLabel + '</button>' +
        shieldResultHtml +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   15b-bis. MÁQUINA DE PREMIOS: 1 tirada GRATIS (no cuesta puntos) que se
   ofrece al ganar el Torneo o el FutDraft (ver finishRun/finishFutDraftRun).
   Reparto de probabilidad (100 puntos en total):
     - 1%  -> personaje bloqueado de más de 200 de coste (el mejor botín)
     - 9%  -> cualquier otro personaje bloqueado (coste 200 o menos)
     - 70% -> Puntos de Espíritu (20 a 80 al azar)
     - 20% -> un escudo de equipo rival al azar (para poder equipártelo
       como tu propio escudo, ver getPlayerShieldPath/actionEquipShield)
   --------------------------------------------------------------------- */

var REWARD_SPIN_MS = 1600;
var REWARD_SHIELD_POOL = Object.keys(TEAM_SHIELD_FILES);

function rewardLockedCharacterPool(minCost, maxCost) {
  var meta = G.meta;
  return ROSTER.filter(function (p) {
    if (!p.locked || meta.unlocked.indexOf(p.id) !== -1) return false;
    var cost = p.cost || 0;
    return cost >= minCost && cost <= maxCost;
  });
}

function rewardLockedShieldPool() {
  var meta = G.meta;
  var owned = meta.unlockedShields || [];
  return REWARD_SHIELD_POOL.filter(function (name) { return owned.indexOf(name) === -1; });
}

// Decide el premio y aplica sus efectos sobre G.meta (puntos/desbloqueos),
// pero NO guarda ni pinta nada -- eso lo hace spinRewardMachine(). Cadena de
// respaldo si el tramo que toca ya no tiene nada que dar (p.ej. roster o
// escudos completos): nunca se "pierde" la tirada, siempre cae a algo.
function rollRewardMachine() {
  var meta = G.meta;
  var roll = Math.random() * 100;

  if (roll < 1) {
    var elite = rewardLockedCharacterPool(201, Infinity);
    if (elite.length) {
      var wonElite = choice(elite);
      meta.unlocked.push(wonElite.id);
      return { type: 'character', player: wonElite, rare: true };
    }
  }
  if (roll < 10) {
    var normal = rewardLockedCharacterPool(0, 200);
    if (normal.length) {
      var wonNormal = choice(normal);
      meta.unlocked.push(wonNormal.id);
      return { type: 'character', player: wonNormal, rare: false };
    }
    var anyLeft = rewardLockedCharacterPool(0, Infinity);
    if (anyLeft.length) {
      var wonAny = choice(anyLeft);
      meta.unlocked.push(wonAny.id);
      return { type: 'character', player: wonAny, rare: (wonAny.cost || 0) > 200 };
    }
  }
  if (roll < 80) {
    var amount = rand(20, 80);
    meta.points += amount;
    return { type: 'credits', amount: amount };
  }
  var shields = rewardLockedShieldPool();
  if (shields.length) {
    var wonShield = choice(shields);
    meta.unlockedShields = meta.unlockedShields || [];
    meta.unlockedShields.push(wonShield);
    return { type: 'shield', name: wonShield };
  }
  // Sin escudos ni personajes que dar (todo desbloqueado): créditos de
  // compensación, para que la tirada gratis nunca se quede en nada.
  var fallback = rand(20, 80);
  meta.points += fallback;
  return { type: 'credits', amount: fallback };
}

function triggerRewardMachine(nextScreen) {
  G.reward = { spinning: false, result: null, nextScreen: nextScreen };
  G.screen = 'rewardMachine';
  render();
}

function spinRewardMachine() {
  var r = G.reward;
  if (!r || r.spinning || r.result) return;
  r.spinning = true;
  render();
  setTimeout(function () {
    var meta = G.meta;
    var result = rollRewardMachine();
    saveMeta(meta);
    G.meta = meta;
    r.spinning = false;
    r.result = result;
    render();
  }, REWARD_SPIN_MS);
}

function continueFromRewardMachine() {
  var next = (G.reward && G.reward.nextScreen) || 'menu';
  G.reward = null;
  G.screen = next;
  render();
}

function rewardResultHtml(result) {
  if (result.type === 'character') {
    var p = result.player;
    return (
      '<div class="panel gacha-result mt">' +
        '<p class="center-text" style="color:var(--accent-2);font-weight:700;">' + (result.rare ? '¡FICHAJE DE LUJO!' : '¡Fichaje conseguido!') + '</p>' +
        '<div class="player-card-head" style="justify-content:center;">' +
          avatarHtml(p) +
          '<div class="player-head-text"><span class="player-name">' + escapeHtml(p.nombre) + '</span>' +
          (p.original ? '<span class="player-original">(' + escapeHtml(p.original) + ')</span>' : '') + '</div>' +
          typeBadge(p.tipo) +
        '</div>' +
        '<p class="dim small center-text">' + escapeHtml(p.desc) + '</p>' +
      '</div>'
    );
  }
  if (result.type === 'shield') {
    return (
      '<div class="panel gacha-result mt center-text">' +
        '<p style="color:var(--accent-2);font-weight:700;">¡Nuevo escudo!</p>' +
        '<img class="team-shield-inline" style="width:64px;height:64px" src="' + escapeHtml(teamShieldPath(result.name)) + '" alt="">' +
        '<p class="dim small">' + escapeHtml(result.name) + '. Puedes equipártelo desde Mi Colección.</p>' +
      '</div>'
    );
  }
  return (
    '<div class="panel gacha-result mt center-text">' +
      '<p style="color:var(--accent-2);font-weight:700;">¡Puntos de Espíritu!</p>' +
      '<p class="currency-display">' + spiritIcon() + ' +' + result.amount + '</p>' +
    '</div>'
  );
}

function renderRewardMachine() {
  var r = G.reward || { spinning: false, result: null };
  var resultHtml = '';
  if (r.spinning) {
    resultHtml = '<p class="dim small center-text mt">Girando…</p>';
  } else if (r.result) {
    resultHtml = rewardResultHtml(r.result);
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title mt mb0">¡Tirada gratis!</h2>' +
        '<p class="dim small">Por ganar, te ganas una tirada gratis en la máquina de premios: personaje, escudo o Puntos de Espíritu.</p>' +
      '</div>' +
      '<div class="panel center-text">' +
        gachaMachineHtml(r.spinning) +
        (r.result
          ? '<button class="btn btn-primary btn-block mt" onclick="continueFromRewardMachine()">Continuar</button>'
          : '<button class="btn btn-primary btn-block mt" ' + (r.spinning ? 'disabled' : '') + ' onclick="spinRewardMachine()">' + (r.spinning ? 'Girando…' : 'Girar gratis') + '</button>') +
        resultHtml +
      '</div>' +
    '</div>'
  );
}

