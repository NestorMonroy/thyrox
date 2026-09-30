// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Xmr}from"/$bunfs/root/chunk-t6d8w8jb.js";import{ucn}from"/$bunfs/root/chunk-qg1wkbh3.js";import{vQr}from"/$bunfs/root/chunk-5n3rmvdq.js";import{SQr}from"/$bunfs/root/chunk-ndc9h2zx.js";import{ha}from"/$bunfs/root/chunk-f31sk9qj.js";import{Poo}from"/$bunfs/root/chunk-0xkwfstm.js";import{Th}from"/$bunfs/root/chunk-ex4n0jxy.js";import{Cme}from"/$bunfs/root/chunk-wa64fjnt.js";import{t1}from"/$bunfs/root/chunk-j7qjtsd3.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([o,t])=>t?.url!==void 0&&!Cme(o)&&ha(t.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([o,t])=>t?.url!==void 0&&ha(t.url)===r&&ucn(o))}var d=Object.freeze({}),m=t1("artifactReadConsentSlugs",d),c=t1("artifactConsentEpoch",0);function $or(e,r){return{ownPublishes:Xmr(e,r),workshopTelemetry:Poo(e,r),whiteboardTelemetry:SQr(e,r),prReviewTargets:vQr(e,r),recordedPages:{isWorkshopPage:(o)=>l(e(),o),localSourcePath:(o)=>a(e(),o)},sharedReadConsent:m(e,r),consentEpoch:c(e,r)}}function TWe(){let e={};return $or(()=>e,(r)=>{e=r(e)})}var AWe={assign:()=>Th[0],get:()=>{return}};function XPe(e){return{assign(r){let o=e.get(),t=o.assignments.get(r);if(t)return t;let i=Th[o.index%Th.length];return e.set((s)=>{if(s.assignments.has(r))return s;let n=new Map(s.assignments);return n.set(r,i),{assignments:n,index:s.index+1}}),i},get(r){return e.get().assignments.get(r)}}}var OY=Object.freeze({bridge:void 0,channel:void 0});class dTn{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{$or,TWe,AWe,XPe,OY,dTn};
