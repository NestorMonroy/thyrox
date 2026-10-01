// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{_,c}from"/$bunfs/root/chunk-dwaez71m.js";import{nt,ee}from"/$bunfs/root/chunk-ctczby4m.js";import{V}from"/$bunfs/root/chunk-hbjpbz2q.js";import{y,m,f}from"/$bunfs/root/chunk-gm7a1q0z.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Hi}from"/$bunfs/root/chunk-4hjp8tw4.js";import{XYt}from"/$bunfs/root/chunk-d9x2va5c.js";var n=[{kind:"ios_app",found:(t)=>t.has_ios_app_project},{kind:"android_app",found:(t)=>t.has_android_app_project}];class i{#t=0;#o=0;#e=new Map;get started(){return this.#t>0}start(){this.#t++,this.#r(!1)}conversationReset(){if(this.started)this.#t++,this.#r(!1)}directoryChanged(){if(!this.started){this.start();return}this.#r(!1)}turnStarting(){let t=this.#t;if(!this.started||this.#o===t)return;if(this.#o=t,n.some(({kind:e})=>this.#e.get(e)!==t))this.#r(!0)}#r(t){let e=this.#t;XYt({fresh:t}).then((r)=>{if(e!==this.#t||r===null)return;if(r.has_ios_app_project===null&&this.#e.get("ios_app")!==e)f("dev_intent_detect","project_unreadable",{kind:_("ios_app"),trigger:_("project_scan")});for(let{kind:o,found:s}of n)if(s(r)===!0&&this.#e.get(o)!==e)this.#e.set(o,e),this.#n(o)})}#n(t){try{Hi({type:"system",subtype:"dev_intent",kind:t,trigger:"project_scan"}),y("dev_intent_detect",{kind:c(t),trigger:_("project_scan")})}catch(e){d(nt(ee(e),"project dev intent send failed")),m("dev_intent_detect","project_send_threw",{kind:c(t),trigger:_("project_scan")})}}}var M2e=new V(()=>new i);
export{M2e};
