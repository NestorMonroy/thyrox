// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as l}from"/$bunfs/root/_837.js";import{lstat as c,realpath as y}from"fs/promises";import{dirname as a,join as f}from"path";function m(t){let o=!1,e=!1,n=!1;for(let r of t){let s=r.isDirectory||r.isSymbolicLink;o||=r.name===i.head&&!r.isDirectory,e||=r.name===i.objects&&s,n||=r.name===i.refs&&s}return o&&e&&n}async function b(t){let o=await Promise.all([i.head,i.objects,i.refs].map((e)=>c(f(t,e)).then((n)=>({name:e,isDirectory:n.isDirectory(),isSymbolicLink:n.isSymbolicLink()}),()=>null)));return m(o.filter((e)=>e!==null))}async function h(t){let o=await y(t).catch(()=>t);for(let e=o;;e=a(e)){if(await b(e))return!0;if(a(e)===e)return!1}}var i;var u=l(()=>{i={head:"HEAD",objects:"objects",refs:"refs"}});
export{i as QVb,m as RVb,b as SVb,h as TVb,u as UVb};
