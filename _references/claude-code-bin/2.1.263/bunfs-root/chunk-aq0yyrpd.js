// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{j,U}from"/$bunfs/root/chunk-k6vqz9fa.js";import{BXn,C6e}from"/$bunfs/root/chunk-jd61qkbk.js";class o extends Map{get everMounted(){return C6e()}set everMounted(e){BXn(e)}set(e,n){return this.everMounted=!0,super.set(e,n)}standaloneRender=null;claimForStandaloneRender(e){let n=()=>{if(this.standaloneRender===t)this.standaloneRender=null},t=e.then(n,n);this.standaloneRender=t}get pendingStandaloneRender(){return this.standaloneRender}}var r=new j(()=>new o);function Hs(){return r.of(U().host)}
export{Hs};
