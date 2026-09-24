// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
class Z5{#t=new Map;#e;#n;constructor(t=2048,e=600000){this.#e=t,this.#n=e}static key(t,e){return JSON.stringify([t,...e])}static#s(t){return`${JSON.stringify([t]).slice(0,-1)},`}get size(){return this.#t.size}set(t,e,n){if(this.dropToolUse(t),this.#t.size>=this.#e){let i=Date.now();for(let[s,r]of this.#t)if(i-r.at>this.#n)this.#t.delete(s);if(this.#t.size>=this.#e){let s=this.#t.keys().next().value;if(s!==void 0)this.#t.delete(s)}}this.#t.set(Z5.key(t,e),{value:n,at:Date.now()})}take(t,e){let n=Z5.key(t,e),i=this.#t.get(n);return this.#t.delete(n),i?.value}has(t,e){return this.#t.has(Z5.key(t,e))}dropToolUse(t){let e=Z5.#s(t);for(let n of this.#t.keys())if(n.startsWith(e))this.#t.delete(n)}}
export{Z5};
