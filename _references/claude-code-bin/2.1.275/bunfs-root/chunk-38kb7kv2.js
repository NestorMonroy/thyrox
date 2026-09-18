// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,Pdr}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Ger,Rr,X1,Dnr,M3,BUe,$St}from"/$bunfs/root/chunk-xbd48fav.js";import{Qat}from"/$bunfs/root/chunk-jzb1vt5b.js";function vCt(o){if(Pdr(),X1(),Rr().providerCache=Ger(),M3(),BUe(),Dnr(),o==="firstParty")$St()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new G(()=>new n);function dze(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function pze(o,d,l,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await Qat(d,c);if(l((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,dze(e)]}}}),e&&r)r(dze(e))}function ECt(o){a.of(o).rearmAutoModeCheck()}
export{vCt,dze,pze,ECt};
