// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{dxa as a,oxa as x}from"/$bunfs/root/_441.js";import{Jjd as r,Kjd as d}from"/$bunfs/root/_826.js";d();x();class c{#t=!1;get autoModeCheckRan(){return this.#t}claimAutoModeCheck(){if(this.#t)return!1;return this.#t=!0,!0}rearmAutoModeCheck(){this.#t=!1}reset(){this.#t=!1}}var f=new r(()=>new c);async function k(i,u,m,l,n){if(!f.of(i).claimAutoModeCheck())return;let{updateContext:h,notification:t}=await a(u,l);if(m((o)=>{let s=h(o.toolPermissionContext),e=s===o.toolPermissionContext?o:{...o,toolPermissionContext:s};if(!t||n)return e;return{...e,notifications:{...e.notifications,queue:[...e.notifications.queue,{key:"auto-mode-gate-notification",text:t,color:"warning",priority:"high"}]}}}),t&&n)n({key:"auto-mode-gate-notification",text:t,color:"warning",priority:"high"})}function y(i){f.of(i).rearmAutoModeCheck()}
export{k as Zl,y as _l};
