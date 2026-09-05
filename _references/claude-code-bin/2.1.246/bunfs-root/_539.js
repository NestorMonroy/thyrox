// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{oid as r,tid as d}from"/$bunfs/root/_825.js";import{Jjd as s,Kjd as c,atd as P,zkd as n}from"/$bunfs/root/_826.js";import{xxd as u}from"/$bunfs/root/_837.js";function i(){return Boolean(process.env.CLAUDE_MEMORY_STORES?.trim())}class l{settled=!1;racePromise=null;raceSettled=!1;waiters=[];settle(){this.settled=!0;for(let e of this.waiters)e();this.waiters=[]}isPending(){if(this.settled||this.raceSettled)return!1;return i()}async wait(e){if(this.settled||this.raceSettled)return;if(!i())return;if(!this.racePromise)this.racePromise=Promise.race([new Promise((a)=>this.waiters.push(a)),r(o)]),this.racePromise.then(()=>{this.raceSettled=!0});await Promise.race([this.racePromise,r(o,e)])}}function t(){return f.of(n().host)}function w(){t().settle()}function v(){return!t().settled&&i()}function g(e){return t().wait(e)}function x(){return t().isPending()}var o=2500,f;var S=u(()=>{P();c();d();f=new s(()=>new l)});
export{o as Mwb,l as Nwb,f as Owb,w as Pwb,v as Qwb,g as Rwb,x as Swb,S as Twb};
