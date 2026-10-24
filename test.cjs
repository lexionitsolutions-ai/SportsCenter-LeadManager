const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=require('./script.js');
assert.equal(app.phoneNumber('+91 98765 43210'),'9876543210');
assert.equal(app.phoneNumber('919876543210'),'9876543210');
assert.equal(app.phoneNumber('1234567890'),'');
assert.equal(app.phoneNumber('00919876543210'),'');
assert.equal(app.addDays('2026-12-31',1),'2027-01-01');
assert.equal(app.addDays('2028-02-28',1),'2028-02-29');
assert.equal(app.addDays('2026-03-01',-1),'2026-02-28');
assert.equal(app.escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
const msg=app.introduction({name:'Rahul',interestedIn:['Gym Setup','Turf Installation']});
assert.ok(msg.includes('Rahul')&&msg.includes('Gym Setup, Turf Installation'));
assert.ok(msg.includes('https://zenithfitness360.lexionitsolutions.workers.dev/')&&msg.includes('https://www.instagram.com/sports_centre_kop?'));
assert.equal(app.openLead({status:'Converted'}),false);
assert.equal(app.openLead({status:'Wrong number'}),false);
assert.equal(app.openLead({status:'Quotation sent'}),true);

const props={SPREADSHEET_ID:'test-sheet',ALLOWED_EMAILS:'staff@example.com',API_KEY:'test-access-code-at-least-32-characters-long'};
let email='staff@example.com', rows=[], uid=0;
const sheet={
 getLastRow:()=>rows.length,
 getRange:(r,c,n,m)=>({
  getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r-1+i]?.[c-1+j]||'')),
  getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>{const v=String(rows[r-1+i]?.[c-1+j]||'');return v.startsWith("'")?v.slice(1):v;})),
  setNumberFormat:()=>{},
  setValues:values=>values.forEach((row,i)=>{rows[r-1+i]=[...row];})
 })
};
const context={console,Session:{getActiveUser:()=>({getEmail:()=>email})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},LockService:{getScriptLock:()=>({waitLock:()=>{},hasLock:()=>true,releaseLock:()=>{}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},Utilities:{getUuid:()=>`uuid-${++uid}`,formatDate:()=>app.todayKey()}};
vm.createContext(context);vm.runInContext(fs.readFileSync('Code.gs','utf8'),context);
rows.push(['id','createdAt','updatedAt','name','contact','interestedIn','source','followUpDate','status','notes','version','requestId','history']);
const call=p=>context.handleRequest(p);
email='intruder@example.com';assert.equal(call({action:'getLeads'}).success,false);email='';assert.equal(call({action:'getLeads'}).success,false);email='staff@example.com';
assert.equal(call({action:'getLeads'}).leads.length,0);
const input={action:'createLead',name:'Rahul',contact:'9876543210',interestedIn:['Gym Setup'],source:'Walk-in',notes:'=IMPORTXML("bad")',followUpDate:app.addDays(app.todayKey(),1),requestId:'request-1'};
let result=call(input);assert.equal(result.success,true);const id=result.lead.id;
assert.equal(call(input).lead.id,id);assert.equal(rows.length,2);
assert.ok(rows[1][9].startsWith("'="));assert.equal(call({action:'getLeads'}).leads[0].notes,input.notes);
assert.equal(call({...input,requestId:'invalid-phone',contact:'123'}).success,false);
assert.equal(call({...input,requestId:'invalid-service',interestedIn:['Unknown']}).success,false);
assert.equal(call({...input,requestId:'invalid-date',followUpDate:'2026-02-30'}).success,false);
assert.equal(call({...input,requestId:'past-date',followUpDate:'2020-01-01'}).success,false);
const update={action:'updateLead',id,version:1,status:'Contacted',reason:'Requested a site visit',followUpDate:app.addDays(app.todayKey(),2),requestId:'update-1'};
result=call(update);assert.equal(result.success,true);assert.equal(result.lead.version,2);assert.equal(result.lead.history.length,1);assert.equal(result.lead.history[0].previousDate,input.followUpDate);
result=call(update);assert.equal(result.success,true);assert.equal(result.lead.history.length,1);
assert.equal(call({...update,requestId:'conflict',reason:'Stale change'}).success,false);
assert.equal(call({...update,requestId:'blank-reason',version:2,reason:'  '}).success,false);
result=call({...update,requestId:'close',version:2,status:'Converted',reason:'Order confirmed',followUpDate:''});assert.equal(result.success,true);assert.equal(result.lead.followUpDate,'');assert.equal(result.lead.history.length,2);
result=call({...update,requestId:'reopen',version:3,status:'Call later',reason:'New project'});assert.equal(result.success,true);assert.equal(result.lead.version,4);
assert.equal(call({action:'deleteAll'}).success,false);
context.ContentService={MimeType:{JSON:'json'},createTextOutput:body=>({body,setMimeType(){return this;}})};
const post=p=>JSON.parse(context.doPost({parameter:{payload:JSON.stringify(p)}}).body);
// HTTP always requires a key, even if Google happens to expose an allowed email.
assert.equal(post({action:'getLeads'}).code,'AUTH_REQUIRED');
assert.equal(post({action:'getLeads',apiKey:'wrong'}).success,false);
email='';
assert.equal(post({action:'getLeads',apiKey:props.API_KEY}).success,true);
const httpCreate=post({...input,requestId:'http-create',apiKey:props.API_KEY});
assert.equal(httpCreate.success,true);
assert.equal(post({...input,requestId:'http-create',apiKey:props.API_KEY}).lead.id,httpCreate.lead.id);
const httpUpdate=post({...update,id:httpCreate.lead.id,version:1,requestId:'http-update',apiKey:props.API_KEY});
assert.equal(httpUpdate.success,true);
assert.equal(httpUpdate.lead.history[0].by,'Staff access code');
assert.equal(JSON.parse(context.doPost({parameter:{payload:'invalid json'}}).body).success,false);
assert.equal(call({action:'getLeads',apiKey:'wrong'}).success,false);
console.log('Core, backend and authenticated HTTP create/read/update checks passed.');
