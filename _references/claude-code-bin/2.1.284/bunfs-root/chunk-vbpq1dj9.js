// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{jt}from"/$bunfs/root/chunk-k6n2tyj0.js";import{Gp}from"/$bunfs/root/chunk-3xxkkv4v.js";import{DFe}from"/$bunfs/root/chunk-7h6e886c.js";import{PUe}from"/$bunfs/root/chunk-6vtp2w5r.js";var Oc="MEMORY.md",DL=200,Yq=25000,I5n=4*Yq,Fye=200,CJ=4096;function RYe(t){let r=t.trim();return{trimmed:r,lineCount:jt(r,`
`)+1,byteCount:r.length}}function QC(t){return t.normalize("NFC").toLowerCase()}function bF(t){let r=t?.lastIndexOf("/")??-1;if(r<=0)return"";let n=t.slice(0,r+1);return n.split("/").some((e)=>e.startsWith("."))?"":n}var Wce="This directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence).",O5n="Both directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).";function b0(t){let r="";for(let n of DFe(Gp(t.replace(/\r\n?|[\u2028\u2029]/g,`
`)))){let e=n.codePointAt(0),o=e!==9&&e!==10&&(e<32||e>=127&&e<=159);r+=o?"\uFFFD":n}return r}function gne(t){return PUe(s(t))}function cLo(t){return xYe(t)||/[\p{Cc}\u2028\u2029]/u.test(t)}function vpt(t){return gne(t.replace(/[\t\n\r\u2028\u2029]/g,""))}var JFr=new Set([8204,8205,65038,65039]),i=/^[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{DI}]$/u;function xYe(t){let r=t.codePointAt(0);if(JFr.has(r)||r===9||r===10||r===13)return!1;return i.test(t)||r<32||r>=127&&r<=159}function s(t){let r="";for(let n of t.replace(/\r\n?|[\u2028\u2029]/g,`
`)){if(xYe(n))continue;r+=n}return r}
export{Oc,DL,Yq,I5n,Fye,CJ,RYe,QC,bF,Wce,O5n,b0,gne,cLo,vpt,JFr,xYe};
