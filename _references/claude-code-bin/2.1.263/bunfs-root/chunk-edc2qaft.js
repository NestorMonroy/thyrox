// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{m}from"/$bunfs/root/chunk-78nzsrc6.js";import{wt}from"/$bunfs/root/chunk-gp8z5n9k.js";import{dC}from"/$bunfs/root/chunk-9wa0ka8p.js";import{o$t}from"/$bunfs/root/chunk-6z2r26xc.js";import{k9}from"/$bunfs/root/chunk-95n7690p.js";import{s,jK,k,c,Ne}from"/$bunfs/root/chunk-9evvptjs.js";var n="",u="",n$t="mcp";var p=m(()=>c({}).passthrough()),rrn=m(()=>Ne([s(),k(c({type:s()}).passthrough()),jK()]).describe("MCP tool execution result")),E9=wt({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:n$t,maxResultSizeChars:1e5,async description(){return u},async prompt(){return n},get inputSchema(){return p()},get outputSchema(){return rrn()},async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}},renderToolUseMessage(e,{verbose:t}){return o$t(e,{verbose:t})},userFacingName:()=>"mcp",isResultTruncated(e,t){let o=t?.columns;if(typeof e==="string")return dC(e,o);if(Array.isArray(e))return e.some((r)=>r.type==="text"&&dC(r.text,o));return!1},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:k9(e)}}});
export{n$t,rrn,E9};
