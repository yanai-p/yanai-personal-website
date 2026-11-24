import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dist=new URL('../dist/',import.meta.url);
function setup(beforeRun=()=>{}){
 const dom=new JSDOM(readFileSync(new URL('index.html',dist),'utf8'),{url:'http://localhost:4173/',runScripts:'outside-only'});
 const w=dom.window,doc=w.document;
 w.matchMedia=()=>({addEventListener(){}});
 Object.defineProperty(w,'innerWidth',{value:390,writable:true,configurable:true});
 Object.defineProperty(doc.documentElement,'scrollHeight',{value:6000,configurable:true});
 beforeRun(w,doc);
 w.eval(readFileSync(new URL('app.js',dist),'utf8'));
 const header=doc.querySelector('.header');
 return {dom,w,doc,header,scroll(y){Object.defineProperty(w,'scrollY',{value:y,configurable:true});w.dispatchEvent(new w.Event('scroll'));},hidden:()=>header.classList.contains('header-hidden')};
}
test('header hides on deliberate descent and returns on even a fractional upward scroll',()=>{
 const e=setup();try{
  e.scroll(50);assert.equal(e.hidden(),false);
  e.scroll(100);assert.equal(e.hidden(),false,'initial scrolling keeps navigation available');
  e.scroll(150);assert.equal(e.hidden(),false);
  e.scroll(180);assert.equal(e.hidden(),true);
  e.scroll(179.75);assert.equal(e.hidden(),false);
  assert.equal(e.header.classList.contains('header-returning'),true);
  e.scroll(210);assert.equal(e.hidden(),false,'a returned header stays for a meaningful stretch');
  e.scroll(240);assert.equal(e.hidden(),true);
  assert.equal(e.header.classList.contains('header-returning'),false);
  e.scroll(0);assert.equal(e.hidden(),false);
 }finally{e.dom.window.close();}
});
test('open menu and keyboard focus retain navigation; pointer-focused links do not pin it forever',()=>{
 const e=setup();try{
  e.scroll(400);assert.equal(e.hidden(),true);
  e.doc.querySelector('.menu-toggle').click();e.scroll(350);assert.equal(e.hidden(),false);
  e.doc.querySelector('.menu-toggle').click();
  const link=e.doc.querySelector('.brand');link.focus();e.scroll(500);assert.equal(e.hidden(),false);
  link.dispatchEvent(new e.w.Event('pointerdown',{bubbles:true}));e.scroll(650);assert.equal(e.hidden(),true);
  e.doc.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
  e.doc.querySelector('.header-cta').focus();assert.equal(e.hidden(),false);
  e.scroll(700);assert.equal(e.hidden(),false);
 }finally{e.dom.window.close();}
});
test('viewport changes and dialogs expose navigation; elastic overscroll does not generate a false return',()=>{
 const e=setup();try{
  e.scroll(400);assert.equal(e.hidden(),true);
  e.w.dispatchEvent(new e.w.Event('resize'));assert.equal(e.hidden(),false);
  const dialog=e.doc.querySelector('dialog');dialog.open=true;e.scroll(500);assert.equal(e.hidden(),false);
  dialog.open=false;e.scroll(650);assert.equal(e.hidden(),true);
  const bottom=6000-e.w.innerHeight;e.scroll(bottom);e.scroll(bottom+80);e.scroll(bottom);
  assert.equal(e.hidden(),true,'rubber-band bounce at the bottom is not an upward gesture');
  e.scroll(bottom-.5);assert.equal(e.hidden(),false);
  e.scroll(-40);e.scroll(0);assert.equal(e.hidden(),false);
 }finally{e.dom.window.close();}
});


test('surface closes from the far edge and reverses from its current shape in both directions',()=>{
 for(const rtl of [true,false]){
  const animations=[];
  const e=setup((w,doc)=>{
   doc.documentElement.dir=rtl?'rtl':'ltr';
   const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
   const header=doc.querySelector('.header'),image=header.querySelector('.brand img'),brand=header.querySelector('.brand');
   header.getBoundingClientRect=()=>box(0,0,390,76);
   image.getBoundingClientRect=()=>box(rtl?330:20,18,40,40);
   Object.defineProperty(image,'offsetWidth',{value:40});Object.defineProperty(image,'offsetHeight',{value:40});
   brand.getBoundingClientRect=()=>box(rtl?220:20,12,150,52);
   const positions=rtl?[240,120,110,40,30]:[100,240,240,320,330];
   [...header.querySelectorAll('.brand-label,.header-inner>nav,.language-picker,.header-cta,.menu-toggle')].forEach((el,i)=>{el.getBoundingClientRect=()=>box(positions[i],18,40,40);});
   header.querySelector('.header-surface').animate=(frames,options)=>{
    const animation={frames,options,cancelled:false,cancel(){this.cancelled=true;},finished:new Promise(()=>{})};animations.push(animation);return animation;
   };
  });
  try{
   e.scroll(400);assert.equal(animations.length,1);
   const closing=animations[0],numbers=frame=>frame.clipPath.match(/[-\d.]+(?=px)/g).map(Number);
   const mid=numbers(closing.frames.find(frame=>frame.offset>=.6)),end=numbers(closing.frames.at(-1)),far=rtl?3:1,near=rtl?1:3;
   assert.ok(mid[far]/end[far]>.9,'far edge has crossed most of the distance first');
   assert.ok(mid[near]/end[near]<.4,'logo-side edge settles later');
   assert.equal(closing.frames.length,25);
   for(let i=2;i<closing.frames.length;i++)assert.ok(numbers(closing.frames[i])[far]>=numbers(closing.frames[i-1])[far],'the sweep never stops or reverses at an intermediate stage');
   const delay=selector=>Number.parseInt(e.doc.querySelector(selector).style.getPropertyValue('--nav-close-delay'));
   assert.ok(delay('.menu-toggle')<delay('.language-picker'));
   assert.ok(delay('.language-picker')<delay('.brand-label'));
   e.scroll(399);assert.equal(closing.cancelled,true);
   assert.equal(animations[1].frames.length,2,'interruptions go directly from the current shape to the new target');
   assert.deepEqual(numbers(animations[1].frames.at(-1)).slice(4),[0,0,14,14],'only the bottom corners remain rounded when expanded');
   e.doc.dispatchEvent(new e.w.CustomEvent('site-motion-change',{detail:{paused:true}}));
   assert.equal(animations[1].cancelled,true);
  }finally{e.dom.window.close();}
 }
});

test('desktop navigation stays fully visible on descent, ascent and resize',()=>{
 const e=setup();try{e.scroll(400);assert.equal(e.hidden(),true);e.w.innerWidth=1440;e.w.dispatchEvent(new e.w.Event('resize'));assert.equal(e.hidden(),false);for(const y of [600,900,850,1800]){e.scroll(y);assert.equal(e.hidden(),false);}e.w.innerWidth=390;e.w.dispatchEvent(new e.w.Event('resize'));e.scroll(2000);assert.equal(e.hidden(),true);}finally{e.dom.window.close();}
});
