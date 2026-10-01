// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ws}from"/$bunfs/root/chunk-v67w5hxq.js";import{qr}from"/$bunfs/root/chunk-hbjpbz2q.js";import{yGo}from"/$bunfs/root/chunk-0wj52kch.js";import{VB}from"/$bunfs/root/chunk-kt4703ww.js";import{Oyn}from"/$bunfs/root/chunk-vqc3jzpc.js";var t="(value set by your organization)";function POe(r,e){if(e!=="managed")return r;return{...r,url:yGo(r.url)??t,...r.headers&&{headers:qr(r.headers,()=>t)}}}function lze(r){return r==="cached"?"pending":r}function WKt(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=POe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:lze(e.type),config:o,scope:e.config.scope,source:VB(e.name,e.config),serverInfo:ws(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:Oyn(e)}})}
export{POe,lze,WKt};
