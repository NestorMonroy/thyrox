// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Es}from"/$bunfs/root/chunk-b93xrf5w.js";import{os}from"/$bunfs/root/chunk-cqc88nqm.js";import{qvo}from"/$bunfs/root/chunk-dzhe9h05.js";import{mF}from"/$bunfs/root/chunk-4n4g22z6.js";import{nsn}from"/$bunfs/root/chunk-b7h8pwnv.js";var t="(value set by your organization)";function GAe(r,e){if(e!=="managed")return r;return{...r,url:qvo(r.url)??t,...r.headers&&{headers:os(r.headers,()=>t)}}}function q$e(r){return r==="cached"?"pending":r}function VFt(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=GAe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:q$e(e.type),config:o,scope:e.config.scope,source:mF(e.name,e.config),serverInfo:Es(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:nsn(e)}})}
export{GAe,q$e,VFt};
