// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{but,Ho,ce,Sut,t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{open as l}from"fs/promises";function u(n,e,i){bdt(n.statSync(e),e,i)}function bdt(n,e,i){if(n.isDirectory())throw Object.assign(Error("EISDIR: illegal operation on a directory, read"),{code:"EISDIR",errno:-21,syscall:"read",path:e});if(!n.isFile())throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"),{code:"ERR_NOT_REGULAR_FILE",path:e});if(i!==void 0&&n.size>i)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n.size,maxBytes:i})}function aIo(n,e){if(n.isFile()&&Number(n.nlink)>1)throw Object.assign(Error("File has more than one hard link"),{code:"ERR_MULTIPLE_LINKS",path:e})}function CVn(n,e,i){if(i===void 0)return;if(n>i)throw Object.assign(Error("File exceeds maxBytes limit"),{code:"ERR_FILE_TOO_LARGE",path:e,size:n,maxBytes:i})}function PAe(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_NOT_REGULAR_FILE"}function tX(n){return n!=null&&typeof n==="object"&&"code"in n&&n.code==="ERR_FILE_TOO_LARGE"}function tun(n){if(n.byteLength===0)return"utf8";if(n.byteLength>=2){if(n[0]===255&&n[1]===254)return"utf16le"}if(n.byteLength>=3&&n[0]===239&&n[1]===187&&n[2]===191)return"utf8";return"utf8"}function rhe(n){let e=tun(n.subarray(0,4096));return Buffer.from(n.buffer,n.byteOffset,n.byteLength).toString(e).replaceAll(`\r
`,`
`)}function yLr(n){let{buffer:e,bytesRead:i}=ce().readSync(n,{length:4096});return tun(e.subarray(0,i))}function nun(n){let e=0,i=0;for(let r=0;r<n.length;r++)if(n[r]===`
`)if(r>0&&n[r-1]==="\r")e++;else i++;return e>i?"CRLF":"LF"}function _Lr(n,e){let i=ce(),{resolvedPath:r,isSymlink:s}=Ho(i,n);if(s)t(`Reading through symlink: ${n} -> ${r}`);u(i,n,e);let o=yLr(n),c;if(e===void 0)c=i.readFileSync(n,{encoding:o});else{let{buffer:g,bytesRead:a}=i.readSync(n,{length:e+1});CVn(a,n,e),c=g.subarray(0,a).toString(o)}let d=nun(c.slice(0,4096));return{content:c.replaceAll(`\r
`,`
`),encoding:o,lineEndings:d}}function PB(n,e){return _Lr(n,e).content}async function qm(n,e){let i=ce(),{resolvedPath:r,isSymlink:s}=Ho(i,n);if(s)t(`Reading through symlink: ${n} -> ${r}`);bdt(await i.stat(n),n,e);await using o=await l(n,but());return await m$e(o,n,e)}async function m$e(n,e,i){bdt(await n.stat(),e,i);let r=i===void 0?await n.readFile():await Sut(n,i+1,"file");CVn(r.length,e,i);let s=tun(r.subarray(0,4096)),o=r.toString(s),c=nun(o.slice(0,4096));return{content:o.replaceAll(`\r
`,`
`),encoding:s,lineEndings:c}}
export{bdt,aIo,CVn,PAe,tX,tun,rhe,yLr,nun,_Lr,PB,qm,m$e};
