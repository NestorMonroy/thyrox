// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{As}from"/$bunfs/root/chunk-379zyrv7.js";import{io}from"/$bunfs/root/chunk-nvht7ckf.js";import{MLo}from"/$bunfs/root/chunk-bydh8jk1.js";import{qU}from"/$bunfs/root/chunk-csayct82.js";import{Ppn}from"/$bunfs/root/chunk-1ay853f5.js";var t="(value set by your organization)";function EIe(r,e){if(e!=="managed")return r;return{...r,url:MLo(r.url)??t,...r.headers&&{headers:io(r.headers,()=>t)}}}function k1e(r){return r==="cached"?"pending":r}function lzt(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=EIe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:k1e(e.type),config:o,scope:e.config.scope,source:qU(e.name,e.config),serverInfo:As(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:Ppn(e)}})}
export{EIe,k1e,lzt};
