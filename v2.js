import {SequenceViewer} from './sequence-viewer.js?v=stream1';
import {DataPlayer} from './data-player.js?v=prior-asr-20261015';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;const selected={data:'outdoor',model:'workspace'};
const videos=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting&&!paused&&!document.hidden){if(!v.getAttribute('src'))v.src=v.dataset.ambient;v.play().catch(()=>{});}else v.pause();}),{threshold:.01});
function observeVideo(v){v.muted=true;v.loop=true;v.playsInline=true;videos.observe(v);}
fetch('assets-v2/wall/manifest.json').then(r=>r.json()).then(items=>{
 const wall=$('#media-wall'),hero=$('.hero');
 const fill=()=>{const cols=innerWidth<=700?3:6,gap=innerWidth<=700?4:6,size=(hero.clientWidth-gap*(cols-1))/cols,count=cols*Math.ceil(hero.clientHeight/(size+gap));
  while(wall.children.length<count){const i=wall.children.length,source=items[i%items.length],tile=document.createElement('div');tile.className='wall-tile';const v=document.createElement('video');v.preload='metadata';v.dataset.ambient=source.video;v.poster=source.poster;tile.append(v);wall.append(tile);observeVideo(v);}
  while(wall.children.length>count){const tile=wall.lastElementChild,v=tile.querySelector('video');videos.unobserve(v);v.pause();v.removeAttribute('src');v.load();tile.remove();}
 };new ResizeObserver(fill).observe(hero);fill();
}).catch(()=>{});
const viewers={data:new DataPlayer($('#data-viewer')),model:new SequenceViewer($('#model-viewer'),'model')};
function load(kind){const v=viewers[kind],id=selected[kind];if(v._requested===id)return;v._requested=id;v.load(id);}
const visibility=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)load(e.target.dataset.kind);}),{rootMargin:'0px',threshold:.02});
Object.values(viewers).forEach(v=>visibility.observe(v.root));
function selectTask(kind,id){selected[kind]=id;$$(`[data-task-selector="${kind}"] [data-case]`).forEach(b=>{const a=b.dataset.case===id;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});load(kind);}
for(const kind of ['data','model']){
 fetch(`assets-v2/${kind==='data'?'tasks':'model-tasks'}.json?v=contact-20261015`,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json();}).then(items=>{
  const list=$(`[data-task-selector="${kind}"]`);list.replaceChildren();const counts={};
  if(kind==='data'){[items[0],items[1],items[2]]=[items[2],items[1],items[0]];items.forEach((item,i)=>item.clipLabel=`Clip_${String(i+1).padStart(2,'0')}`);}
  items.forEach((item,i)=>{if(kind==='model'&&!item.trainingVerified)throw Error('Unverified training source');const label=item.dataset==='EgoX-Data-6M'?'EgoX-Bench':item.dataset;const b=document.createElement('button');b.dataset.case=item.id;b.dataset.kind=kind;if(item.dataset)b.dataset.dataset=item.dataset;b.className=item.id===selected[kind]?'active':'';b.setAttribute('aria-pressed',String(item.id===selected[kind]));b.setAttribute('aria-label',kind==='data'?item.clipLabel:`${label}, ${item.episode}, verified training sequence`);const img=document.createElement('img');img.src=`assets-v2/${kind}-${item.id}/poster.jpg`;img.alt='';img.loading='lazy';const text=document.createElement('span');text.textContent=kind==='data'?item.clipLabel:label;if(kind==='model'){const code=document.createElement('small');code.textContent=`${counts[item.dataset]=(counts[item.dataset]||0)+1} / 3`;text.append(code);}b.append(img,text);b.onclick=()=>selectTask(kind,item.id);list.append(b);});
 }).catch(e=>{const list=$(`[data-task-selector="${kind}"]`);list.textContent='Examples are being prepared. Please refresh shortly.';console.warn(e.message);});
}
function motion(){document.body.classList.toggle('motion-paused',paused);$$('video[data-ambient]').forEach(v=>{v.pause();videos.unobserve(v);videos.observe(v);});if(paused)Object.values(viewers).forEach(v=>v.setPlaying(false));}
motion();
document.addEventListener('visibilitychange',()=>{if(document.hidden){$$('video').forEach(v=>v.pause());Object.values(viewers).forEach(v=>v.setPlaying(false));}else motion();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{paused=e.matches;motion();});
window.sceneViewers=viewers;window.selectedTasks=selected;
