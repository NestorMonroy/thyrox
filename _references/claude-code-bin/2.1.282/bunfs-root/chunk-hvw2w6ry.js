// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,pUr}from"/$bunfs/root/chunk-zwm3fybx.js";import{Bxr,$r,YU,S9,q4e,NLe}from"/$bunfs/root/chunk-wbbthbh9.js";import{ACr}from"/$bunfs/root/chunk-438a6bk3.js";import{OIe}from"/$bunfs/root/chunk-q3dfnatp.js";function ajt(o){if(pUr(),YU(),$r().providerCache=Bxr(),S9(),q4e(),ACr(),o==="firstParty")NLe()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new K(()=>new n);function M8e(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function D8e(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await OIe(l,c);if(d((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,M8e(e)]}}}),e&&r)r(M8e(e))}function ljt(o){a.of(o).rearmAutoModeCheck()}
export{ajt,M8e,D8e,ljt};
