// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as s}from"/$bunfs/root/_837.js";class r{resetters=[];lazy(e){let t;return this.resetters.push(()=>{t=void 0}),()=>t??=e()}reset(){for(let e of this.resetters)e()}}function o(e){return n.lazy(e)}var n;var a=s(()=>{n=new r});
export{o as Ped,a as Qed};
