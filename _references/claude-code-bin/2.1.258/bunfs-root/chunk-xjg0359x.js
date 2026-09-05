// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{CZn,KYe}from"/$bunfs/root/chunk-v9k8xajp.js";class o extends Map{get everMounted(){return KYe()}set everMounted(e){CZn(e)}set(e,n){return this.everMounted=!0,super.set(e,n)}standaloneRender=null;claimForStandaloneRender(e){let n=()=>{if(this.standaloneRender===t)this.standaloneRender=null},t=e.then(n,n);this.standaloneRender=t}get pendingStandaloneRender(){return this.standaloneRender}}var r=new Y(()=>new o);function ui(){return r.of(W().host)}
export{ui};
