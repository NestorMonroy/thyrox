// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{jNe}from"/$bunfs/root/chunk-kfgah04j.js";import{FEt}from"/$bunfs/root/chunk-89z5e5jw.js";import{Jjn}from"/$bunfs/root/chunk-whnvw1d7.js";import{Yjn}from"/$bunfs/root/chunk-bnb2q6px.js";import{Ni}from"/$bunfs/root/chunk-7kse1ekq.js";import{n2n}from"/$bunfs/root/chunk-3hx096qm.js";import{ep}from"/$bunfs/root/chunk-q2wrayky.js";import{Wbe}from"/$bunfs/root/chunk-se0qtvt0.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!Wbe(i)&&Ni(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&Ni(s.url)===r&&FEt(i))}function vle(e,r){return{ownPublishes:jNe(e,r),workshopTelemetry:n2n(e,r),whiteboardTelemetry:Yjn(e,r),prReviewTargets:Jjn(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function Uat(){let e={};return vle(()=>e,(r)=>{e=r(e)})}var jat={assign:()=>ep[0],get:()=>{return}};function kle(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=ep[i.index%ep.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var Z6=Object.freeze({bridge:void 0,channel:void 0});class nDt{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{vle,Uat,jat,kle,Z6,nDt};
