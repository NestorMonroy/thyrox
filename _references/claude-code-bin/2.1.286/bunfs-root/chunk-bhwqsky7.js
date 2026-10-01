// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V}from"/$bunfs/root/chunk-hbjpbz2q.js";import{e0e}from"/$bunfs/root/chunk-n47xepyv.js";class a{#t=!1;#o=!1;get autoModeCheckRan(){return this.#t}get isLaunchRun(){return!this.#o}claimAutoModeCheck(){if(this.#t)return!1;return this.#t=!0,!0}rearmAutoModeCheck(){this.#t=!1,this.#o=!0}reset(){this.#t=!1,this.#o=!1}}var c=new V(()=>new a);function cZe(t){return{key:"auto-mode-gate-notification",kind:"warning",text:t,color:"warning",priority:"high"}}async function dZe(t,u,f,l,n){let s=c.of(t);if(!s.claimAutoModeCheck())return;let{updateContext:h,notification:o}=await e0e(u,l,s.isLaunchRun);if(f((e)=>{let r=h(e.toolPermissionContext),i=r===e.toolPermissionContext?e:{...e,toolPermissionContext:r};if(!o||n)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,cZe(o)]}}}),o&&n)n(cZe(o))}function o4t(t){c.of(t).rearmAutoModeCheck()}
export{cZe,dZe,o4t};
