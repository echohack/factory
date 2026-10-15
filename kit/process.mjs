export function processOutline(root, steps, { onJump } = {}) {
  const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
  const list = make('ol', 'process-steps');
  const rows = steps.map((step, i) => {
    const item = make('li', 'process-step'), head = make(onJump ? 'button' : 'div', 'process-head');
    if (onJump) { head.type = 'button'; head.addEventListener('click', () => onJump(step.key)); }
    head.append(make('span', 'process-number', String(i + 1)), make('span', 'process-title', step.title));
    item.append(head); list.append(item);
    return { item, head };
  });
  root.replaceChildren(list);
  return {
    set(active, { done } = {}) {
      const keys = [].concat(active), first = Math.min(...keys.map(k => steps.findIndex(s => s.key === k)).filter(i => i >= 0));
      rows.forEach(({ item, head }, i) => {
        const on = keys.includes(steps[i].key), finished = done ? done.includes(steps[i].key) : active === 'done' || i < first;
        item.classList.toggle('active', on); item.classList.toggle('done', !on && finished);
        if (on) head.setAttribute('aria-current', 'step'); else head.removeAttribute('aria-current');
      });
    }
  };
}
