/* ---------------------------------------------------------------------
   9. RENDER: MAPA
   --------------------------------------------------------------------- */

function availableNodeIds() {
  var run = G.run;
  if (!run.currentNodeId) return run.map.rows[0].map(function (n) { return n.id; });
  return run.map.edges[run.currentNodeId] || [];
}

function nodeIconSvg(type) {
  switch (type) {
    case 'partido': return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6 L15 9 L14 13 L10 13 L9 9 Z" fill="currentColor"/></svg>';
    case 'entrenamiento': return '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="4" height="4" fill="currentColor"/><rect x="17" y="10" width="4" height="4" fill="currentColor"/><rect x="7" y="11" width="10" height="2" fill="currentColor"/></svg>';
    case 'fichaje': return '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    case 'descanso': return '<svg viewBox="0 0 24 24"><path d="M5 13a7 7 0 1 0 12.6-6.1A8 8 0 1 1 5 13Z" fill="currentColor"/></svg>';
    case 'evento': return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="6" width="2" height="8" fill="currentColor"/><rect x="11" y="16" width="2" height="2" fill="currentColor"/></svg>';
    case 'jefe': return '<svg viewBox="0 0 24 24"><path d="M4 8 L8 11 L12 5 L16 11 L20 8 L18 17 L6 17 Z" fill="currentColor"/></svg>';
    default: return '';
  }
}

function setSquadView(view) {
  G.squadView = view;
  render();
}

// Vista de campo: coloca a la plantilla por posición real, delanteros
// arriba (ataque) y portero abajo (su propia portería), como una alineación.
// Solo se muestran las filas que tienen algún jugador (con MAX_SQUAD=4 casi
// siempre faltará alguna posición).
function renderSquadPitch(squad) {
  var order = ['Delantero', 'Centrocampista', 'Defensa', 'Portero'];
  var rowsHtml = order.map(function (pos) {
    var players = squad.filter(function (p) { return p.posicion === pos; });
    if (!players.length) return '';
    var itemsHtml = players.map(function (p) {
      return (
        '<div class="pitch-player' + (p.fatigado ? ' fatigued' : '') + '">' +
          avatarHtml(p) +
          '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span>' +
        '</div>'
      );
    }).join('');
    return '<div class="pitch-row">' + itemsHtml + '</div>';
  }).join('');
  return '<div class="pitch">' + rowsHtml + '<div class="pitch-center-line"></div><div class="pitch-center-circle"></div></div>';
}

function renderMap() {
  var run = G.run;
  var avail = availableNodeIds();
  var rowsHtml = run.map.rows.map(function (rowNodes) {
    var nodesHtml = rowNodes.map(function (n) {
      var classes = 'node-btn';
      if (n.type === 'jefe') classes += ' boss';
      var isAvailable = avail.indexOf(n.id) !== -1;
      var isCurrent = run.currentNodeId === n.id;
      if (n.cleared) classes += ' cleared';
      if (isCurrent) classes += ' current';
      if (isAvailable && !n.cleared) classes += ' available';
      var disabled = !isAvailable || n.cleared;
      var attr = disabled ? ' disabled' : ' onclick="enterNode(\'' + n.id + '\')"';
      return (
        '<div class="node-btn-wrap">' +
          '<button class="' + classes + '" data-node="' + n.id + '"' + attr + ' aria-label="' + NODE_LABELS[n.type] + '">' +
            nodeIconSvg(n.type) +
          '</button>' +
          '<span class="node-label">' + NODE_LABELS[n.type] + '</span>' +
        '</div>'
      );
    }).join('');
    return '<div class="map-row">' + nodesHtml + '</div>';
  }).join('');

  return (
    '<div class="screen">' +
      '<div class="panel">' +
        '<h2 class="panel-title mb0">Mapa de la temporada</h2>' +
        '<p class="dim small">Nodos superados: ' + run.clearedCount + ' · Partidos ganados: ' + run.matchesWon + (run.hardMode ? ' · <strong style="color:var(--danger)">Modo Difícil</strong>' : '') + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="panel-title-row">' +
          '<h3>Tu plantilla</h3>' +
          '<div class="view-toggle">' +
            '<button class="btn-tiny' + (G.squadView !== 'lista' ? ' active' : '') + '" onclick="setSquadView(\'campo\')">Campo</button>' +
            '<button class="btn-tiny' + (G.squadView === 'lista' ? ' active' : '') + '" onclick="setSquadView(\'lista\')">Lista</button>' +
          '</div>' +
        '</div>' +
        (G.squadView === 'lista'
          ? '<div class="card-grid">' + run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>'
          : renderSquadPitch(run.squad)) +
      '</div>' +
      '<div class="map-wrap">' +
        '<div class="map-rows" id="mapRows">' + rowsHtml + '<svg class="map-svg" id="mapSvg"></svg></div>' +
      '</div>' +
      '<div class="legend">' +
        '<span>' + nodeIconSvg('partido') + ' Partido</span>' +
        '<span>' + nodeIconSvg('entrenamiento') + ' Entrenamiento</span>' +
        '<span>' + nodeIconSvg('fichaje') + ' Fichaje</span>' +
        '<span>' + nodeIconSvg('descanso') + ' Descanso</span>' +
        '<span>' + nodeIconSvg('evento') + ' Evento Especial</span>' +
        '<span>' + nodeIconSvg('jefe') + ' Jefe</span>' +
      '</div>' +
    '</div>'
  );
}

