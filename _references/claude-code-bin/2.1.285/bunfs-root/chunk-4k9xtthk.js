// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{hs}from"/$bunfs/root/chunk-srhvbygf.js";import{Jr}from"/$bunfs/root/chunk-bxhyh54r.js";import{$Bo}from"/$bunfs/root/chunk-5d5c7e2g.js";import{pB}from"/$bunfs/root/chunk-qazw855w.js";import{Qmn}from"/$bunfs/root/chunk-7y7h3m02.js";var t="(value set by your organization)";function CPe(r,e){if(e!=="managed")return r;return{...r,url:$Bo(r.url)??t,...r.headers&&{headers:Jr(r.headers,()=>t)}}}function Xje(r){return r==="cached"?"pending":r}function RVt(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=CPe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:Xje(e.type),config:o,scope:e.config.scope,source:pB(e.name,e.config),serverInfo:hs(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:Qmn(e)}})}
export{CPe,Xje,RVt};
