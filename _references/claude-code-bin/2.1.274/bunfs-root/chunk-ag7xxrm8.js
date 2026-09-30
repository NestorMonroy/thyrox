// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{wt}from"/$bunfs/root/chunk-gx4tznbd.js";import{f}from"/$bunfs/root/chunk-w8gsn0hm.js";import{FQt}from"/$bunfs/root/chunk-r147zxrv.js";import{OJ}from"/$bunfs/root/chunk-5b4hsp3r.js";import{GR}from"/$bunfs/root/chunk-ejdfb6ns.js";import{o,T9,C,u,Fe}from"/$bunfs/root/chunk-13s0tpz6.js";var n="",p="",NQt="mcp";var a=f(()=>u({}).passthrough()),RMn=f(()=>Fe([o(),C(u({type:o()}).passthrough()),T9()]).describe("MCP tool execution result")),CJ=wt({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:NQt,maxResultSizeChars:1e5,async description(){return p},async prompt(){return n},get inputSchema(){return a()},get outputSchema(){return RMn()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return FQt(e,{verbose:t})},userFacingName:()=>"mcp",isResultTruncated(e,t){let r=t?.columns;if(typeof e==="string")return GR(e,r);if(Array.isArray(e))return e.some((s)=>s.type==="text"&&GR(s.text,r));return!1},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:OJ(e)}}});
export{NQt,RMn,CJ};
