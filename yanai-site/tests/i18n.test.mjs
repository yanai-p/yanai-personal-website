import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const languages = ['he','th','hi','si','zh-CN','ro','uz','en'];
const wait = () => new Promise(resolve => setTimeout(resolve, 15));

function setup(query = '') {
 const dom = new JSDOM(html, {url:'http://localhost:4173/'+query, runScripts:'outside-only', pretendToBeVisual:true});
 const w = dom.window;
 w.matchMedia = () => ({matches:false,addEventListener(){}});
 w.IntersectionObserver = class {observe(){} unobserve(){} disconnect(){}};
 w.ResizeObserver = w.IntersectionObserver;
 w.Element.prototype.animate = () => ({cancel(){},finished:Promise.resolve()});
 w.Element.prototype.getAnimations = () => [];
 w.Element.prototype.scrollIntoView = () => {};
 w.scrollTo=()=>{};
 w.open=()=>null;
 w.document.getAnimations = () => [];
 w.HTMLMediaElement.prototype.load = () => {};
 w.HTMLMediaElement.prototype.play = () => Promise.resolve();
 w.HTMLMediaElement.prototype.pause = () => {};
 w.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
 w.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 let requests = 0;
 w.fetch = async () => { requests++; throw Error('mock offline'); };
 for (const file of ['locales.js','i18n.js','app.js','experience.js','vendor/phone-number.js','validation.js','contact.js','motion.js','polish.js','interface.js']) {
  w.eval(readFileSync(new URL(file, dist),'utf8'));
 }
 return {dom,w,doc:w.document,requests:()=>requests};
}

test('building chapters show physically distinct states and keep a deliberate choice while reading',async()=>{
 const {dom,w,doc}=setup();
 try {
  const css=doc.createElement('style');css.textContent=readFileSync(new URL('building.css',dist),'utf8');doc.head.append(css);
  const scene=doc.querySelector('.build-story');
  scene.getBoundingClientRect=()=>({top:100,bottom:700});
  for(const index of [0,1,2,1,0,2]) {
   doc.querySelector(`#chapter-${index}`).click();
   assert.equal(scene.dataset.chapter,String(index));
   assert.equal(doc.querySelector(`#chapter-${index}`).getAttribute('aria-selected'),'true');
   assert.equal(doc.querySelector(`#build-caption-${index}`).hidden,false);
   assert.equal(w.getComputedStyle(doc.querySelector('.building-foundation')).opacity,index===0?'1':'0');
   assert.equal(w.getComputedStyle(doc.querySelector('.building-level')).opacity,index===1?'1':'0');
   assert.equal(w.getComputedStyle(doc.querySelector('.building-finish')).opacity,index===2?'1':'0');
  }
  assert.equal(doc.querySelectorAll('.finish-window').length,24);
  doc.querySelector('#chapter-0').click();w.scrollY=50;w.dispatchEvent(new w.Event('scroll'));await wait();
  assert.equal(scene.dataset.chapter,'0','scrolling inside the scene must not override selection');
  doc.querySelector('#motion-toggle').click();await wait();
  assert.equal(scene.dataset.chapter,'0','reduced motion must preserve the chosen stage');
  doc.querySelector('#chapter-2').click();assert.equal(scene.dataset.chapter,'2');
  assert.deepEqual([...doc.querySelectorAll('[data-intent]')].map(x=>x.dataset.intent),['foundation','structure','finish']);
  assert.equal(doc.querySelectorAll('.choice-number,.tab-num,.hero-proof').length,0);
 } finally {dom.window.close();}
});

function hebrewResidue(doc) {
 const values=[];
 const walker=doc.createTreeWalker(doc.documentElement,5);
 while(walker.nextNode()) {
  const node=walker.currentNode;
  const el=node.nodeType===3?node.parentElement:node;
  if(el.closest('script,style,noscript,[translate="no"]'))continue;
  if(node.nodeType===3 && !el.closest('textarea') && /[\u0590-\u05ff]/.test(node.nodeValue))values.push(node.nodeValue.trim());
  if(node.nodeType===1)for(const attr of ['aria-label','alt','title','placeholder','content']) {
   const v=el.getAttribute(attr)||'';if(/[\u0590-\u05ff]/.test(v))values.push(`${attr}: ${v}`);
  }
 }
 return [...new Set(values)];
}

