// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,P0n}from"/$bunfs/root/chunk-annedm50.js";import{YAn,Pr,r1,hG,fTe,mZe,LTn}from"/$bunfs/root/chunk-hyqdn9c0.js";import{D8e}from"/$bunfs/root/chunk-vd630rs0.js";function Yst(o){if(P0n(),r1(),Pr().providerCache=YAn(),hG(),fTe(),LTn(),o==="firstParty")mZe()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new j(()=>new n);function CIe(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function RIe(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await D8e(l,c);if(d((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,CIe(e)]}}}),e&&r)r(CIe(e))}function Xst(o){a.of(o).rearmAutoModeCheck()}
export{Yst,CIe,RIe,Xst};
