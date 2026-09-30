// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{As}from"/$bunfs/root/chunk-t6d3nxvc.js";import{Go}from"/$bunfs/root/chunk-zwm3fybx.js";import{dRo}from"/$bunfs/root/chunk-nbmjse29.js";import{HF}from"/$bunfs/root/chunk-c9jscxk0.js";import{oln}from"/$bunfs/root/chunk-tsex6vh0.js";var t="(value set by your organization)";function pRe(r,e){if(e!=="managed")return r;return{...r,url:dRo(r.url)??t,...r.headers&&{headers:Go(r.headers,()=>t)}}}function yUe(r){return r==="cached"?"pending":r}function P1t(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=pRe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:yUe(e.type),config:o,scope:e.config.scope,source:HF(e.name,e.config),serverInfo:As(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:oln(e)}})}
export{pRe,yUe,P1t};
