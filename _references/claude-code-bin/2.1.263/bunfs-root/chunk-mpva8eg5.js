// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{j,$0n}from"/$bunfs/root/chunk-k6vqz9fa.js";import{XAn,Pr,s1,yG,fTe,mZe,DTn}from"/$bunfs/root/chunk-32f2qmtc.js";import{M8e}from"/$bunfs/root/chunk-9wa0ka8p.js";function Xst(o){if($0n(),s1(),Pr().providerCache=XAn(),yG(),fTe(),DTn(),o==="firstParty")mZe()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new j(()=>new n);function CIe(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function RIe(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await M8e(l,c);if(d((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,CIe(e)]}}}),e&&r)r(CIe(e))}function Jst(o){a.of(o).rearmAutoModeCheck()}
export{Xst,CIe,RIe,Jst};
