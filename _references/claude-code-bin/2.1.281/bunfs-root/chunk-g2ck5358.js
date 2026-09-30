// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Mt}from"/$bunfs/root/chunk-n9ykdegv.js";import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{BGt}from"/$bunfs/root/chunk-xwkmjjf0.js";import{Zte}from"/$bunfs/root/chunk-f0yw772d.js";import{o,JZ,C,d,Fe}from"/$bunfs/root/chunk-r9b963ay.js";var r="",s="",_Sn="mcp",FGt="mcp-display-only";var p=f(()=>d({}).passthrough()),E7n=f(()=>Fe([o(),C(d({type:o()}).passthrough()),JZ()]).describe("MCP tool execution result")),Lye=Mt({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:_Sn,backgrounding:"self",maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return p()},get outputSchema(){return E7n()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return BGt(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:Zte(e)}}});
export{_Sn,FGt,E7n,Lye};
