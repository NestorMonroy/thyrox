// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{In,Gf}from"/$bunfs/root/chunk-4dvekan0.js";import{L4}from"/$bunfs/root/chunk-xjjs8j5r.js";import{posix as a}from"path";var mdn=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${mdn}]+`,"u");function QDr(n){return n.replace(c,"")}function QVn(n,r=eLr(n)){return In(n)||O6e(n)||L4.test(r[0])||r.map(QDr).some((e)=>In(e)||O6e(e))}var u=/^\.\.\//;function O6e(n){return Gf(n)||Gf(a.normalize(n).replace(u,"/"))||l(n)&&Gf("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function ZDr(n){let r=n.slice(7);return QVn(r)||QVn(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function eLr(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{mdn,QDr,QVn,O6e,ZDr,eLr};
