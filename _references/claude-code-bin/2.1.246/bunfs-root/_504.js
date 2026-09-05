// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as r}from"/$bunfs/root/_837.js";function u(e){return e.length>0&&e.length<=256&&!i.test(e)}function a(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(l,(n)=>`&#${n.charCodeAt(0)};`)}function s(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function c(e){return t(s(String(e??"")))}function A(e){return c(e).replaceAll('"',"&quot;")}var l,p=256,i;var o=r(()=>{l=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,i=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/});
export{p as Lhb,i as Mhb,u as Nhb,a as Ohb,s as Phb,c as Qhb,A as Rhb,o as Shb};
