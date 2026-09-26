// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Oe}from"/$bunfs/root/chunk-zt13kgz5.js";import{rt}from"/$bunfs/root/chunk-dbjks79r.js";import{nn}from"/$bunfs/root/chunk-bjy6zt8z.js";import{gf}from"/$bunfs/root/chunk-tvfv76nc.js";import{JD,Yun}from"/$bunfs/root/chunk-kbsxbve1.js";import{randomUUID as i}from"crypto";function Ehe(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function ZW(r,e,t){return{type:"control_response",response:{subtype:"error",request_id:r,error:e,...t!==void 0&&{error_code:t}}}}function ez(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:gf,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function Fqn(r=process.argv.slice(2)){return Yun(r)&&JD("--output-format",r)==="stream-json"}function out(){return Oe(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function d(r,e=process.argv.slice(2)){let t=JD("--session-id",e);return(JD("--sdk-url",e)===void 0?nn(t):t)||r}function sut({sessionId:r,message:e,reason:t,resultIndex:o=0}){return{...ez(r,[e]),...t!==void 0&&{startup_failure_reason:t},...o!==null&&{result_index:o}}}async function WV(r){let e=process.stdout;if(!out()||!Fqn()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(sut({...r,sessionId:d(r.sessionId)}))+`
`,o=()=>{},s=new Promise((n)=>{o=n});e.once("error",o);try{e.write(t,()=>o())}catch{return}await rt(s,u)}
export{Ehe,ZW,ez,Fqn,out,sut,WV};