test('all languages cover static content, dynamic trades, stages and form feedback',async()=>{
 const {dom,w,doc,requests}=setup();
 try {
  const canonicalOptions=[...doc.querySelector('#trade').options].map(o=>o.value);
  for(const language of languages.slice(1)) {
   w.YanaiI18n.setLanguage(language);await wait();
   assert.equal(doc.documentElement.lang,language);
   assert.equal(doc.documentElement.dir,'ltr');
   assert.deepEqual(hebrewResidue(doc),[],`${language}: initial content`);
   for(const button of doc.querySelectorAll('[data-explore]')) {
    button.click();await wait();
    doc.querySelector('#explorer-cta').click();await wait();
    assert.deepEqual(hebrewResidue(doc),[],`${language}: ${button.id}`);
   }
   for(const button of doc.querySelectorAll('[data-intent]')) {
    button.click();await wait();
    assert.deepEqual(hebrewResidue(doc),[],`${language}: ${button.dataset.intent}`);
   }
   doc.querySelector('#contact-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
   assert.equal(doc.querySelector('#validation-summary').hidden,false);
   assert.deepEqual(hebrewResidue(doc),[],`${language}: errors`);
   assert.deepEqual([...doc.querySelector('#trade').options].map(o=>o.value),canonicalOptions);
  }
  assert.equal(requests(),0,'invalid forms must not send data');
  w.YanaiI18n.setLanguage('he');await wait();
  assert.equal(doc.documentElement.dir,'rtl');
  assert.equal(doc.querySelector('.brand strong').textContent,'ינאי פרסונל');
  assert.equal(doc.querySelector('a[aria-label="מעבר לטופס יצירת קשר"] span').textContent.trim(),'ליצירת קשר');
 } finally {dom.window.close();}
});

test('language switching preserves user input and creates translated WhatsApp text',async()=>{
 const {dom,w,doc,requests}=setup('?lang=ro#contact');
 try {
  const name=doc.querySelector('[name="name"]');name.value='שם של לקוח';
  doc.querySelector('[name="company"]').value='חברת לקוח';
  doc.querySelector('[name="phone"]').value='+972 54 233 1748';
  doc.querySelector('[name="details"]').value='פרטים אישיים שלא מתרגמים';
  w.YanaiI18n.setLanguage('th');await wait();
  assert.equal(name.value,'שם של לקוח');
  assert.equal(w.location.hash,'#contact');
  assert.equal(w.localStorage.getItem('yanai-language'),'th');
  doc.querySelector('#contact-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(requests(),0);
  const fallback=doc.querySelector('#form-status a');
  const message=new URL(fallback.href).searchParams.get('text');
  assert.ok(message.includes('ชื่อ: שם של לקוח'));
  assert.ok(message.includes('פרטים אישיים שלא מתרגמים'));
  assert.ok(!message.includes('{'));
  w.YanaiI18n.setLanguage('en');await wait();
  assert.match(doc.querySelector('[type="submit"]').textContent,/Continue to WhatsApp/);
  assert.deepEqual(hebrewResidue(doc),[]);
 } finally {dom.window.close();}
});

test('URLs select each language directly; unsafe values fall back to Hebrew',()=>{
 for(const language of [...languages,'not-a-language']) {
  const {dom,doc}=setup('?lang='+language);
  assert.equal(doc.documentElement.lang,languages.includes(language)?language:'he');
  dom.window.close();
 }
});


test('automatic construction follows the illustration through foundation, skeleton and finish',async()=>{
 const {dom,w,doc}=setup();
 try {
  w.innerHeight=800;
  const scene=doc.querySelector('.build-story');
  scene.getBoundingClientRect=()=>({top:-200,bottom:1000});
  let top=850;
  doc.querySelector('.build-art').getBoundingClientRect=()=>({top,height:360,bottom:top+360});
  for(const [position,chapter] of [[850,'0'],[600,'0'],[480,'1'],[300,'1'],[180,'1'],[150,'2'],[100,'2'],[80,'2'],[300,'1']]){
   top=position;w.dispatchEvent(new w.Event('scroll'));
   await new Promise(r=>setTimeout(r,35));
   assert.equal(scene.dataset.chapter,chapter,`art top ${position}`);
  }
 } finally {dom.window.close();}
});

test('branded pickers change language, restore focus and preserve canonical form values',async()=>{
 const {dom,w,doc}=setup();
 try {
  const trigger=doc.querySelector('#language-select-trigger');
  const dialog=doc.querySelector('#language-select-dialog');
  assert.equal(doc.querySelector('#language-select').hidden,true);
  assert.equal(dialog.querySelectorAll('[role=option]').length,8);
  trigger.click();assert.equal(dialog.open,true);
  assert.equal(trigger.getAttribute('aria-expanded'),'true');
  doc.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));
  assert.equal(doc.activeElement.dataset.value,'en');
  doc.activeElement.click();await wait();
  assert.equal(doc.documentElement.lang,'en');assert.equal(doc.documentElement.dir,'ltr');
  assert.equal(dialog.open,false);assert.equal(doc.activeElement,trigger);
  assert.equal(trigger.getAttribute('aria-expanded'),'false');
  assert.equal(doc.documentElement.classList.contains('choice-open'),false);
  assert.equal(w.localStorage.getItem('yanai-language'),'en');
  const trade=doc.querySelector('#trade');
  doc.querySelector('#trade-trigger').click();
  const option=doc.querySelectorAll('#trade-dialog [role=option]')[1];
  const canonical=option.dataset.value;option.click();await wait();
  assert.equal(new w.FormData(doc.querySelector('#contact-form')).get(trade.name),canonical);
  assert.equal(doc.querySelector('#trade-trigger .choice-value').textContent,trade.selectedOptions[0].textContent);
  doc.querySelector('#contact-form').reset();await wait();
  assert.equal(doc.querySelector('#trade-trigger .choice-value').textContent,trade.selectedOptions[0].textContent);
 } finally {dom.window.close();}
});


