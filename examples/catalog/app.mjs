import { loadSprites, spriteLayers } from '../../kit/sprites.mjs';
const $ = id => document.getElementById(id), pageSize = 50;
const [catalog, manifest] = await Promise.all(['catalog.json', 'manifest.json'].map(async path => {
  const response = await fetch(`./assets/${path}`); if (!response.ok) throw new Error(`Missing ${path}`); return response.json();
}));
const featured = ['assembling-machine-3', 'foundry', 'chemical-plant', 'recycler', 'buffer-chest', 'fast-inserter', 'splitter', 'arithmetic-combinator', 'substation', 'logistic-robot', 'accumulator', 'cryogenic-plant'];
const all = [...catalog.objects, ...catalog.tokens].sort((a,b) => {
  const rank = o => featured.includes(o.id) ? featured.indexOf(o.id) : featured.length;
  return rank(a)-rank(b);
});
let pageNumber=0, playing=false, clock=0, last=null, revision=0, cards=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
for (const group of [...new Set(all.map(o=>o.group))]) $('group').add(new Option(group,group));
$('summary').textContent=`${catalog.objects.length} WORLD OBJECTS / ${catalog.tokens.length} ITEM TOKENS`;
const filtered=()=>all.filter(o=>(!$('group').value||o.group===$('group').value) && [o.name,o.id,o.group,...o.roles].join(' ').toLowerCase().includes($('search').value.toLowerCase().trim()));
function pose(o, time, direction) {
  const rig=manifest.sprites[o.id], reach=Math.abs(rig.pickup[1]);
  const angle=(1-Math.cos(time*.9))*Math.PI/2;
  const pickupAngle=-Math.PI/2+direction*Math.PI/2;
  const pickup=[Math.cos(pickupAngle)*reach,Math.sin(pickupAngle)*reach];
  const flow=[[0,1],[-1,0],[0,-1],[1,0]][direction];
  return {pivot:[0,0],pickup,drop:pickup.map(v=>-v),flow,hand:[reach*Math.cos(pickupAngle+angle),reach*Math.sin(pickupAngle+angle)],closed:Math.sin(time*.9)>0};
}
function draw(card) {
  if(!card.atlas) return;
  const {canvas,atlas,object:o}=card, w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(o.kind==='icon'){atlas.drawIcon(ctx,o.id,w/2,h/2,56);return;}
  if(o.kind==='inserter'){
    const reach=Math.abs(manifest.sprites[o.id].pickup[1]), tile=Math.min(38,(w-48)/(2*reach+2),(h-34)/(2*reach+1.5));
    ctx.save();ctx.translate(w/2,h*.56);for(const pass of ['shadow','platform','arm']) atlas.drawInserter(ctx,o.id,pose(o,clock,Number(card.direction?.value??0)),{tileSize:tile,pass});ctx.restore();return;
  }
  const s=manifest.sprites[o.id], layers=spriteLayers(s);
  const bounds=layers.reduce((b,l)=>[Math.min(b[0],l.shift[0]-l.width*l.scale/64),Math.min(b[1],l.shift[1]-l.height*l.scale/64),Math.max(b[2],l.shift[0]+l.width*l.scale/64),Math.max(b[3],l.shift[1]+l.height*l.scale/64)],[0,0,0,0]);
  const tile=Math.min(38,(w-28)/(bounds[2]-bounds[0]),(h-28)/(bounds[3]-bounds[1]));
  const x=w/2-(bounds[0]+bounds[2])*tile/2,y=h/2-(bounds[1]+bounds[3])*tile/2;
  atlas.draw(ctx,o.id,x,y,{tileSize:tile,frame:clock*12,variant:card.variant?.value,direction:o.id==='radar'&&playing&&!reduced.matches?Math.floor(clock*12)%64:Number(card.direction?.value??0)});
}
async function render() {
  const version=++revision, list=filtered(), pages=Math.max(1,Math.ceil(list.length/pageSize));pageNumber=Math.min(pageNumber,pages-1);
  $('cards').setAttribute('aria-busy','true');
  const visible=list.slice(pageNumber*pageSize,(pageNumber+1)*pageSize);cards=[];$('cards').replaceChildren();
  $('count').textContent=`${list.length} PARTS · ${$('group').value||'ALL COLLECTIONS'}`;
  $('page').textContent=`${pageNumber+1} / ${pages}`;$('previous').disabled=pageNumber===0;$('next').disabled=pageNumber===pages-1;
  const images=new Map();
  for(const object of visible){
    const article=document.createElement('article');article.className='card';article.dataset.id=object.id;
    article.innerHTML='<div class="preview"><canvas></canvas></div><div class="card-body"><h2></h2><p class="roles"></p><div class="options"></div></div>';
    const q=s=>article.querySelector(s), canvas=q('canvas');canvas.setAttribute('aria-label',object.id+' sprite preview');
    q('h2').textContent=object.id;q('.roles').textContent=object.roles.join(' · ');
    const card={object,canvas,article};
    if(object.variants.length){card.variant=document.createElement('select');card.variant.setAttribute('aria-label',`${object.id} variant`);for(const v of object.variants)card.variant.add(new Option(v.replaceAll('_',' '),v));q('.options').append(card.variant);card.variant.onchange=()=>draw(card);}
    if(object.directions>1){card.direction=document.createElement('select');card.direction.setAttribute('aria-label',`${object.id} direction`);for(let i=0;i<object.directions;i++)card.direction.add(new Option(`${object.group==='Logistics'?'Shape':'View'} ${String(i+1).padStart(2,'0')}`,i));q('.options').append(card.direction);card.direction.onchange=()=>draw(card);}
    if(!object.variants.length && object.directions===1)q('.options').remove();
    $('cards').append(article);cards.push(card);
    try {card.atlas=await loadSprites('./assets/',{manifest,ids:[object.id],images});if(version!==revision)return;draw(card);}
    catch(error){const p=document.createElement('p');p.className='card-error';p.textContent=error.message;q('.card-body').append(p);console.error(error);}
  }
  $('cards').setAttribute('aria-busy','false');
  window.catalogDemo={count:list.length,visible:cards.map(c=>c.object.id),manifest,catalog};
}
for(const id of ['search','group']) $(id).addEventListener('input',()=>{pageNumber=0;render();});
$('previous').onclick=()=>{pageNumber--;render();};$('next').onclick=()=>{pageNumber++;render();};
function setPlaying(value){playing=value;$('animate').setAttribute('aria-pressed',String(value));$('animate').textContent=value?'Pause previews Ⅱ':'Animate previews ▶';last=null;}
$('animate').onclick=()=>setPlaying(!playing);
function syncMotion(){if(reduced.matches)setPlaying(false);$('animate').disabled=reduced.matches;$('animate').title=reduced.matches?'Animation is disabled while reduced motion is enabled.':'';}
reduced.addEventListener('change',syncMotion);syncMotion();
new ResizeObserver(()=>cards.forEach(draw)).observe($('cards'));
document.addEventListener('visibilitychange',()=>{last=null;});
function frame(now){
  if(playing&&!document.hidden&&!reduced.matches){clock+=last==null?0:Math.min(now-last,100)/1000;for(const card of cards){const r=card.canvas.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)draw(card);}}
  last=now;requestAnimationFrame(frame);
}
await render();requestAnimationFrame(frame);
