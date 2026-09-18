// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Pn,mm}from"/$bunfs/root/chunk-gfewy5rb.js";import{dI}from"/$bunfs/root/chunk-4bbpt7sc.js";import{posix as a}from"path";var x2t=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${x2t}]+`,"u");function j8n(n){return n.replace(c,"")}function Ngn(n,r=W8n(n)){return Pn(n)||S$e(n)||dI.test(r[0])||r.map(j8n).some((e)=>Pn(e)||S$e(e))}var u=/^\.\.\//;function S$e(n){return mm(n)||mm(a.normalize(n).replace(u,"/"))||l(n)&&mm("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function z8n(n){let r=n.slice(7);return Ngn(r)||Ngn(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function W8n(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{x2t,j8n,Ngn,S$e,z8n,W8n};
