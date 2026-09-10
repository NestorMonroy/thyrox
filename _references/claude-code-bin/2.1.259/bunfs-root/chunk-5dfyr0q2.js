// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,A$n}from"/$bunfs/root/chunk-x1rrg5j2.js";import{Fvn,mo,R1,KG,tse,IZe,TCn}from"/$bunfs/root/chunk-x722nt0q.js";import{D3e}from"/$bunfs/root/chunk-qpwbvc04.js";function wst(o){if(A$n(),R1(),mo().providerCache=Fvn(),KG(),tse(),TCn(),o==="firstParty")IZe()}class s{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new V(()=>new s);function Lxe(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function Pxe(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:t}=await D3e(l,c);if(d((e)=>{let n=m(e.toolPermissionContext),i=n===e.toolPermissionContext?e:{...e,toolPermissionContext:n};if(!t||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,Lxe(t)]}}}),t&&r)r(Lxe(t))}function Est(o){a.of(o).rearmAutoModeCheck()}
export{wst,Lxe,Pxe,Est};
