/**
 * One shared tooltip for every server-rendered chart. Marks carry data-tip="value|label" (value
 * first, label second) and tabindex so keyboard focus shows the same readout as hover.
 * Text goes in with textContent only: labels come from data feeds.
 */
const tip = document.createElement('div');
tip.className = 'h22-tooltip';
tip.setAttribute('role', 'status');
tip.hidden = true;
const strong = document.createElement('strong');
const span = document.createElement('span');
tip.append(strong, span);
document.body.append(tip);

function show(el: Element, x: number, y: number) {
  const [value = '', label = ''] = (el.getAttribute('data-tip') ?? '').split('|');
  strong.textContent = value;
  span.textContent = label;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 12));
  const top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
  tip.style.transform = `translate(${left}px, ${top}px)`;
}
const hide = () => { tip.hidden = true; };
const target = (e: Event) => (e.target instanceof Element ? e.target.closest('[data-tip]') : null);

document.addEventListener('pointermove', (e) => {
  const el = target(e);
  if (el) show(el, e.clientX, e.clientY); else hide();
});
document.addEventListener('focusin', (e) => {
  const el = target(e);
  if (!el) return hide();
  const r = el.getBoundingClientRect();
  show(el, r.left + r.width / 2, r.top);
});
document.addEventListener('focusout', hide);
document.addEventListener('scroll', hide, { passive: true });
