// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{jNe}from"/$bunfs/root/chunk-d8sbgfaq.js";import{NEt}from"/$bunfs/root/chunk-9b5ejgew.js";import{Kjn}from"/$bunfs/root/chunk-yn61qr4x.js";import{Vjn}from"/$bunfs/root/chunk-3gxd6d5t.js";import{Ni}from"/$bunfs/root/chunk-nrkj245a.js";import{Zjn}from"/$bunfs/root/chunk-7w6bh7dm.js";import{ep}from"/$bunfs/root/chunk-78e0pwfv.js";import{zbe}from"/$bunfs/root/chunk-73a8tbsw.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!zbe(i)&&Ni(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&Ni(s.url)===r&&NEt(i))}function Ale(e,r){return{ownPublishes:jNe(e,r),workshopTelemetry:Zjn(e,r),whiteboardTelemetry:Vjn(e,r),prReviewTargets:Kjn(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function Bat(){let e={};return Ale(()=>e,(r)=>{e=r(e)})}var Uat={assign:()=>ep[0],get:()=>{return}};function vle(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=ep[i.index%ep.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var X6=Object.freeze({bridge:void 0,channel:void 0});class tDt{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{Ale,Bat,Uat,vle,X6,tDt};
