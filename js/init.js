/* ---------------------------------------------------------------------
   16. INICIALIZACIÓN
   --------------------------------------------------------------------- */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    appEl = document.getElementById('app');
    // Enlaces compartidos (?jugador=/?futdraftSquad=/?futdraftResult=),
    // a petición explícita -- ver encodeShareParam/decodeShareParam en
    // core.js y cada render*Shared* correspondiente. Solo puede haber
    // uno a la vez en la URL, se comprueban en orden.
    try {
      var params = new URLSearchParams(location.search);
      var sharedJugador = params.get('jugador');
      var sharedSquad = params.get('futdraftSquad');
      var sharedResult = params.get('futdraftResult');
      if (sharedJugador) {
        var decodedJugador = playerModeDecodeShare(sharedJugador);
        if (decodedJugador) { G.jugadorSharedSummary = decodedJugador; G.screen = 'jugadorShared'; }
      } else if (sharedSquad) {
        var decodedSquad = decodeShareParam(sharedSquad);
        if (decodedSquad) { G.futdraftSharedSquad = decodedSquad; G.screen = 'futdraftSharedSquad'; }
      } else if (sharedResult) {
        var decodedResult = decodeShareParam(sharedResult);
        if (decodedResult) { G.futdraftSharedResult = decodedResult; G.screen = 'futdraftSharedResult'; }
      }
    } catch (e) {}
    // Aviso de "Parches": se enseña si la última versión vista (guardada en
    // meta) no coincide con la actual, ver js/sound-version.js.
    try { if (G.meta && G.meta.lastSeenVersion !== APP_VERSION) G.showPatchNotes = true; } catch (e) {}
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
