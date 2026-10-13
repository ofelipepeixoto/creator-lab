import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildRequest} from '../lib/schema.mjs';
import {prepareEditorialReview} from '../lib/editorial.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/editorial-synthetic.json',import.meta.url),'utf8'));
const response=transcript=>{const req=buildRequest(transcript);return {model:req.model,answers:Object.fromEntries(Object.entries(req.questions).map(([key,q])=>[key,{type:'choice',choice:Object.keys(q.criteria)[0],confidence:.8}])),usage:{input_tokens:10},secret:'fixture-only-not-for-export'};};
const input=()=>({...structuredClone(fixture),result:response(fixture.transcript)});
test('editorial packet is deterministic, pending review and excludes raw payloads',()=>{
 const sample=input();sample.result.answers.topic.probabilities={unexpected:'fixture-only-not-for-export'};
 const a=prepareEditorialReview(sample),b=prepareEditorialReview(input());
 assert.deepEqual(a,b);assert.match(a.contentHash,/^[a-f0-9]{64}$/);
 assert.equal(a.review.status,'pending');assert.equal(a.review.approved,false);assert.equal(a.publication.allowed,false);
 assert.equal(JSON.stringify(a).includes('fixture-only-not-for-export'),false);
});
test('editorial packet rejects changed transcript provenance and undeclared rights',()=>{
 const changed=input();changed.transcript.text+=' Extra text.';assert.throws(()=>prepareEditorialReview(changed),/hash mismatch/);
 const rights=input();rights.source.kind='authorized';assert.throws(()=>prepareEditorialReview(rights),/rights reference/);
 rights.source.rightsReference='fixture-consent-record';assert.equal(prepareEditorialReview(rights).source.rightsReference,'fixture-consent-record');
});
test('changed classification creates a new content hash and cannot auto-approve',()=>{
 const a=input(),b=input();b.result.answers.topic.choice='other';b.review={approved:true};
 const packet=prepareEditorialReview(b);assert.notEqual(prepareEditorialReview(a).contentHash,packet.contentHash);assert.equal(packet.review.approved,false);
});
test('editorial extraction rejects unsupported source and classification',()=>{
 const a=input();a.source.kind='unknown';assert.throws(()=>prepareEditorialReview(a),/Source/);
 const b=input();b.result.answers.topic.choice='viral-guarantee';assert.throws(()=>prepareEditorialReview(b),/Invalid/);
});
