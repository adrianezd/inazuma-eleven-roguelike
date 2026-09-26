/* ---------------------------------------------------------------------
   PLEGABLES AUTOMÁTICOS: cualquier panel que empiece por un título (h3) y
   tenga contenido suficiente se convierte en un desplegable con la misma
   estética que Entrenadores y Ofertas recibidas (flecha circular). Se aplica
   tras cada render, solo en pantallas seguras (no en partidos en vivo). El
   estado abierto/cerrado se guarda en G.autoFolds y se recuerda al volver.
   Los paneles con data-nofold, los que ya son plegables y los de partido no
   se tocan.
   --------------------------------------------------------------------- */
var AUTOFOLD_SKIP_SCREENS = ['futdraftLive', 'futdraftPenalty', 'match', 'penaltyMode', 'penalty', 'combat', 'futdraftVsLive', 'map', 'futdraftMatchResult'];
var AUTOFOLD_MIN_CHILDREN = 2;

function autoFoldArrowStyle(open) {
  return 'width:34px;height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid ' +
    (open ? '#ffb020' : 'rgba(255,255,255,0.22)') + ';background:' + (open ? 'rgba(255,176,32,0.18)' : 'rgba(255,255,255,0.06)') +
    ';color:#ffb020;transition:transform 0.25s ease;transform:rotate(' + (open ? '0' : '-90') + 'deg)';
}
window.autoFoldToggle = function (head) {
  var key = head.getAttribute('data-fold-key');
  var body = head.nextElementSibling;
  var open = head.getAttribute('aria-expanded') !== 'true';
  head.setAttribute('aria-expanded', String(open));
  body.style.display = open ? '' : 'none';
  head.querySelector('.autofold-arrow').setAttribute('style', autoFoldArrowStyle(open));
  var sub = head.querySelector('.autofold-sub');
  if (sub) sub.style.display = open ? 'none' : '';
  G.autoFolds = G.autoFolds || {};
  G.autoFolds[key] = open;
};
// Secciones del menú principal (título + rejilla): mismo desplegable, Próximamente cerrada por defecto.
function autoFoldMenuSections(root) {
  var titles = root.querySelectorAll('.menu-section-title');
  for (var i = 0; i < titles.length; i++) {
    var tt = titles[i], grid = tt.nextElementSibling;
    if (!grid || !grid.classList.contains('menu-grid') || tt.hasAttribute('data-folded')) continue;
    var title = tt.textContent.trim();
    var key = 'menu|' + title;
    var open = G.autoFolds[key] !== undefined ? G.autoFolds[key] !== false : title !== 'Próximamente';
    var head = document.createElement('div');
    head.setAttribute('role', 'button'); head.setAttribute('tabindex', '0'); head.setAttribute('aria-expanded', String(open));
    head.setAttribute('data-fold-key', key); head.setAttribute('onclick', 'autoFoldToggle(this)');
    head.setAttribute('style', 'display:flex;align-items:center;gap:12px;width:100%;min-height:44px;margin:14px 0 6px;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none');
    head.innerHTML = '<div style="flex:1 1 auto;font-family:Oswald,sans-serif;font-size:1.1rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-dim)">' + title + '<div class="autofold-sub" style="font-size:0.72rem;opacity:0.65;text-transform:none;letter-spacing:0;' + (open ? 'display:none' : '') + '">Toca para ver</div></div>' +
      '<div class="autofold-arrow" aria-hidden="true" style="' + autoFoldArrowStyle(open) + '"><svg viewBox="0 0 24 24" width="18" height="18" style="display:block"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
    tt.parentNode.insertBefore(head, tt);
    tt.parentNode.removeChild(tt);
    if (!open) grid.style.display = 'none';
  }
}
function autoFoldPanels(root) {
  if (!root || AUTOFOLD_SKIP_SCREENS.indexOf(G.screen) !== -1) return;
  G.autoFolds = G.autoFolds || {};
  if (G.screen === 'menu') autoFoldMenuSections(root);
  var panels = root.querySelectorAll('.panel');
  for (var i = 0; i < panels.length; i++) {
    var p = panels[i];
    if (p.hasAttribute('data-nofold') || p.closest('[data-nofold]')) continue;
    if (p.querySelector(':scope > [aria-expanded]')) continue;
    if (p.className.indexOf('matchup') !== -1 || p.className.indexOf('recap') !== -1 || p.className.indexOf('tie-') !== -1) continue;
    var h = p.firstElementChild;
    if (!h || h.tagName !== 'H3') continue;
    if (p.children.length < AUTOFOLD_MIN_CHILDREN) continue;
    var title = h.textContent.trim();
    if (!title) continue;
    var key = G.screen + '|' + title;
    var open = G.autoFolds[key] !== false;
    var head = document.createElement('div');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', String(open));
    head.setAttribute('data-fold-key', key);
    head.setAttribute('onclick', 'autoFoldToggle(this)');
    head.setAttribute('style', 'display:flex;align-items:center;gap:12px;width:100%;min-height:44px;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none');
    var text = document.createElement('div');
    text.setAttribute('style', 'flex:1 1 auto;min-width:0');
    var t = document.createElement('div');
    t.setAttribute('style', 'font-family:Oswald,sans-serif;font-size:1.15rem;line-height:1.2');
    t.textContent = title;
    var sub = document.createElement('div');
    sub.className = 'autofold-sub';
    sub.setAttribute('style', 'font-size:0.75rem;opacity:0.65;margin-top:2px;' + (open ? 'display:none' : ''));
    sub.textContent = 'Toca para ver';
    text.appendChild(t); text.appendChild(sub);
    var arrow = document.createElement('div');
    arrow.className = 'autofold-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('style', autoFoldArrowStyle(open));
    arrow.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" style="display:block"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    head.appendChild(text); head.appendChild(arrow);
    var body = document.createElement('div');
    body.style.marginTop = '4px';
    if (!open) body.style.display = 'none';
    p.removeChild(h);
    while (p.firstChild) body.appendChild(p.firstChild);
    p.appendChild(head);
    p.appendChild(body);
  }
}
