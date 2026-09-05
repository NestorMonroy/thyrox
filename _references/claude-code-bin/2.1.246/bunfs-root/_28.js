// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{jhd as g,ohd as p}from"/$bunfs/root/_820.js";import{xkd as c,ykd as f}from"/$bunfs/root/_826.js";import{ctd as d}from"/$bunfs/root/_827.js";import{pxd as n}from"/$bunfs/root/_836.js";f();p();d();function v(){let i=n(),e=new Map,o=0;return{emit(t,r){if(o===0){e.set(t,r);return}i.emit(t,r)},subscribe(t){o++;let r=[...e];e.clear();for(let[u,m]of r)t(u,m);let l=i.subscribe(t),s=!0;return()=>{if(s)s=!1,o--,l()}}}}var b=new c(v);function T(i){return(e,o)=>{g(`[remote-tools] ${e}: ${o}`),b.of(i).emit(e,o)}}
export{v as ec,b as fc,T as gc};
