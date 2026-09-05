// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{hp}from"/$bunfs/root/chunk-z9pce9zb.js";import{Qf}from"/$bunfs/root/chunk-c8fb7b2w.js";function C1n(e){return{request:hp(`?${e}$p`),match:(s)=>s.type==="decrpm"&&s.mode===e}}function R1n(){return{request:hp("?6n"),match:(e)=>e.type==="cursorPosition"}}function I1n(e){return{request:Qf(e,"?"),match:(s)=>s.type==="osc"&&s.code===e}}function x1n(){return{request:hp(">0q"),match:(e)=>e.type==="xtversion"}}var n=hp("c");class mtn{stdout;queue=[];themeChangeSubscribers=new Set;constructor(e){this.stdout=e}subscribeThemeChange(e){return this.themeChangeSubscribers.add(e),()=>{this.themeChangeSubscribers.delete(e)}}send(e){return new Promise((s)=>{this.queue.push({kind:"query",match:e.match,resolve:(r)=>s(r)}),this.stdout.write(e.request)})}flush(){return new Promise((e)=>{this.queue.push({kind:"sentinel",resolve:e}),this.stdout.write(n)})}cancel(e){let s=this.queue.findIndex((t)=>t.kind==="query"&&t.match===e.match);if(s===-1)return;let[r]=this.queue.splice(s,1);if(r?.kind==="query")r.resolve(void 0)}resync({probe:e}){for(let s of this.queue.splice(0))if(s.kind==="query")s.resolve(void 0);else if(s.kind==="sentinel")s.resolve();if(e)this.queue.push({kind:"barrier"}),this.stdout.write(n)}onResponse(e){if(e.type==="themeNotify"){for(let r of this.themeChangeSubscribers)r();return}if(this.queue[0]?.kind==="barrier"){if(e.type==="da1")this.queue.shift();return}let s=this.queue.findIndex((r)=>r.kind==="query"&&r.match(e));if(s!==-1){let[r]=this.queue.splice(s,1);if(r?.kind==="query")r.resolve(e);return}if(e.type==="da1"){let r=this.queue.findIndex((t)=>t.kind==="sentinel");if(r===-1)return;for(let t of this.queue.splice(0,r+1))if(t.kind==="query")t.resolve(void 0);else if(t.kind==="sentinel")t.resolve()}}}
export{C1n,R1n,I1n,x1n,mtn};
