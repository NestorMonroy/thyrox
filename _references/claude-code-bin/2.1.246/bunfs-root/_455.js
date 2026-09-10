// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Qrc as m,yrc as u}from"/$bunfs/root/_668.js";import{lCc as i,mCc as _,nCc as l,oCc as p}from"/$bunfs/root/_696.js";import{kYc as o,pYc as E}from"/$bunfs/root/_748.js";import{Xcd as t,bdd as a}from"/$bunfs/root/_815.js";import{nid as f}from"/$bunfs/root/_824.js";import{mxd as e,nxd as n}from"/$bunfs/root/_836.js";import{xxd as s}from"/$bunfs/root/_837.js";function d(){let r=process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL;if(t()!=="windows")return e(r);if(n(r))return!1;if(e(r))return!0;if(o()===null)return!0;return u("tengu_cobalt_ridge",!1)}function L(){if(t()!=="windows")return!0;return o()!==null}function g(){return L()?"bash":"powershell"}var w;var O=s(()=>{m();_();p();f();a();E();w=[i,l]});
export{w as S1a,d as T1a,L as U1a,g as V1a,O as W1a};
