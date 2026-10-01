// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{zt}from"/$bunfs/root/chunk-xjjs8j5r.js";import{Jp}from"/$bunfs/root/chunk-pn8bw28z.js";import{wBe}from"/$bunfs/root/chunk-vqc3jzpc.js";import{Hxe}from"/$bunfs/root/chunk-p4dz1hva.js";var bd="MEMORY.md",qM=200,r7=25000,J6n=4*r7,N_e=200,o7=4096;function j8e(t){let r=t.trim();return{trimmed:r,lineCount:zt(r,`
`)+1,byteCount:r.length}}function kR(t){return t.normalize("NFC").toLowerCase()}function ZF(t){let r=t?.lastIndexOf("/")??-1;if(r<=0)return"";let n=t.slice(0,r+1);return n.split("/").some((e)=>e.startsWith("."))?"":n}var ARe="This directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence).",Q6n="Both directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).";function j0(t){let r="";for(let n of wBe(Jp(t.replace(/\r\n?|[\u2028\u2029]/g,`
`)))){let e=n.codePointAt(0),o=e!==9&&e!==10&&(e<32||e>=127&&e<=159);r+=o?"\uFFFD":n}return r}function s7(t){return Hxe(s(t))}function EUo(t){return W8e(t)||/[\p{Cc}\u2028\u2029]/u.test(t)}function BUt(t){return s7(t.replace(/[\t\n\r\u2028\u2029]/g,""))}var wjr=new Set([8204,8205,65038,65039]),i=/^[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{DI}]$/u;function W8e(t){let r=t.codePointAt(0);if(wjr.has(r)||r===9||r===10||r===13)return!1;return i.test(t)||r<32||r>=127&&r<=159}function s(t){let r="";for(let n of t.replace(/\r\n?|[\u2028\u2029]/g,`
`)){if(W8e(n))continue;r+=n}return r}
export{bd,qM,r7,J6n,N_e,o7,j8e,kR,ZF,ARe,Q6n,j0,s7,EUo,BUt,wjr,W8e};
