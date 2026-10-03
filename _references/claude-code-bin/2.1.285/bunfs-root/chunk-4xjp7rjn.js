// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{$t}from"/$bunfs/root/chunk-hsxntwga.js";import{vXt}from"/$bunfs/root/chunk-5c7bp7h8.js";import{_ie}from"/$bunfs/root/chunk-w9dh3gd7.js";import{o,Ore,C,d,Fe}from"/$bunfs/root/chunk-ea52y7e7.js";var r="",s="",JOn="mcp",SXt="mcp-display-only";var u=p(()=>d({}).passthrough()),phr=p(()=>Fe([o(),C(d({type:o()}).passthrough()),Ore()]).describe("MCP tool execution result")),Rve=$t({isMcp:!0,isOpenWorld(){return!1},name:"mcp",uiTableKey:JOn,backgrounding:"self",maxResultSizeChars:1e5,async description(){return s},async prompt(){return r},get inputSchema(){return u()},get outputSchema(){return phr()},create(){return{async call(){return{data:""}},async checkPermissions(){return{behavior:"passthrough",message:"MCPTool requires permission."}}}},renderToolUseMessage(e,{verbose:t}){return vXt(e,{verbose:t})},userFacingName:()=>"mcp",mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:_ie(e)}}});
export{JOn,SXt,phr,Rve};
