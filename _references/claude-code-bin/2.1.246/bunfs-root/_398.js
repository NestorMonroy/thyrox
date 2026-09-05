// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Cdc as n,Ddc as r,Dfc as s,Edc as u,Ndc as i,pec as l,rfc as o}from"/$bunfs/root/_668.js";import{xxd as a}from"/$bunfs/root/_837.js";function c(){let e=i();if(e==="opus"&&n())return{alias:"opus[1m]",name:"Opus 1M",multiplier:5};else if(e==="sonnet"&&r()&&!s(l()))return{alias:"sonnet[1m]",name:"Sonnet 1M",multiplier:5};return null}function d(e){let t=c();if(!t)return null;switch(e){case"warning":return`/model ${t.alias}`;case"tip":return`Tip: You have access to ${t.name} with ${t.multiplier}x more context`;default:return null}}var m=a(()=>{u();o()});
export{d as KP,m as LP};
