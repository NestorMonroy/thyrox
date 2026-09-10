// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Tbd as c}from"/$bunfs/root/_811.js";import{ncd as i}from"/$bunfs/root/_812.js";import{xxd as s}from"/$bunfs/root/_837.js";import{homedir as m}from"os";import{join as o}from"path";function r(e){return{env:e?.env??process.env,home:e?.homedir??i.HOME??m()}}function G(e){let{env:n,home:t}=r(e);return n.XDG_STATE_HOME??o(t,".local","state")}function X(e){let{env:n,home:t}=r(e);return n.XDG_CACHE_HOME??o(t,".cache")}function p(e){let{env:n,home:t}=r(e);return n.XDG_DATA_HOME??o(t,".local","share")}function a(e){return o(p(e),"claude","versions")}function h(e){let{home:n}=r(e);return o(n,".local","bin")}var D=s(()=>{c()});
export{G as jUb,X as kUb,p as lUb,a as mUb,h as nUb,D as oUb};
