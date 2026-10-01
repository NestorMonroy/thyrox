// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Le}from"/$bunfs/root/chunk-dj0a6j9w.js";import{DD,_Gt}from"/$bunfs/root/chunk-fkamvb6d.js";import{at}from"/$bunfs/root/chunk-bg5yf16b.js";import{Xt}from"/$bunfs/root/chunk-9wvhp90s.js";import{_u}from"/$bunfs/root/chunk-g1x66m3p.js";import{randomUUID as i}from"crypto";function TSe(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function E2(r,e,t){return{type:"control_response",response:{subtype:"error",request_id:r,error:e,...t!==void 0&&{error_code:t}}}}function k2(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:_u,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function BQn(r=process.argv.slice(2)){return _Gt(r)&&DD("--output-format",r)==="stream-json"}function Byt(){return Le(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function d(r,e=process.argv.slice(2)){let t=DD("--session-id",e);return(DD("--sdk-url",e)===void 0?Xt(t):t)||r}function jyt({sessionId:r,message:e,reason:t,resultIndex:o=0}){return{...k2(r,[e]),...t!==void 0&&{startup_failure_reason:t},...o!==null&&{result_index:o}}}async function T2(r){let e=process.stdout;if(!Byt()||!BQn()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(jyt({...r,sessionId:d(r.sessionId)}))+`
`,o=()=>{},s=new Promise((n)=>{o=n});e.once("error",o);try{e.write(t,()=>o())}catch{return}await at(s,u)}
export{TSe,E2,k2,BQn,Byt,jyt,T2};
