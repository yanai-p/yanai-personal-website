import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const script = readFileSync(new URL('experience.js', dist), 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function setup({reduced = false, saved = false, saveData = false, reject = false, pending = false} = {}) {
  const dom = new JSDOM(html, {url: 'http://localhost:4173/', runScripts: 'outside-only', pretendToBeVisual: true});
  const w = dom.window, doc = w.document, video = doc.querySelector('#hero-video');
  const observers = new Map();
  const preference = {matches: reduced, addEventListener(_, listener) { this.listener = listener; }};
  let paused = true, hidden = false, loads = 0, plays = 0, resolvePlay;
  w.matchMedia = () => preference;
  w.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { observers.set(target, this.callback); }
  };
  Object.defineProperty(w.navigator, 'connection', {value: {saveData}});
  Object.defineProperty(doc, 'hidden', {get: () => hidden});
  Object.defineProperty(video, 'paused', {get: () => paused});
  video.load = () => loads++;
  video.pause = () => { paused = true; };
  video.play = () => {
    plays++;
    if (reject) return Promise.reject(new Error('Autoplay denied'));
    if (pending) return new Promise(resolve => { resolvePlay = () => { paused = false; resolve(); }; });
    paused = false;
    return Promise.resolve();
  };
  if (saved) w.sessionStorage.setItem('yanai-motion', 'reduced');
  w.eval(script);
  return {
    dom, doc, video, preference,
    counts: () => ({loads, plays}),
    visible: value => observers.get(video)([{isIntersecting: value}]),
    contactVisible: value => observers.get(doc.querySelector('#contact'))([{isIntersecting: value}]),
    footerVisible: value => observers.get(doc.querySelector('footer'))([{isIntersecting: value}]),
    hidden: value => { hidden = value; doc.dispatchEvent(new w.Event('visibilitychange')); },
    motion: value => doc.dispatchEvent(new w.CustomEvent('site-motion-change', {detail: {paused: value}})),
    resolve: () => resolvePlay(),
  };
}

test('Hero retains its poster without loading footage when motion or data preferences block autoplay', async t => {
  for (const option of [{reduced: true}, {saved: true}, {saveData: true}]) {
    await t.test(JSON.stringify(option), async () => {
      const env = setup(option);
      try {
        env.visible(true); await flush();
        assert.deepEqual(env.counts(), {loads: 0, plays: 0});
        assert.equal(env.video.paused, true);
        assert.equal(env.video.preload, 'none');
        assert.ok(env.video.poster.endsWith('yanai-hero-sites-60fps-poster.jpg'));
        assert.equal(env.video.querySelector('source').hasAttribute('src'), false);
      } finally { env.dom.window.close(); }
    });
  }
});

test('contact controls yield to the inquiry form and keyboard, then return on leaving', async () => {
 const env=setup();
 try {
  const w=env.dom.window,body=env.doc.body,bar=env.doc.querySelector('.mobile-contact');
  Object.defineProperty(w,'scrollY',{value:900,configurable:true});
  w.dispatchEvent(new w.Event('scroll'));
  assert.equal(bar.classList.contains('visible'),true);
  env.contactVisible(true);
  assert.equal(body.classList.contains('contact-in-view'),true);
  assert.equal(bar.inert,true);
  env.doc.querySelector('#lead-phone').focus();
  assert.equal(body.classList.contains('editing-form'),true);
  env.contactVisible(false);
  assert.equal(bar.inert,true,'The keyboard must keep the bottom bar hidden');
  env.doc.querySelector('#lead-phone').blur();
  await new Promise(resolve=>w.requestAnimationFrame(resolve));
  assert.equal(body.classList.contains('editing-form'),false);
  assert.equal(bar.classList.contains('visible'),true);
 } finally {env.dom.window.close();}
});

