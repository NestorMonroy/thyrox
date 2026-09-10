// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{pH}from"/$bunfs/root/chunk-xj9n0xxp.js";import{Cn,am}from"/$bunfs/root/chunk-a7esebzw.js";import{posix as a}from"path";var Fft=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${Fft}]+`,"u");function Kln(n){return n.replace(c,"")}function UUt(n,r=Yln(n)){return Cn(n)||zwe(n)||pH.test(r[0])||r.map(Kln).some((e)=>Cn(e)||zwe(e))}var u=/^\.\.\//;function zwe(n){return am(n)||am(a.normalize(n).replace(u,"/"))||l(n)&&am("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function Uft(n){let r=n.slice(7);return UUt(r)||UUt(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function Yln(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{Fft,Kln,UUt,zwe,Uft,Yln};
