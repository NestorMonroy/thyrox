// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{xTn}from"/$bunfs/root/chunk-e593f5jd.js";import{y}from"/$bunfs/root/chunk-czwr6846.js";import{Me}from"/$bunfs/root/chunk-37s48y77.js";import{C,L}from"/$bunfs/root/chunk-68gegf2j.js";L();var n=[];class i{#n=Me();#o={entries:n,loading:!1};#t=!1;#i=0;#e=0;getSnapshot=()=>this.#o;subscribe=(e)=>this.#n.subscribe(e);#r(e){let t=this.#o,r={...t,...e};if(r.entries===t.entries&&r.loading===t.loading)return;this.#o=r,this.#n.emit()}get pending(){return this.#e!==0}clear(){this.#t=!1,this.#r({entries:n})}beginLoad(){if(this.#e=++this.#i,!this.#t)this.#r({loading:!0});return this.#e}endLoad(e){if(e!==this.#e)return;this.#e=0,this.#r({loading:!1})}setEntries(e){this.#t=!0,this.#r({entries:e.length===0?n:e})}get known(){return this.#t}}function Hje(){return{roster:null,selection:null,view:null,attach:null,editor:null,deleteConfirm:null,earlier:new i,agentLastUsedMigrationDone:!1,scope:null,resultSeen:{entryChannel:y("unknown"),openFinished:null,emitted:new Set},fleetNudgeStore:null,killRing:xTn()}}function ver({selection:e,view:t,attach:r,editor:o,deleteConfirm:l},{clock:s,groupsEnabled:a}){C(()=>{let d=e.attachView({clock:s,onError:o.setError}),p=t.attachView({groupsEnabled:a}),c=r.attachView(),h=o.attachView(),S=l.attachView();return()=>{S(),h(),c(),p(),d()}},[e,t,r,o,l,s])}
export{Hje,ver};
