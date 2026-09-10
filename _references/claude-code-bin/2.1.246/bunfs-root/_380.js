// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Adc as s,Bdc as w,Gec as p,Kec as M,Oec as m,jfc as r,rec as d,rfc as S,uec as f}from"/$bunfs/root/_668.js";import{ABc as L,wBc as u}from"/$bunfs/root/_695.js";import{xxd as c}from"/$bunfs/root/_837.js";function i(e){if(e==null)return null;if(M(e)||(p(e)??s(e)))return e;return f(e)}function a(e,n){let o=i(e);if(o===null)return null;if(n!==null&&o.trim().toLowerCase()===n.trim().toLowerCase())return null;let l=i(n);if(t(o)||t(l))return o;let g=l===null?m():r(l);return r(o).toLowerCase()===g.toLowerCase()?null:o}function A(e){return a(e.mainLoopModelForSession,e.mainLoopModel)??e.mainLoopModel}function t(e){return e!==null&&d(u(e.trim().toLowerCase()))}var v=c(()=>{L();S();w()});
export{i as CN,a as DN,A as EN,v as FN};