test('compact building follows natural scroll without pinning or spacer height and restores desktop DOM',async()=>{
 const {dom,w,doc}=setup();
 try {
  const scene=doc.querySelector('.build-story');
  const frame=doc.querySelector('.build-mobile-frame');
  const track=doc.querySelector('.build-mobile-track');
  const art=doc.querySelector('.build-art');
  let artTop=399;
  scene.getBoundingClientRect=()=>({top:-100,bottom:1600});
  doc.querySelector('.header').getBoundingClientRect=()=>({height:76});
  doc.querySelector('.build-viewport-probe').getBoundingClientRect=()=>({height:740});
  art.getBoundingClientRect=()=>({top:artTop,height:300});
  w.innerWidth=384;w.innerHeight=740;
  w.dispatchEvent(new w.Event('resize'));await new Promise(r=>setTimeout(r,35));
  assert.equal(art.parentElement,frame);
  assert.equal(doc.querySelectorAll('#chapter-0').length,1,'responsive layout must not duplicate tabs');
  assert.equal(track.classList.contains('is-pinned'),false);
  assert.equal(track.style.height,'');
  assert.equal(track.style.getPropertyValue('--scene-travel'),'');
  const travel=358;
  for(const [progress,chapter] of [[0,'0'],[.30,'0'],[.36,'1'],[.59,'1'],[.61,'2'],[.57,'2'],[.55,'1'],[.30,'0']]){
   artTop=399-progress*travel;w.dispatchEvent(new w.Event('scroll'));
   await new Promise(r=>setTimeout(r,35));
   assert.equal(scene.dataset.chapter,chapter,`progress ${progress}`);
  }
  let stageWrites=0;
  const mutationWatch=new w.MutationObserver(records=>stageWrites+=records.length);
  mutationWatch.observe(doc.querySelector('.build-stage'),{attributes:true,attributeFilter:['style']});
  for(let step=0;step<4;step++){
   artTop+=3;w.dispatchEvent(new w.Event('scroll'));await new Promise(r=>setTimeout(r,35));
  }
  assert.equal(stageWrites,0,'scrolling within a phase must not invalidate inherited SVG styles');
  mutationWatch.disconnect();
  // Dynamic toolbar changes do not change stable-viewport scroll travel.
  w.innerHeight=820;w.dispatchEvent(new w.Event('resize'));await new Promise(r=>setTimeout(r,35));
  assert.equal(scene.dataset.chapter,'0');
  assert.equal(track.style.getPropertyValue('--scene-travel'),'');
  doc.querySelector('#chapter-2').click();
  w.innerWidth=768;w.dispatchEvent(new w.Event('resize'));await new Promise(r=>setTimeout(r,35));
  assert.equal(scene.dataset.chapter,'2','a chosen stage survives unfolding');
  w.innerHeight=360;w.dispatchEvent(new w.Event('resize'));await new Promise(r=>setTimeout(r,35));
  assert.equal(track.classList.contains('is-pinned'),false,'tall content must never be trapped in a short viewport');
  assert.equal(scene.dataset.chapter,'2');
  artTop=399;w.scrollY=150;w.dispatchEvent(new w.Event('scroll'));await new Promise(r=>setTimeout(r,35));
  assert.equal(scene.dataset.chapter,'0','deliberate scrolling resumes automatic phases after a tab selection');
  w.innerWidth=1440;w.dispatchEvent(new w.Event('resize'));await new Promise(r=>setTimeout(r,35));
  assert.equal(art.parentElement,doc.querySelector('.build-stage'));
  assert.equal(doc.querySelector('.build-chapters').parentElement,doc.querySelector('.build-copy'));
  assert.equal(track.hidden,true);
 } finally {dom.window.close();}
});


