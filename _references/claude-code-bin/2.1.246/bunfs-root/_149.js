// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Dv as s,Fv as u}from"/$bunfs/root/_196.js";import{Jjd as t,Kjd as i}from"/$bunfs/root/_826.js";import{ctd as c}from"/$bunfs/root/_827.js";import{pxd as r}from"/$bunfs/root/_836.js";c();i();u();function a(){let o=new Map;return{known(e){let n=Math.max(o.get(e)??0,1);return o.set(e,n),n},next(e){let n=(o.get(e)??0)+1;return o.set(e,n),n}}}function l(){return{consentPin:s(),generations:a(),pointedToCommand:{shown:!1},decided:r()}}var p=new t(l);
export{l as Sp,p as Tp};
