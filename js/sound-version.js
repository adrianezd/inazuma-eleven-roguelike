/* ---------------------------------------------------------------------
   17. SONIDOS, VERSIÓN/PARCHES Y AUTOGUARDADO DE MODO CARRERA
   A petición explícita: sonido de gol y de inicio de partido (sintetizados
   con Web Audio, sin depender de ningún archivo externo), un aviso de
   "Parches" que se enseña al cargar la página con lo último que se ha
   metido (se guarda la última versión vista en localStorage para no
   repetirlo cada vez), y el autoguardado de Modo Carrera (cada 3
   minutos, solo si está activado en Configuración).
   --------------------------------------------------------------------- */

// Sube este número (y añade una entrada arriba de APP_PATCH_NOTES) cada
// vez que se publique una ronda de cambios que merezca avisarse.
var APP_VERSION = '1.1.0';
var APP_PATCH_NOTES = [
  {
    version: '1.1.0',
    items: [
      'Entrenadores: cada uno con equipo, ataque, defensa, intensidad y estilo. Se eligen en FutDraft, Liga y FutDraft 2 jugadores; en Modo Mundial es Hillman con el Raimon; en Modo Carrera te toca uno al azar y puedes fichar otros en el mercado.',
      'Pestaña Táctica en todos los modos: estilo de juego, estilo físico e intensidad. Pulsa al entrenador en el campo para abrirla.',
      'Modo Carrera: 5 huecos de guardado, resumen de temporada con campeón, trofeos, mejor jugador, revelación y balance económico, y récords del club.',
      'Los penaltis se ven lanzamiento a lanzamiento en Carrera y Modo Mundial, también en la Supercopa.',
      'Copa de 64 equipos, goleadores de Copa y Champions, y directiva rediseñada.',
      'App instalable: añade el juego a la pantalla de inicio (iPhone: compartir, Añadir a pantalla de inicio) y funciona sin conexión tras la primera visita.',
      'Carrera: pestaña Noticias en Club con los fichajes de otros clubes. Puntitos más vivos: se mueven todos menos los porteros, y de visitante juegas a la derecha.',
      'Confeti y destello al marcar y al ganar trofeos.',
      'Carrera: cansancio y entrenadores opcionales (al crear la partida y en Ajustes); lesiones y rojas se ven con un icono en el campo, el banquillo y la plantilla; más paneles plegables con flecha.',
      'Partido: los jugadores mantienen la formación, la posesión depende de la fuerza de los equipos y se ven dos goles seguidos.',
      'Modo Mundial: elige Temporada 1 o Temporada 2 (Academia Alius, de Tormenta de Géminis a Genesis), con draft al ganar cada partido.',
      'Modo Carrera: plantilla a mano, eligiendo tú los 16 jugadores (con tope de media). Modo Mundial: Temporada 3 con los rivales del torneo mundial.',
      'Mi perfil en el menú: partidos, victorias, goles y títulos de todos los modos.',
      'Menú: botón Continuar carrera con el resumen de tu club, y botón Novedades.',
      'Champions: cruces de ida y vuelta rediseñados con casillas de cada partido y el global.',
      'Cansancio en Modo Carrera: los titulares se cansan cada jornada y bajan de media; rota a los cansados con un botón.',
      'Animaciones suaves al cambiar de pantalla y al marcar, y ajustes para móvil.'
    ]
  },
  {
    version: '1.0.1',
    items: [
      'Nuevo apartado Configuración en Modo Carrera: autoguardado cada 3 minutos.',
      'Modo Carrera: 3 formas de vivir un partido — Jugar (puntos en directo con los dorsales), Simular y Saltar.',
      'Sonido de gol y de inicio de partido.',
      'FutDraft 2 jugadores: prórroga, penaltis y elección de capitán.',
      'Modo Jugador: eventos con decisiones, selección nacional e historial de premios.'
    ]
  },
  {
    version: '1.0.0',
    items: ['Primera versión con número de versión visible.']
  }
];

