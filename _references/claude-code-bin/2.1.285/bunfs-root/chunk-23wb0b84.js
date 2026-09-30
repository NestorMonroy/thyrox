// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q}from"/$bunfs/root/chunk-bxhyh54r.js";import{VHe}from"/$bunfs/root/chunk-vnpkkncv.js";class a{#t=!1;#o=!1;get autoModeCheckRan(){return this.#t}get isLaunchRun(){return!this.#o}claimAutoModeCheck(){if(this.#t)return!1;return this.#t=!0,!0}rearmAutoModeCheck(){this.#t=!1,this.#o=!0}reset(){this.#t=!1,this.#o=!1}}var c=new q(()=>new a);function I7e(t){return{key:"auto-mode-gate-notification",kind:"warning",text:t,color:"warning",priority:"high"}}async function P7e(t,u,f,l,n){let s=c.of(t);if(!s.claimAutoModeCheck())return;let{updateContext:h,notification:o}=await VHe(u,l,s.isLaunchRun);if(f((e)=>{let r=h(e.toolPermissionContext),i=r===e.toolPermissionContext?e:{...e,toolPermissionContext:r};if(!o||n)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,I7e(o)]}}}),o&&n)n(I7e(o))}function WVt(t){c.of(t).rearmAutoModeCheck()}
export{I7e,P7e,WVt};
