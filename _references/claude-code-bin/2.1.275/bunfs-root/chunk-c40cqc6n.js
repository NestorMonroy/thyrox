// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{$e}from"/$bunfs/root/chunk-aw1peprz.js";import{Nt}from"/$bunfs/root/chunk-4qqe0nh4.js";class e{#e={credentialsPersisted:0,loginCompleted:0};#t=$e();subscribe=(t)=>this.#t.subscribe(t);getSnapshot=()=>this.#e;credentialsPersisted(){this.#e={...this.#e,credentialsPersisted:this.#e.credentialsPersisted+1},this.#t.emit()}loginCompleted(){this.#e={...this.#e,loginCompleted:this.#e.loginCompleted+1},this.#t.emit()}}var qJ=new Nt(()=>new e);
export{qJ};
