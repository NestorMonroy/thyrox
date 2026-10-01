// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Le}from"/$bunfs/root/chunk-2j44ssk9.js";import{nt}from"/$bunfs/root/chunk-jxwbd5gq.js";import{en}from"/$bunfs/root/chunk-s1pmhfks.js";import{Hp}from"/$bunfs/root/chunk-b9kqqt4n.js";import{ZL,_hn}from"/$bunfs/root/chunk-r0sw7a0w.js";import{randomUUID as i}from"crypto";function v_e(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function kz(r,e,t){return{type:"control_response",response:{subtype:"error",request_id:r,error:e,...t!==void 0&&{error_code:t}}}}function Tz(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:Hp,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function hYn(r=process.argv.slice(2)){return _hn(r)&&ZL("--output-format",r)==="stream-json"}function Qft(){return Le(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function d(r,e=process.argv.slice(2)){let t=ZL("--session-id",e);return(ZL("--sdk-url",e)===void 0?en(t):t)||r}function Zft({sessionId:r,message:e,reason:t,resultIndex:o=0}){return{...Tz(r,[e]),...t!==void 0&&{startup_failure_reason:t},...o!==null&&{result_index:o}}}async function Az(r){let e=process.stdout;if(!Qft()||!hYn()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(Zft({...r,sessionId:d(r.sessionId)}))+`
`,o=()=>{},s=new Promise((n)=>{o=n});e.once("error",o);try{e.write(t,()=>o())}catch{return}await nt(s,u)}
export{v_e,kz,Tz,hYn,Qft,Zft,Az};
