// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{ut,ue}from"/$bunfs/root/chunk-d5d0zdsy.js";import{b,c}from"/$bunfs/root/chunk-gytndg57.js";import{G}from"/$bunfs/root/chunk-4qqe0nh4.js";import{_,m,f}from"/$bunfs/root/chunk-epe8zpsz.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{Al}from"/$bunfs/root/chunk-xbd48fav.js";import{JPt}from"/$bunfs/root/chunk-bjeefqav.js";var n=[{kind:"ios_app",found:(t)=>t.has_ios_app_project},{kind:"android_app",found:(t)=>t.has_android_app_project}];class i{#t=0;#r=0;#e=new Map;get started(){return this.#t>0}start(){this.#t++,this.#o(!1)}conversationReset(){if(this.started)this.#t++,this.#o(!1)}turnStarting(){let t=this.#t;if(!this.started||this.#r===t)return;if(this.#r=t,n.some(({kind:e})=>this.#e.get(e)!==t))this.#o(!0)}#o(t){let e=this.#t;JPt({fresh:t}).then((o)=>{if(e!==this.#t||o===null)return;if(o.has_ios_app_project===null&&this.#e.get("ios_app")!==e)f("dev_intent_detect","project_unreadable",{kind:b("ios_app"),trigger:b("project_scan")});for(let{kind:r,found:s}of n)if(s(o)===!0&&this.#e.get(r)!==e)this.#e.set(r,e),this.#n(r)})}#n(t){try{Al({type:"system",subtype:"dev_intent",kind:t,trigger:"project_scan"}),_("dev_intent_detect",{kind:c(t),trigger:b("project_scan")})}catch(e){d(ut(ue(e),"project dev intent send failed")),m("dev_intent_detect","project_send_threw",{kind:c(t),trigger:b("project_scan")})}}}var KGe=new G(()=>new i);
export{KGe};