// ===== Sonidos (Web Audio, sin archivos) =====
var _audioCtx = null;
function soundCtx() {
  if (typeof window === 'undefined') return null;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_audioCtx) { try { _audioCtx = new AC(); } catch (e) { return null; } }
  if (_audioCtx.state === 'suspended') { try { _audioCtx.resume(); } catch (e) {} }
  return _audioCtx;
}
function soundEnabled() { return !G.meta || G.meta.soundEnabled !== false; }
// Nota corta con envolvente simple (ataque rápido, caída exponencial).
function playTone(freq, startAt, duration, type, gain) {
  var ctx = soundCtx();
  if (!ctx) return;
  var osc = ctx.createOscillator();
  var g = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  var t0 = ctx.currentTime + (startAt || 0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.2, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + duration + 0.05);
}
// Fanfarria ascendente de 4 notas -- el "sonido de gol".
window.playGoalSound = function () {
  if (!soundEnabled()) return;
  [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { playTone(f, i * 0.09, 0.35, 'triangle', 0.22); });
};
// Silbato descendente corto -- el "sonido de inicio de partido".
window.playKickoffSound = function () {
  if (!soundEnabled()) return;
  var ctx = soundCtx();
  if (!ctx) return;
  var osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = 'square';
  var t0 = ctx.currentTime;
  osc.frequency.setValueAtTime(1800, t0);
  osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.35);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + 0.45);
};
window.actionToggleSound = function () {
  G.meta.soundEnabled = !soundEnabled();
  saveMeta(G.meta);
  if (G.meta.soundEnabled) playKickoffSound();
  render();
};

// ===== Aviso de "Parches" al cargar =====
window.actionOpenPatchNotes = function () { G.showPatchNotes = true; render(); };
function renderPatchNotesModal() {
  var latest = APP_PATCH_NOTES[0];
  var older = APP_PATCH_NOTES.slice(1, 3).map(function (n) {
    return '<p class="dim small" style="margin:8px 0 2px"><strong>Versión ' + escapeHtml(n.version) + '</strong></p><ul class="dim small" style="text-align:left;padding-left:18px;margin:0">' + n.items.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') + '</ul>';
  }).join('');
  return '<div class="modal-overlay" onclick="actionDismissPatchNotes()">' +
    '<div class="jugador-trophy-card" data-nofx="1" onclick="event.stopPropagation()" style="max-width:340px;max-height:80vh;overflow-y:auto">' +
      '<div class="jugador-trophy-icon">📣</div>' +
      '<h3 style="margin-bottom:4px">Versión ' + escapeHtml(APP_VERSION) + '</h3>' +
      '<p class="dim small" style="margin-bottom:6px">Parches y novedades:</p>' +
      '<ul class="dim small" style="text-align:left;padding-left:18px;margin:0 0 8px">' +
        latest.items.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') +
      '</ul>' + older +
      '<button class="btn btn-primary btn-block mt" onclick="actionDismissPatchNotes()">Aceptar</button>' +
    '</div>' +
  '</div>';
}
window.actionDismissPatchNotes = function () {
  G.showPatchNotes = false;
  G.meta.lastSeenVersion = APP_VERSION;
  saveMeta(G.meta);
  render();
};

// ===== Autoguardado de Modo Carrera =====
// Cada 3 minutos, si está activado en Configuración (c.autosave, se
// serializa con la partida) y hay una partida de Carrera con hueco
// activo, la guarda sola en su hueco -- sin sustituir al botón
// "Guardar" manual, que sigue funcionando igual.
var CAREER_AUTOSAVE_MS = 3 * 60 * 1000;
window.actionToggleCareerAutosave = function () {
  var c = G.career;
  if (!c) return;
  c.autosave = !c.autosave;
  render();
};
setInterval(function () {
  var c = G.career;
  if (c && c.autosave && G.careerActiveSlot && !c.fired) {
    var ok = saveCareerToSlot(G.careerActiveSlot);
    if (ok) { c.autosaveMessage = 'Autoguardado a las ' + new Date().toLocaleTimeString(); if (G.screen === 'careerMode' && c.tab === 'configuracion') render(); }
  }
}, CAREER_AUTOSAVE_MS);
