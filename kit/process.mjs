// A vertical outline of the process beside the scene: steps top-down, the active step and part highlighted.
// steps: [{ key, title, detail, parts: [{ key, title }] }]. set(stepKey, partKey) marks earlier steps done;
// set('done') completes them all. onJump(stepKey), when given, makes each step a button.
export function processOutline(root, steps, { onJump } = {}) {
  const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
  const list = make('ol', 'process-steps'), rows = [];
  steps.forEach((step, i) => {
    const item = make('li', 'process-step'), head = make(onJump ? 'button' : 'div', 'process-head');
    if (onJump) { head.type = 'button'; head.addEventListener('click', () => onJump(step.key)); }
    head.append(make('span', 'process-number', String(i + 1)), make('span', 'process-title', step.title));
    item.append(head);
    if (step.detail) item.append(make('p', 'process-detail', step.detail));
    const parts = (step.parts ?? []).map(part => make('li', 'process-part', part.title));
    if (parts.length) { const sub = make('ol', 'process-parts'); sub.append(...parts); item.append(sub); }
    rows.push({ step, item, head, parts }); list.append(item);
  });
  root.replaceChildren(list);
  return {
    set(active, part) {
      const index = steps.findIndex(s => s.key === active), done = active === 'done' ? steps.length : index;
      rows.forEach(({ step, item, head, parts }, i) => {
        item.classList.toggle('active', i === index); item.classList.toggle('done', i < done);
        if (i === index) head.setAttribute('aria-current', 'step'); else head.removeAttribute('aria-current');
        parts.forEach((p, j) => p.classList.toggle('active', i === index && step.parts[j].key === part));
      });
    }
  };
}
