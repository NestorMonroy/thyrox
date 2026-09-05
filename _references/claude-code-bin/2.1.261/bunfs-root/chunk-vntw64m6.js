// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{m}from"/$bunfs/root/chunk-84mvm17e.js";import{Ht}from"/$bunfs/root/chunk-10nvcevy.js";import{dC}from"/$bunfs/root/chunk-vd630rs0.js";import{r$t}from"/$bunfs/root/chunk-b7b9cd8z.js";import{A9}from"/$bunfs/root/chunk-05qnpg1c.js";import{s,BK,k,c,Ne}from"/$bunfs/root/chunk-hc3tpgm9.js";var n="",u="",t$t="mcp";var p=m(()=>c({}).passthrough()),nrn=m(()=>Ne([s(),k(c({type:s()}).passthrough()),BK()]).describe("MCP tool execution result")),H9=Ht({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:t$t,maxResultSizeChars:1e5,async description(){return u},async prompt(){return n},get inputSchema(){return p()},get outputSchema(){return nrn()},async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}},renderToolUseMessage(e,{verbose:t}){return r$t(e,{verbose:t})},userFacingName:()=>"mcp",isResultTruncated(e,t){let o=t?.columns;if(typeof e==="string")return dC(e,o);if(Array.isArray(e))return e.some((r)=>r.type==="text"&&dC(r.text,o));return!1},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:A9(e)}}});
export{t$t,nrn,H9};
