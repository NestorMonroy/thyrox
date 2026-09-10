// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Agd as l,Hgd as c,Ngd as y,jhd as g,ohd as F}from"/$bunfs/root/_820.js";import{xxd as p}from"/$bunfs/root/_837.js";function u(n,t,r){let e=n.statSync(t);if(e.isDirectory())throw Object.assign(Error("EISDIR: illegal operation on a directory, read"),{code:"EISDIR",errno:-21,syscall:"read",path:t});if(!e.isFile())throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"),{code:"ERR_NOT_REGULAR_FILE",path:t});if(r!==void 0&&e.size>r)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:t,size:e.size,maxBytes:r})}function x(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_NOT_REGULAR_FILE"}function w(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_FILE_TOO_LARGE"}function a(n){if(n.byteLength===0)return"utf8";if(n.byteLength>=2){if(n[0]===255&&n[1]===254)return"utf16le"}if(n.byteLength>=3&&n[0]===239&&n[1]===187&&n[2]===191)return"utf8";return"utf8"}function O(n){let t=a(n.subarray(0,4096));return Buffer.from(n.buffer,n.byteOffset,n.byteLength).toString(t).replaceAll(`\r
`,`
`)}function d(n){let{buffer:t,bytesRead:r}=c().readSync(n,{length:4096});return a(t.subarray(0,r))}function E(n){let t=0,r=0;for(let e=0;e<n.length;e++)if(n[e]===`
`)if(e>0&&n[e-1]==="\r")t++;else r++;return t>r?"CRLF":"LF"}function R(n,t){let r=c(),{resolvedPath:e,isSymlink:s}=l(r,n);if(s)g(`Reading through symlink: ${n} -> ${e}`);u(r,e,t);let i=d(e),o=r.readFileSync(e,{encoding:i}),f=E(o.slice(0,4096));return{content:o.replaceAll(`\r
`,`
`),encoding:i,lineEndings:f}}function _(n,t){return R(n,t).content}async function S(n,t){let r=c(),{resolvedPath:e,isSymlink:s}=l(r,n);if(s)g(`Reading through symlink: ${n} -> ${e}`);u(r,e,t);let i=d(e),o=await r.readFile(e,{encoding:i}),f=E(o.slice(0,4096));return{content:o.replaceAll(`\r
`,`
`),encoding:i,lineEndings:f}}var b=p(()=>{F();y()});
export{x as eZc,w as fZc,a as gZc,O as hZc,d as iZc,E as jZc,R as kZc,_ as lZc,S as mZc,b as nZc};
