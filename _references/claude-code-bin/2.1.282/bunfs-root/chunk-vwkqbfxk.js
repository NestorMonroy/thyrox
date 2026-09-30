// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{plr}from"/$bunfs/root/chunk-etvwvvwh.js";import{Uon}from"/$bunfs/root/chunk-rnveejg1.js";import{W5r}from"/$bunfs/root/chunk-m1c5htw4.js";import{B5r}from"/$bunfs/root/chunk-rykcm74c.js";import{la}from"/$bunfs/root/chunk-an11nt8y.js";import{KXr}from"/$bunfs/root/chunk-mp1gknps.js";import{lh}from"/$bunfs/root/chunk-1z65s61j.js";import{cwe}from"/$bunfs/root/chunk-c9jscxk0.js";import{DU}from"/$bunfs/root/chunk-k0p66s5d.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([o,t])=>t?.url!==void 0&&!cwe(o)&&la(t.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([o,t])=>t?.url!==void 0&&la(t.url)===r&&Uon(o))}var d=Object.freeze({}),m=DU("artifactReadConsentSlugs",d),c=DU("artifactConsentEpoch",0);function uQn(e,r){return{ownPublishes:plr(e,r),workshopTelemetry:KXr(e,r),whiteboardTelemetry:B5r(e,r),prReviewTargets:W5r(e,r),recordedPages:{isWorkshopPage:(o)=>l(e(),o),localSourcePath:(o)=>a(e(),o)},sharedReadConsent:m(e,r),consentEpoch:c(e,r)}}function bGt(){let e={};return uQn(()=>e,(r)=>{e=r(e)})}var SGt={assign:()=>lh[0],get:()=>{return}};function Dxe(e){return{assign(r){let o=e.get(),t=o.assignments.get(r);if(t)return t;let i=lh[o.index%lh.length];return e.set((s)=>{if(s.assignments.has(r))return s;let n=new Map(s.assignments);return n.set(r,i),{assignments:n,index:s.index+1}}),i},get(r){return e.get().assignments.get(r)}}}var Qce=Object.freeze({bridge:void 0,channel:void 0});class iSn{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{uQn,bGt,SGt,Dxe,Qce,iSn};
