// Creator Lab, MIT (see LICENSE). Offline review contract; no provider calls.
import {createHash} from 'node:crypto';
import {buildRequest,parseResult,VERSION,MODEL} from './schema.mjs';
const sha256=value=>createHash('sha256').update(value).digest('hex');
const bounded=(value,name,max=200)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`Invalid ${name}`);
 return value;
};
/** Caller must enforce resource authorization and verify media rights separately.
 * A declared rights reference is provenance, not proof of permission.
 * Returns a proposal for the existing review flow, never an approval or publish action.
 */
export function prepareEditorialReview({transcript,result,source}){
 const request=buildRequest(transcript);
 if(!source||!['synthetic','authorized'].includes(source.kind))throw new Error('Source must be synthetic or authorized');
 const id=bounded(source.id,'source id');
 const transcriptHash=sha256(transcript.text);
 if(source.transcriptSha256!==transcriptHash)throw new Error('Transcript hash mismatch');
 const rightsReference=source.kind==='authorized'?bounded(source.rightsReference,'rights reference',500):null;
 const analysis=parseResult(result,request);
 const evidence={contractVersion:'editorial-review-v1',source:{kind:source.kind,id,transcriptSha256:transcriptHash,rightsReference},classification:{schemaVersion:VERSION,model:MODEL,labels:Object.fromEntries(Object.entries(analysis.labels).map(([key,a])=>[key,{value:a.value,confidence:a.confidence}])),anatomy:analysis.anatomy.map(({id,start,end,text,value,confidence})=>({id,start,end,text,value,confidence})),reviewSuggested:analysis.review}};
 // Raw provider payloads, API keys, cost estimates and collection URLs are not exported.
 return {...evidence,contentHash:sha256(JSON.stringify(evidence)),review:{status:'pending',approved:false},publication:{allowed:false}};
}
