// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{lBr,Xft}from"/$bunfs/root/chunk-8d0q4yh9.js";class t extends Map{get everMounted(){return Xft()}set everMounted(n){lBr(n)}set(n,o){this.everMounted=!0;let e=this.get(n);if(e&&e!==o&&!e.hasUnmounted&&e.holdsRawMode)d(Error("ink: second root created on a stream whose mounted root still holds stdin (raw mode); unmount the previous root first"));return super.set(n,o)}treeRoots=new Map;standaloneRender=null;claimForStandaloneRender(n){let o=()=>{if(this.standaloneRender===e)this.standaloneRender=null},e=n.then(o,o);this.standaloneRender=e}get pendingStandaloneRender(){return this.standaloneRender}}var r=new G(()=>new t);function As(){return r.of(W().host)}
export{As};
