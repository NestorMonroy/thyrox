// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{NPe}from"/$bunfs/root/chunk-1040s0x6.js";import{jHt}from"/$bunfs/root/chunk-03qex2dt.js";import{HUn}from"/$bunfs/root/chunk-nd65ye06.js";import{bUn}from"/$bunfs/root/chunk-xcz7d330.js";import{Ma}from"/$bunfs/root/chunk-tsnan5t5.js";import{kUn}from"/$bunfs/root/chunk-0dafcrw6.js";import{sp}from"/$bunfs/root/chunk-1ag0ee2m.js";import{Q_e}from"/$bunfs/root/chunk-m82dfgh3.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!Q_e(i)&&Ma(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&Ma(s.url)===r&&jHt(i))}function ale(e,r){return{ownPublishes:NPe(e,r),workshopTelemetry:kUn(e,r),whiteboardTelemetry:bUn(e,r),prReviewTargets:HUn(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function fst(){let e={};return ale(()=>e,(r)=>{e=r(e)})}var pst={assign:()=>sp[0],get:()=>{return}};function lle(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=sp[i.index%sp.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var O6=Object.freeze({bridge:void 0,channel:void 0});class vPt{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{ale,fst,pst,lle,O6,vPt};
