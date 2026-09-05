// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{m$a as l,n$a as f,o$a as y}from"/$bunfs/root/_483.js";import{S2b as a,Z2b as h}from"/$bunfs/root/_630.js";import{vzc as i,yzc as d}from"/$bunfs/root/_683.js";import{D5c as u,E5c as k}from"/$bunfs/root/_766.js";import{xxd as m}from"/$bunfs/root/_837.js";function A(e,r,t){let s=r===void 0?void 0:u(r),n=s===void 0||s===e||e===`http://${s}`||e===`https://${s}`;if(!(n&&(t?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(l()??!0)||(t?.supportsHyperlinks??f()))){if(r!==void 0&&!n)return`${r} (${e})`;return e}let c=(((t?.themeName)?a(t.themeName):!1)?i.blue:i.blueBright)(r??e);return`${o}${e}${p}${c}${o}${p}`}var o="\x1B]8;;",p="\x07";var q=m(()=>{d();k();y();h()});
export{A as ix,q as jx};
