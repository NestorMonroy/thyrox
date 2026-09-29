// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ps}from"/$bunfs/root/chunk-e1ahn80a.js";import{Zr}from"/$bunfs/root/chunk-d37h8mav.js";import{DBo}from"/$bunfs/root/chunk-45j14f09.js";import{uB}from"/$bunfs/root/chunk-77kn462z.js";import{Agn}from"/$bunfs/root/chunk-hf1cte62.js";var t="(value set by your organization)";function NIe(r,e){if(e!=="managed")return r;return{...r,url:DBo(r.url)??t,...r.headers&&{headers:Zr(r.headers,()=>t)}}}function jje(r){return r==="cached"?"pending":r}function FVt(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=NIe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:jje(e.type),config:o,scope:e.config.scope,source:uB(e.name,e.config),serverInfo:Ps(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:Agn(e)}})}
export{NIe,jje,FVt};
