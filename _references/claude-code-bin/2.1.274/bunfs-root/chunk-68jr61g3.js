// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,G}from"/$bunfs/root/chunk-ja309z9r.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{mLr,$dt}from"/$bunfs/root/chunk-sva6b916.js";class t extends Map{get everMounted(){return $dt()}set everMounted(n){mLr(n)}set(n,o){this.everMounted=!0;let e=this.get(n);if(e&&e!==o&&!e.hasUnmounted&&e.holdsRawMode)d(Error("ink: second root created on a stream whose mounted root still holds stdin (raw mode); unmount the previous root first"));return super.set(n,o)}treeRoots=new Map;standaloneRender=null;claimForStandaloneRender(n){let o=()=>{if(this.standaloneRender===e)this.standaloneRender=null},e=n.then(o,o);this.standaloneRender=e}get pendingStandaloneRender(){return this.standaloneRender}}var r=new W(()=>new t);function ys(){return r.of(G().host)}
export{ys};
