// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{yL}from"/$bunfs/root/chunk-zjgjwhk7.js";import{I}from"/$bunfs/root/chunk-vqpmen5t.js";import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{Q}from"/$bunfs/root/chunk-055ns4k8.js";import{o,C,d}from"/$bunfs/root/chunk-ea52y7e7.js";var i=p(()=>d({deviceId:o(),name:o().default("Browser"),osPlatform:o().optional()}));async function wkn(n){let e=await xqt(n,"list_connected_browsers",{});if(!e)return[];let t=C(i()).safeParse(Q(e));return t.success?t.data:[]}async function xqt(n,e,t){let s=await yL(n,{name:e,arguments:t}),r=Array.isArray(s.content)?s.content[0]:void 0,c=r&&typeof r==="object"&&"text"in r&&typeof r.text==="string"?r.text:void 0;if(s.isError)throw new I(c||`${e} failed`,"claude-in-chrome tool call failed");return c}
export{wkn,xqt};