function drawMapConnections() {
  var wrap = document.getElementById('mapRows');
  var svg = document.getElementById('mapSvg');
  if (!wrap || !svg) return;
  var run = G.run;
  var edges = run.map.edges;
  var traversed = run.traversedEdges || {};
  // Verde SOLO en el tramo que ya andaste de verdad (traversedEdges), nunca
  // en las opciones que podrías elegir a continuación -- eso se pinta en
  // cuanto entras en el nodo, no antes, para no insinuar una elección que
  // todavía no has hecho.
  var rect = wrap.getBoundingClientRect();
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  var lines = '';
  Object.keys(edges).forEach(function (fromId) {
    var fromEl = wrap.querySelector('[data-node="' + fromId + '"]');
    if (!fromEl) return;
    var fr = fromEl.getBoundingClientRect();
    var fx = fr.left - rect.left + fr.width / 2;
    var fy = fr.top - rect.top + fr.height / 2;
    edges[fromId].forEach(function (toId) {
      var toEl = wrap.querySelector('[data-node="' + toId + '"]');
      if (!toEl) return;
      var tr = toEl.getBoundingClientRect();
      var tx = tr.left - rect.left + tr.width / 2;
      var ty = tr.top - rect.top + tr.height / 2;
      var stroke = traversed[fromId + '>' + toId] ? '#2f9e6b' : '#2a3b4a';
      lines += '<line x1="' + fx + '" y1="' + fy + '" x2="' + tx + '" y2="' + ty + '" stroke="' + stroke + '" stroke-width="3" />';
    });
  });
  svg.innerHTML = lines;
}

window.addEventListener('resize', function () {
  if (G.screen === 'map') drawMapConnections();
});

function enterNode(nodeId) {
  var node = findNode(G.run.map, nodeId);
  if (!node || node.cleared) return;
  // Guarda el tramo concreto que se anda (de dónde vienes a dónde vas), no
  // solo que el nodo de origen quedó "superado" -- así el mapa puede pintar
  // el camino real recorrido en vez de adivinarlo por nodos sueltos.
  if (G.run.currentNodeId) {
    G.run.traversedEdges[G.run.currentNodeId + '>' + nodeId] = true;
  }
  G.run.currentNodeId = nodeId;
  switch (node.type) {
    case 'partido': startMatch(nodeId, false); break;
    case 'jefe': startMatch(nodeId, true); break;
    case 'entrenamiento': G.pendingTraining = generateTrainingOptions(); G.screen = 'entrenamiento'; render(); break;
    case 'fichaje': G.pendingRecruits = generateRecruitOptions(); G.screen = 'fichaje'; render(); break;
    case 'descanso': G.screen = 'descanso'; render(); break;
    case 'evento':
      // Solo en Modo Difícil: un evento puede ser en realidad una emboscada
      // de un equipo de jefe (probabilidad baja, no en todos los eventos).
      if (G.run.hardMode && Math.random() < 0.2) {
        startMatch(nodeId, true);
      } else {
        G.pendingEventResult = resolveEventoNode();
        G.screen = 'evento';
        render();
      }
      break;
  }
}

