import { makeTrace, DEFAULT_INPUT } from './model.mjs';
import { TracePlayer } from '../../kit/trace.mjs';
import { loadSprites } from '../../kit/sprites.mjs';
import { FactoryScene } from '../../kit/scene.mjs';
import { factoryLayout } from './layout.mjs';
import { transferView, connectLayout } from '../../kit/transport.mjs';
import { processOutline } from '../../kit/process.mjs';
const $ = id => document.getElementById(id);
let input = [...DEFAULT_INPUT], trace = makeTrace(input), player = new TracePlayer(trace.events, trace.initial);
let scene, visible = true, lastTime = null, lastIndex = -1, frameClock = 0;
const media = matchMedia('(prefers-reduced-motion: reduce)'), narrow = matchMedia('(max-width: 560px)');
const layout = () => connectLayout(factoryLayout(narrow.matches));
const STEPS = [{ key: 'filter', title: 'Filter' }, { key: 'map', title: 'Map' }, { key: 'reduce', title: 'Reduce' }];
const outline = processOutline($('process'), STEPS, { onJump: jump });
function jump(phase) { const i = trace.events.findIndex(e => e.phase === phase); player.seek(i <= 0 ? 0 : i + 1); lastTime = null; render(); }
function renderOps() {
  const s = trace.events.at(-1).after, list = a => `[${a.join(', ')}]`;
  $('ops-body').replaceChildren(...[['Filter', 'n => n % 2 === 0', list(input), list(s.filtered)], ['Map', 'n => n * 3', list(s.filtered), list(s.mapped)],
    ['Reduce', '(sum, n) => sum + n, 0', list(s.mapped), String(s.sum)]].map(([step, code, reads, returns]) => {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = step; tr.append(th);
    for (const text of [code, reads, returns]) { const td = document.createElement('td'), c = document.createElement('code'); c.textContent = text; td.append(c); tr.append(td); }
    return tr;
  }));
}
function render() {
  if (!scene) return;
  const snap = player.snapshot(), state = snap.state, event = snap.event, l = layout();
  const active = event?.kind === 'work' ? event.machine : null;
  const transport = transferView(l.routes, event, media.matches ? 0 : snap.progress);
  scene.render(l, { beltFrame: frameClock / 60, frames: active ? { [active]: frameClock / 55 } : {}, active,
    ...transport, readouts: { ...state.stock, filter: undefined, map: undefined, sum: state.sum } });
  $('play').textContent = snap.done ? 'Run again ↺' : snap.playing ? 'Pause Ⅱ' : snap.index ? 'Continue ▶' : 'Run factory ▶';
  $('step').disabled = snap.done;
  outline.set(snap.done ? 'done' : event?.phase ?? state.phase);
  if (snap.index!==lastIndex) {
    $('narration').textContent = snap.done ? `Complete. The result is ${state.sum}.` : snap.index ? trace.events[snap.index-1].message : media.matches ? 'Reduced motion is on. Use Step to inspect each event.' : 'Ready. Run the factory, or step through one event at a time.';
    lastIndex=snap.index;
  }
  $('scene').setAttribute('aria-label',`Program factory, ${snap.done?'complete':event?.phase}. ${state.tested} of ${input.length} values tested, ${state.rejected.length} rejected.${state.transit ? ` ${state.transit.value} ${state.transit.holder === 'belt' ? 'on the belt' : 'held by an inserter'}.` : ''} Accumulator ${state.sum}.`);
}
function toggle() { if (player.snapshot().done) {player.reset();frameClock=0;lastIndex=-1;} player.playing?player.pause():player.play();lastTime=null;render(); }
function reset() { player.reset();frameClock=0;lastIndex=-1;lastTime=null;render(); }
$('play').addEventListener('click',toggle);
$('step').addEventListener('click',()=>{player.step();lastTime=null;render();});
$('reset').addEventListener('click',reset);
$('factory').addEventListener('keydown',e=>{
  if (e.target.closest('input,select,textarea,button,a') || e.altKey || e.metaKey || e.ctrlKey || !scene) return;
  if(e.code==='Space'){e.preventDefault();toggle();}
  if(e.code==='ArrowRight'){e.preventDefault();player.step();render();}
});
media.addEventListener('change',()=>{if(media.matches)player.pause();lastTime=null;lastIndex=-1;render();});
document.addEventListener('visibilitychange',()=>{lastTime=null;});
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=null;},{threshold:0});observer.observe($('scene'));
new ResizeObserver(render).observe($('scene'));
function frame(now){
  if (scene && visible && !document.hidden && player.playing) {
    const dt=lastTime==null?0:Math.min(now-lastTime,100)*Number($('speed').value);
    player.update(dt);
    frameClock=media.matches?0:frameClock+dt;
    render();
  }
  lastTime=visible&&!document.hidden?now:null;requestAnimationFrame(frame);
}
renderOps();
try {
  const atlas=await loadSprites('./assets/');scene=new FactoryScene($('scene'),atlas);
  for(const id of ['play','step','reset'])$(id).disabled=false;
  render();requestAnimationFrame(frame);
  window.factoryDemo={seek(index){player.seek(index);render();},get layout(){return layout();},get view(){const s=player.snapshot();return transferView(layout().routes,s.event,media.matches?0:s.progress);},get state(){return player.snapshot();},get result(){return trace.result;},step(){player.step();render();},finish(){player.seek(trace.events.length);render();},reset,render};
} catch(error) {$('narration').textContent=error.message;$('narration').classList.remove('sr-only');console.error(error);}
