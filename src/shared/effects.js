// Intèrpret d'efectes JS pur i PARENT-DRIVEN (03-RESEARCH §Pattern 2). Viu al codi
// de confiança del pare, MAI dins de l'iframe (que roman scriptless,
// sandbox="allow-same-origin" sense allow-scripts, T-03-08). SENSE eval/Function:
// els valors dels desplegables són només CLAUS a taules frozen; una clau desconeguda
// és un no-op, mai codi (GAME-06/D-11, T-03-07).
//
// GAME-07/D-19: CADA lookup de DOM és null-guardat. Sobre un doc sense l'element
// (peça HTML no col·locada a la fase anterior) l'efecte és un no-op silenciós: cap
// error de consola, cap bloqueig del panell. Els efectes muten NOMÉS
// style/classList/visibility, mai innerHTML (T-03-11).

import { JS_ELEMENTS, JS_EVENTS } from './robotTemplate.js';

// Consulta segura de propietat pròpia: evita que una clau com 'toString'/'__proto__'
// resolgui a un mètode heretat d'Object.prototype (defensa T-03-07/T-03-10).
const own = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);

// D-16: accions simples. Cada una commuta una classe/estil sobre l'element destí.
// Les classes (.js-rotate/.js-scale) viuen al <style> del srcdoc (client wrapPreview).
export const ACTIONS = Object.freeze({
  'canviar-color': (el) => { el.style.backgroundColor = '#e23b3b'; },
  'amagar-mostrar': (el) => {
    el.style.visibility = el.style.visibility === 'hidden' ? 'visible' : 'hidden';
  },
  girar: (el) => { el.classList.toggle('js-rotate'); },
  'canviar-mida': (el) => { el.classList.toggle('js-scale'); },
});

// D-17: accions compostes (multi-element predefinit; el destí s'ignora). Cada una és
// una llista [{sel, fn}]: per a cada selector, `querySelectorAll(sel).forEach(fn)` →
// una NodeList buida (element absent) és un no-op natural (GAME-07). Les classes
// commutades (.js-squint/.js-boca-tanca/.js-vermell/.js-scale/.js-rotate) existeixen
// al <style> del srcdoc.
export const COMPOSITES = Object.freeze({
  'acluca-tanca': Object.freeze([
    Object.freeze({ sel: '.ull', fn: (el) => el.classList.toggle('js-squint') }),
    Object.freeze({ sel: '#boca', fn: (el) => el.classList.toggle('js-boca-tanca') }),
  ]),
  'ulls-vermells-orelles-grosses': Object.freeze([
    Object.freeze({ sel: '.ull', fn: (el) => el.classList.toggle('js-vermell') }),
    Object.freeze({ sel: '.orella', fn: (el) => el.classList.toggle('js-scale') }),
  ]),
  'cap-gira-antena-creix': Object.freeze([
    Object.freeze({ sel: '#robot-cap', fn: (el) => el.classList.toggle('js-rotate') }),
    Object.freeze({ sel: '.antena', fn: (el) => el.classList.toggle('js-scale') }),
  ]),
});

// Aplica l'efecte d'una regla sobre `doc` (el contentDocument de l'iframe, o un stub
// de test). Composta → itera cada selector (NodeList buida = no-op). Simple → resol
// el destí i aplica l'acció NOMÉS si tots dos existeixen (destí absent o acció
// desconeguda = no-op silenciós, GAME-07/D-19).
export function applyAction(doc, rule) {
  if (!rule) return;
  if (own(COMPOSITES, rule.accio)) {
    COMPOSITES[rule.accio].forEach(({ sel, fn }) => doc.querySelectorAll(sel).forEach(fn));
    return;
  }
  if (!own(JS_ELEMENTS, rule.desti) || !own(ACTIONS, rule.accio)) return;
  const target = doc.querySelector(JS_ELEMENTS[rule.desti]);
  if (target) ACTIONS[rule.accio](target);
}

// Registra el listener d'una regla sobre l'element ORIGEN de `doc`. Si l'origen és
// absent (peça no col·locada) o l'event és desconegut → no-op sense listener
// (GAME-07/D-19). Rebuild-then-reattach (Pitfall 3): el pare reconstrueix el srcdoc
// UNA vegada i torna a cridar attachRule per a cada regla, així mai s'acumulen
// listeners obsolets.
export function attachRule(doc, rule) {
  if (!rule || !own(JS_ELEMENTS, rule.origen) || !own(JS_EVENTS, rule.event)) return;
  const origin = doc.querySelector(JS_ELEMENTS[rule.origen]);
  if (!origin) return;
  origin.addEventListener(JS_EVENTS[rule.event], () => applyAction(doc, rule));
}
