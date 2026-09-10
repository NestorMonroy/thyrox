// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Lkd as o,Tkd as i,Ukd as d,atd as g}from"/$bunfs/root/_826.js";import{Dtd as n,mud as u}from"/$bunfs/root/_828.js";import{xxd as c}from"/$bunfs/root/_837.js";import{AsyncLocalStorage as w}from"async_hooks";function s(t,r){return e.run({cwd:n(t)},r)}function S(t,r){return s(t??f(),r)}function T(){return e.getStore()!==void 0}function h(t){let r=e.getStore();if(r)r.cwd=n(t);else d(t)}function a(){return e.getStore()?.cwd??i()}function f(){try{return a()}catch{return o()}}var e;var p=c(()=>{g();u();e=new w});
export{s as h_c,S as i_c,T as j_c,h as k_c,a as l_c,f as m_c,p as n_c};
