// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Xyr}from"/$bunfs/root/chunk-engpw3kj.js";import{mun}from"/$bunfs/root/chunk-sd0096wb.js";import{bro}from"/$bunfs/root/chunk-v2edwjqs.js";import{yro}from"/$bunfs/root/chunk-h8zgc8xh.js";import{ga}from"/$bunfs/root/chunk-dd2zynyc.js";import{Dlo}from"/$bunfs/root/chunk-sw8hjwvv.js";import{Nh}from"/$bunfs/root/chunk-q8zgw8kw.js";import{ole}from"/$bunfs/root/chunk-cz4d2a16.js";import{b1}from"/$bunfs/root/chunk-39gr7gnw.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([o,t])=>t?.url!==void 0&&!ole(o)&&ga(t.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([o,t])=>t?.url!==void 0&&ga(t.url)===r&&mun(o))}var d=Object.freeze({}),m=b1("artifactReadConsentSlugs",d),c=b1("artifactConsentEpoch",0);function plr(e,r){return{ownPublishes:Xyr(e,r),workshopTelemetry:Dlo(e,r),whiteboardTelemetry:yro(e,r),prReviewTargets:bro(e,r),recordedPages:{isWorkshopPage:(o)=>l(e(),o),localSourcePath:(o)=>a(e(),o)},sharedReadConsent:m(e,r),consentEpoch:c(e,r)}}function Yze(){let e={};return plr(()=>e,(r)=>{e=r(e)})}var Xze={assign:()=>Nh[0],get:()=>{return}};function rHe(e){return{assign(r){let o=e.get(),t=o.assignments.get(r);if(t)return t;let i=Nh[o.index%Nh.length];return e.set((s)=>{if(s.assignments.has(r))return s;let n=new Map(s.assignments);return n.set(r,i),{assignments:n,index:s.index+1}}),i},get(r){return e.get().assignments.get(r)}}}var v8=Object.freeze({bridge:void 0,channel:void 0});class cRn{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{plr,Yze,Xze,rHe,v8,cRn};
