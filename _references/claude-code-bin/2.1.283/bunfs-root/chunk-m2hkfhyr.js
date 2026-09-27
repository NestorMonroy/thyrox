// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{y,c}from"/$bunfs/root/chunk-vyyazxfq.js";import{st,te}from"/$bunfs/root/chunk-ern0s5ks.js";import{q}from"/$bunfs/root/chunk-nvht7ckf.js";import{_,m,p}from"/$bunfs/root/chunk-d09a8ccq.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{Ga}from"/$bunfs/root/chunk-t6pwageh.js";import{_4t}from"/$bunfs/root/chunk-3sfzem6s.js";var n=[{kind:"ios_app",found:(t)=>t.has_ios_app_project},{kind:"android_app",found:(t)=>t.has_android_app_project}];class i{#t=0;#o=0;#e=new Map;get started(){return this.#t>0}start(){this.#t++,this.#r(!1)}conversationReset(){if(this.started)this.#t++,this.#r(!1)}directoryChanged(){if(!this.started){this.start();return}this.#r(!1)}turnStarting(){let t=this.#t;if(!this.started||this.#o===t)return;if(this.#o=t,n.some(({kind:e})=>this.#e.get(e)!==t))this.#r(!0)}#r(t){let e=this.#t;_4t({fresh:t}).then((r)=>{if(e!==this.#t||r===null)return;if(r.has_ios_app_project===null&&this.#e.get("ios_app")!==e)p("dev_intent_detect","project_unreadable",{kind:y("ios_app"),trigger:y("project_scan")});for(let{kind:o,found:s}of n)if(s(r)===!0&&this.#e.get(o)!==e)this.#e.set(o,e),this.#n(o)})}#n(t){try{Ga({type:"system",subtype:"dev_intent",kind:t,trigger:"project_scan"}),_("dev_intent_detect",{kind:c(t),trigger:y("project_scan")})}catch(e){d(st(te(e),"project dev intent send failed")),m("dev_intent_detect","project_send_threw",{kind:c(t),trigger:y("project_scan")})}}}var $We=new q(()=>new i);
export{$We};
