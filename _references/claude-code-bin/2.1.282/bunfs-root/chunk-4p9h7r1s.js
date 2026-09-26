// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Dt}from"/$bunfs/root/chunk-1g1dfcph.js";import{f}from"/$bunfs/root/chunk-f344jh32.js";import{N5t}from"/$bunfs/root/chunk-zbjdtda0.js";import{Rre}from"/$bunfs/root/chunk-kxbveva8.js";import{o,Jee,C,d,Fe}from"/$bunfs/root/chunk-hq4c63ht.js";var r="",s="",SAn="mcp",D5t="mcp-display-only";var p=f(()=>d({}).passthrough()),tir=f(()=>Fe([o(),C(d({type:o()}).passthrough()),Jee()]).describe("MCP tool execution result")),Sbe=Dt({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:SAn,backgrounding:"self",maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return p()},get outputSchema(){return tir()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return N5t(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:Rre(e)}}});
export{SAn,D5t,tir,Sbe};
