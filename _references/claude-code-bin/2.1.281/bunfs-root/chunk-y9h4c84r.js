// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Pn,Tm}from"/$bunfs/root/chunk-35k7s716.js";import{LH}from"/$bunfs/root/chunk-nqsdwfmt.js";import{posix as a}from"path";var r7t=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${r7t}]+`,"u");function _hr(n){return n.replace(c,"")}function m0n(n,r=Shr(n)){return Pn(n)||yze(n)||LH.test(r[0])||r.map(_hr).some((e)=>Pn(e)||yze(e))}var u=/^\.\.\//;function yze(n){return Tm(n)||Tm(a.normalize(n).replace(u,"/"))||l(n)&&Tm("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function bhr(n){let r=n.slice(7);return m0n(r)||m0n(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function Shr(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{r7t,_hr,m0n,yze,bhr,Shr};
