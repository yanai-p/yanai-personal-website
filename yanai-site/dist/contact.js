const leadForm=document.querySelector('#contact-form');
const validationSummary=document.querySelector('#validation-summary');
const fieldNames=['company','phone'];
function invalidatePreparedMessage(){
 const status=document.querySelector('#form-status');
 status.hidden=true;status.replaceChildren();delete status.dataset.state;
}
leadForm.addEventListener('input',invalidatePreparedMessage);
leadForm.addEventListener('change',invalidatePreparedMessage);
document.addEventListener('site-language-change',invalidatePreparedMessage);
leadForm.noValidate=true;
function showFieldErrors(errors){
 fieldNames.forEach(name=>{
  const input=leadForm.querySelector(`[name="${name}"]`);const error=document.querySelector(`#${name}-error`);
  error.textContent=errors[name]||'';error.hidden=!errors[name];
  if(errors[name])input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
 });
 const list=validationSummary.querySelector('ul');list.replaceChildren();
 Object.entries(errors).forEach(([name,message])=>{
  const item=document.createElement('li');const link=document.createElement('a');link.href=`#lead-${name}`;link.textContent=message;
  link.addEventListener('click',event=>{event.preventDefault();leadForm.querySelector(`[name="${name}"]`).focus();});item.append(link);list.append(item);
 });
 validationSummary.hidden=!Object.keys(errors).length;
}
const touched=new Set();
let submitted=false;
const formTr=(text,params)=>globalThis.YanaiI18n?.t(text,params)||text.replace(/\{(\w+)\}/g,(_,key)=>params?.[key]??'');
function refreshFormFeedback(){
 const data=new FormData(leadForm),errors=YanaiValidation.validate(data);
 const visible={};
 fieldNames.forEach(name=>{if(errors[name]&&(submitted||touched.has(name)))visible[name]=formTr(errors[name]);});
 showFieldErrors(visible);
 // Inline guidance while filling; a linked summary only after an attempted handoff.
 if(!submitted)validationSummary.hidden=true;
 const info=YanaiValidation.phoneInfo(data.get('phone'));
 const feedback=document.querySelector('#phone-feedback');
 feedback.hidden=!info.valid;
 leadForm.elements.phone.classList.toggle('field-valid',info.valid);
 if(info.valid){
  let country='';try{country=info.country?new Intl.DisplayNames([document.documentElement.lang||'he'],{type:'region'}).of(info.country):'';}catch{}
  const label=formTr('מספר תקין');
  const region=country?formTr('מדינה: {country}',{country}):formTr(info.nonGeographic?'מספר בינלאומי ללא שיוך למדינה':'לא ניתן לזהות מדינה בוודאות');
  const key=label+region;
  if(feedback.dataset.value!==key){
   feedback.textContent='✓ '+label+' · '+region;feedback.dataset.value=key;
  }
 }
 const missing=fieldNames.filter(name=>errors[name]);
 const text=missing.length?formTr('נשאר להשלים: {fields}',{fields:missing.map(n=>formTr(n==='company'?'שם החברה':'טלפון')).join(' · ')}):formTr('הפרטים מוכנים — אפשר להמשיך לוואטסאפ.');
 const readiness=document.querySelector('#form-readiness');
 if(readiness.textContent!==text)readiness.textContent=text;
 readiness.classList.toggle('is-ready',!missing.length);
}
leadForm.addEventListener('focusout',event=>{if(fieldNames.includes(event.target.name)){touched.add(event.target.name);refreshFormFeedback();}});
leadForm.addEventListener('input',refreshFormFeedback);
leadForm.addEventListener('change',refreshFormFeedback);
document.addEventListener('site-language-change',refreshFormFeedback);
refreshFormFeedback();
leadForm.querySelector('[type="submit"]').disabled=false;
let openingWhatsApp=false;
leadForm.addEventListener('submit',event=>{
 event.preventDefault();if(openingWhatsApp)return;
 const data=new FormData(leadForm);if(data.get('_honey'))return;
 submitted=true;refreshFormFeedback();
 const errors=YanaiValidation.validate(data);
 const status=document.querySelector('#form-status');
 if(Object.keys(errors).length){validationSummary.focus();status.hidden=true;return;}
 const tr=(value,params)=>globalThis.YanaiI18n?.t(value,params)||value.replace(/\{(\w+)\}/g,(_,key)=>params?.[key]??'');
 const value=key=>String(data.get(key)||'').trim();
 const message=[tr('שלום חברת ינאי פרסונל, אשמח לדבר על הפרויקט.'),tr('חברה: {company}',{company:value('company')}),value('name')&&tr('שם: {name}',{name:value('name')}),tr('טלפון: {phone}',{phone:value('phone')}),value('stage')&&tr('שלב: {stage}',{stage:tr(value('stage'))}),value('trade')&&tr('מקצוע: {trade}',{trade:tr(value('trade'))}),value('details')].filter(Boolean).join('\n')+'\n\n';
 const url=`https://wa.me/972542331748?text=${encodeURIComponent(message)}`;
 status.replaceChildren(document.createTextNode('הפרטים מוכנים. אם וואטסאפ לא נפתח, לחצו על הקישור:'));
 const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='המשיכו עם הפרטים בוואטסאפ ←';status.append(link);
 status.dataset.state='ready';status.hidden=false;
 // Open synchronously inside the user's click. No network request or await can
 // break mobile popup activation; WhatsApp still requires the customer to send.
 openingWhatsApp=true;
 try{window.open(url,'_blank','noopener,noreferrer');}catch{}
 setTimeout(()=>{openingWhatsApp=false;},700);
});
