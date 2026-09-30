// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{m}from"/$bunfs/root/chunk-7tpgnqqk.js";import{wt}from"/$bunfs/root/chunk-ha3c8j0p.js";import{FR}from"/$bunfs/root/chunk-yw4jc948.js";import{oNt}from"/$bunfs/root/chunk-3nd550p4.js";import{U6}from"/$bunfs/root/chunk-dfm480ef.js";import{s,h3,T,c,$e}from"/$bunfs/root/chunk-44xw78rx.js";var n="",u="",nNt="mcp";var p=m(()=>c({}).passthrough()),Lin=m(()=>$e([s(),T(c({type:s()}).passthrough()),h3()]).describe("MCP tool execution result")),N6=wt({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:nNt,maxResultSizeChars:1e5,async description(){return u},async prompt(){return n},get inputSchema(){return p()},get outputSchema(){return Lin()},async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}},renderToolUseMessage(e,{verbose:t}){return oNt(e,{verbose:t})},userFacingName:()=>"mcp",isResultTruncated(e,t){let o=t?.columns;if(typeof e==="string")return FR(e,o);if(Array.isArray(e))return e.some((r)=>r.type==="text"&&FR(r.text,o));return!1},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:U6(e)}}});
export{nNt,Lin,N6};
