// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{$t}from"/$bunfs/root/chunk-3xz3ntyr.js";import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{e8t}from"/$bunfs/root/chunk-vv623pfy.js";import{_se}from"/$bunfs/root/chunk-x69g4369.js";import{o,$ne,A,u,Fe}from"/$bunfs/root/chunk-dk5kbfrn.js";var r="",s="",Mxn="mcp",QYt="mcp-display-only";var p=f(()=>u({}).passthrough()),apr=f(()=>Fe([o(),A(u({type:o()}).passthrough()),$ne()]).describe("MCP tool execution result")),mwe=$t({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:Mxn,backgrounding:"self",maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return p()},get outputSchema(){return apr()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return e8t(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:_se(e)}}});
export{Mxn,QYt,apr,mwe};
