// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Jjd as i,Kjd as p,atd as c,zkd as a}from"/$bunfs/root/_826.js";import{xxd as l}from"/$bunfs/root/_837.js";function d(e){if(typeof e==="function")return e;if(Symbol.asyncDispose in e)return()=>e[Symbol.asyncDispose]();return()=>e[Symbol.dispose]()}class u{cleanup=new r;preExitFlush=new r}function t(){return f.of(a().host)}function h(e){return t().cleanup.register(e)}async function S(){await t().cleanup.drain()}function b(){return t().cleanup.drainStarted}function g(e){return t().preExitFlush.register(e)}async function w(){await t().preExitFlush.drain()}var r,f;var m=l(()=>{c();p();r=class r{#e=new Set;#n=!1;get drainStarted(){return this.#n}register(e){let s=d(e);this.#e.add(s);let n=()=>{this.#e.delete(s)};return Object.assign(n,{[Symbol.dispose]:n})}async drain(){this.#n=!0;let e=Array.from(this.#e);this.#e.clear();let n=(await Promise.allSettled(e.map(async(o)=>o()))).find((o)=>o.status==="rejected");if(n!==void 0)throw n.reason}async[Symbol.asyncDispose](){await this.drain()}get sizeForTesting(){return this.#e.size}};f=new i(()=>new u)});
export{h as Ehd,S as Fhd,b as Ghd,g as Hhd,w as Ihd,m as Jhd};
