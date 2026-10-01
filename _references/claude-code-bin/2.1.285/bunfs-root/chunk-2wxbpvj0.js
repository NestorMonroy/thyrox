// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{wIe,wo,ae,oht,t}from"/$bunfs/root/chunk-055ns4k8.js";import{open as l}from"fs/promises";function u(n,e,i){xxe(n.statSync(e),e,i)}function xxe(n,e,i){if(n.isDirectory())throw Object.assign(Error("EISDIR: illegal operation on a directory, read"),{code:"EISDIR",errno:-21,syscall:"read",path:e});if(!n.isFile())throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"),{code:"ERR_NOT_REGULAR_FILE",path:e});if(i!==void 0&&n.size>i)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n.size,maxBytes:i})}function Wjo(n,e){if(n.isFile()&&Number(n.nlink)>1)throw Object.assign(Error("File has more than one hard link"),{code:"ERR_MULTIPLE_LINKS",path:e})}function y9n(n,e,i){if(i===void 0)return;if(n>i)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n,maxBytes:i})}function jK(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_NOT_REGULAR_FILE"}function wN(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_FILE_TOO_LARGE"}function u_n(n){if(n.byteLength===0)return"utf8";if(n.byteLength>=2){if(n[0]===255&&n[1]===254)return"utf16le"}if(n.byteLength>=3&&n[0]===239&&n[1]===187&&n[2]===191)return"utf8";return"utf8"}function abe(n){let e=u_n(n.subarray(0,4096));return Buffer.from(n.buffer,n.byteOffset,n.byteLength).toString(e).replaceAll(`\r
`,`
`)}function yVr(n){let{buffer:e,bytesRead:i}=ae().readSync(n,{length:4096});return u_n(e.subarray(0,i))}function p_n(n){let e=0,i=0;for(let r=0;r<n.length;r++)if(n[r]===`
`)if(r>0&&n[r-1]==="\r")e++;else i++;return e>i?"CRLF":"LF"}function _Vr(n,e){let i=ae(),{resolvedPath:r,isSymlink:s}=wo(i,n);if(s)t(`Reading through symlink: ${n} -> ${r}`);u(i,n,e);let o=yVr(n),c;if(e===void 0)c=i.readFileSync(n,{encoding:o});else{let{buffer:g,bytesRead:a}=i.readSync(n,{length:e+1});y9n(a,n,e),c=g.subarray(0,a).toString(o)}let d=p_n(c.slice(0,4096));return{content:c.replaceAll(`\r
`,`
`),encoding:o,lineEndings:d}}function bj(n,e){return _Vr(n,e).content}async function kg(n,e){let i=ae(),{resolvedPath:r,isSymlink:s}=wo(i,n);if(s)t(`Reading through symlink: ${n} -> ${r}`);xxe(await i.stat(n),n,e);await using o=await l(n,wIe());return await lue(o,n,e)}async function lue(n,e,i){xxe(await n.stat(),e,i);let r=i===void 0?await n.readFile():await oht(n,i+1,"file");y9n(r.length,e,i);let s=u_n(r.subarray(0,4096)),o=r.toString(s),c=p_n(o.slice(0,4096));return{content:o.replaceAll(`\r
`,`
`),encoding:s,lineEndings:c}}
export{xxe,Wjo,y9n,jK,wN,u_n,abe,yVr,p_n,_Vr,bj,kg,lue};
