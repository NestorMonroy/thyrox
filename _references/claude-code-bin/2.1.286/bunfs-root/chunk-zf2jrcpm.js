// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ut}from"/$bunfs/root/chunk-22qvrdjq.js";import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{z7t}from"/$bunfs/root/chunk-g40v5m19.js";import{Qie}from"/$bunfs/root/chunk-zwwnnxha.js";import{o,uoe,A,u,$e}from"/$bunfs/root/chunk-cgbfr9c2.js";var r="",s="",N0n="mcp",j7t="mcp-display-only";var n=p(()=>u({}).passthrough()),Ibr=p(()=>$e([o(),A(u({type:o()}).passthrough()),uoe()]).describe("MCP tool execution result")),bEe=Ut({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:N0n,backgrounding:"self",maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return n()},get outputSchema(){return Ibr()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return z7t(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:Qie(e)}}});
export{N0n,j7t,Ibr,bEe};
