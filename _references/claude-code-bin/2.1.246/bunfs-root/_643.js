// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{oxc as e,qxc as c}from"/$bunfs/root/_674.js";import{Lzc as n,Pzc as i}from"/$bunfs/root/_686.js";import{xxd as a}from"/$bunfs/root/_837.js";function f(){return e().status==="ok"&&n()!==null}function g(t){let r=t.startsWith("/api/frame/")?t.slice(10):t;return`${s}${r}`}function l(t,r){return`${R}/${encodeURIComponent(t)}${r}`}function C(t){return{"x-frame-asset-token":t}}var o="/v1/code/agent-proxy",s,R,A="artifact_mount";var p=a(()=>{c();i();s=`${o}/frame`;R=`${o}/artifact`});
export{f as M5b,o as N5b,g as O5b,A as P5b,l as Q5b,C as R5b,p as S5b};
