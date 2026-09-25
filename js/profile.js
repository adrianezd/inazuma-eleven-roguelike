/* ---------------------------------------------------------------------
   PERFIL: estadísticas globales de todos los modos (partidos, goles y
   títulos), guardadas en G.meta.profile. Se anotan automáticamente al ver
   el resultado de un partido (hook en render, ver profileHook) y en los
   partidos de Carrera que se "saltan" (profileRecord).
   --------------------------------------------------------------------- */
var PROFILE_MODES = [
  { id: 'carrera', name: 'Modo Carrera' },
  { id: 'futdraft', name: 'FutDraft' },
  { id: 'liga', name: 'Liga' },
  { id: 'mundial', name: 'Modo Mundial' }
];
function profileData() {
  var m = G.meta;
  if (!m.profile) m.profile = { modes: {}, titles: {} };
  if (!m.profile.modes) m.profile.modes = {};
  if (!m.profile.titles) m.profile.titles = {};
  return m.profile;
}
function profileModeStats(mode) {
  var p = profileData();
  if (!p.modes[mode]) p.modes[mode] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
  return p.modes[mode];
}
function profileRecord(mode, myGoals, oppGoals, playerWon) {
  var s = profileModeStats(mode);
  s.played++;
  s.gf += myGoals; s.ga += oppGoals;
  var won = myGoals > oppGoals || (myGoals === oppGoals && playerWon === true);
  var lost = myGoals < oppGoals || (myGoals === oppGoals && playerWon === false);
  if (won) s.won++; else if (lost) s.lost++; else s.drawn++;
  saveMeta(G.meta);
}
function profileTitle(kind) {
  var p = profileData();
  p.titles[kind] = (p.titles[kind] || 0) + 1;
  saveMeta(G.meta);
}
// Llamado desde render(): anota el resultado mostrado (una sola vez por resultado).
function profileHook() {
  try {
    if (G.screen === 'futdraftMatchResult' && G.futdraft && G.futdraft.lastMatchResult) {
      var lm = G.futdraft.lastMatchResult;
      if (lm._profileDone) return;
      lm._profileDone = true;
      var mode = lm.isCareer ? 'carrera' : (lm.isLiga ? 'liga' : (lm.isWorldTour ? 'mundial' : 'futdraft'));
      var tiedNoPen = lm.myGoals === lm.oppGoals && lm.isCareer && !lm.penalty;
      profileRecord(mode, lm.myGoals, lm.oppGoals, tiedNoPen ? null : lm.playerWon);
    }
  } catch (e) {}
}
var PROFILE_TITLE_NAMES = { liga: 'Ligas', copa: 'Copas del Rey', champions: 'Champions League', supercopa: 'Supercopas', mundial: 'Modo Mundial' };
window.actionGoProfile = function () { G.screen = 'perfil'; render(); };
function renderProfile() {
  var p = profileData();
  var total = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
  PROFILE_MODES.forEach(function (md) {
    var s = profileModeStats(md.id);
    Object.keys(total).forEach(function (k) { total[k] += s[k]; });
  });
  function cell(label, value) { return '<div class="recap-cell"><span>' + label + '</span><strong>' + value + '</strong></div>'; }
  var pct = total.played ? Math.round(total.won / total.played * 100) : 0;
  var modeRows = PROFILE_MODES.map(function (md) {
    var s = profileModeStats(md.id);
    return '<div class="record-row"><span>' + md.name + '</span><strong>' + s.played + ' partidos, ' + s.won + 'V ' + s.drawn + 'E ' + s.lost + 'D, ' + s.gf + '-' + s.ga + '</strong></div>';
  }).join('');
  var titleKeys = Object.keys(PROFILE_TITLE_NAMES);
  var totalTitles = titleKeys.reduce(function (sum, k) { return sum + (p.titles[k] || 0); }, 0);
  var titleRows = titleKeys.map(function (k) { return '<div class="record-row"><span>' + PROFILE_TITLE_NAMES[k] + '</span><strong>' + (p.titles[k] || 0) + '</strong></div>'; }).join('');
  return '<div class="screen">' +
    '<div class="panel center-text"><button class="btn btn-outline btn-block" onclick="actionBackToMenu()">Volver</button><h2 class="panel-title mt mb0">Mi perfil</h2><p class="dim small">Estadísticas de todos los modos.</p></div>' +
    '<div class="panel recap-card"><div class="recap-title">Resumen global</div><div class="recap-grid">' +
      cell('Partidos', total.played) + cell('Victorias', total.won + ' (' + pct + '%)') + cell('Goles a favor', total.gf) + cell('Goles en contra', total.ga) + cell('Títulos', totalTitles) +
    '</div></div>' +
    '<div class="panel"><h3 style="margin-bottom:8px">Por modo</h3>' + modeRows + '</div>' +
    '<div class="panel"><h3 style="margin-bottom:8px">Títulos</h3>' + titleRows + '</div>' +
  '</div>';
}
