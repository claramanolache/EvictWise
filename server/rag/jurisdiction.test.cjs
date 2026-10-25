const {test}=require('node:test');const assert=require('node:assert/strict');
const {profileJurisdiction,matchesJurisdiction}=require('./jurisdiction.cjs');
const {openIndex,rebuild,search}=require('./index.cjs');const {rebuildTextIndex,searchText}=require('./text-search.cjs');const {answer}=require('./chat.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const context=location=>'Saved profile:\n'+JSON.stringify({location});
const palo=context({country:'USA',state:'CA',city:'Palo Alto'});
const row=scope=>({text:`Source: Test\nJurisdiction: ${scope}\n\nEviction rules`});
test('Palo Alto includes federal, California, Santa Clara county and its own city only',()=>{
 const area=profileJurisdiction(palo);assert.equal(area.county,'santa clara');
 for(const scope of ['United States','United States — federal','California','Santa Clara County, California','Palo Alto, California','San Francisco Bay Area']) assert(matchesJurisdiction(row(scope),area),scope);
 for(const scope of ['San Francisco, California','Berkeley, California','Los Angeles, California','San Mateo County, California','See source','']) assert(!matchesJurisdiction(row(scope),area),scope);
});
test('missing or contradictory locations do not silently default to California',()=>{
 assert.equal(profileJurisdiction('bad JSON'),null);
 assert.equal(profileJurisdiction(context({city:'Palo Alto'})),null);
 assert.equal(profileJurisdiction(context({country:'US',state:'CA',city:'Palo Alto',county:'San Mateo County'})),null);
 const texas=profileJurisdiction(context({country:'US',state:'TX',city:'Austin'}));
 assert(!matchesJurisdiction(row('California'),texas));assert(matchesJurisdiction(row('United States'),texas));
 const overseas=profileJurisdiction(context({country:'Canada',state:'Ontario',city:'Toronto'}));assert(!matchesJurisdiction(row('United States'),overseas));
 const rental=profileJurisdiction(JSON.stringify({location:{country:'US',state:'CA',city:'Palo Alto'},rentalLocation:{country:'US',state:'CA',city:'San Francisco'}}));
 assert.equal(rental.city,'san francisco');assert(!matchesJurisdiction(row('Palo Alto, California'),rental));
});
test('both searches filter before limiting; out-of-area top matches cannot starve valid results',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rag-area-'));const docs=path.join(root,'docs');fs.mkdirSync(docs);const db=openIndex(path.join(root,'db.sqlite3'));t.after(()=>{db.close();fs.rmSync(root,{recursive:true,force:true});});
 for(let i=0;i<12;i++) {const filename=path.join(docs,`${i}.txt`);fs.writeFileSync(filename,'Eviction rules evidence '+i);fs.writeFileSync(filename+'.source.json',JSON.stringify({title:'Source',resolved_url:'',jurisdiction:i===11?'California':'Los Angeles, California',retrieved_at:'2026-01-01'}));}
 await rebuildTextIndex(db,docs);await rebuild({db,root:docs,embedTexts:async texts=>texts.map(()=>[1,0])});
 const filter=r=>matchesJurisdiction(r,profileJurisdiction(palo));
 assert.equal(search(db,[1,0],{filter,limit:1})[0].file,'11.txt');
 assert.equal(searchText(db,'eviction',1,filter)[0].file,'11.txt');
 const result=await answer({db,profileContext:'',messages:[{role:'user',content:'Eviction?'}],client:{}});
 assert.match(result.content,/city, county, state/);assert.equal(result.sources.length,0);
 let prompt;
 const client={embeddings:{create:async()=>({data:[{index:0,embedding:[1,0]}]})},chat:{completions:{create:async request=>{prompt=request;return {choices:[{message:{content:'{"content":"Rule [S1]","sourceIds":["S1"]}'}}]};}}}};
 const response=await answer({db,profileContext:palo,messages:[{role:'user',content:'Eviction?'}],client});
 assert.equal(response.sources[0].file,'11.txt');assert(!prompt.messages[1].content.includes('Los Angeles'));assert(prompt.messages[1].content.includes('retrievalJurisdiction'));
});
