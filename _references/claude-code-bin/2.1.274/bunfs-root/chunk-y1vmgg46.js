// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{j6n}from"/$bunfs/root/chunk-qq8vrqdk.js";import{bzt}from"/$bunfs/root/chunk-btr0wq16.js";import{myr}from"/$bunfs/root/chunk-p0jpfv5k.js";import{pyr}from"/$bunfs/root/chunk-w3ymdhhw.js";import{ua}from"/$bunfs/root/chunk-x31r83nz.js";import{J_r}from"/$bunfs/root/chunk-nrhsy0rh.js";import{$m}from"/$bunfs/root/chunk-5mzvkfyk.js";import{Hpe}from"/$bunfs/root/chunk-ayyj05ne.js";function a(e,r){return Object.entries(e.frameUrls??{}).find(([i,s])=>s?.url!==void 0&&!Hpe(i)&&ua(s.url)===r)?.[0]}function l(e,r){return(e.workshopVerifiedSlugs??[]).includes(r)||Object.entries(e.frameUrls??{}).some(([i,s])=>s?.url!==void 0&&ua(s.url)===r&&bzt(i))}function PHn(e,r){return{ownPublishes:j6n(e,r),workshopTelemetry:J_r(e,r),whiteboardTelemetry:pyr(e,r),prReviewTargets:myr(e,r),recordedPages:{isWorkshopPage:(i)=>l(e(),i),localSourcePath:(i)=>a(e(),i)}}}function fRt(){let e={};return PHn(()=>e,(r)=>{e=r(e)})}var mRt={assign:()=>$m[0],get:()=>{return}};function Sbe(e){return{assign(r){let i=e.get(),s=i.assignments.get(r);if(s)return s;let t=$m[i.index%$m.length];return e.set((o)=>{if(o.assignments.has(r))return o;let n=new Map(o.assignments);return n.set(r,t),{assignments:n,index:o.index+1}}),t},get(r){return e.get().assignments.get(r)}}}var mne=Object.freeze({bridge:void 0,channel:void 0});class EXt{#e=void 0;#r=void 0;get bridge(){return this.#e}get channel(){return this.#r}connectBridge(e){this.#e=e}disconnectBridge(){this.#e=void 0}setChannel(e){this.#r=e}}
export{PHn,fRt,mRt,Sbe,mne,EXt};
