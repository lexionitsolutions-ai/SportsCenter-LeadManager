'use strict';
const SERVICES = ['Gym Setup', 'Machine Equipments', 'Turf Installation', 'Sports Equipments', 'Home Gym Setup', 'Treadmills', 'Cardio Equipments', 'Mat Installation'];
const STATUSES = ['New', 'Contacted', 'Quotation sent', 'Call later', 'Converted', 'Not interested', 'Wrong number'];
const CLOSED = ['Converted', 'Not interested', 'Wrong number'];
const WEBSITE = 'https://zenithfitness360.lexionitsolutions.workers.dev/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAdGRleAVJ1P5leHRuA2FlbQIxMQBwZG9mAmZkaWQWUQ7sUfKgu9XNtPwyAdD71XR4Vl2KqXNydGMGYXBwX2lkDzEyNDAyNDU3NDI4NzQxNAABp1A9mkMTcAKzoGKrVvxCIDYp5wCXud4nNSYMNGEVoLKEotFoZ95ZnNaZiBLp_aem_OZg-6nOFSbKYcGykYAgdfQ';
const INSTAGRAM = 'https://www.instagram.com/sports_centre_kop?srtk=MWhjYW5mN2lpYmhsZA==';
const API_URL = 'https://script.google.com/macros/s/AKfycbxKL-uC53lSZCHTMwSUYcgNJIlT7CsxgTaMRSy9wIBmgUsoEWxjBMEb5lN9sySXlbVr/exec';
let staffAccessCode='';
try { staffAccessCode=localStorage.getItem('sports-centre-access')||''; } catch {}
if(!staffAccessCode){try { staffAccessCode=sessionStorage.getItem('sports-centre-access')||''; } catch {}}
function rememberAccessCode() {
  if(!staffAccessCode)return;
  try {localStorage.setItem('sports-centre-access',staffAccessCode);}catch{}
  try {sessionStorage.setItem('sports-centre-access',staffAccessCode);}catch{}
}
function clearAccessCode() {
  staffAccessCode='';
  try{localStorage.removeItem('sports-centre-access');}catch{}
  try{sessionStorage.removeItem('sports-centre-access');}catch{}
}
const live = typeof google !== 'undefined' && !!google.script?.run;
const state = { leads: [], filter: 'today', tab: 'enquiries', editing: null, busy: false, ready: false, lastSaved: null, requestId: null, updateRequestId: null };
const $ = id => document.getElementById(id);
function todayKey() { return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function addDays(key, amount) { const d = new Date(key+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10); }
function displayDate(key) { return key ? new Date(key+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}) : 'No next follow-up'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function phoneNumber(value) { let n=String(value).replace(/[\s()-]/g,''); if(n.startsWith('+91'))n=n.slice(3); else if(/^91\d{10}$/.test(n))n=n.slice(2); return /^[6-9]\d{9}$/.test(n)?n:''; }
function uuid() { return globalThis.crypto?.randomUUID?.() || 'sc-'+Date.now()+'-'+Math.random().toString(36).slice(2); }
function openLead(lead) { return !CLOSED.includes(lead.status); }
function initials(name) { return name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(); }
function introduction(lead) { return `Hello ${lead.name},\n\nThank you for enquiring with *Sports Centre*!\n\nWe help you build spaces for sport and fitness, with:\n• Complete gym setups & home gyms\n• Gym machines, treadmills & cardio equipment\n• Sports equipment\n• Turf installation\n• Sports mat installation\n\nWe’ve noted your interest in *${lead.interestedIn.join(', ')}*. Our team looks forward to helping you find the right solution.\n\nExplore Zenith Fitness (our temporary reference website):\n${WEBSITE}\n\nFollow Sports Centre on Instagram:\n${INSTAGRAM}\n\nTell us more about your requirements, and let’s plan your next project.\n\nBest regards,\nTeam Sports Centre`; }
function whatsappUrl(lead, message=introduction(lead)) { return 'https://wa.me/91'+phoneNumber(lead.contact)+'?text='+encodeURIComponent(message); }
function toast(message, error=false) { $('toast').textContent=message; $('toast').className=error?'error':''; $('toast').hidden=false; clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').hidden=true,error?9000:5000); }
function apiError(result) {
  const error=new Error(result.message||'Could not complete the request.');error.code=result.code;return error;
}
async function api(action,payload={}) {
  const request={action,...payload,apiKey:staffAccessCode};
  if(live) return new Promise((resolve,reject)=>google.script.run.withSuccessHandler(result=>{if(result.success)resolve(result);else reject(apiError(result));}).withFailureHandler(e=>reject(Error(e.message||'Connection failed.'))).handleRequest(request));
  // URL-encoded POST avoids a JSON preflight; Google redirects its JSON response.
  const body=new URLSearchParams({payload:JSON.stringify(request)});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
  try {
    const response=await fetch(API_URL,{method:'POST',body,redirect:'follow',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error('Google Sheets connection failed (HTTP '+response.status+'). Check your Apps Script deployment.');
    let result;try{result=JSON.parse(await response.text());}catch{throw Error('The script returned a page instead of JSON. Replace Code.gs, run setup, and redeploy as Execute as Me / Anyone.');}
    if(!result.success)throw apiError(result);
    return result;
  } catch(error) {
    if(error.name==='AbortError')throw Error('Google Sheets did not respond in time. Your form is kept; retry with the same details.');
    throw error;
  } finally {clearTimeout(timeout);}
}
function showAccessDialog() {
  $('accessCode').value='';$('accessError').hidden=true;$('forgetAccessBtn').hidden=!staffAccessCode;
  if(!$('accessDialog').open)$('accessDialog').showModal();
}
async function loadLeads() {
  if(state.busy)return false;
  $('refreshBtn').disabled=true;$('connection').textContent='Connecting...';
  try {
    const result=await api('getLeads');
    if(!Array.isArray(result.leads))throw Error('Invalid response from the script. Check the deployed Code.gs version.');
    state.leads=result.leads;state.ready=true;rememberAccessCode();render();$('connection').textContent='Google Sheets connected';$('modeBanner').hidden=true;return true;
  } catch(error) {
    state.ready=false;$('connection').textContent='Not connected';$('modeBanner').hidden=false;$('connectionHelp').textContent=error.message;
    if(error.code==='AUTH_REQUIRED'){clearAccessCode();state.leads=[];render();showAccessDialog();$('accessError').textContent=error.message;$('accessError').hidden=false;}
    else toast(error.message,true);
    return false;
  } finally {syncButtons();}
}
async function connectSheets(event) {
  event.preventDefault();staffAccessCode=$('accessCode').value.trim();if(!staffAccessCode)return;
  $('connectBtn').disabled=true;$('connectBtn').textContent='Connecting...';$('accessError').hidden=true;
  try {
    if(await loadLeads()) {
      $('accessDialog').close();$('accessCode').value='';toast('Connected to Google Sheets.');
    } else {
      $('accessError').textContent=$('connectionHelp').textContent;$('accessError').hidden=false;
    }
  } finally {$('connectBtn').disabled=false;$('connectBtn').textContent='Connect';}
}
function syncButtons(){ $('saveEnquiry').disabled=state.busy||!state.ready;$('saveUpdate').disabled=state.busy||!state.ready;$('refreshBtn').disabled=state.busy; }
function switchTab(tab) {state.tab=tab==='followups'?'followups':'enquiries';const follow=state.tab==='followups';$('enquiriesPanel').hidden=follow;$('followupsPanel').hidden=!follow;document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-current',b.dataset.tab===state.tab?'page':'false');});$('pageTitle').textContent=follow?'Follow-ups':'New enquiry';if(location.hash!=='#'+state.tab)history.replaceState(null,'','#'+state.tab);render();}
function filteredLeads() {const t=todayKey(),query=$('search').value.toLowerCase().trim(),date=$('dateFilter').value;return state.leads.filter(l=>{
    const matchesDate=date?openLead(l)&&l.followUpDate===date:({today:openLead(l)&&l.followUpDate===t,yesterday:openLead(l)&&l.followUpDate===addDays(t,-1),overdue:openLead(l)&&!!l.followUpDate&&l.followUpDate<t,tomorrow:openLead(l)&&l.followUpDate===addDays(t,1),pending:openLead(l),converted:l.status==='Converted',all:true})[state.filter];
    return matchesDate&&(!query||[l.name,l.contact,...l.interestedIn].join(' ').toLowerCase().includes(query));
  }).sort((a,b)=>(a.followUpDate||'9999').localeCompare(b.followUpDate||'9999')||b.createdAt.localeCompare(a.createdAt));}
function render() {
  const t=todayKey(),pending=state.leads.filter(openLead),today=pending.filter(l=>l.followUpDate===t).length,overdue=pending.filter(l=>l.followUpDate&&l.followUpDate<t).length;
  $('totalStat').textContent=state.leads.length;$('todayStat').textContent=today;$('overdueStat').textContent=overdue;$('wonStat').textContent=state.leads.filter(l=>l.status==='Converted').length;$('navCount').textContent=today+overdue;$('yesterdayStat').textContent=pending.filter(l=>l.followUpDate===addDays(t,-1)).length;$('tomorrowStat').textContent=pending.filter(l=>l.followUpDate===addDays(t,1)).length;
  const leads=filteredLeads();$('resultCount').textContent=leads.length+' '+(leads.length===1?'lead':'leads');
  const labels={today:'Today',yesterday:'Yesterday',tomorrow:'Tomorrow',overdue:'Overdue',pending:'All open',converted:'Converted',all:'All leads'};
  $('filterTitle').textContent=$('dateFilter').value?displayDate($('dateFilter').value):labels[state.filter];
  const detail=(label,value)=>`<div><span class="detail-label">${label}</span><span class="detail-value">${escapeHtml(value)}</span></div>`;
  $('leadList').innerHTML=leads.length?leads.map(l=>{
    const late=openLead(l)&&l.followUpDate&&l.followUpDate<t;
    return `<article class="lead-card"><div class="lead-top"><div><h3>${escapeHtml(l.name)}</h3><a href="tel:+91${phoneNumber(l.contact)}">${escapeHtml(l.contact)}</a></div><div class="badges"><span class="badge ${l.status==='Converted'?'converted':''}">${escapeHtml(l.status)}</span>${late?'<span class="badge overdue">Overdue</span>':''}</div></div><div class="lead-info">${detail('Requirements / notes',l.notes||'No notes added')}${detail('Interested in',l.interestedIn.join(', '))}${detail('Source',l.source)}${detail('Follow-up date',displayDate(l.followUpDate))}${detail('Latest follow-up',l.history[0]?.reason||'No follow-up recorded')}</div><div class="lead-actions"><a class="secondary call-action" href="tel:+91${phoneNumber(l.contact)}">Call</a><button class="secondary whatsapp-action" data-whatsapp="${escapeHtml(l.id)}">WhatsApp</button><button class="primary" data-update="${escapeHtml(l.id)}">Update</button></div></article>`;
  }).join(''):'<div class="empty-state"><strong>No leads found.</strong>Try another filter or add a new enquiry.</div>';
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',!$('dateFilter').value&&b.dataset.filter===state.filter);b.setAttribute('aria-pressed',String(!$('dateFilter').value&&b.dataset.filter===state.filter));});
}
function upsert(lead){const i=state.leads.findIndex(l=>l.id===lead.id);if(i<0)state.leads.unshift(lead);else state.leads[i]=lead;render();}
function showWhatsApp(lead){state.lastSaved=lead;$('whatsappLink').href=whatsappUrl(lead);$('whatsappDialog').showModal();}
async function saveEnquiry(event){event.preventDefault();if(state.busy)return;const interests=[$('interestedIn').value];if(!interests[0]){$('interestedIn').reportValidity();return;}const contact=phoneNumber($('contact').value);if(!contact){$('contact').setCustomValidity('Enter a valid Indian 10-digit mobile number, starting with 6, 7, 8 or 9.');$('contact').reportValidity();return;}if(!$('name').value.trim()){$('name').setCustomValidity('Enter the customer’s name.');$('name').reportValidity();return;}
  if($('followUpDate').value<todayKey()){toast('Choose today or a future follow-up date.',true);return;}
  const payload={name:$('name').value.trim(),contact,interestedIn:interests,followUpDate:$('followUpDate').value,source:$('source').value,notes:$('notes').value.trim(),requestId:state.requestId||uuid()};state.requestId=payload.requestId;state.busy=true;syncButtons();$('saveEnquiry').textContent='Saving enquiry…';
  try{const {lead}=await api('createLead',payload);upsert(lead);state.requestId=null;$('enquiryForm').reset();$('followUpDate').value=addDays(todayKey(),1);showWhatsApp(lead);toast('Enquiry saved to Google Sheets.');}catch(e){toast(e.message+' Your form has been kept. Retry saving.',true);}finally{state.busy=false;syncButtons();$('saveEnquiry').textContent='Save enquiry';}}
function openUpdate(lead){state.editing=lead;state.updateRequestId=uuid();$('updateTitle').textContent=lead.name;$('updateContact').textContent='+91 '+lead.contact+' · '+lead.interestedIn.join(', ');$('updateStatus').value=lead.status;$('updateDate').value=openLead(lead)?(lead.followUpDate<todayKey()?todayKey():lead.followUpDate):'';$('updateReason').value='';updateDateRequirement();$('updateDialog').querySelector('details').open=false;$('historyList').innerHTML=lead.history.length?lead.history.map(h=>`<div class="history-item"><strong>${escapeHtml(new Date(h.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST · ${escapeHtml(h.status)}</strong>${escapeHtml(h.reason)}<br>Next: ${escapeHtml(displayDate(h.nextDate))}</div>`).join(''):'<p class="muted">No follow-ups recorded yet.</p>';$('updateDialog').showModal();}
function updateDateRequirement(){const closed=CLOSED.includes($('updateStatus').value);$('updateDate').required=!closed;$('updateDate').disabled=closed;$('updateDate').min=todayKey();}
async function saveUpdate(event){event.preventDefault();if(state.busy)return;const reason=$('updateReason').value.trim();if(!reason){$('updateReason').setCustomValidity('Add the conversation or reason.');$('updateReason').reportValidity();return;}const status=$('updateStatus').value,followUpDate=CLOSED.includes(status)?'':$('updateDate').value;if(!CLOSED.includes(status)&&(!followUpDate||followUpDate<todayKey())){toast('Choose today or a future follow-up date.',true);return;}
  state.busy=true;syncButtons();$('saveUpdate').textContent='Saving…';try{const {lead}=await api('updateLead',{id:state.editing.id,version:state.editing.version,status,followUpDate,reason,requestId:state.updateRequestId});upsert(lead);$('updateDialog').close();toast('Follow-up updated. Conversation added to history.');}catch(e){toast(e.message,true);}finally{state.busy=false;syncButtons();$('saveUpdate').textContent='Save follow-up';}}
function init(){
  $('interestedIn').innerHTML='<option value="">Select a service</option>'+SERVICES.map(s=>`<option value="${s}">${s}</option>`).join('');
  $('todayLabel').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});$('followUpDate').min=todayKey();$('followUpDate').value=addDays(todayKey(),1);$('modeBanner').hidden=false;
  $('forgetAccessBtn').addEventListener('click',()=>{clearAccessCode();state.ready=false;state.leads=[];render();syncButtons();$('connection').textContent='Not connected';$('modeBanner').hidden=false;showAccessDialog();});
  $('staffAccessBtn').addEventListener('click',showAccessDialog);$('accessForm').addEventListener('submit',connectSheets);
  $('enquiryForm').addEventListener('submit',saveEnquiry);$('updateForm').addEventListener('submit',saveUpdate);$('refreshBtn').addEventListener('click',loadLeads);
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  $('filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){state.filter=b.dataset.filter;$('dateFilter').value='';render();}});$('search').addEventListener('input',render);$('dateFilter').addEventListener('change',render);$('clearFilters').addEventListener('click',()=>{$('search').value='';$('dateFilter').value='';state.filter='today';render();});
  $('leadList').addEventListener('click',e=>{const b=e.target.closest('[data-update],[data-whatsapp]');if(!b||state.busy)return;const lead=state.leads.find(l=>l.id===(b.dataset.update||b.dataset.whatsapp));if(lead)b.dataset.update?openUpdate(lead):showWhatsApp(lead);});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(!state.busy)$(b.dataset.close).close();}));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{if(state.busy)e.preventDefault();}));
  $('updateStatus').addEventListener('change',updateDateRequirement);$('contact').addEventListener('input',()=>$('contact').setCustomValidity(''));$('name').addEventListener('input',()=>$('name').setCustomValidity(''));$('updateReason').addEventListener('input',()=>$('updateReason').setCustomValidity(''));
  $('enquiryForm').addEventListener('input',()=>{state.requestId=null;});$('updateForm').addEventListener('input',()=>{state.updateRequestId=uuid();});
  $('whatsappLink').addEventListener('click',()=>$('whatsappDialog').close());
  window.addEventListener('hashchange',()=>switchTab(location.hash.slice(1)));switchTab(location.hash.slice(1));syncButtons();if(live||staffAccessCode)loadLeads();else showAccessDialog();
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
if(typeof module!=='undefined')module.exports={phoneNumber,addDays,todayKey,introduction,escapeHtml,openLead,SERVICES};
