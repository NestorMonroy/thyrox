// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{kt}from"/$bunfs/root/chunk-r8hc3n2z.js";import{m}from"/$bunfs/root/chunk-55w4bsdv.js";import{LC}from"/$bunfs/root/chunk-qpwbvc04.js";import{B$t}from"/$bunfs/root/chunk-espvybk7.js";import{G9}from"/$bunfs/root/chunk-jcdr1w4p.js";import{i,zK,T,c,Ge}from"/$bunfs/root/chunk-84vc68b7.js";var s="",n="",N$t="mcp";var u=m(()=>c({}).passthrough()),yon=m(()=>Ge([i(),T(c({type:i()}).passthrough()),zK()]).describe("MCP tool execution result")),U9=kt({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:N$t,maxResultSizeChars:1e5,async description(){return n},async prompt(){return s},get inputSchema(){return u()},get outputSchema(){return yon()},async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}},renderToolUseMessage(e,{verbose:t}){return B$t(e,{verbose:t})},userFacingName:()=>"mcp",isResultTruncated(e,t){let o=t?.columns;if(typeof e==="string")return LC(e,o);if(Array.isArray(e))return e.some((r)=>r.type==="text"&&LC(r.text,o));return!1},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:G9(e)}}});
export{N$t,yon,U9};
