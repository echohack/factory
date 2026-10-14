import { makeTrace, parseInput, DEFAULT_INPUT } from './model.mjs';
import { TracePlayer } from './kit/trace.mjs';
import { loadSprites } from './kit/sprites.mjs';
import { FactoryScene } from './kit/scene.mjs';
const $ = id => document.getElementById(id);
let input = [...DEFAULT_INPUT], trace = makeTrace(input), player = new TracePlayer(trace.events, trace.initial);
let scene, visible = true, lastTime = null, lastIndex = -1, frameClock = 0;
const media = matchMedia('(prefers-reduced-motion: reduce)'), narrow = matchMedia('(max-width: 560px)');
function layout() {
  const mobile = narrow.matches;
  const positions = mobile ? { input:[3,2.5], filter:[3,6.7], filtered:[3,10.9], reject:[8,6.7], map:[3,15.1], mapped:[3,19.3], sum:[3,23.5] }
    : { input:[1.5,4], filter:[6,4], filtered:[10,4], reject:[6,8], map:[15,4], mapped:[19,4], sum:[23.5,4] };
  const text = { input:['Input','raw values','wooden-chest'], filter:['Filter','keep even','filter'], filtered:['Filtered','intermediate array','steel-chest'],
    reject:['Rejected','odd values','wooden-chest'], map:['Map','multiply by 3','map'], mapped:['Mapped','intermediate array','steel-chest'], sum:['Reduce','sum, starting at 0','steel-chest'] };
  const objects = Object.entries(positions).map(([id,[x,y]]) => ({ id,x,y,sprite:text[id][2],label:text[id][0],caption:text[id][1],
    labelX: mobile && id !== 'filter' && id !== 'reject' ? 7.2 : x,
    labelY: mobile ? id === 'filter' ? y - 2.4 : id === 'reject' ? y - 1.9 : y - .15 : id === 'reject' ? 10 : 1.65,
    labelPlate: mobile && id === 'filter',
    readoutX: mobile && id !== 'reject' ? 7.2 : x,
    readoutY: mobile && id !== 'reject' ? y + 1.1 : y + 1.35 }));
  // The rejected branch exits down on desktop and right on narrow screens.
  const routes = {};
  const connect = (a,b,points) => { routes[`${a}:${b}`] = points ?? [positions[a],positions[b]]; };
  connect('input','filter'); connect('filter','filtered');
  connect('filter','reject');
  connect('filtered','map');connect('map','mapped');connect('mapped','sum');
  const belts = [ ['input','filter'],['filter','filtered'],['filtered','map'],['map','mapped'],['mapped','sum'] ].map(([a,b]) => ({from:positions[a],to:positions[b]}));
  belts.push({from:positions.filter,to:positions.reject});
  return { width:mobile?10.5:26,height:mobile?26:11,objects,belts,routes };
}
function render() {
  if (!scene) return;
  const snap = player.snapshot(), state = snap.state, event = snap.event, l = layout();
  const active = event?.machine ?? (event?.to === 'filter' || event?.to === 'map' ? event.to : null);
  const token = event?.from ? { path:l.routes[`${event.from}:${event.to}`],progress:media.matches?0:snap.progress,value:event.value } : null;
  scene.render(l,{beltFrame:frameClock/60,frames:active?{[active]:frameClock/55}:{},active,token,
    readouts:{input:input.length-state.tested,filtered:state.filtered.length-state.mapped.length,mapped:state.mapped.length-state.reduced,sum:state.sum,reject:state.rejected.length}});
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
  window.factoryDemo={get state(){return player.snapshot();},get result(){return trace.result;},step(){player.step();render();},finish(){player.seek(trace.events.length);render();},reset,render};
} catch(error) {$('narration').textContent=error.message;console.error(error);}
