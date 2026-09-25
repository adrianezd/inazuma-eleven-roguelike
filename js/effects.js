/* ---------------------------------------------------------------------
   EFECTOS: confeti y destello para goles y trofeos (solo DOM y CSS, sin
   librerías). fxConfetti('big') para títulos, fxConfetti('small') para
   tus goles. Respeta "reducir movimiento".
   --------------------------------------------------------------------- */
var FX_COLORS = ['#ffb020', '#ff4d4d', '#3aa0ff', '#3ddc84', '#ffffff', '#c77dff'];
function fxReducedMotion() {
  try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
function fxConfetti(size) {
  if (fxReducedMotion() || typeof document === 'undefined') return;
  var big = size === 'big';
  var count = big ? 90 : 28;
  var layer = document.createElement('div');
  layer.className = 'fx-layer';
  for (var i = 0; i < count; i++) {
    var p = document.createElement('span');
    p.className = 'fx-piece';
    var startX = big ? Math.random() * 100 : 35 + Math.random() * 30;
    p.style.left = startX + '%';
    p.style.top = big ? '-8%' : '35%';
    p.style.background = FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)];
    p.style.setProperty('--dx', ((Math.random() - 0.5) * (big ? 240 : 320)) + 'px');
    p.style.setProperty('--dy', (big ? 100 + Math.random() * 40 : 20 + Math.random() * 45) + 'vh');
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    p.style.animationDuration = (big ? 2.2 + Math.random() * 1.6 : 1.1 + Math.random() * 0.8) + 's';
    p.style.animationDelay = (Math.random() * (big ? 0.5 : 0.15)) + 's';
    if (Math.random() < 0.4) p.style.borderRadius = '50%';
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, big ? 4500 : 2500);
}
function fxGoalFlash() {
  if (fxReducedMotion() || typeof document === 'undefined') return;
  var f = document.createElement('div');
  f.className = 'fx-goal-flash';
  document.body.appendChild(f);
  setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 700);
  fxConfetti('small');
}
