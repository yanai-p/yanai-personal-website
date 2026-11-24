import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dist=new URL('../dist/',import.meta.url);
function setup(){
 const dom=new JSDOM(readFileSync(new URL('index.html',dist),'utf8'),{url:'http://localhost:4173',runScripts:'outside-only'});
 const w=dom.window,doc=w.document,opened=[],timers=[];
 w.open=(...args)=>{opened.push(args);return null;};w.setTimeout=fn=>{timers.push(fn);return 1;};
 w.fetch=()=>{throw Error('Email requests must not be made');};
 for(const file of ['vendor/phone-number.js','validation.js','contact.js'])w.eval(readFileSync(new URL(file,dist),'utf8'));
 const form=doc.querySelector('#contact-form');
 const set=(key,value)=>{form.elements.namedItem(key).value=value;};
 set('company','חברת בדיקה');set('phone','054-2331748');set('stage','גמר');set('trade','רצפים');set('details','מרכז, שני עובדים');
 return {dom,w,doc,form,opened,set,retry(){timers.splice(0).forEach(fn=>fn());},submit(){form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}};
}
test('valid inquiry opens WhatsApp immediately with all entered details and space to continue',()=>{
 const e=setup();try{e.set('name','איש קשר');e.submit();assert.equal(e.opened.length,1);const [url,target,features]=e.opened[0];assert.equal(target,'_blank');assert.match(features,/noopener/);const parsed=new URL(url);assert.equal(parsed.origin,'https://wa.me');assert.equal(parsed.pathname,'/972542331748');const text=parsed.searchParams.get('text');for(const value of ['חברת בדיקה','איש קשר','054-2331748','גמר','רצפים','מרכז, שני עובדים'])assert.ok(text.includes(value));assert.ok(text.endsWith('\n\n'));assert.equal(e.form.elements.company.value,'חברת בדיקה');assert.equal(e.doc.querySelector('#form-status').dataset.state,'ready');assert.ok(!e.doc.querySelector('#form-status').textContent.includes('בהצלחה'));}finally{e.dom.window.close();}
});
test('invalid company and phone focus a useful summary without opening WhatsApp',()=>{
 const e=setup();try{e.set('company',' ');e.set('phone','12');e.submit();assert.equal(e.opened.length,0);assert.equal(e.doc.activeElement.id,'validation-summary');assert.equal(e.doc.querySelectorAll('.validation-summary li').length,2);e.set('company','חברה');e.form.elements.company.dispatchEvent(new e.w.Event('input',{bubbles:true}));assert.equal(e.doc.querySelector('#company-error').hidden,true);}finally{e.dom.window.close();}
});
test('missing optional fields do not create empty labels, and a popup fallback is always available',()=>{
 const e=setup();try{for(const key of ['name','stage','trade','details'])e.set(key,'');e.submit();const text=new URL(e.opened[0][0]).searchParams.get('text');assert.ok(!text.includes('שלב:'));assert.ok(!text.includes('מקצוע:'));const link=e.doc.querySelector('#form-status a');assert.equal(link.href,e.opened[0][0]);assert.equal(link.target,'_blank');}finally{e.dom.window.close();}
});
test('double activation opens one tab, while returning clients can reopen with edited details',()=>{
 const e=setup();try{e.submit();e.submit();assert.equal(e.opened.length,1);e.retry();e.set('details','מידע נוסף');e.submit();assert.equal(e.opened.length,2);assert.ok(new URL(e.opened[1][0]).searchParams.get('text').includes('מידע נוסף'));}finally{e.dom.window.close();}
});
test('phone validation accepts punctuation and rejects letters and invalid lengths',()=>{
 for(const phone of ['+972 (54) 233-1748','054.233.1748','054\u200f-233-1748','12345678','054hello2331748','1234567890123456']){const e=setup();try{e.set('phone',phone);e.submit();assert.equal(e.opened.length,phone.startsWith('+')||phone.startsWith('054.')||phone.includes('\u200f')?1:0);}finally{e.dom.window.close();}}
});
test('honeypot suppresses the handoff',()=>{const e=setup();try{e.set('_honey','bot');e.submit();assert.equal(e.opened.length,0);}finally{e.dom.window.close();}});

test('real country patterns accept Israeli landlines and international formats; invented prefixes fail',()=>{
 const e=setup();try{
  for(const number of ['08-9228543','0542331748','+972 54 2331748','00972 54 2331748','+44 20 7946 0018','+1 202 555 0123','+66 81 234 5678','+91 91234 56789','+94 71 234 5678','+86 131 2345 6789','+40 712 345 678','+998 91 234 5678','٠٥٤٢٣٣١٧٤٨','０５４２３３１７４８'])assert.equal(e.w.YanaiValidation.phoneInfo(number).valid,true,number);
  for(const number of ['0501234567','+972112331748','05423317','+999123456789','+4420794600189999','call +442079460018','1234567890'])assert.equal(e.w.YanaiValidation.phoneInfo(number).valid,false,number);
 }finally{e.dom.window.close();}
});

