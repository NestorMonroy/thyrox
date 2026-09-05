// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{$x}from"/$bunfs/root/chunk-ctshp37x.js";import{Rn,Wp}from"/$bunfs/root/chunk-ycrs8y50.js";import{posix as a}from"path";var Gdt=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${Gdt}]+`,"u");function vln(n){return n.replace(c,"")}function bFt(n,r=kln(n)){return Rn(n)||_Se(n)||$x.test(r[0])||r.map(vln).some((e)=>Rn(e)||_Se(e))}var u=/^\.\.\//;function _Se(n){return Wp(n)||Wp(a.normalize(n).replace(u,"/"))||l(n)&&Wp("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function Wdt(n){let r=n.slice(7);return bFt(r)||bFt(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function kln(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{Gdt,vln,bFt,_Se,Wdt,kln};
