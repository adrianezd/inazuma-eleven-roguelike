/* ---------------------------------------------------------------------
   16. INICIALIZACIÓN
   --------------------------------------------------------------------- */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    appEl = document.getElementById('app');
    // Enlace compartido de Modo Jugador (?jugador=...), a petición
    // explícita -- ver playerModeEncodeShare/renderJugadorShared.
    try {
      var params = new URLSearchParams(location.search);
      var shared = params.get('jugador');
      if (shared) {
        var decoded = playerModeDecodeShare(shared);
        if (decoded) { G.jugadorSharedSummary = decoded; G.screen = 'jugadorShared'; }
      }
    } catch (e) {}
    render();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    typeAdvantage: typeAdvantage,
    generateOpponentSquad: generateOpponentSquad,
    generateMap: generateMap,
    bossBonusRange: bossBonusRange,
    ROSTER: ROSTER,
    TYPES: TYPES,
    CYCLE: CYCLE
  };
}
