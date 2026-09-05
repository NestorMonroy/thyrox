// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{vxd as c}from"/$bunfs/root/_837.js";var p=c(function(U){var n=(e)=>encodeURIComponent(e).replace(/[!'()*]/g,u),u=(e)=>`%${e.charCodeAt(0).toString(16).toUpperCase()}`,l=(e)=>e.split("/").map(n).join("/");U.escapeUri=n;U.escapeUriPath=l});var x=c(function(g){var o=p();function y(e){let i=[];for(let s of Object.keys(e).sort()){let r=e[s];if(s=o.escapeUri(s),Array.isArray(r))for(let t=0,a=r.length;t<a;t++)i.push(`${s}=${o.escapeUri(r[t])}`);else{let t=s;if(r||typeof r==="string")t+=`=${o.escapeUri(r)}`;i.push(t)}}return i.join("&")}g.buildQueryString=y});
export{x as f$c};
