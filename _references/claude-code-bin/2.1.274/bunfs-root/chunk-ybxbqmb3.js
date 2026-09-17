// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ut,de}from"/$bunfs/root/chunk-3btyksgt.js";import{b,c}from"/$bunfs/root/chunk-64dkx51v.js";import{W}from"/$bunfs/root/chunk-ja309z9r.js";import{_,p,g}from"/$bunfs/root/chunk-marw4shk.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{Il}from"/$bunfs/root/chunk-27bj2wbx.js";import{uxt}from"/$bunfs/root/chunk-2epas1a2.js";var n=[{kind:"ios_app",found:(t)=>t.has_ios_app_project},{kind:"android_app",found:(t)=>t.has_android_app_project}];class i{#t=0;#r=0;#e=new Map;get started(){return this.#t>0}start(){this.#t++,this.#o(!1)}conversationReset(){if(this.started)this.#t++,this.#o(!1)}turnStarting(){let t=this.#t;if(!this.started||this.#r===t)return;if(this.#r=t,n.some(({kind:e})=>this.#e.get(e)!==t))this.#o(!0)}#o(t){let e=this.#t;uxt({fresh:t}).then((o)=>{if(e!==this.#t||o===null)return;if(o.has_ios_app_project===null&&this.#e.get("ios_app")!==e)g("dev_intent_detect","project_unreadable",{kind:b("ios_app"),trigger:b("project_scan")});for(let{kind:r,found:s}of n)if(s(o)===!0&&this.#e.get(r)!==e)this.#e.set(r,e),this.#n(r)})}#n(t){try{Il({type:"system",subtype:"dev_intent",kind:t,trigger:"project_scan"}),_("dev_intent_detect",{kind:c(t),trigger:b("project_scan")})}catch(e){d(ut(de(e),"project dev intent send failed")),p("dev_intent_detect","project_send_threw",{kind:c(t),trigger:b("project_scan")})}}}var Xze=new W(()=>new i);
export{Xze};
