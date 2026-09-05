// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Et}from"/$bunfs/root/chunk-8seefhsx.js";import{m}from"/$bunfs/root/chunk-ffgkv432.js";import{yC}from"/$bunfs/root/chunk-vw215j9f.js";import{e$t}from"/$bunfs/root/chunk-hcbea62v.js";import{t9}from"/$bunfs/root/chunk-15z1m91t.js";import{i,pK,T,c,Ge}from"/$bunfs/root/chunk-3qwvcykp.js";var s="",n="",Q0t="mcp";var u=m(()=>c({}).passthrough()),Jtn=m(()=>Ge([i(),T(c({type:i()}).passthrough()),pK()]).describe("MCP tool execution result")),Z4=Et({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:Q0t,maxResultSizeChars:1e5,async description(){return n},async prompt(){return s},get inputSchema(){return u()},get outputSchema(){return Jtn()},async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}},renderToolUseMessage(e,{verbose:t}){return e$t(e,{verbose:t})},userFacingName:()=>"mcp",isResultTruncated(e,t){let o=t?.columns;if(typeof e==="string")return yC(e,o);if(Array.isArray(e))return e.some((r)=>r.type==="text"&&yC(r.text,o));return!1},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:t9(e)}}});
export{Q0t,Jtn,Z4};
