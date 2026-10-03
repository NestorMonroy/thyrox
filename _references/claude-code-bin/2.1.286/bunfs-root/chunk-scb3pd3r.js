// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{hwr}from"/$bunfs/root/chunk-xhmfynt7.js";import{Kfn}from"/$bunfs/root/chunk-8kykcmx6.js";import{Eao}from"/$bunfs/root/chunk-q60x01vj.js";import{wao}from"/$bunfs/root/chunk-4gbe577k.js";import{_a}from"/$bunfs/root/chunk-v1zj6cf5.js";import{Upo}from"/$bunfs/root/chunk-0w18020d.js";import{ty}from"/$bunfs/root/chunk-bpr1reze.js";import{Kle}from"/$bunfs/root/chunk-zf2qkmse.js";import{J1}from"/$bunfs/root/chunk-0ehjq4e3.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([o,t])=>t?.url!==void 0&&!Kle(o)&&_a(t.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([o,t])=>t?.url!==void 0&&_a(t.url)===r&&Kfn(o))}var d=Object.freeze({}),m=J1("artifactReadConsentSlugs",d),c=J1("artifactConsentEpoch",0);function _ur(e,r){return{ownPublishes:hwr(e,r),workshopTelemetry:Upo(e,r),whiteboardTelemetry:wao(e,r),prReviewTargets:Eao(e,r),recordedPages:{isWorkshopPage:(o)=>l(e(),o),localSourcePath:(o)=>a(e(),o)},sharedReadConsent:m(e,r),consentEpoch:c(e,r)}}function p2e(){let e={};return _ur(()=>e,(r)=>{e=r(e)})}var f2e={assign:()=>ty[0],get:()=>{return}};function uHe(e){return{assign(r){let o=e.get(),t=o.assignments.get(r);if(t)return t;let i=ty[o.index%ty.length];return e.set((s)=>{if(s.assignments.has(r))return s;let n=new Map(s.assignments);return n.set(r,i),{assignments:n,index:s.index+1}}),i},get(r){return e.get().assignments.get(r)}}}var K8=Object.freeze({bridge:void 0,channel:void 0});class BIn{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{_ur,p2e,f2e,uHe,K8,BIn};
