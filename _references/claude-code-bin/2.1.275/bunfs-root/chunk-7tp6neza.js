// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{PXn}from"/$bunfs/root/chunk-y4mqcs47.js";import{Oqt}from"/$bunfs/root/chunk-xrpeszkn.js";import{Ovr}from"/$bunfs/root/chunk-f3y5qs2c.js";import{Pvr}from"/$bunfs/root/chunk-ba8cfjp3.js";import{Xi}from"/$bunfs/root/chunk-cf542jqn.js";import{kkr}from"/$bunfs/root/chunk-991sqjbb.js";import{Km}from"/$bunfs/root/chunk-jbg7raey.js";import{zfe}from"/$bunfs/root/chunk-q2gh92k2.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!zfe(i)&&Xi(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&Xi(s.url)===r&&Oqt(i))}function ZDn(e,r){return{ownPublishes:PXn(e,r),workshopTelemetry:kkr(e,r),whiteboardTelemetry:Pvr(e,r),prReviewTargets:Ovr(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function YIt(){let e={};return ZDn(()=>e,(r)=>{e=r(e)})}var XIt={assign:()=>Km[0],get:()=>{return}};function zSe(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=Km[i.index%Km.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var pre=Object.freeze({bridge:void 0,channel:void 0});class nZt{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{ZDn,YIt,XIt,zSe,pre,nZt};
