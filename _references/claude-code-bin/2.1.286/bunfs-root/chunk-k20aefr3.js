// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{XL}from"/$bunfs/root/chunk-tcbz0p7m.js";import{I}from"/$bunfs/root/chunk-ctczby4m.js";import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{Q}from"/$bunfs/root/chunk-6w550002.js";import{o,A,u}from"/$bunfs/root/chunk-cgbfr9c2.js";var i=p(()=>u({deviceId:o(),name:o().default("Browser"),osPlatform:o().optional()}));async function jAn(n){let e=await O4t(n,"list_connected_browsers",{});if(!e)return[];let t=A(i()).safeParse(Q(e));return t.success?t.data:[]}async function O4t(n,e,t){let s=await XL(n,{name:e,arguments:t}),r=Array.isArray(s.content)?s.content[0]:void 0,c=r&&typeof r==="object"&&"text"in r&&typeof r.text==="string"?r.text:void 0;if(s.isError)throw new I(c||`${e} failed`,"claude-in-chrome tool call failed");return c}
export{jAn,O4t};
