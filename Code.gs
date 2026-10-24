/** Sports Centre Lead Studio — paste into your spreadsheet's Apps Script project. */
const LEAD_HEADERS_ = ['id','createdAt','updatedAt','name','contact','interestedIn','source','followUpDate','status','notes','version','requestId','history'];
const SERVICES_ = ['Gym Setup','Machine Equipments','Turf Installation','Sports Equipments','Home Gym Setup','Treadmills','Cardio Equipments','Mat Installation'];
const STATUSES_ = ['New','Contacted','Quotation sent','Call later','Converted','Not interested','Wrong number'];
const CLOSED_ = ['Converted','Not interested','Wrong number'];

function doGet() {
  // Public app shell. Lead access is open to anyone, as requested.
  return HtmlService.createHtmlOutputFromFile('App').setTitle('Sports Centre | Lead Manager').addMetaTag('viewport','width=device-width, initial-scale=1');
}

/** HTTP endpoint used by index.html, including when hosted outside Apps Script. */
function doPost(e) {
  let result;
  try {
    const request=JSON.parse(e && e.parameter && e.parameter.payload || '{}');
    result=handleRequest(request);
  } catch(error) {
    result={success:false,message:error.message,code:error.code||'REQUEST_ERROR'};
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor of a spreadsheet-bound project, before deployment. */
function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open Apps Script from your Google Sheet using Extensions > Apps Script.');
  const props=PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID',spreadsheet.getId());
  spreadsheet.setSpreadsheetTimeZone('Asia/Kolkata');
  const sheet=sheet_();
  sheet.setFrozenRows(1);sheet.getRange(1,1,1,LEAD_HEADERS_.length).setBackground('#202127').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(4,180);sheet.setColumnWidth(6,250);sheet.setColumnWidth(10,300);
}

/** Public endpoint: anyone can read, create, and update leads. */
function handleRequest(request) {
  let lock;
  try {
    const actor='Staff';
    if (!request || !['getLeads','createLead','updateLead'].includes(request.action)) throw new Error('Unknown action.');
    lock=LockService.getScriptLock();lock.waitLock(30000);
    const sheet=sheet_();
    const leads=readLeads_(sheet);
    if(request.action==='getLeads')return {success:true,leads:leads};
    const requestId=text_(request.requestId,100,true);
    if(request.action==='createLead') {
      const existing=leads.find(l=>l.requestId===requestId);if(existing)return {success:true,lead:existing};
      const phone=phone_(request.contact);
      const interests=request.interestedIn;
      if(!Array.isArray(interests)||!interests.length||interests.some(s=>!SERVICES_.includes(s)))throw new Error('Select valid services.');
      const lead={id:Utilities.getUuid(),createdAt:new Date().toISOString(),updatedAt:'',name:text_(request.name,100,true),contact:phone,interestedIn:[...new Set(interests)],source:text_(request.source,50,true),followUpDate:date_(request.followUpDate),status:'New',notes:text_(request.notes,2000,false),version:1,requestId:requestId,history:[]};
      writeLead_(sheet,sheet.getLastRow()+1,lead);SpreadsheetApp.flush();return {success:true,lead:lead};
    }
    const index=leads.findIndex(l=>l.id===request.id);if(index<0)throw new Error('Lead not found. Refresh the dashboard.');
    const lead=leads[index];
    if(lead.history.some(h=>h.requestId===requestId))return {success:true,lead:lead};
    if(Number(request.version)!==lead.version)throw new Error('Another team member updated this lead. Close this window, refresh, and review the latest history before saving again.');
    if(!STATUSES_.includes(request.status))throw new Error('Invalid status.');
    const reason=text_(request.reason,2000,true);
    const nextDate=CLOSED_.includes(request.status)?'':date_(request.followUpDate);
    const at=new Date().toISOString();
    lead.history.unshift({id:Utilities.getUuid(),requestId:requestId,at:at,status:request.status,reason:reason,previousDate:lead.followUpDate,nextDate:nextDate,by:actor});
    // Store lead + history together in one row write; a failed retry cannot duplicate a successful update.
    if(JSON.stringify(lead.history).length>45000)throw new Error('This lead has reached its history storage limit. Ask the administrator to archive its history before updating.');
    lead.status=request.status;lead.followUpDate=nextDate;lead.updatedAt=at;lead.version+=1;
    writeLead_(sheet,index+2,lead);SpreadsheetApp.flush();return {success:true,lead:lead};
  }catch(error){return {success:false,message:error.message||'Unable to complete request.',code:error.code||'REQUEST_ERROR'};}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}

function sheet_() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw new Error('Run setup() in the Apps Script editor first.');
  const spreadsheet=SpreadsheetApp.openById(id);
  let sheet=spreadsheet.getSheetByName('Leads');
  if(!sheet){sheet=spreadsheet.insertSheet('Leads');sheet.getRange(1,1,1,LEAD_HEADERS_.length).setValues([LEAD_HEADERS_]);}
  const headers=sheet.getRange(1,1,1,LEAD_HEADERS_.length).getValues()[0];
  if(headers.join('|')!==LEAD_HEADERS_.join('|'))throw new Error('The Leads headers do not match. Restore the original headers; do not rename or reorder them.');
  return sheet;
}
function readLeads_(sheet) {
  if(sheet.getLastRow()<2)return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,LEAD_HEADERS_.length).getDisplayValues().map(row=>{
    const l={};LEAD_HEADERS_.forEach((h,i)=>{l[h]=row[i];});
    // Sheets display values omit the protective apostrophe used by writeLead_.
    l.interestedIn=JSON.parse(l.interestedIn);l.history=JSON.parse(l.history||'[]');l.version=Number(l.version);return l;
  });
}
function writeLead_(sheet,row,lead) {
  const values=LEAD_HEADERS_.map(h=>{let value=lead[h];if(Array.isArray(value))value=JSON.stringify(value);if(typeof value==='string'&&/^[=+\-@']/.test(value))value="'"+value;return String(value??'');});
  const range=sheet.getRange(row,1,1,LEAD_HEADERS_.length);range.setNumberFormat('@');range.setValues([values]);
}
function text_(value,max,required) {
  if(value!=null&&typeof value!=='string')throw new Error('Invalid text value.');
  const text=String(value||'').trim();if(required&&!text)throw new Error('Complete all required fields.');if(text.length>max)throw new Error('Text is too long (maximum '+max+' characters).');return text;
}
function phone_(value) {
  let text=String(value||'').replace(/[\s()-]/g,'');if(text.startsWith('+91'))text=text.slice(3);else if(/^91\d{10}$/.test(text))text=text.slice(2);
  if(!/^[6-9]\d{9}$/.test(text))throw new Error('Enter a valid Indian mobile number.');return text;
}
function date_(value) {
  const key=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key))throw new Error('Choose a valid follow-up date.');
  const date=new Date(key+'T12:00:00Z');
  if(isNaN(date.getTime())||date.toISOString().slice(0,10)!==key)throw new Error('Choose a valid calendar date.');
  if(key<Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd'))throw new Error('The next follow-up must be today or later.');return key;
}
