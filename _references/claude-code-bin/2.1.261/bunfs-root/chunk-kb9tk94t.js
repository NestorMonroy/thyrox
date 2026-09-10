// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{vx}from"/$bunfs/root/chunk-py8dsda5.js";import{An,jp}from"/$bunfs/root/chunk-dcawh0q4.js";import{posix as a}from"path";var cdt=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${cdt}]+`,"u");function gsn(n){return n.replace(c,"")}function GOt(n,r=hsn(n)){return An(n)||sSe(n)||vx.test(r[0])||r.map(gsn).some((e)=>An(e)||sSe(e))}var u=/^\.\.\//;function sSe(n){return jp(n)||jp(a.normalize(n).replace(u,"/"))||l(n)&&jp("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function udt(n){let r=n.slice(7);return GOt(r)||GOt(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function hsn(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{cdt,gsn,GOt,sSe,udt,hsn};
