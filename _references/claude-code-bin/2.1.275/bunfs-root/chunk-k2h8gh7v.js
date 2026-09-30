// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Oe}from"/$bunfs/root/chunk-aw1peprz.js";import{it}from"/$bunfs/root/chunk-t2x4z9pb.js";import{dn}from"/$bunfs/root/chunk-q7rz8cer.js";import{gp}from"/$bunfs/root/chunk-stsvx00v.js";import{UIe,B8t}from"/$bunfs/root/chunk-dmjr6ks7.js";import{randomUUID as i}from"crypto";function Rce(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function A6(r,e){return{type:"control_response",response:{subtype:"error",request_id:r,error:e}}}function Q2(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:gp,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function ARn(r=process.argv.slice(2)){return B8t(r)&&UIe("--output-format",r)==="stream-json"}function aZe(){return Oe(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function l(r,e=process.argv.slice(2)){let t=UIe("--session-id",e);return(UIe("--sdk-url",e)===void 0?dn(t):t)||r}function lZe({sessionId:r,message:e,reason:t,resultIndex:s=0}){return{...Q2(r,[e]),...t!==void 0&&{startup_failure_reason:t},...s!==null&&{result_index:s}}}async function kU(r){let e=process.stdout;if(!aZe()||!ARn()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(lZe({...r,sessionId:l(r.sessionId)}))+`
`,s=()=>{},o=new Promise((n)=>{s=n});e.once("error",s),e.write(t,()=>s()),await it(o,u)}
export{Rce,A6,Q2,ARn,aZe,lZe,kU};