test('mobile navigation moves focus into the menu and then to its destination',()=>{
 const {dom,doc}=setup();
 try{
  const menu=doc.querySelector('.menu-toggle');menu.click();
  const first=doc.querySelector('#navigation a');
  assert.equal(doc.activeElement,first);
  first.click();
  assert.equal(menu.getAttribute('aria-expanded'),'false');
  assert.equal(doc.activeElement,doc.querySelector('#expertise'));
  menu.click();doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(doc.activeElement,menu);
 }finally{dom.window.close();}
});

test('picker arrow keys follow its two-column grid without changing the selected value',()=>{
 const {dom,w,doc}=setup();
 try{
  doc.querySelector('#language-select-trigger').click();
  const options=[...doc.querySelectorAll('#language-select-dialog [role=option]')];
  options[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  assert.equal(doc.activeElement,options[2]);
  assert.equal(doc.querySelector('#language-select').value,'he');
  options[2].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
  assert.equal(doc.activeElement,options[0]);
 }finally{dom.window.close();}
});

test('contact controls retain their visible labels in their accessible names in every language',async()=>{
 const {dom,w,doc}=setup();
 try {
  for(const language of languages){
   w.YanaiI18n.setLanguage(language);await wait();
   const floating=doc.querySelector('.floating-contact');
   assert.equal(floating.getAttribute('aria-labelledby'),'floating-contact-label floating-contact');
   assert.equal(doc.querySelector('#floating-contact-label').textContent,w.YanaiI18n.t('ליצירת קשר'));
   assert.equal(doc.querySelector('.mobile-whatsapp'),null,'WhatsApp remains one live control while docking');
   assert.equal(doc.querySelector('.mobile-whatsapp-slot').getAttribute('aria-hidden'),'true');
   assert.equal(floating.getAttribute('aria-label'),w.YanaiI18n.t('מעבר לטופס יצירת קשר'));
   assert.equal(doc.querySelector('.mobile-call').getAttribute('aria-label'),w.YanaiI18n.t('התקשרו'));
   assert.equal(doc.querySelector('.mobile-call').textContent.trim(),'');
   const ids=[...doc.querySelectorAll('[id]')].map(el=>el.id);assert.equal(ids.length,new Set(ids).size);
  }
  const status=doc.querySelector('#form-status');
  assert.equal(status.tabIndex,-1);assert.equal(status.getAttribute('aria-atomic'),'true');
 } finally {dom.window.close();}
});

test('WhatsApp handoff is localized in every language and never reports a sent message',async()=>{
 for(const language of languages){const {dom,w,doc}=setup();try{
  let opened;w.open=url=>{opened=url;return null;};w.YanaiI18n.setLanguage(language);await wait();
  doc.querySelector('[name="company"]').value='Test company';doc.querySelector('[name="phone"]').value='0542331748';doc.querySelector('[name="stage"]').value='גמר';
  doc.querySelector('#contact-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(doc.querySelector('#form-status').dataset.state,'ready');assert.ok(new URL(opened).searchParams.get('text').includes(w.YanaiI18n.t('גמר')));if(language!=='he')assert.deepEqual(hebrewResidue(doc),[]);
 }finally{dom.window.close();}}
});

test('the requested redundant form note is removed while the privacy explanation remains available',()=>{
 const {dom,doc}=setup();
 try {
  assert.equal(doc.querySelector('#contact-form .form-note'),null);
  assert.ok(doc.querySelector('[data-dialog="privacy"]'));
  assert.match(doc.querySelector('#privacy').textContent,/WhatsApp/);assert.ok(!doc.querySelector('#privacy').textContent.includes('FormSubmit'));
  assert.ok(doc.querySelector('#contact-form [type="submit"]'));
  assert.equal(doc.querySelector('#form-status').tabIndex,-1);
 } finally {dom.window.close();}
});

test('stage selection follows project cards but preserves an explicit form choice',async()=>{
 const {dom,w,doc}=setup();try{
  const stage=doc.querySelector('#project-stage');
  doc.querySelector('[data-intent="foundation"]').click();assert.equal(stage.value,'יסודות');
  assert.equal(doc.querySelectorAll('#welcome-trades a').length,2);
  const next=doc.querySelector('#welcome-next');
  assert.equal(next.getAttribute('href'),'#contact');
  next.click();
  assert.equal(doc.activeElement.id,'contact-form');
  assert.equal(stage.value,'יסודות');
  assert.equal(doc.querySelector('#trade').value,'');
  doc.querySelector('[data-intent="finish"]').click();assert.equal(stage.value,'גמר');
  doc.querySelector('[data-intent="structure"]').click();assert.equal(stage.value,'שלד');
  stage.value='יסודות';stage.dispatchEvent(new w.Event('change',{bubbles:true}));
  doc.querySelector('[data-intent="finish"]').click();assert.equal(stage.value,'יסודות');
  next.click();assert.equal(stage.value,'גמר','explicit continuation applies the chosen card over an older form selection');
  assert.equal(doc.querySelector('#project-stage-trigger .choice-value').textContent,'גמר');
  assert.equal(doc.querySelectorAll('[name="company"]').length,1);
  assert.equal(doc.querySelector('[name="company"]').required,true);
  assert.equal(doc.querySelector('[name="name"]').required,false);
  assert.equal(doc.querySelector('#floating-contact').getAttribute('href'),'#contact');
 }finally{dom.window.close();}
});


test('all locales preserve direct contact destinations and native click behavior', async () => {
 const {dom,w,doc,requests}=setup();
 try {
  const selector='a[href^="mailto:"],a[href^="tel:"],a[href^="https://wa.me/"]';
  const expected=[...doc.querySelectorAll(selector)].map(a=>a.getAttribute('href'));
  assert.equal(expected.length,11); // The floating WhatsApp is reused in the dock.
  assert.equal(expected.filter(href=>href==='mailto:office@yanai-p.co.il').length,3);
  const allowed=new Set(['mailto:office@yanai-p.co.il','tel:+972542331748','tel:+97289228543','https://wa.me/972542331748']);
  assert.ok(expected.every(href=>allowed.has(href)));
  for(const language of languages) {
   w.YanaiI18n.setLanguage(language);await wait();
   assert.deepEqual([...doc.querySelectorAll(selector)].map(a=>a.getAttribute('href')),expected,language);
   for(const link of doc.querySelectorAll(selector)) {
    const event=new w.Event('click',{bubbles:true,cancelable:true});
    link.dispatchEvent(event);
    assert.equal(event.defaultPrevented,false,`${language}: ${link.href}`);
   }
   await wait();
   assert.equal(doc.querySelector('#email-feedback').hidden,false);
   if(language!=='he')assert.deepEqual(hebrewResidue(doc),[]);
  }
  assert.equal(requests(),0);
  assert.equal((html.match(/<!--email_off-->/g)||[]).length,4);
 } finally {dom.window.close();}
});

test('email copy confirms success only after clipboard success and handles denied access', async () => {
 const {dom,w,doc,requests}=setup();
 try {
  const copied=[];
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copied.push(text)},configurable:true});
  const button=doc.querySelector('#copy-email'),feedback=doc.querySelector('#email-feedback');
  assert.equal(button.hidden,false);
  button.click();await wait();
  assert.deepEqual(copied,['office@yanai-p.co.il']);
  assert.equal(feedback.textContent,w.YanaiI18n.t('כתובת האימייל הועתקה.'));
  for(const language of languages) {
   w.YanaiI18n.setLanguage(language);await wait();
   button.click();await wait();
   assert.equal(feedback.textContent,w.YanaiI18n.t('כתובת האימייל הועתקה.'));
   assert.equal(button.getAttribute('aria-label'),w.YanaiI18n.t('העתקת כתובת האימייל'));
  }
  w.navigator.clipboard.writeText=async()=>{throw Error('denied');};
  button.click();await wait();
  assert.equal(feedback.textContent,w.YanaiI18n.t('ההעתקה לא זמינה. אפשר לסמן ולהעתיק את הכתובת.'));
  assert.equal(feedback.getAttribute('role'),'status');
  Object.defineProperty(w.navigator,'clipboard',{value:undefined,configurable:true});
  button.click();await wait();
  assert.equal(feedback.hidden,false);
  assert.equal(feedback.textContent,w.YanaiI18n.t('ההעתקה לא זמינה. אפשר לסמן ולהעתיק את הכתובת.'));
  assert.equal(requests(),0);
 } finally {dom.window.close();}
});


