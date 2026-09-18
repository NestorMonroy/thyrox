// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{At}from"/$bunfs/root/chunk-3qftbphc.js";import{p}from"/$bunfs/root/chunk-dtjhjxgx.js";import{l0t}from"/$bunfs/root/chunk-6dwc0tzs.js";import{g7}from"/$bunfs/root/chunk-rez39t4b.js";import{o,uX,C,u,Fe}from"/$bunfs/root/chunk-nfxfp8ap.js";var r="",s="",Men="mcp",i0t="mcp-display-only";var n=p(()=>u({}).passthrough()),k$n=p(()=>Fe([o(),C(u({type:o()}).passthrough()),uX()]).describe("MCP tool execution result")),lde=At({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:Men,maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return n()},get outputSchema(){return k$n()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return l0t(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:g7(e)}}});
export{Men,i0t,k$n,lde};
