// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{n1}from"/$bunfs/root/chunk-wkb15n6y.js";import{P}from"/$bunfs/root/chunk-31aa9k3a.js";import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{J}from"/$bunfs/root/chunk-6b6gfk00.js";import{o,A,u}from"/$bunfs/root/chunk-fwjxbyrt.js";var i=f(()=>u({deviceId:o(),name:o().default("Browser"),osPlatform:o().optional()}));async function Akn(n){let e=await jqt(n,"list_connected_browsers",{});if(!e)return[];let t=A(i()).safeParse(J(e));return t.success?t.data:[]}async function jqt(n,e,t){let s=await n1(n,{name:e,arguments:t}),r=Array.isArray(s.content)?s.content[0]:void 0,c=r&&typeof r==="object"&&"text"in r&&typeof r.text==="string"?r.text:void 0;if(s.isError)throw new P(c||`${e} failed`,"claude-in-chrome tool call failed");return c}
export{Akn,jqt};