test('rebar copy uses classic phrasing and retains reinforcement only as a technical tag',async()=>{
 const {dom,doc}=setup();
 try {
  doc.querySelector('#trade-tab-1').click();await wait();
  assert.match(doc.querySelector('#explorer-description').textContent,/עבודות ברזל לשלד המבנה/);
  assert.match(doc.querySelector('#explorer-hint').textContent,/אילו עבודות ברזל מתוכננות/);
  assert.doesNotMatch(doc.querySelector('#explorer-description').textContent+doc.querySelector('#explorer-hint').textContent,/זיון/);
  assert.ok([...doc.querySelectorAll('#explorer-tags span')].some(tag=>tag.textContent==='זיון בטון'));
 } finally {dom.window.close();}
});



test('ribbon follows native scroll on phones and desktop, centers complete word groups and respects reduced motion',async()=>{
 const {dom,w,doc}=setup();
 try {
  const ribbon=doc.querySelector('.kinetic-track'),band=ribbon.parentElement;
  let top=355;
  band.getBoundingClientRect=()=>({top,bottom:top+90,height:90});
  Object.defineProperty(w,'innerHeight',{value:800,configurable:true});
  const home=[...ribbon.children].indexOf(ribbon.querySelector('[data-ribbon-home]'));
  assert.ok(home>=12&&ribbon.children.length-home>=24,'complete repetitions must extend in both directions');
  const words=[...ribbon.querySelectorAll('span')].map(e=>e.textContent);
  assert.equal(words.length,30);
  for(let i=6;i<words.length;i++)assert.equal(words[i],words[i%6],'the sequence repeats without a seam');
  [...ribbon.children].forEach((item,i)=>assert.equal(item.tagName,i%2?'I':'SPAN'));
  [...ribbon.children].forEach((item,i)=>{
   Object.defineProperty(item,'offsetLeft',{value:i*110,configurable:true});
   Object.defineProperty(item,'offsetWidth',{value:i===home+2?120:100,configurable:true});
  });
  const tick=()=>new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));
  const paint=async y=>{top=y;w.dispatchEvent(new w.Event('scroll'));await tick();return Number(ribbon.style.transform.match(/translate3d\(([-.\d]+)px/)[1]);};
  for(const width of [390,1440]){
   Object.defineProperty(w,'innerWidth',{value:width,configurable:true});
   Object.defineProperty(band,'clientWidth',{value:width,configurable:true});
   w.dispatchEvent(new w.Event('resize'));await tick();
   const groupCenter=width===390?home*110+170:(home+4)*110+50;
   assert.equal(Number.parseFloat(ribbon.style.marginLeft)+groupCenter,width/2);
   const entry=await paint(700);assert.ok(entry>0);
   assert.equal(await paint(355),0,'complete words meet the reading line at viewport center');
   const exit=await paint(10);assert.ok(exit<0);
   assert.equal(await paint(700),entry,'reverse scrolling retraces the same positions');
   assert.equal(await paint(900),entry,'offscreen ribbon does not keep animating');
  }
  doc.querySelector('#motion-toggle').click();await tick();
  assert.equal(ribbon.style.transform,'');
  top=200;w.dispatchEvent(new w.Event('scroll'));await tick();assert.equal(ribbon.style.transform,'');
 } finally {dom.window.close();}
});