function clearCurrentNode() {
  var node = findNode(G.run.map, G.run.currentNodeId);
  if (node && !node.cleared) { node.cleared = true; G.run.clearedCount++; }
}

function returnToMap() {
  // Supervivencia, Diario y Torneo no usan mapa: cada etapa (entrenamiento,
  // evento) encadena directamente con la siguiente en vez de volver a un mapa.
  if (G.run.mode === 'supervivencia') { advanceSurvivalStage(); return; }
  if (G.run.mode === 'torneo' && G.tournament && G.tournament.pendingRoundAdvance) {
    advanceTournamentPostMatchSequence();
    return;
  }
  if (G.run.mode === 'diario') {
    if (G.run.dailyStep >= DAILY_SEQUENCE.length) {
      G.run.victory = true;
      finishRun();
    } else {
      advanceDailyStage();
    }
    return;
  }
  clearCurrentNode();
  G.screen = 'map';
  render();
}

/* ---------------------------------------------------------------------
   10. ENTRENAMIENTO
   --------------------------------------------------------------------- */

var STAT_KEYS = ['tiro', 'pase', 'defensa', 'especial'];
var STAT_LABELS = { tiro: 'Tiro', pase: 'Regate', defensa: 'Defensa', especial: 'Especial' };

function generateTrainingOptions() {
  var options = [];
  var used = {};
  var guard = 0;
  while (options.length < 3 && guard < 50) {
    guard++;
    var player = choice(G.run.squad);
    var stat = choice(STAT_KEYS);
    var key = player.instanceId + stat;
    if (used[key]) continue;
    used[key] = true;
    options.push({ playerId: player.instanceId, stat: stat, amount: rand(8, 14) });
  }
  return options;
}

