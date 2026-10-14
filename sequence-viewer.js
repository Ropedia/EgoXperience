import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {gunzipSync} from './vendor/fflate/browser.js';
const $=(s,r)=>r.querySelector(s);
const matrix=a=>new THREE.Matrix4().fromArray(a).transpose();
// Bounded session cache: revisiting recent frames does not repeat network requests.
const chunkCache=new Map();let cacheBytes=0;
function remember(key,buffer){if(chunkCache.has(key))return;chunkCache.set(key,buffer);cacheBytes+=buffer.byteLength;while(cacheBytes>48*1024*1024){const oldest=chunkCache.keys().next().value;cacheBytes-=chunkCache.get(oldest).byteLength;chunkCache.delete(oldest);}}
const image=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Image unavailable'));i.src=url;});
async function read(url,type,signal){const r=await fetch(url,{signal});if(!r.ok)throw Error('Scene resource unavailable');return type==='json'?r.json():new type(await r.arrayBuffer());}

export class SequenceViewer {
 constructor(root,kind){
  this.root=root;this.kind=kind;this.generation=0;this.frame=0;this.playing=false;this.speed=1;this.mode='orbit';this.aux='depth';this.active=false;
  root.innerHTML=`<div class="viewer-top"><span>${kind==='data'?'EGOX-ENGINE ANNOTATIONS':'EGOX PREDICTIONS'}</span><span class="mode-tag">INTERACTIVE 3D</span><div class="toolbar"><button data-command="orbit">Orbit ↺</button><button data-command="first">First person</button><button data-command="fullscreen" aria-label="Expand 3D viewer">⛶</button></div></div><div class="viewer-main"><div class="viewport"><div class="webgl-canvas"></div><span class="view-mode">FREE VIEW</span><div class="render-status">Preparing interactive scene…</div><span class="view-hint">Drag to rotate, right-drag to pan, scroll to zoom</span></div><div class="rgb-sidebar"><div class="rgb-label">RGB <strong class="source-frame">FRAME —</strong></div><canvas class="frame-canvas rgb-canvas" width="240" height="136" aria-label="Synchronized RGB frame"></canvas><div class="source-tabs" role="group" aria-label="Auxiliary observation"><button class="active" data-aux="depth" aria-pressed="true">Depth</button>${kind==='data'?'<button data-aux="mask" aria-pressed="false">Object mask</button>':''}</div><canvas class="frame-canvas aux-canvas" width="240" height="136" aria-label="Synchronized depth or mask"></canvas><div class="caption-box"><small>${kind==='data'?'TASK CAPTION · SOURCE ANNOTATION':'MODEL OBSERVATIONS'}</small><p class="caption">Loading scene data…</p></div></div></div><div class="layers">${[['points','Scene','#adbea9'],['left','Left hand','#54aaff'],['right','Right hand','#ff9967'],['object','Object mesh','#acd384'],['axes','6DoF axes','#83d0b7'],['camera','Camera','#91cfd4']].map(([key,label,color])=>`<label><input type="checkbox" data-layer="${key}" checked><i style="background:${color}"></i>${label}</label>`).join('')}</div><div class="timeline"><button class="play" aria-label="Play reconstruction">▷</button><input class="scrub" type="range" min="0" max="95" value="0" step="1" aria-label="Reconstruction frame"><output>0.00 / 0.00 s</output><select class="speed" aria-label="Playback speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option></select></div>`;
  this.status=$('.render-status',root);this.container=$('.webgl-canvas',root);
  if(kind==='data'){
   const language=document.createElement('section');language.className='language-track';language.setAttribute('aria-label','Time-aligned action captions');language.innerHTML='<div class="language-head"><div><small>CAPTION MODALITY</small><h3>Actions, in words.</h3></div><button class="narration-audio" aria-pressed="false">Narration audio off</button></div><div class="language-content"><div class="narrated"><span class="language-label">NARRATED ACTION · ASR · 中文</span><p class="asr-quote" lang="zh">Loading original subtitles…</p><span class="asr-clock"></span></div><div class="language-task"><span class="language-label">VISUAL TASK ANNOTATION</span><p class="task-caption"></p><small>Source task description · not a model prediction</small></div></div><div class="cue-list" aria-label="Narration cues in this window"></div>';root.append(language);
   $('.narration-audio',root).onclick=()=>{this.audioEnabled=!this.audioEnabled;$('.narration-audio',root).setAttribute('aria-pressed',String(this.audioEnabled));$('.narration-audio',root).textContent=this.audioEnabled?'Narration audio on':'Narration audio off';if(this.audioEnabled)this.setPlaying(true);else this.audio?.pause();};
  }
  $('.play',root).onclick=()=>this.setPlaying(!this.playing);
  $('.scrub',root).oninput=e=>{this.setPlaying(false);this.update(Number(e.target.value));};
  $('.speed',root).onchange=e=>{this.speed=Number(e.target.value);if(this.audio)this.audio.playbackRate=this.speed;};
  root.querySelectorAll('[data-layer]').forEach(i=>i.onchange=()=>this.layers());
  root.querySelectorAll('[data-aux]').forEach(b=>b.onclick=()=>{this.aux=b.dataset.aux;root.querySelectorAll('[data-aux]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});this.drawImages();});
  root.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{if(b.dataset.command==='fullscreen'){if(document.fullscreenElement)document.exitFullscreen();else root.requestFullscreen().catch(()=>{});}else this.setView(b.dataset.command);});
  this.intersection=new IntersectionObserver(e=>{this.active=e[0].isIntersecting;if(!this.active)this.setPlaying(false);},{threshold:.05});this.intersection.observe(root);
 }
 async load(name){
  this.name=name;this.setPlaying(false);const generation=++this.generation;
  this.abort?.abort();this.abort=new AbortController();this.clear();this.status.hidden=false;this.status.classList.remove('failed');this.status.textContent='Loading original geometry…';this.root.dataset.ready='false';
  const base=`assets-v2/${this.kind}-${name}/`;
  try{
   const d=await read(base+'scene.json','json',this.abort.signal);if(generation!==this.generation)return;
   const paths=[['positions','points.bin',Float32Array],['colors','colors.bin',Uint8Array],['left','left.bin',Float32Array],['right','right.bin',Float32Array],['leftFaces','left-faces.bin',Uint16Array],['rightFaces','right-faces.bin',Uint16Array]];
   this.stream=null;this.chunkJobs=new Map();this.loadedChunks=new Set();this.pendingFrame=null;
   const streamResponse=await fetch(base+'stream.json',{signal:this.abort.signal});
   if(generation!==this.generation)return;
   let values;
   if(streamResponse.ok){
    const manifest=await streamResponse.json();if(generation!==this.generation)return;
    this.stream=manifest;this.streamBase=base;
    values=await Promise.all(paths.map(async([k,p,T])=>[k,k.endsWith('Faces')?await read(base+p,T,this.abort.signal):new T(d.nFrames*(k==='positions'||k==='colors'?d.pointCapacity*3:778*3))]));
    if(generation!==this.generation)return;
    this.arrays=Object.fromEntries(values);this.streamData=d;
    await this.ensureChunk(0);
   }else{
    throw Error('Geometry manifest unavailable');
   }
   if(generation!==this.generation)return;
   const images=await Promise.all([image(base+d.rgb),image(base+d.depth),d.mask?image(base+d.mask):Promise.resolve(null)]);
   if(generation!==this.generation)return;
   this.data=d;this.arrays=Object.fromEntries(values);this.images={rgb:images[0],depth:images[1],mask:images[2]};
   if(this.kind==='data'&&d.narration){this.audio=new Audio(base+d.narration.audio);this.audio.preload='metadata';this.audioEnabled=false;$('.narration-audio',this.root).setAttribute('aria-pressed','false');$('.narration-audio',this.root).textContent='Narration audio off';const list=$('.cue-list',this.root);list.replaceChildren();for(const cue of d.narration.cues){const b=document.createElement('button');b.type='button';b.textContent=`${cue.start.toFixed(2)}–${cue.end.toFixed(2)} s · ${cue.text}`;b.lang='zh';b.onclick=()=>{this.setPlaying(false);const target=Math.max(cue.start,d.narration.sampleTimes[0]);const times=d.narration.sampleTimes;let best=0;for(let i=1;i<times.length;i++)if(Math.abs(times[i]-target)<Math.abs(times[best]-target))best=i;this.update(best);};list.append(b);}}
   this.status.textContent='Loading object asset…';const gltf=await new GLTFLoader().loadAsync(new URL(base+d.mesh,document.baseURI).href);
   if(generation!==this.generation){this.disposeObject(gltf.scene);return;}
   this.init(gltf.scene);this.frame=0;$('.scrub',this.root).max=d.nFrames-1;this.update(0);this.setView('orbit');this.status.hidden=true;this.root.dataset.ready='true';
  }catch(e){if(generation!==this.generation||e.name==='AbortError')return;this.clear();this.status.hidden=false;this.status.classList.add('failed');this.status.textContent='This 3D scene could not load. WebGL and the scene files are required.';const b=document.createElement('button');b.className='retry';b.textContent='Retry';b.onclick=()=>this.load(name);this.status.append(b);console.warn('Scene load failed:',e.message);this.root.dataset.error=e.message;}
 }
 ensureChunk(frame){
  if(!this.stream)return Promise.resolve();
  const index=Math.floor(frame/this.stream.chunkFrames);
  if(this.chunkJobs.has(index))return this.chunkJobs.get(index);
  const chunk=this.stream.chunks[index],generation=this.generation,arrays=this.arrays,d=this.streamData;
  const job=(async()=>{
   const url=this.streamBase+chunk.file;
   let buffer=chunkCache.get(url);
   if(!buffer){const response=await fetch(url,{signal:this.abort.signal});
    if(!response.ok)throw Error('Geometry chunk unavailable');
    buffer=typeof DecompressionStream!=='undefined'?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():gunzipSync(new Uint8Array(await response.arrayBuffer())).buffer;remember(url,buffer);}
   if(generation!==this.generation)return;
   let offset=0;
   for(const [key,T,stride] of [['positions',Float32Array,d.pointCapacity*3],['colors',Uint8Array,d.pointCapacity*3],['left',Float32Array,778*3],['right',Float32Array,778*3]]){
    const length=chunk.count*stride,bytes=length*T.BYTES_PER_ELEMENT;
    arrays[key].set(new T(buffer.slice(offset,offset+bytes)),chunk.start*stride);offset+=bytes;
   }
   this.loadedChunks.add(index);
  })();
  this.chunkJobs.set(index,job);
  job.catch(()=>{if(generation===this.generation)this.chunkJobs.delete(index);});
  return job;
 }
 init(object){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0x102326,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.container.append(this.renderer.domElement);
  this.renderer.domElement.setAttribute('aria-label','Interactive scene: drag to orbit, right-drag to pan, scroll to zoom.');this.renderer.domElement.tabIndex=0;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(48,1,.01,100);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minDistance=.08;this.controls.maxDistance=20;
  this.controls.addEventListener('start',()=>{this.mode='orbit';$('.view-mode',this.root).textContent='FREE VIEW';});
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x68817e,2.3));const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(2,4,3);this.scene.add(key);
  const N=this.data.pointCapacity;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));geo.setAttribute('color',new THREE.BufferAttribute(new Uint8Array(N*3),3,true));geo.setDrawRange(0,0);
  this.parts={points:new THREE.Points(geo,new THREE.PointsMaterial({size:.012,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.9,depthWrite:true}))};this.parts.points.frustumCulled=false;
  for(const [side,color] of [['left',0x50a6ed],['right',0xf09865]]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(778*3),3));g.setIndex(new THREE.BufferAttribute(this.arrays[side+'Faces'],1));const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.8,side:THREE.DoubleSide}));m.frustumCulled=false;this.parts[side]=m;}
  this.assetBox=new THREE.Box3().setFromObject(object);this.parts.object=object;object.matrixAutoUpdate=false;this.parts.axes=new THREE.AxesHelper(.14);this.parts.axes.matrixAutoUpdate=false;this.parts.axes.material.depthTest=false;this.parts.axes.renderOrder=10;
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(16*3),3));this.parts.camera=new THREE.LineSegments(fg,new THREE.LineBasicMaterial({color:0x87d2d7,transparent:true,opacity:.85}));this.parts.camera.frustumCulled=false;
  Object.values(this.parts).forEach(x=>this.scene.add(x));
  this.resize=new ResizeObserver(()=>{const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();});this.resize.observe(this.container);
  this.last=performance.now();this.accum=0;
  const loop=now=>{if(!this.renderer)return;this.raf=requestAnimationFrame(loop);const dt=Math.min((now-this.last)/1000,.15);this.last=now;if(!this.active||document.hidden)return;if(this.playing){this.accum+=dt*this.speed*this.data.fps;if(this.accum>=1){const step=Math.floor(this.accum);this.accum-=step;this.update((this.frame+step)%this.data.nFrames);}}if(this.mode!=='first')this.controls.update();this.renderer.render(this.scene,this.camera);};this.raf=requestAnimationFrame(loop);
 }
 update(frame){
  if(!this.data||!this.parts)return;
  if(this.stream&&!this.loadedChunks.has(Math.floor(frame/this.stream.chunkFrames))){
   this.pendingFrame=frame;this.status.hidden=false;this.status.textContent='Buffering requested frames…';
   const generation=this.generation;
   this.ensureChunk(frame).then(()=>{if(generation===this.generation&&this.pendingFrame===frame){this.pendingFrame=null;this.status.hidden=true;this.update(frame);}}).catch(e=>{if(generation===this.generation&&e.name!=='AbortError'){this.pendingFrame=null;this.setPlaying(false);this.status.textContent='Connection interrupted. Press play or seek to retry.';}});return;
  }
  this.pendingFrame=null;this.status.hidden=true;this.frame=frame;const d=this.data,a=this.arrays,N=d.pointCapacity;
  if(this.stream&&this.playing){const next=(Math.floor(frame/this.stream.chunkFrames)+1)*this.stream.chunkFrames;if(next<d.nFrames)this.ensureChunk(next).catch(()=>{});}
  const g=this.parts.points.geometry;g.attributes.position.array.set(a.positions.subarray(frame*N*3,(frame+1)*N*3));g.attributes.color.array.set(a.colors.subarray(frame*N*3,(frame+1)*N*3));g.attributes.position.needsUpdate=true;g.attributes.color.needsUpdate=true;g.setDrawRange(0,d.pointCounts[frame]);
  for(const side of ['left','right']){const hg=this.parts[side].geometry;hg.attributes.position.array.set(a[side].subarray(frame*778*3,(frame+1)*778*3));hg.attributes.position.needsUpdate=true;hg.computeVertexNormals();}
  const T=matrix(d.objectMatrices[frame]);this.parts.object.matrix.copy(T);this.parts.axes.matrix.copy(T);
  const C=matrix(d.cameraMatrices[frame]),k=d.intrinsics[frame],h=d.imageHeight,w=d.imageWidth,z=.12;
  const points=[[0,0,0],...[[0,0],[w,0],[w,h],[0,h]].map(([u,v])=>[(u-k[2])/k[0]*z,-(v-k[3])/k[1]*z,-z])].map(p=>new THREE.Vector3(...p).applyMatrix4(C));
  const seg=[];for(let i=1;i<=4;i++){seg.push(...points[0].toArray(),...points[i].toArray(),...points[i].toArray(),...points[i===4?1:i+1].toArray());}this.parts.camera.geometry.attributes.position.array.set(seg);this.parts.camera.geometry.attributes.position.needsUpdate=true;
  this.layers();if(this.mode==='first')this.firstPerson();this.drawImages();$('.scrub',this.root).value=frame;$('.source-frame',this.root).textContent='FRAME '+d.frameIds[frame];$('output',this.root).textContent=`${d.seconds[frame].toFixed(2)} / ${d.seconds.at(-1).toFixed(2)} s`;$('.caption',this.root).textContent=this.kind==='data'?(d.captions[frame]||'No task caption at this frame.'):'RGB + first-frame object mask. All scene, hand, and camera geometry shown here is predicted.';this.drawNarration();this.root.dataset.frame=frame;
 }
 drawNarration(){
  if(this.kind!=='data'||!this.data?.narration)return;const n=this.data.narration,t=n.sampleTimes[this.frame],quote=$('.asr-quote',this.root);const cue=n.cues.find(c=>t>=c.start&&t<c.end);quote.replaceChildren();
  if(cue){let offset=0;for(const ch of cue.text){const span=document.createElement('span');span.textContent=ch;let found=-1;for(let j=offset;j<cue.chars.length;j++)if(cue.chars[j].text===ch){found=j;break;}if(found>=0){const timing=cue.chars[found];offset=found+1;if(t>=timing.start)span.className='spoken';if(t>=timing.start&&t<timing.end)span.classList.add('current-word');}quote.append(span);}}
  else{quote.textContent='No ASR subtitle at this timestamp.';quote.lang='en';}if(cue)quote.lang='zh';
  $('.asr-clock',this.root).textContent=`Source audio clock ${t.toFixed(2)} s${cue?` · cue ${cue.start.toFixed(2)}–${cue.end.toFixed(2)} s`:''}`;
  $('.task-caption',this.root).textContent=this.data.captions[this.frame]||'No task annotation at this frame.';
  const target=Math.max(0,t-n.clipStart);if(this.audio&&(!this.playing||Math.abs(this.audio.currentTime-target)>.22))this.audio.currentTime=target;
 }
 layers(){if(!this.parts)return;this.root.querySelectorAll('[data-layer]').forEach(i=>{let visible=i.checked,key=i.dataset.layer;if(key==='left'||key==='right')visible&&=this.data.handVisible[key][this.frame];if(key==='object'||key==='axes')visible&&=this.data.objectVisible[this.frame];if(key==='camera'&&this.mode==='first')visible=false;this.parts[key].visible=visible;});}
 drawImages(){if(!this.images)return;const x=this.frame%8*240,y=Math.floor(this.frame/8)*136;for(const [name,selector] of [['rgb','.rgb-canvas'],[this.aux,'.aux-canvas']]){const img=this.images[name];if(!img)continue;const c=$(selector,this.root);c.getContext('2d').drawImage(img,x,y,240,136,0,0,240,136);}}
 firstPerson(){const M=matrix(this.data.cameraMatrices[this.frame]);this.camera.position.setFromMatrixPosition(M);this.camera.quaternion.setFromRotationMatrix(M);const forward=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);this.controls.target.copy(this.camera.position).add(forward);this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(this.data.imageHeight/(2*this.data.intrinsics[this.frame][1])));this.camera.updateProjectionMatrix();}
 setView(mode){if(!this.parts)return;this.mode=mode;this.controls.enabled=mode!=='first';if(mode==='first'){this.firstPerson();$('.view-mode',this.root).textContent='FIRST-PERSON VIEW';}else{const target=new THREE.Vector3().setFromMatrixPosition(matrix(this.data.objectMatrices[this.frame]));this.controls.target.copy(target);this.camera.position.copy(target).add(new THREE.Vector3(.38,.42,.9));this.camera.up.set(0,1,0);this.camera.fov=48;this.camera.updateProjectionMatrix();this.controls.update();$('.view-mode',this.root).textContent='FREE VIEW';}this.layers();}
 setPlaying(value){this.playing=value&&!!this.parts;this.accum=0;$('.play',this.root).textContent=this.playing?'Ⅱ':'▷';$('.play',this.root).setAttribute('aria-label',this.playing?'Pause reconstruction':'Play reconstruction');if(this.audio){if(this.playing&&this.audioEnabled){this.audio.playbackRate=this.speed;this.audio.play().catch(()=>{});}else this.audio.pause();}}
 disposeObject(object){object?.traverse(o=>{o.geometry?.dispose();const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of mats){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
 clear(){this.setPlaying(false);if(this.audio){this.audio.removeAttribute('src');this.audio.load();this.audio=null;}cancelAnimationFrame(this.raf);this.resize?.disconnect();this.controls?.dispose();this.disposeObject(this.scene);this.renderer?.dispose();this.renderer=null;this.parts=null;this.data=null;this.images=null;this.arrays=null;this.scene=null;this.container.replaceChildren();}
}
