// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{eSb as a,lSb as r,sSb as u,wSb as s,ySb as A}from"/$bunfs/root/_593.js";import{h3b as S,m3b as d}from"/$bunfs/root/_633.js";import{xxd as c}from"/$bunfs/root/_837.js";function o(){let t=r(p);if(!t)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return t}function v(t){let e=o(),n=()=>{let i=e.getState();return t(i)};return s(e.subscribe,n,n)}function y(){return o().setState}function T(){let t=o();return u(()=>S(t.setState),[t])}function g(){return o()}function w(){return r(p)?.setState}function E(t){let e=r(p);return s(e?e.subscribe:f,()=>e?t(e.getState()):void 0)}var p,f=()=>()=>{};var l=c(()=>{A();d();p=a(null)});
export{p as TE,v as UE,y as VE,T as WE,g as XE,w as YE,E as ZE,l as _E};
