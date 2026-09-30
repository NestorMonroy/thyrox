// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Pe}from"/$bunfs/root/chunk-tep8see7.js";import{pt}from"/$bunfs/root/chunk-akpzg2yh.js";import{mn}from"/$bunfs/root/chunk-4cmy5sqz.js";import{ip}from"/$bunfs/root/chunk-jmwypqbv.js";import{gxe,m3t}from"/$bunfs/root/chunk-v52c8cd2.js";import{randomUUID as i}from"crypto";function kle(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function $3(r,e){return{type:"control_response",response:{subtype:"error",request_id:r,error:e}}}function f2(r,e,t){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:ip,modelUsage:{},permission_denials:[],uuid:i(),errors:e,...t!==void 0&&{user_message_uuid:t}}}var u=1000;function pkn(r=process.argv.slice(2)){return m3t(r)&&gxe("--output-format",r)==="stream-json"}function p7e(){return Pe(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS)}function l(r,e=process.argv.slice(2)){let t=gxe("--session-id",e);return(gxe("--sdk-url",e)===void 0?mn(t):t)||r}function f7e({sessionId:r,message:e,reason:t,resultIndex:s=0}){return{...f2(r,[e]),...t!==void 0&&{startup_failure_reason:t},...s!==null&&{result_index:s}}}async function U1(r){let e=process.stdout;if(!p7e()||!pkn()||e.writableEnded||e.destroyed)return;let t=JSON.stringify(f7e({...r,sessionId:l(r.sessionId)}))+`
`,s=()=>{},o=new Promise((n)=>{s=n});e.once("error",s),e.write(t,()=>s()),await pt(o,u)}
export{kle,$3,f2,pkn,p7e,f7e,U1};
