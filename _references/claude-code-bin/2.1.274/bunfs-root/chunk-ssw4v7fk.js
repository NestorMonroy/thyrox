// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Co,le,isr,t}from"/$bunfs/root/chunk-r2c9k9kh.js";function f(n,e,r){g(n.statSync(e),e,r)}function g(n,e,r){if(n.isDirectory())throw Object.assign(Error("EISDIR: illegal operation on a directory, read"),{code:"EISDIR",errno:-21,syscall:"read",path:e});if(!n.isFile())throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"),{code:"ERR_NOT_REGULAR_FILE",path:e});if(r!==void 0&&n.size>r)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n.size,maxBytes:r})}function l(n,e,r){if(r===void 0)return;if(n>r)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n,maxBytes:r})}function Uhe(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_NOT_REGULAR_FILE"}function _3(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_FILE_TOO_LARGE"}function BSt(n){if(n.byteLength===0)return"utf8";if(n.byteLength>=2){if(n[0]===255&&n[1]===254)return"utf16le"}if(n.byteLength>=3&&n[0]===239&&n[1]===187&&n[2]===191)return"utf8";return"utf8"}function lRe(n){let e=BSt(n.subarray(0,4096));return Buffer.from(n.buffer,n.byteOffset,n.byteLength).toString(e).replaceAll(`\r
`,`
`)}function krr(n){let{buffer:e,bytesRead:r}=le().readSync(n,{length:4096});return BSt(e.subarray(0,r))}function jSt(n){let e=0,r=0;for(let i=0;i<n.length;i++)if(n[i]===`
`)if(i>0&&n[i-1]==="\r")e++;else r++;return e>r?"CRLF":"LF"}function Arr(n,e){let r=le(),{resolvedPath:i,isSymlink:d}=Co(r,n);if(d)t(`Reading through symlink: ${n} -> ${i}`);f(r,n,e);let o=krr(n),s;if(e===void 0)s=r.readFileSync(n,{encoding:o});else{let{buffer:u,bytesRead:a}=r.readSync(n,{length:e+1});l(a,n,e),s=u.subarray(0,a).toString(o)}let c=jSt(s.slice(0,4096));return{content:s.replaceAll(`\r
`,`
`),encoding:o,lineEndings:c}}function b0(n,e){return Arr(n,e).content}async function R_(n,e){let r=le(),{resolvedPath:i,isSymlink:d}=Co(r,n);if(d)t(`Reading through symlink: ${n} -> ${i}`);g(await r.stat(n),n,e);let o=await r.readFileBytes(n,e===void 0?void 0:e+1);l(o.length,n,e);let s=BSt(o.subarray(0,4096)),c=o.toString(s),u=jSt(c.slice(0,4096));return{content:c.replaceAll(`\r
`,`
`),encoding:s,lineEndings:u}}async function OKr(n,e,r){g(await n.stat(),e,r);let i=Buffer.alloc(4096),{bytesRead:d}=await n.read(i,0,i.length,0),o=BSt(i.subarray(0,d)),s=r===void 0?await n.readFile():await isr(n,r+1,"file");l(s.length,e,r);let c=s.toString(o),u=jSt(c.slice(0,4096));return{content:c.replaceAll(`\r
`,`
`),encoding:o,lineEndings:u}}
export{Uhe,_3,BSt,lRe,krr,jSt,Arr,b0,R_,OKr};