function renderTraining() {
  var cards = G.pendingTraining.map(function (opt, i) {
    var player = G.run.squad.find(function (p) { return p.instanceId === opt.playerId; });
    return (
      '<div class="choice-card">' +
        '<h3>' + escapeHtml(player.nombre) + ' ' + typeBadge(player.tipo) + '</h3>' +
        '<p>Mejora permanente: <strong>+' + opt.amount + ' ' + STAT_LABELS[opt.stat] + '</strong> (actual: ' + player[opt.stat] + ')</p>' +
        '<button class="btn btn-primary btn-block" onclick="applyTraining(' + i + ')">Entrenar</button>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">Entrenamiento</h2><p class="dim small">Elige una mejora de estadística para un jugador de tu plantilla.</p></div>' +
      cards +
    '</div>'
  );
}

function applyTraining(index) {
  var opt = G.pendingTraining[index];
  var player = G.run.squad.find(function (p) { return p.instanceId === opt.playerId; });
  applyStatChange(player, opt.stat, opt.amount);
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   11. FICHAJE
   --------------------------------------------------------------------- */

function renderRecruit() {
  var full = G.run.squad.length >= MAX_SQUAD;
  var cards = G.pendingRecruits.map(function (cand, i) {
    var actionsHtml = '<button class="btn btn-primary btn-block" onclick="recruitPlayer(' + i + ', null)">Fichar</button>';
    if (full) {
      actionsHtml = '<p class="dim small">Plantilla completa. Elige a quién sustituir:</p>' +
        '<div class="btn-row">' + G.run.squad.map(function (p) {
          return '<button class="btn btn-danger" onclick="recruitPlayer(' + i + ', \'' + p.instanceId + '\')">Sustituir a ' + escapeHtml(p.nombre) + '</button>';
        }).join('') + '</div>';
    }
    var origHtml = cand.original ? '<span class="player-original">(' + escapeHtml(cand.original) + ')</span>' : '';
    return (
      '<div class="choice-card">' +
        '<div class="player-card-head">' +
          avatarHtml(cand) +
          '<div class="player-head-text"><span class="player-name">' + escapeHtml(cand.nombre) + '</span>' + origHtml + '</div>' +
          typeBadge(cand.tipo) +
        '</div>' +
        statBarsHtml(cand) +
        (cand.hissatsu ? '<div class="hissatsu-tag">' + cand.hissatsu.map(escapeHtml).join(' · ') + '</div>' : '') +
        '<div class="mt">' + actionsHtml + '</div>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">Fichaje</h2><p class="dim small">' + (full ? 'Tu plantilla ya tiene 4 jugadores.' : 'Añade un nuevo jugador real de Inazuma Eleven a tu plantilla (máx. 4).') + '</p></div>' +
      cards +
      '<button class="btn btn-outline btn-block mt" onclick="returnToMap()">Rechazar y continuar</button>' +
    '</div>'
  );
}

function recruitPlayer(index, replaceInstanceId) {
  var cand = G.pendingRecruits[index];
  if (replaceInstanceId) {
    var idx = G.run.squad.findIndex(function (p) { return p.instanceId === replaceInstanceId; });
    if (idx !== -1) G.run.squad[idx] = cand;
  } else if (G.run.squad.length < MAX_SQUAD) {
    G.run.squad.push(cand);
  }
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   12. DESCANSO
   --------------------------------------------------------------------- */

function renderRest() {
  var anyFatigued = G.run.squad.some(function (p) { return p.fatigado; });
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Descanso</h2>' +
        '<p class="dim">Tu equipo recupera fuerzas antes del siguiente reto.</p>' +
        '<div class="card-grid">' + G.run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
        '<button class="btn btn-primary btn-block mt" onclick="applyRest()">' + (anyFatigued ? 'Quitar fatiga y continuar' : 'Continuar') + '</button>' +
      '</div>' +
    '</div>'
  );
}

function applyRest() {
  G.run.squad.forEach(function (p) { p.fatigado = false; });
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   12b. EVENTOS ESPECIALES (nodo nuevo: resultado aleatorio entre 3 opciones)
   --------------------------------------------------------------------- */

function resolveEventoNode() {
  var squad = G.run.squad;
  var roll = rand(1, 10);
  if (roll === 3) {
    var p3 = choice(squad);
    p3.fatigado = true;
    return { type: 'fatiga', text: escapeHtml(p3.nombre) + ' vuelve agotado del evento y queda fatigado (-10 a todo hasta el próximo descanso).' };
  }
  if (roll === 7) {
    squad.forEach(function (p) { applyStatChange(p, 'especial', 10); });
    return { type: 'bonus', text: 'Subís a la Torre Inazuma a entrenar en altura. Todo el equipo sube +10 a Especial (solo esta partida).' };
  }
  if (roll === 8) {
    var stats = ['tiro', 'pase', 'defensa', 'especial'];
    var pSab = choice(squad);
    var statKey = choice(stats);
    applyStatChange(pSab, statKey, -20);
    return { type: 'malus', text: 'Sabotaje del autobús: ' + escapeHtml(pSab.nombre) + ' llega dolorido por el viaje y pierde 20 puntos en ' + STAT_LABELS[statKey] + '.' };
  }
  if (roll === 9) {
    var squadIdsSecret = squad.map(function (x) { return x.id; });
    var secretPool = ROSTER.filter(function (x) { return x.cost === 99999 && squadIdsSecret.indexOf(x.id) === -1; });
    if (secretPool.length === 0) {
      return { type: 'fichaje', text: 'No hay ningún jugador secreto disponible para unirse ahora mismo.' };
    }
    var secretPlayer = rosterInstance(choice(secretPool));
    if (squad.length >= MAX_SQUAD) {
      return { type: 'fichaje-full', text: '¡' + escapeHtml(secretPlayer.nombre) + ' se ofrece a uniros! Un fichaje secreto muy especial, pero tu plantilla ya está completa.', candidate: secretPlayer };
    }
    squad.push(secretPlayer);
    return { type: 'fichaje', text: '¡' + escapeHtml(secretPlayer.nombre) + ' se une a tu plantilla! Un fichaje secreto muy especial.' };
  }
  if (roll === 10) {
    var anyFatigued = squad.some(function (p) { return p.fatigado; });
    if (!anyFatigued) {
      // Si nadie está fatigado, el hospital no aparece: cae a otro evento.
      return resolveEventoNode();
    }
    squad.forEach(function (p) { p.fatigado = false; });
    return { type: 'bonus', text: 'Visitáis el hospital del Raimon. Todo el equipo se cura de la fatiga.' };
  }
  if (roll === 6) {
    squad.forEach(function (p) {
      p.fatigado = false;
      applyStatChange(p, 'tiro', 10);
    });
    return { type: 'bonus', text: 'Un entrenador invitado os da una charla motivadora: se os quita toda la fatiga y todo el equipo sube +10 a Tiro (solo esta partida).' };
  }
  if (roll === 4) {
    squad.forEach(function (p) {
      applyStatChange(p, 'tiro', 5);
      applyStatChange(p, 'pase', 5);
      applyStatChange(p, 'defensa', 5);
      applyStatChange(p, 'especial', 5);
    });
    return { type: 'bonus', text: 'Silvia os ha preparado bolas de arroz. ¡Todo el equipo sube +5 en todos los atributos (solo esta partida)!' };
  }
  if (roll === 5) {
    squad.forEach(function (p) {
      applyStatChange(p, 'tiro', -5);
      applyStatChange(p, 'pase', -5);
      applyStatChange(p, 'defensa', -5);
      applyStatChange(p, 'especial', -5);
    });
    return { type: 'malus', text: 'Sector Quinto os ha cerrado la escuela. Todo el equipo pierde 5 puntos en todas las estadísticas.' };
  }
  if (roll === 1) {
    var p = choice(squad);
    var amount = rand(10, 18);
    applyStatChange(p, 'especial', amount);
    return { type: 'tecnica', text: escapeHtml(p.nombre) + ' aprende una nueva técnica en un entrenamiento especial: +' + amount + ' a Especial.' };
  }
  if (roll === 2) {
    var squadIds = squad.map(function (x) { return x.id; });
    var unlocked = getUnlockedIds();
    var pool = ROSTER.filter(function (x) {
      if (squadIds.indexOf(x.id) !== -1) return false;
      if (x.locked && unlocked.indexOf(x.id) === -1) return false;
      return true;
    });
    if (pool.length === 0) {
      return { type: 'fichaje', text: 'No hay ningún jugador disponible para unirse ahora mismo.' };
    }
    var newPlayer = rosterInstance(choice(pool));
    if (squad.length >= MAX_SQUAD) {
      return { type: 'fichaje-full', text: 'Un jugador prometedor, ' + escapeHtml(newPlayer.nombre) + ', se ofrece a unirse al equipo, pero tu plantilla ya está completa.', candidate: newPlayer };
    }
    squad.push(newPlayer);
    return { type: 'fichaje', text: escapeHtml(newPlayer.nombre) + ' se une a tu plantilla gratis tras el evento.' };
  }
}

function renderEvento() {
  var result = G.pendingEventResult || { text: '' };
  // Si el evento ofrece un fichaje pero la plantilla ya está completa, se
  // deja elegir a quién sustituir (o rechazarlo), igual que en el nodo de
  // Fichaje normal, en vez de perder el jugador automáticamente.
  var actionsHtml = '<button class="btn btn-primary btn-block mt" onclick="applyEvento()">Continuar</button>';
  if (result.type === 'fichaje-full' && result.candidate) {
    actionsHtml =
      '<p class="dim small mt">¿Quieres que se una de todos modos? Elige a quién sustituir:</p>' +
      '<div class="btn-row">' + G.run.squad.map(function (p) {
        return '<button class="btn btn-danger" onclick="eventoRecruitDecide(\'' + p.instanceId + '\')">Sustituir a ' + escapeHtml(p.nombre) + '</button>';
      }).join('') + '</div>' +
      '<button class="btn btn-outline btn-block mt" onclick="eventoRecruitDecide(null)">No, gracias</button>';
  }
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">Evento Especial</h2>' +
        '<p>' + result.text + '</p>' +
        '<div class="card-grid">' + G.run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
        actionsHtml +
      '</div>' +
    '</div>'
  );
}

function eventoRecruitDecide(replaceInstanceId) {
  var result = G.pendingEventResult;
  if (replaceInstanceId && result && result.candidate) {
    var idx = G.run.squad.findIndex(function (p) { return p.instanceId === replaceInstanceId; });
    if (idx !== -1) G.run.squad[idx] = result.candidate;
  }
  applyEvento();
}

function applyEvento() {
  G.run.spiritEarned += SPIRIT_PER_NODE;
  returnToMap();
}

