// Phase headings top-down beside the scene. set(key) highlights one and marks earlier ones done; set('done') completes all.
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
    set(active) {
      const index = steps.findIndex(s => s.key === active), done = active === 'done' ? steps.length : index;
      rows.forEach(({ item, head }, i) => {
        item.classList.toggle('active', i === index); item.classList.toggle('done', i < done);
        if (i === index) head.setAttribute('aria-current', 'step'); else head.removeAttribute('aria-current');
      });
    }
  };
}
