// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as s}from"/$bunfs/root/_837.js";class e{drains=new Set;register(i){this.drains.add(i)}async drainAll(){await Promise.all([...this.drains].map((i)=>i().catch(()=>{})))}}function o(i){r.register(i)}function a(){return r.drainAll()}var r;var t=s(()=>{r=new e});
export{o as tGc,a as uGc,t as vGc};
