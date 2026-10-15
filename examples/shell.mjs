const $ = id => document.getElementById(id);
const frame = $('frame'), search = $('search'), status = $('status');
let figures = [], current = null;

$('shortcut').textContent = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K';

function link(figure) {
  const item = document.createElement('li'), a = document.createElement('a'), label = document.createElement('span');
  a.className = 'menu-link'; a.href = `#${figure.name}`; a.dataset.name = figure.name; a.title = figure.title;
  let icon;
  if (figure.icon) { icon = new Image(); icon.src = `./icons/${figure.icon}`; icon.alt = ''; }
  else { icon = document.createElement('span'); icon.classList.add('menu-mono'); icon.textContent = figure.title.slice(0, 1).toUpperCase(); icon.setAttribute('aria-hidden', 'true'); }
  icon.classList.add('menu-icon');
  label.className = 'menu-label'; label.textContent = figure.title;
  a.append(icon, label); item.append(a);
  return item;
}

function mark() {
  for (const a of document.querySelectorAll('.menu a[data-name]')) {
    if (a.dataset.name === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

function render() {
  const query = search.value.trim().toLowerCase();
  const shown = figures.filter(figure => !query || `${figure.title} ${figure.name}`.toLowerCase().includes(query));
  const diagrams = shown.filter(figure => !figure.library), library = shown.filter(figure => figure.library);
  $('diagrams').replaceChildren(...diagrams.map(link));
  $('library').replaceChildren(...library.map(link));
  $('rule').hidden = !diagrams.length || !library.length;
  $('no-match').hidden = shown.length > 0 || !figures.length;
  mark();
}

function framed() {
  try {
    const parts = frame.contentWindow.location.pathname.split('/');
    return figures.find(figure => parts.includes(figure.name))?.name ?? null;
  } catch { return null; }
}

function select(name) {
  const figure = figures.find(entry => entry.name === name);
  if (!figure) return;
  current = figure.name;
  document.title = `${figure.title} · Factory`;
  frame.title = figure.title;
  $('open').href = `./${figure.name}/`;
  if (location.hash !== `#${figure.name}`) history.replaceState(null, '', `#${figure.name}`);
  mark();
}

function show(name) {
  const figure = figures.find(entry => entry.name === name) ?? figures.find(entry => !entry.library) ?? figures[0];
  status.hidden = !!figure;
  if (!figure) { status.textContent = 'No diagrams yet. Ask /factory to explain a program, and it appears here.'; frame.removeAttribute('src'); return; }
  if (framed() !== figure.name) frame.src = `./${figure.name}/`;
  select(figure.name);
}

async function load() {
  const response = await fetch('./figures.json', { cache: 'no-store' });
  if (!response.ok) throw new Error((await response.text()) || 'The diagram list did not load.');
  figures = await response.json();
  render();
  show(current ?? decodeURIComponent(location.hash.slice(1)));
}

function failed(error) { status.textContent = error.message; status.hidden = false; }

function shortcut(event) {
  if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault(); search.focus(); search.select();
}

addEventListener('hashchange', () => show(decodeURIComponent(location.hash.slice(1))));
addEventListener('keydown', shortcut);
frame.addEventListener('load', () => {
  const name = framed();
  if (name) select(name);
  try { frame.contentDocument.addEventListener('keydown', shortcut); } catch {}
});
search.addEventListener('input', render);
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') { search.value = ''; render(); search.blur(); }
  if (event.key !== 'Enter') return;
  const first = document.querySelector('.menu a[data-name]');
  if (!first) return;
  location.hash = first.dataset.name; search.value = ''; render(); frame.focus();
});
if (import.meta.hot) import.meta.hot.on('factory:figures', () => load().catch(failed));
load().catch(failed);
