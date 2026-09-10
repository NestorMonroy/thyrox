// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{RAn}from"/$bunfs/root/chunk-6ysaq0dt.js";import{ITt}from"/$bunfs/root/chunk-8c9p99ew.js";import{Uqn}from"/$bunfs/root/chunk-v2xwcyx6.js";import{Nqn}from"/$bunfs/root/chunk-dpq3z41t.js";import{Wi}from"/$bunfs/root/chunk-1vw101nq.js";import{Gqn}from"/$bunfs/root/chunk-1syb6ky7.js";import{_f}from"/$bunfs/root/chunk-p1w3e187.js";import{xwe}from"/$bunfs/root/chunk-8k0dg7dk.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!xwe(i)&&Wi(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&Wi(s.url)===r&&ITt(i))}function sue(e,r){return{ownPublishes:RAn(e,r),workshopTelemetry:Gqn(e,r),whiteboardTelemetry:Nqn(e,r),prReviewTargets:Uqn(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function uut(){let e={};return sue(()=>e,(r)=>{e=r(e)})}var dut={assign:()=>_f[0],get:()=>{return}};function iue(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=_f[i.index%_f.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var lX=Object.freeze({bridge:void 0,channel:void 0});class r$t{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{sue,uut,dut,iue,lX,r$t};
