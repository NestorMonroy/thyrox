// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Qt}from"/$bunfs/root/chunk-rg63yke9.js";import{Bp}from"/$bunfs/root/chunk-thv2q2wm.js";import{vFe}from"/$bunfs/root/chunk-cemn76gy.js";import{URe}from"/$bunfs/root/chunk-rpt0hvfr.js";var Gl="MEMORY.md",$H=200,IJ=25000,q4n=4*IJ,jye=200,PJ=4096;function TYe(t){let r=t.trim();return{trimmed:r,lineCount:Qt(r,`
`)+1,byteCount:r.length}}function cR(t){return t.normalize("NFC").toLowerCase()}function kF(t){let r=t?.lastIndexOf("/")??-1;if(r<=0)return"";let n=t.slice(0,r+1);return n.split("/").some((e)=>e.startsWith("."))?"":n}var MCe="This directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence).",K4n="Both directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).";function SD(t){let r="";for(let n of vFe(Bp(t.replace(/\r\n?|[\u2028\u2029]/g,`
`)))){let e=n.codePointAt(0),o=e!==9&&e!==10&&(e<32||e>=127&&e<=159);r+=o?"\uFFFD":n}return r}function Qq(t){return URe(s(t))}function W0o(t){return AYe(t)||/[\p{Cc}\u2028\u2029]/u.test(t)}function SFe(t){return Qq(t.replace(/[\t\n\r\u2028\u2029]/g,""))}var ZFr=new Set([8204,8205,65038,65039]),i=/^[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{DI}]$/u;function AYe(t){let r=t.codePointAt(0);if(ZFr.has(r)||r===9||r===10||r===13)return!1;return i.test(t)||r<32||r>=127&&r<=159}function s(t){let r="";for(let n of t.replace(/\r\n?|[\u2028\u2029]/g,`
`)){if(AYe(n))continue;r+=n}return r}
export{Gl,$H,IJ,q4n,jye,PJ,TYe,cR,kF,MCe,K4n,SD,Qq,W0o,SFe,ZFr,AYe};
