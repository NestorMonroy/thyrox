// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{y,c}from"/$bunfs/root/chunk-czwr6846.js";import{it,te}from"/$bunfs/root/chunk-31aa9k3a.js";import{q}from"/$bunfs/root/chunk-d37h8mav.js";import{_,m,p}from"/$bunfs/root/chunk-q5gkv7dz.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{ja}from"/$bunfs/root/chunk-swk3rjnt.js";import{G3t}from"/$bunfs/root/chunk-my06aerx.js";var n=[{kind:"ios_app",found:(t)=>t.has_ios_app_project},{kind:"android_app",found:(t)=>t.has_android_app_project}];class i{#t=0;#o=0;#e=new Map;get started(){return this.#t>0}start(){this.#t++,this.#r(!1)}conversationReset(){if(this.started)this.#t++,this.#r(!1)}directoryChanged(){if(!this.started){this.start();return}this.#r(!1)}turnStarting(){let t=this.#t;if(!this.started||this.#o===t)return;if(this.#o=t,n.some(({kind:e})=>this.#e.get(e)!==t))this.#r(!0)}#r(t){let e=this.#t;G3t({fresh:t}).then((r)=>{if(e!==this.#t||r===null)return;if(r.has_ios_app_project===null&&this.#e.get("ios_app")!==e)p("dev_intent_detect","project_unreadable",{kind:y("ios_app"),trigger:y("project_scan")});for(let{kind:o,found:s}of n)if(s(r)===!0&&this.#e.get(o)!==e)this.#e.set(o,e),this.#n(o)})}#n(t){try{ja({type:"system",subtype:"dev_intent",kind:t,trigger:"project_scan"}),_("dev_intent_detect",{kind:c(t),trigger:y("project_scan")})}catch(e){d(it(te(e),"project dev intent send failed")),m("dev_intent_detect","project_send_threw",{kind:c(t),trigger:y("project_scan")})}}}var ize=new q(()=>new i);
export{ize};
