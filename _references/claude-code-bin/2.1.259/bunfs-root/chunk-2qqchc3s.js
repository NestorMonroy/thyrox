// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{y0e}from"/$bunfs/root/chunk-j4rfty67.js";import{xEt}from"/$bunfs/root/chunk-dtz7ymrp.js";import{OGn}from"/$bunfs/root/chunk-9gtqvf6w.js";import{$Gn}from"/$bunfs/root/chunk-k2a4kvsw.js";import{Ba}from"/$bunfs/root/chunk-2yqsfgga.js";import{jGn}from"/$bunfs/root/chunk-wjy4fxhr.js";import{dp}from"/$bunfs/root/chunk-11mcqc6q.js";import{lSe}from"/$bunfs/root/chunk-j974qv4b.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!lSe(i)&&Ba(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&Ba(s.url)===r&&xEt(i))}function oce(e,r){return{ownPublishes:y0e(e,r),workshopTelemetry:jGn(e,r),whiteboardTelemetry:$Gn(e,r),prReviewTargets:OGn(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function Qat(){let e={};return oce(()=>e,(r)=>{e=r(e)})}var Zat={assign:()=>dp[0],get:()=>{return}};function ice(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=dp[i.index%dp.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var EY=Object.freeze({bridge:void 0,channel:void 0});class U0t{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{oce,Qat,Zat,ice,EY,U0t};
