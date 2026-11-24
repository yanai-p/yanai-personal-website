import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dist=new URL('../dist/',import.meta.url);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(saveData=false){
 const dom=new JSDOM(readFileSync(new URL('index.html',dist),'utf8'),{url:'http://localhost:4173/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,images=[],idle=[],reveals=[];
 w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.IntersectionObserver=class{observe(){}};
 w.HTMLMediaElement.prototype.pause=()=>{};
 w.Element.prototype.getAnimations=()=>[];
 w.HTMLImageElement.prototype.decode=()=>Promise.resolve();
 Object.defineProperty(w.navigator,'connection',{value:{saveData}});
 w.requestIdleCallback=callback=>{idle.push(callback);return idle.length;};
 w.Image=class{
  constructor(){this.decoded=new Promise(resolve=>{this.finishDecode=resolve;});images.push(this);}
  set src(value){this._src=value;}
  get src(){return this._src;}
  get currentSrc(){return this._src;}
  decode(){return this.decoded;}
 };
 w.document.addEventListener('trade-image-ready',event=>reveals.push(event.detail.index));
 w.eval(readFileSync(new URL('experience.js',dist),'utf8'));
 w.dispatchEvent(new w.Event('load'));
 return {dom,w,images,idle,reveals,photo:w.document.querySelector('#explorer-image')};
}

test('trade images warm sequentially at idle with matching responsive sizes and low priority',async()=>{
 const {dom,w,images,idle}=setup();
 try{
  await tick();assert.equal(images.length,0);
  assert.equal(idle.length,1);
  idle.shift()();assert.equal(images.length,1);
  assert.equal(images[0].fetchPriority,'low');
  assert.equal(images[0].sizes,'(max-width: 600px) 90vw, 50vw');
  assert.match(images[0].srcset,/640w/);
  const loading=images[0].onload();await tick();
  assert.equal(idle.length,0,'next request waits for decoding');
  images[0].finishDecode();await loading;await tick();
  idle.shift()();assert.equal(images.length,2);
  w.document.querySelector('#trade-tab-1').click();
  assert.equal(images.length,2,'click reuses the in-flight warm request');
  assert.equal(images[1].fetchPriority,'high');
 }finally{dom.window.close();}
});

test('first reveal waits for decode and late completion cannot replace a newer selection',async()=>{
 const {dom,w,images,reveals,photo}=setup();
 try{
  const initial=photo.src;
  w.document.querySelector('#trade-tab-1').click();
  const rebar=images[0];const first=rebar.onload();await tick();
  assert.equal(photo.src,initial);assert.deepEqual(reveals,[]);
  w.document.querySelector('#trade-tab-2').click();
  const plaster=images[1];const second=plaster.onload();plaster.finishDecode();await second;await tick();
  assert.match(photo.src,/plastering/);assert.deepEqual(reveals,[2]);
  rebar.finishDecode();await first;await tick();
  assert.match(photo.src,/plastering/);assert.deepEqual(reveals,[2]);
  w.document.querySelector('#trade-tab-1').click();await tick();
  assert.match(photo.src,/rebar/);assert.deepEqual(reveals,[2,1]);
  assert.equal(images.length,2,'repeat visits use prepared images');
  assert.equal(photo.parentElement.getAttribute('aria-busy'),'false');
 }finally{dom.window.close();}
});

test('data saving skips speculative downloads and a failed image can retry on demand',async()=>{
 const {dom,w,images,idle,reveals,photo}=setup(true);
 try{
  await tick();assert.equal(idle.length,0);assert.equal(images.length,0);
  w.document.querySelector('#trade-tab-3').click();images[0].onerror();await tick();
  assert.deepEqual(reveals,[]);assert.equal(photo.style.visibility,'hidden');
  w.document.querySelector('#trade-tab-3').click();
  const retry=images[1];const loaded=retry.onload();retry.finishDecode();await loaded;await tick();
  assert.match(photo.src,/tiling/);assert.equal(photo.style.visibility,'');
  assert.deepEqual(reveals,[3]);
 }finally{dom.window.close();}
});


test('photo crossfade keeps the previous frame, cleans interrupted layers, and finishes cleanly',async()=>{
 const {dom,w,images,photo}=setup();
 const animations=[];
 w.Element.prototype.animate=function(frames,timing){
  const animation={element:this,frames,timing,cancelled:false,cancel(){this.cancelled=true;}};
  animations.push(animation);return animation;
 };
 try{
  const initial=photo.src;
  w.document.querySelector('#trade-tab-1').click();
  images[0].finishDecode();await images[0].onload();await tick();
  assert.equal(w.document.querySelectorAll('.trade-photo-previous').length,1);
  assert.equal(w.document.querySelector('.trade-photo-previous').src,initial);
  assert.equal(w.document.querySelector('.trade-photo-previous').getAttribute('aria-hidden'),'true');
  assert.equal(animations.length,3);
  assert.equal(animations[1].frames[1].clipPath,'inset(0 0 0 100%)');
  assert.equal(w.document.querySelectorAll('.trade-photo-wipe').length,1);
  assert.equal(animations[1].frames[1].opacity,0);
  w.document.querySelector('#trade-tab-2').click();
  images[1].finishDecode();await images[1].onload();await tick();
  assert.equal(w.document.querySelectorAll('.trade-photo-previous').length,1,'rapid switches never pile up image layers');
  assert.ok(animations[0].cancelled&&animations[1].cancelled);
  assert.match(w.document.querySelector('.trade-photo-previous').src,/rebar/);
  assert.equal(w.document.querySelectorAll('.trade-photo-wipe').length,1);
  animations[4].onfinish();
  assert.equal(w.document.querySelectorAll('.trade-photo-wipe').length,0);
  assert.equal(w.document.querySelectorAll('.trade-photo-previous').length,0);
  assert.equal(photo.style.visibility,'');assert.match(photo.src,/plastering/);
 }finally{dom.window.close();}
});

test('reducing motion finishes an active crossfade and subsequent selections swap without motion',async()=>{
 const {dom,w,images,photo}=setup();let count=0;
 w.Element.prototype.animate=()=>{count++;return {cancel(){}};};
 try{
  w.document.querySelector('#trade-tab-1').click();
  images[0].finishDecode();await images[0].onload();await tick();
  assert.equal(count,3);
  w.document.dispatchEvent(new w.CustomEvent('site-motion-change',{detail:{paused:true}}));
  assert.equal(w.document.querySelectorAll('.trade-photo-previous').length,0);
  w.document.querySelector('#trade-tab-2').click();
  images[1].finishDecode();await images[1].onload();await tick();
  assert.equal(count,3);assert.equal(photo.style.visibility,'');assert.match(photo.src,/plastering/);
 }finally{dom.window.close();}
});
