// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ne}from"/$bunfs/root/chunk-4a5nddj6.js";import{V,W}from"/$bunfs/root/chunk-cqc88nqm.js";function uU(o,t,s=32000){let n=Math.min(500*Math.pow(2,o-1),s),e=Math.round(n+Math.random()*0.25*n);if(t){let i=parseInt(t,10);if(!isNaN(i))return Math.max(i*1000,e)}return e}var a=new V(()=>Ne());function r(){return a.of(W().host)}function k$n(){r().emit()}function cho(o){return r().subscribe(o)}
export{uU,k$n,cho};
