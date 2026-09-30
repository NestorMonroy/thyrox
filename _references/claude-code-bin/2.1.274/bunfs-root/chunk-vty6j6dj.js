// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,Hir}from"/$bunfs/root/chunk-ja309z9r.js";import{Y9n,Cr,s1,BJn,O4,FFe,Yyt}from"/$bunfs/root/chunk-27bj2wbx.js";import{Wst}from"/$bunfs/root/chunk-5v3bq3ty.js";function $kt(o){if(Hir(),s1(),Cr().providerCache=Y9n(),O4(),FFe(),BJn(),o==="firstParty")Yyt()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new W(()=>new n);function mje(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function gje(o,d,l,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await Wst(d,c);if(l((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,mje(e)]}}}),e&&r)r(mje(e))}function Fkt(o){a.of(o).rearmAutoModeCheck()}
export{$kt,mje,gje,Fkt};
