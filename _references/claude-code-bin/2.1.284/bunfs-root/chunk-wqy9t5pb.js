// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Pn,Hf}from"/$bunfs/root/chunk-zy97v06w.js";import{mM}from"/$bunfs/root/chunk-k6n2tyj0.js";import{posix as a}from"path";var Dln=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${Dln}]+`,"u");function qHr(n){return n.replace(c,"")}function $zn(n,r=YHr(n)){return Pn(n)||P3e(n)||mM.test(r[0])||r.map(qHr).some((e)=>Pn(e)||P3e(e))}var u=/^\.\.\//;function P3e(n){return Hf(n)||Hf(a.normalize(n).replace(u,"/"))||l(n)&&Hf("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function KHr(n){let r=n.slice(7);return $zn(r)||$zn(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function YHr(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{Dln,qHr,$zn,P3e,KHr,YHr};
