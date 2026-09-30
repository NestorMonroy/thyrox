// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Le}from"/$bunfs/root/chunk-fkak21hw.js";import{c0,cWt}from"/$bunfs/root/chunk-kn03s03j.js";import{it}from"/$bunfs/root/chunk-dmpcy5p5.js";import{Jt}from"/$bunfs/root/chunk-b1a55n2g.js";import{jp}from"/$bunfs/root/chunk-tvaqzpt5.js";import{randomUUID as i}from"crypto";function Abe(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function X2(r,e,t){return{type:"control_response",response:{subtype:"error",request_id:r,error:e,...t!==void 0&&{error_code:t}}}}function J2(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:jp,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function MXn(r=process.argv.slice(2)){return cWt(r)&&c0("--output-format",r)==="stream-json"}function Bgt(){return Le(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function d(r,e=process.argv.slice(2)){let t=c0("--session-id",e);return(c0("--sdk-url",e)===void 0?Jt(t):t)||r}function jgt({sessionId:r,message:e,reason:t,resultIndex:o=0}){return{...J2(r,[e]),...t!==void 0&&{startup_failure_reason:t},...o!==null&&{result_index:o}}}async function Q2(r){let e=process.stdout;if(!Bgt()||!MXn()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(jgt({...r,sessionId:d(r.sessionId)}))+`
`,o=()=>{},s=new Promise((n)=>{o=n});e.once("error",o);try{e.write(t,()=>o())}catch{return}await it(s,u)}
export{Abe,X2,J2,MXn,Bgt,jgt,Q2};
