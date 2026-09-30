// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,UDr}from"/$bunfs/root/chunk-cqc88nqm.js";import{xTr,Nr,wU,I8,vKe,dDe}from"/$bunfs/root/chunk-5khn4tvf.js";import{gEr}from"/$bunfs/root/chunk-sr1hc0y9.js";import{xxe}from"/$bunfs/root/chunk-5npd9aj3.js";function _Ut(o){if(UDr(),wU(),Nr().providerCache=xTr(),I8(),vKe(),gEr(),o==="firstParty")dDe()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new V(()=>new n);function nYe(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function rYe(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await xxe(l,c);if(d((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,nYe(e)]}}}),e&&r)r(nYe(e))}function bUt(o){a.of(o).rearmAutoModeCheck()}
export{_Ut,nYe,rYe,bUt};
