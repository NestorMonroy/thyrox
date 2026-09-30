// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{$t}from"/$bunfs/root/chunk-q3brtb9y.js";import{OXt}from"/$bunfs/root/chunk-nxd8gscd.js";import{pie}from"/$bunfs/root/chunk-pb93xbea.js";import{o,Rre,A,u,Fe}from"/$bunfs/root/chunk-fwjxbyrt.js";var r="",s="",VOn="mcp",PXt="mcp-display-only";var p=f(()=>u({}).passthrough()),Igr=f(()=>Fe([o(),A(u({type:o()}).passthrough()),Rre()]).describe("MCP tool execution result")),vve=$t({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:VOn,backgrounding:"self",maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return p()},get outputSchema(){return Igr()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return OXt(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:pie(e)}}});
export{VOn,PXt,Igr,vve};
