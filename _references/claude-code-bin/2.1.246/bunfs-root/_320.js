// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Qrc as _,yrc as s}from"/$bunfs/root/_668.js";import{AUc as d,BUc as f,DUc as l}from"/$bunfs/root/_740.js";import{Tbd as p}from"/$bunfs/root/_811.js";import{ncd as a}from"/$bunfs/root/_812.js";import{jhd as i,ohd as c}from"/$bunfs/root/_820.js";import{Uhd as t,Vhd as n,nid as u}from"/$bunfs/root/_824.js";import{nud as o,pud as m}from"/$bunfs/root/_829.js";import{xxd as g}from"/$bunfs/root/_837.js";function v(e){if(d(a.CLAUDE_CODE_HOVER_REST??s("tengu_hover_rest",!1)),e===void 0)return o()?f():void 0;let r=o()?e.backend:void 0;if(r===void 0)return;if(!n(e.configHome)){i(`CLAUDE_CONFIG_DIR now names ${t()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return r}var C=g(()=>{_();m();c();p();u();l()});
export{v as gH,C as hH};
