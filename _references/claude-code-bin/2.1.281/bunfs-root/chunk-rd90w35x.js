// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ASr}from"/$bunfs/root/chunk-336t1akq.js";import{$tn}from"/$bunfs/root/chunk-zykw4mfc.js";import{Yzr}from"/$bunfs/root/chunk-e2xwx1rw.js";import{qzr}from"/$bunfs/root/chunk-baf5gy15.js";import{ra}from"/$bunfs/root/chunk-6j512bza.js";import{Cqr}from"/$bunfs/root/chunk-xs677pz7.js";import{Yg}from"/$bunfs/root/chunk-tb73cqmq.js";import{zbe}from"/$bunfs/root/chunk-4n4g22z6.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!zbe(i)&&ra(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&ra(s.url)===r&&$tn(i))}function c9n(e,r){return{ownPublishes:ASr(e,r),workshopTelemetry:Cqr(e,r),whiteboardTelemetry:qzr(e,r),prReviewTargets:Yzr(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function Ajt(){let e={};return c9n(()=>e,(r)=>{e=r(e)})}var Cjt={assign:()=>Yg[0],get:()=>{return}};function cRe(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=Yg[i.index%Yg.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var Xle=Object.freeze({bridge:void 0,channel:void 0});class zhn{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{c9n,Ajt,Cjt,cRe,Xle,zhn};
