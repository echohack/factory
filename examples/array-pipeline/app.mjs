import { makeTrace, parseInput, DEFAULT_INPUT } from './model.mjs';
import { TracePlayer } from './kit/trace.mjs';
import { loadSprites } from './kit/sprites.mjs';
import { FactoryScene } from './kit/scene.mjs';
import { factoryLayout } from './layout.mjs';
import { transferView, connectLayout } from './kit/transport.mjs';
const $ = id => document.getElementById(id);
let input = [...DEFAULT_INPUT], trace = makeTrace(input), player = new TracePlayer(trace.events, trace.initial);
let scene, visible = true, lastTime = null, lastIndex = -1, frameClock = 0;
const media = matchMedia('(prefers-reduced-motion: reduce)'), narrow = matchMedia('(max-width: 560px)');
const layout = () => connectLayout(factoryLayout(narrow.matches));
function render() {
  if (!scene) return;
  const snap = player.snapshot(), state = snap.state, event = snap.event, l = layout();
  const active = event?.kind === 'work' ? event.machine : null;
  const transport = transferView(l.routes, event, media.matches ? 0 : snap.progress);
  scene.render(l, { beltFrame: frameClock / 60, frames: active ? { [active]: frameClock / 55 } : {}, active,
    ...transport, readouts: { ...state.stock, filter: undefined, map: undefined, sum: state.sum } });
  $('hand-state').textContent = state.transit ? `${state.transit.value} · ${state.transit.holder === 'belt' ? 'on belt' : 'held by inserter'}` : 'Empty';
  $('sum').value = state.sum; $('sum').textContent = state.sum;
  $('input-summary').textContent = `${input.length} ${input.length===1?'value':'values'}. Three operations.`;
  for (const key of ['filtered','mapped','rejected']) $(key).textContent = `[${state[key].join(', ')}]`;
  $('reduced-count').textContent = `${state.reduced} ${state.reduced===1?'value':'values'} added`;
  $('event-count').textContent = `${String(snap.index).padStart(2,'0')} / ${snap.total} EVENTS`;
  $('phase-label').textContent = snap.done ? 'Production complete' : `${snap.playing?'Running':'Paused'} · ${event?.phase ?? state.phase}`;
  $('play').textContent = snap.done ? 'Run again ↺' : snap.playing ? 'Pause Ⅱ' : snap.index ? 'Continue ▶' : 'Run factory ▶';
  $('step').disabled = snap.done;
  document.querySelectorAll('[data-line]').forEach(el => el.classList.toggle('active',Number(el.dataset.line)===(event?.line??3)));
  if (snap.index!==lastIndex) {
    $('narration').textContent = snap.done ? `Complete. The result is ${state.sum}.` : snap.index ? trace.events[snap.index-1].message : media.matches ? 'Reduced motion is on. Use Step to inspect each event.' : 'Ready. Run the factory, or step through one event at a time.';
    lastIndex=snap.index;
  }
  $('scene').setAttribute('aria-label',`Program factory, ${snap.done?'complete':event?.phase}. ${state.tested} of ${input.length} values tested, ${state.rejected.length} rejected. Accumulator ${state.sum}.`);
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
$('input-form').addEventListener('submit',e=>{
  e.preventDefault();
  try { const values=parseInput($('input-values').value);const next=makeTrace(values); input=values;trace=next;player=new TracePlayer(trace.events,trace.initial);$('input-error').textContent='';$('input-values').removeAttribute('aria-invalid');reset(); }
  catch(error){$('input-error').textContent=error.message;$('input-values').setAttribute('aria-invalid','true');}
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
try {
  const atlas=await loadSprites('./assets/');scene=new FactoryScene($('scene'),atlas);
  for(const id of ['play','step','reset'])$(id).disabled=false;
  render();requestAnimationFrame(frame);
  window.factoryDemo={seek(index){player.seek(index);render();},get layout(){return layout();},get view(){const s=player.snapshot();return transferView(layout().routes,s.event,media.matches?0:s.progress);},get state(){return player.snapshot();},get result(){return trace.result;},step(){player.step();render();},finish(){player.seek(trace.events.length);render();},reset,render};
} catch(error) {$('narration').textContent=error.message;console.error(error);}