test('required fields guide before submission and phone corrections update immediately',()=>{
 const e=setup();try{
  e.set('company','');e.set('phone','');e.form.elements.phone.dispatchEvent(new e.w.Event('input',{bubbles:true}));
  assert.equal(e.doc.querySelector('#phone-error').hidden,true);
  assert.match(e.doc.querySelector('#form-readiness').textContent,/שם החברה.*טלפון/);
  e.form.elements.phone.dispatchEvent(new e.w.Event('focusout',{bubbles:true}));
  assert.equal(e.form.elements.phone.getAttribute('aria-invalid'),'true');
  assert.equal(e.doc.querySelector('#validation-summary').hidden,true);
  e.set('phone','+44 20 7946 0018');e.form.elements.phone.dispatchEvent(new e.w.Event('input',{bubbles:true}));
  assert.equal(e.doc.querySelector('#phone-error').hidden,true);
  assert.equal(e.doc.querySelector('#phone-feedback').hidden,false);
  assert.equal(e.doc.querySelector('#phone-feedback').textContent,'✓ מספר תקין · מדינה: בריטניה');
  assert.equal(e.doc.querySelector('#phone-feedback bdi'),null);
  e.set('company','Company');e.form.elements.company.dispatchEvent(new e.w.Event('input',{bubbles:true}));
  assert.equal(e.doc.querySelector('#form-readiness').classList.contains('is-ready'),true);
  assert.equal(e.opened.length,0);
 }finally{e.dom.window.close();}
});

test('country detection distinguishes shared calling codes and accepts RTL pasted numbers',()=>{
 const e=setup();try{
  const cases=[['0542331748','IL'],['972-54-233-1748+','IL'],['+1 202 555 0123','US'],['1-202-555-0123+','US'],['+1 416 555 0123','CA'],['+1 242 365 1234','BS'],['+44 20 7946 0018','GB'],['+66 81 234 5678','TH'],['+91 91234 56789','IN'],['+94 71 234 5678','LK'],['+86 131 2345 6789','CN'],['+40 712 345 678','RO'],['+998 91 234 5678','UZ']];
  for(const [number,country] of cases){
   const info=e.w.YanaiValidation.phoneInfo(number);
   assert.equal(info.valid,true,number);assert.equal(info.country,country,number);
   e.set('phone',number);e.form.elements.phone.dispatchEvent(new e.w.Event('input',{bubbles:true}));
   const name=new Intl.DisplayNames(['he'],{type:'region'}).of(country);
   assert.equal(e.doc.querySelector('#phone-feedback').textContent,'✓ מספר תקין · מדינה: '+name);
  }
  for(const number of ['+1-555-234-5678','1-555-234-5678+','+1-202-555-0123+','1+2025550123']){
   e.set('phone',number);e.form.elements.phone.dispatchEvent(new e.w.Event('input',{bubbles:true}));
   assert.equal(e.w.YanaiValidation.phoneInfo(number).valid,false,number);
   assert.equal(e.doc.querySelector('#phone-feedback').hidden,true);
  }
  e.set('phone','+80012345678');e.form.elements.phone.dispatchEvent(new e.w.Event('input',{bubbles:true}));
  assert.equal(e.doc.querySelector('#phone-feedback').textContent,'✓ מספר תקין · מספר בינלאומי ללא שיוך למדינה');
 }finally{e.dom.window.close();}
});

test('editing stage, trade, text or language invalidates the old prepared WhatsApp link',()=>{
 for(const change of ['stage','trade','details','language']){
  const e=setup();try{
   e.submit();const status=e.doc.querySelector('#form-status');assert.equal(status.hidden,false);
   if(change==='language')e.doc.dispatchEvent(new e.w.Event('site-language-change'));
   else {e.set(change,change==='stage'?'יסודות':change==='trade'?'טפסנים':'עוד מידע');e.form.elements.namedItem(change).dispatchEvent(new e.w.Event(change==='details'?'input':'change',{bubbles:true}));}
   assert.equal(status.hidden,true);assert.equal(status.querySelector('a'),null);
   e.retry();e.submit();assert.equal(status.hidden,false);
   if(change==='stage')assert.ok(new URL(e.opened.at(-1)[0]).searchParams.get('text').includes('יסודות'));
  }finally{e.dom.window.close();}
 }
});
