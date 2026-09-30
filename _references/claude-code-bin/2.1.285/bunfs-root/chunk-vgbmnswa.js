// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{_,c}from"/$bunfs/root/chunk-aap6zsd0.js";import{tt,ee}from"/$bunfs/root/chunk-vqpmen5t.js";import{q}from"/$bunfs/root/chunk-bxhyh54r.js";import{y,m,f}from"/$bunfs/root/chunk-dpwtsz9f.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{Pi}from"/$bunfs/root/chunk-f74xvn8g.js";import{H3t}from"/$bunfs/root/chunk-kr90wxn4.js";var n=[{kind:"ios_app",found:(t)=>t.has_ios_app_project},{kind:"android_app",found:(t)=>t.has_android_app_project}];class i{#t=0;#o=0;#e=new Map;get started(){return this.#t>0}start(){this.#t++,this.#r(!1)}conversationReset(){if(this.started)this.#t++,this.#r(!1)}directoryChanged(){if(!this.started){this.start();return}this.#r(!1)}turnStarting(){let t=this.#t;if(!this.started||this.#o===t)return;if(this.#o=t,n.some(({kind:e})=>this.#e.get(e)!==t))this.#r(!0)}#r(t){let e=this.#t;H3t({fresh:t}).then((r)=>{if(e!==this.#t||r===null)return;if(r.has_ios_app_project===null&&this.#e.get("ios_app")!==e)f("dev_intent_detect","project_unreadable",{kind:_("ios_app"),trigger:_("project_scan")});for(let{kind:o,found:s}of n)if(s(r)===!0&&this.#e.get(o)!==e)this.#e.set(o,e),this.#n(o)})}#n(t){try{Pi({type:"system",subtype:"dev_intent",kind:t,trigger:"project_scan"}),y("dev_intent_detect",{kind:c(t),trigger:_("project_scan")})}catch(e){u(tt(ee(e),"project dev intent send failed")),m("dev_intent_detect","project_send_threw",{kind:c(t),trigger:_("project_scan")})}}}var g2e=new q(()=>new i);
export{g2e};
