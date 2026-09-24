// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oe}from"/$bunfs/root/chunk-4a5nddj6.js";import{rt}from"/$bunfs/root/chunk-7r0w3nmp.js";import{rn}from"/$bunfs/root/chunk-kp7gknaw.js";import{lf}from"/$bunfs/root/chunk-rh3bbekj.js";import{vD,Lln}from"/$bunfs/root/chunk-xwwap3xv.js";import{randomUUID as i}from"crypto";function uge(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function IW(r,e,t){return{type:"control_response",response:{subtype:"error",request_id:r,error:e,...t!==void 0&&{error_code:t}}}}function PW(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:lf,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function Z2n(r=process.argv.slice(2)){return Lln(r)&&vD("--output-format",r)==="stream-json"}function bct(){return Oe(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function d(r,e=process.argv.slice(2)){let t=vD("--session-id",e);return(vD("--sdk-url",e)===void 0?rn(t):t)||r}function Sct({sessionId:r,message:e,reason:t,resultIndex:o=0}){return{...PW(r,[e]),...t!==void 0&&{startup_failure_reason:t},...o!==null&&{result_index:o}}}async function fV(r){let e=process.stdout;if(!bct()||!Z2n()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(Sct({...r,sessionId:d(r.sessionId)}))+`
`,o=()=>{},s=new Promise((n)=>{o=n});e.once("error",o);try{e.write(t,()=>o())}catch{return}await rt(s,u)}
export{uge,IW,PW,Z2n,bct,Sct,fV};
