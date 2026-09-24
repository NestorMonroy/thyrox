// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{y$,_Nt}from"/$bunfs/root/chunk-35k7s716.js";import{Nu}from"/$bunfs/root/chunk-b93xrf5w.js";import{constants as l}from"fs";import{lstat as d,open as f,readlink as p,realpath as m,stat as R}from"fs/promises";function $rr(o,t="linux"){return _Nt(o)||y$(o,t)}async function Jxe(o,t,i){let n=t+1,r=Buffer.alloc(i===void 0?n:Math.min(Math.max(Number(i)+1,1),n)),e=0;while(e<n){if(e===r.length){let s=Buffer.alloc(n);r.copy(s),r=s}let{bytesRead:a}=await o.read(r,e,r.length-e,e);if(a===0)break;e+=a}return{bytes:r.subarray(0,Math.min(e,t)),overLimit:e>t}}var k={realpath:m,lstat:d,readlink:p};async function dSt(o,t,i,n=k){let r;try{r=await n.lstat(i,{bigint:!0})}catch{return}if(r.dev!==t.dev||r.ino!==t.ino)return;try{let e=await n.readlink(`/proc/self/fd/${o.fd}`);if(!e.startsWith("/")||e.endsWith(" (deleted)"))return;let a=await n.lstat(e,{bigint:!0});if(a.dev!==t.dev||a.ino!==t.ino)return;return e}catch{return}try{if(await n.realpath(i)!==i)return}catch{return}return i}async function Frr(o){return f(o,l.O_RDONLY|l.O_NONBLOCK|Nu)}export{$rr,Jxe,dSt,Frr};
