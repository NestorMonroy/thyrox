// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
var l=[];class kue{#e=()=>l;#t=()=>!0;#o;#l=new WeakMap;provide(o,e=()=>!0){this.#e=o,this.#t=e,this.#o=void 0}presentable(){return this.#t()}tools(){let o=this.#e();if(this.#o===void 0||this.#o.source!==o){for(let{tool:e,machine:t}of o)this.#l.set(e,t);this.#o={source:o,tools:o.map(({tool:e})=>e)}}return this.#o.tools}machineFor(o){return this.tools(),this.#l.get(o)}}function Fne(o){return o.toolState?.get(kue).tools()??n}var n=[];
export{kue,Fne};
