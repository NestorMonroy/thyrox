// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{bPe,So,ae,s_t,t}from"/$bunfs/root/chunk-6w550002.js";import{open as l}from"fs/promises";function u(n,e,i){AIe(n.statSync(e),e,i)}function AIe(n,e,i){if(n.isDirectory())throw Object.assign(Error("EISDIR: illegal operation on a directory, read"),{code:"EISDIR",errno:-21,syscall:"read",path:e});if(!n.isFile())throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"),{code:"ERR_NOT_REGULAR_FILE",path:e});if(i!==void 0&&n.size>i)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n.size,maxBytes:i})}function EVo(n,e){if(n.isFile()&&Number(n.nlink)>1)throw Object.assign(Error("File has more than one hard link"),{code:"ERR_MULTIPLE_LINKS",path:e})}function E7n(n,e,i){if(i===void 0)return;if(n>i)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n,maxBytes:i})}function m4(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_NOT_REGULAR_FILE"}function QN(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_FILE_TOO_LARGE"}function WSn(n){if(n.byteLength===0)return"utf8";if(n.byteLength>=2){if(n[0]===255&&n[1]===254)return"utf16le"}if(n.byteLength>=3&&n[0]===239&&n[1]===187&&n[2]===191)return"utf8";return"utf8"}function iSe(n){let e=WSn(n.subarray(0,4096));return Buffer.from(n.buffer,n.byteOffset,n.byteLength).toString(e).replaceAll(`\r
`,`
`)}function e5r(n){let{buffer:e,bytesRead:i}=ae().readSync(n,{length:4096});return WSn(e.subarray(0,i))}function zSn(n){let e=0,i=0;for(let r=0;r<n.length;r++)if(n[r]===`
`)if(r>0&&n[r-1]==="\r")e++;else i++;return e>i?"CRLF":"LF"}function t5r(n,e){let i=ae(),{resolvedPath:r,isSymlink:s}=So(i,n);if(s)t(`Reading through symlink: ${n} -> ${r}`);u(i,n,e);let o=e5r(n),c;if(e===void 0)c=i.readFileSync(n,{encoding:o});else{let{buffer:g,bytesRead:a}=i.readSync(n,{length:e+1});E7n(a,n,e),c=g.subarray(0,a).toString(o)}let d=zSn(c.slice(0,4096));return{content:c.replaceAll(`\r
`,`
`),encoding:o,lineEndings:d}}function qj(n,e){return t5r(n,e).content}async function Fg(n,e){let i=ae(),{resolvedPath:r,isSymlink:s}=So(i,n);if(s)t(`Reading through symlink: ${n} -> ${r}`);AIe(await i.stat(n),n,e);await using o=await l(n,bPe());return await zue(o,n,e)}async function zue(n,e,i){AIe(await n.stat(),e,i);let r=i===void 0?await n.readFile():await s_t(n,i+1,"file");E7n(r.length,e,i);let s=WSn(r.subarray(0,4096)),o=r.toString(s),c=zSn(o.slice(0,4096));return{content:o.replaceAll(`\r
`,`
`),encoding:s,lineEndings:c}}
export{AIe,EVo,E7n,m4,QN,WSn,iSe,e5r,zSn,t5r,qj,Fg,zue};
