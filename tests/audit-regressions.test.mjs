import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {buildRequest,parseResult}=await import(pathToFileURL(join(root,'lib/schema.mjs')));
const {Pipeline}=await import(pathToFileURL(join(root,'lib/pipeline.mjs')));
const speech={text:'This synthetic sentence contains enough words for classification.',segments:[]};
const answer=req=>({model:req.model,answers:Object.fromEntries(Object.entries(req.questions).map(([k,q])=>[k,{type:'choice',choice:Object.keys(q.criteria)[0],confidence:.9}])),usage:{input_tokens:10}});
test('A1 imported segment content cannot bypass request text bound',()=>{
 assert.throws(()=>buildRequest({...speech,segments:[{text:'x'.repeat(48001),start:0,end:1}]}),/limit|exceeds|length/i);
});
test('A2 unexpected response model is rejected',()=>{
 const req=buildRequest(speech),raw=answer(req);raw.model='unexpected-model';assert.throws(()=>parseResult(raw,req),/model/i);
});
test('A3 negative usage cannot produce negative estimated cost',()=>{
 const req=buildRequest(speech),raw=answer(req);raw.usage.input_tokens=-100;assert.equal(parseResult(raw,req).costUsd,null);
});
for(const change of ['language','media'])test(`A4 transcript cache invalidates changed ${change}`,async()=>{
 const temp=await mkdtemp(join(tmpdir(),'audit-cache-'));const original=global.fetch;let count=0;
 global.fetch=async(url,opts)=>{if(String(url).includes('groq.com')){count++;return Response.json({...speech,duration:12});}if(String(url).includes('typesafe.ai'))return Response.json(answer(JSON.parse(opts.body)));throw Error('Unexpected fixture request');};
 try {
 const p=await new Pipeline(temp,()=>({groq:'fixture',jev:'fixture'}),{groqRpm:60000}).init();
 const run=async(language,url)=>{const j=await p.create({creator:'tester',language},[{id:'fixed',ownerUsername:'tester',videoUrl:url}]);await p.run(j.id);while(p.active.size)await new Promise(r=>setTimeout(r,5));await p.writes.get(j.id);assert.equal(j.status,'complete');};
 await run('en','https://scontent.cdninstagram.com/a.mp4');
 await run(change==='language'?'pt':'en',`https://scontent.cdninstagram.com/${change==='media'?'b':'a'}.mp4`);
 assert.equal(count,2,'A changed input must not silently reuse an earlier transcript');
 }finally{global.fetch=original;await rm(temp,{recursive:true,force:true});}
});
