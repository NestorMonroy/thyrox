// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,APn}from"/$bunfs/root/chunk-b1z7jvb2.js";import{Kwn,ho,u1,TG,aie,Z7e,Tvn}from"/$bunfs/root/chunk-8qt7d28b.js";import{J8e}from"/$bunfs/root/chunk-vw215j9f.js";function qot(o){if(APn(),u1(),ho().providerCache=Kwn(),TG(),aie(),Tvn(),o==="firstParty")Z7e()}class s{#o=!1;get autoModeCheckRan(){return this.#o}claimAutoModeCheck(){if(this.#o)return!1;return this.#o=!0,!0}rearmAutoModeCheck(){this.#o=!1}reset(){this.#o=!1}}var a=new Y(()=>new s);function uRe(o){return{key:"auto-mode-gate-notification",kind:"warning",text:o,color:"warning",priority:"high"}}async function dRe(o,l,d,c,r){if(!a.of(o).claimAutoModeCheck())return;let{updateContext:m,notification:t}=await J8e(l,c);if(d((e)=>{let n=m(e.toolPermissionContext),i=n===e.toolPermissionContext?e:{...e,toolPermissionContext:n};if(!t||r)return i;return{...i,notifications:{...i.notifications,queue:[...i.notifications.queue,uRe(t)]}}}),t&&r)r(uRe(t))}function Kot(o){a.of(o).rearmAutoModeCheck()}
export{qot,uRe,dRe,Kot};
