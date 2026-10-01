// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{v_r}from"/$bunfs/root/chunk-er45rrqn.js";import{rpn}from"/$bunfs/root/chunk-1tfp92h1.js";import{Pno}from"/$bunfs/root/chunk-0sfz2d9q.js";import{Rno}from"/$bunfs/root/chunk-avbgjxk0.js";import{wa}from"/$bunfs/root/chunk-ttv57pbg.js";import{Glo}from"/$bunfs/root/chunk-cwdrf18k.js";import{Fh}from"/$bunfs/root/chunk-g3rb05aw.js";import{kge}from"/$bunfs/root/chunk-8emzmjwy.js";import{w1}from"/$bunfs/root/chunk-v2jtzqr4.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([o,t])=>t?.url!==void 0&&!kge(o)&&wa(t.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([o,t])=>t?.url!==void 0&&wa(t.url)===r&&rpn(o))}var d=Object.freeze({}),m=w1("artifactReadConsentSlugs",d),c=w1("artifactConsentEpoch",0);function glr(e,r){return{ownPublishes:v_r(e,r),workshopTelemetry:Glo(e,r),whiteboardTelemetry:Rno(e,r),prReviewTargets:Pno(e,r),recordedPages:{isWorkshopPage:(o)=>l(e(),o),localSourcePath:(o)=>a(e(),o)},sharedReadConsent:m(e,r),consentEpoch:c(e,r)}}function jGe(){let e={};return glr(()=>e,(r)=>{e=r(e)})}var WGe={assign:()=>Fh[0],get:()=>{return}};function cHe(e){return{assign(r){let o=e.get(),t=o.assignments.get(r);if(t)return t;let i=Fh[o.index%Fh.length];return e.set((s)=>{if(s.assignments.has(r))return s;let n=new Map(s.assignments);return n.set(r,i),{assignments:n,index:s.index+1}}),i},get(r){return e.get().assignments.get(r)}}}var m8=Object.freeze({bridge:void 0,channel:void 0});class cRn{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{glr,jGe,WGe,cHe,m8,cRn};
