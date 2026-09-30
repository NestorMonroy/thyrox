// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{UB}from"/$bunfs/root/chunk-ap9jzkt6.js";import{I}from"/$bunfs/root/chunk-ern0s5ks.js";import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{J}from"/$bunfs/root/chunk-zkn0228z.js";import{o,A,u}from"/$bunfs/root/chunk-dk5kbfrn.js";var i=f(()=>u({deviceId:o(),name:o().default("Browser"),osPlatform:o().optional()}));async function Hwn(n){let e=await p2t(n,"list_connected_browsers",{});if(!e)return[];let t=A(i()).safeParse(J(e));return t.success?t.data:[]}async function p2t(n,e,t){let s=await UB(n,{name:e,arguments:t}),r=Array.isArray(s.content)?s.content[0]:void 0,c=r&&typeof r==="object"&&"text"in r&&typeof r.text==="string"?r.text:void 0;if(s.isError)throw new I(c||`${e} failed`,"claude-in-chrome tool call failed");return c}
export{Hwn,p2t};