test('Hero stops offscreen and in background tabs, resumes on return, and respects the global motion control', async () => {
  const env = setup();
  try {
    assert.equal(env.doc.querySelector('#video-toggle,.film-progress'), null);
    assert.equal(env.video.controls, false);
    env.visible(true); await flush();
    assert.equal(env.video.paused, false);
    assert.equal(env.video.preload, 'auto');
    assert.ok(env.video.querySelector('source').src.endsWith('yanai-hero-sites-60fps-web-mobile.mp4'));
    env.visible(false); assert.equal(env.video.paused, true);
    env.visible(true); await flush(); assert.equal(env.video.paused, false);
    env.hidden(true); assert.equal(env.video.paused, true);
    env.hidden(false); await flush(); assert.equal(env.video.paused, false);
    env.motion(true); env.hidden(true); env.hidden(false); await flush();
    assert.equal(env.video.paused, true);
    env.motion(false); await flush(); assert.equal(env.video.paused, false);
    env.preference.matches = true; env.preference.listener();
    assert.equal(env.video.paused, true);
    env.preference.matches = false; env.preference.listener(); await flush();
    assert.equal(env.video.paused, false);
    assert.equal(env.counts().loads, 1, 'Returning to the Hero must not reload the video');
  } finally { env.dom.window.close(); }
});

test('Late play completion cannot override motion reduction; autoplay rejection does not break the page', async () => {
  const pending = setup({pending: true});
  try {
    pending.visible(true); pending.motion(true); pending.resolve(); await flush();
    assert.equal(pending.video.paused, true);
  } finally { pending.dom.window.close(); }
  const denied = setup({reject: true});
  try {
    denied.visible(true); await flush();
    assert.equal(denied.video.paused, true);
    assert.ok(denied.video.poster);
    denied.doc.querySelector('#trade-tab-1').click();
    assert.equal(denied.doc.querySelector('#trade-tab-1').getAttribute('aria-selected'), 'true');
  } finally { denied.dom.window.close(); }
});

test('bottom contact bar stays out of the footer and restores correctly on reverse scroll',()=>{
 const env=setup();
 try {
  const w=env.dom.window,body=env.doc.body,bar=env.doc.querySelector('.mobile-contact');
  const scroll=y=>{Object.defineProperty(w,'scrollY',{value:y,configurable:true});w.dispatchEvent(new w.Event('scroll'));};
  for(const y of [0,501,450,700,0,900]){scroll(y);assert.equal(bar.classList.contains('visible'),y>500);assert.equal(bar.inert,y<=500);}
  env.contactVisible(true);env.footerVisible(true);env.contactVisible(false);
  assert.equal(body.classList.contains('footer-in-view'),true);
  assert.equal(bar.classList.contains('visible'),false);assert.equal(bar.inert,true);
  env.footerVisible(false);assert.equal(bar.classList.contains('visible'),true);assert.equal(bar.inert,false);
  env.contactVisible(true);env.footerVisible(true);env.footerVisible(false);
  assert.equal(bar.inert,true,'Leaving footer while the form is visible must not reveal a floating action');
 } finally {env.dom.window.close();}
});


test('WhatsApp descends and reverses without replacing the focused link when it docks',async()=>{
 const env=setup();
 try {
  const w=env.dom.window,link=env.doc.querySelector('.floating-contact');
  Object.defineProperty(w,'innerWidth',{value:390,configurable:true});
  const scroll=async y=>{
   Object.defineProperty(w,'scrollY',{value:y,configurable:true});
   w.dispatchEvent(new w.Event('scroll'));
   await new Promise(resolve=>w.requestAnimationFrame(resolve));
   return Number.parseFloat(link.style.getPropertyValue('--contact-float-offset'));
  };
  const start=await scroll(0),middle=await scroll(250);
  assert.ok(start<middle&&middle<0,'The control descends progressively toward the dock');
  link.focus();
  assert.equal(await scroll(600),0);
  assert.equal(env.doc.activeElement,link,'Docking preserves the same focused control');
  assert.equal(link.inert,false,'The docked WhatsApp must remain operable');
  assert.equal(await scroll(250),middle,'Reverse scroll retraces the same path');
  assert.equal(await scroll(0),start);
  env.contactVisible(true);assert.equal(link.inert,true);
  env.contactVisible(false);assert.equal(link.inert,false);
 } finally {env.dom.window.close();}
});
