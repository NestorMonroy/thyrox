// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,GNn}from"/$bunfs/root/chunk-t8q7n4ta.js";import{hxn,Mr,a1,xW,lxe,Wtt,lHn}from"/$bunfs/root/chunk-btbsn9s4.js";import{I9e}from"/$bunfs/root/chunk-yw4jc948.js";function klt(o){if(GNn(),a1(),Mr().providerCache=hxn(),xW(),lxe(),lHn(),o==="firstParty")Wtt()}class n{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new z(()=>new n);function IHe(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function PHe(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:e}=await I9e(l,c);if(d((t)=>{let s=m(t.toolPermissionContext),i=s===t.toolPermissionContext?t:{...t,toolPermissionContext:s};if(!e||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,IHe(e)]}}}),e&&r)r(IHe(e))}function Alt(o){a.of(o).rearmAutoModeCheck()}
export{klt,IHe,PHe,Alt};
