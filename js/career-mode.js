/* ---------------------------------------------------------------------
   MODO CARRERA: todavía no es jugable (liga + Champions + copa, fichajes,
   cesiones y ventas con 16 equipos -- ver ideas sueltas). De momento esta
   pantalla solo enseña el equipo base con el que arrancará, fijado por el
   usuario, resuelto a sus entradas reales del roster, con un botón
   "Próximamente" en vez de un modo jugable.
   --------------------------------------------------------------------- */

// 11 titulares + 5 suplentes elegidos por el usuario. La distribución de
// posiciones de los 11 titulares (4 Delantero, 2 Centrocampista, 4
// Defensa, 1 Portero) coincide exactamente con la formación '424' de
// FUTDRAFT_FORMATIONS, así que se reutiliza tal cual para pintar el campo
// con renderFutDraftPitch sin tener que inventar una formación nueva.
var CAREER_MODE_STARTER_IDS = ['r41', 'r170', 'r67', 'r264', 'r267', 'r263', 'r268', 'r269', 'r265', 'r266', 'r57'];
var CAREER_MODE_BENCH_IDS = ['r83', 'r96', 'r88', 'r66', 'r81'];
var CAREER_MODE_FORMATION = '424';

function careerModeRoster(ids) {
  return ids.map(function (id) { return ROSTER.find(function (p) { return p.id === id; }); }).filter(Boolean);
}

function actionGoCareerMode() { G.screen = 'careerMode'; render(); }

function renderCareerMode() {
  var starters = careerModeRoster(CAREER_MODE_STARTER_IDS);
  var bench = careerModeRoster(CAREER_MODE_BENCH_IDS);
  var benchHtml = bench.map(function (p) {
    return '<div class="pitch-player">' + pitchMediaBadgeHtml(p) + pitchAffinityBadgeHtml(p) + avatarHtml(p) + '<span class="pitch-player-name">' + escapeHtml(p.nombre) + '</span></div>';
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<button class="btn btn-outline btn-block" onclick="actionGoOtrosModos()">Volver</button>' +
        '<h2 class="panel-title mt mb0">Modo Carrera</h2>' +
        '<p class="dim small">Liga, Champions y Copa con 16 equipos, fichajes, cesiones y ventas. Todavía en construcción -- este es el equipo base con el que arrancará.</p>' +
      '</div>' +
      '<div class="panel">' +
        renderFutDraftPitch(starters, CAREER_MODE_FORMATION, false) +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:4px">Banquillo</h3>' +
        '<div class="pitch-row" style="justify-content:center">' + benchHtml + '</div>' +
      '</div>' +
      '<button class="btn btn-outline btn-block" disabled style="opacity:0.5;cursor:not-allowed;">Próximamente</button>' +
    '</div>'
  );
}
