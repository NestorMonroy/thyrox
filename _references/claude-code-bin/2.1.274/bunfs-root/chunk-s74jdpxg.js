// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{y2,lcr}from"/$bunfs/root/chunk-g5h2a16k.js";import{m_}from"/$bunfs/root/chunk-ywky8azq.js";import{constants as l}from"fs";import{lstat as d,open as f,readlink as p,realpath as m,stat as R}from"fs/promises";function P1n(o,t="linux"){return lcr(o)||y2(o,t)}async function rwe(o,t,i){let n=t+1,r=Buffer.alloc(i===void 0?n:Math.min(Math.max(Number(i)+1,1),n)),e=0;while(e<n){if(e===r.length){let s=Buffer.alloc(n);r.copy(s),r=s}let{bytesRead:a}=await o.read(r,e,r.length-e,e);if(a===0)break;e+=a}return{bytes:r.subarray(0,Math.min(e,t)),overLimit:e>t}}var k={realpath:m,lstat:d,readlink:p};async function Hit(o,t,i,n=k){let r;try{r=await n.lstat(i,{bigint:!0})}catch{return}if(r.dev!==t.dev||r.ino!==t.ino)return;try{let e=await n.readlink(`/proc/self/fd/${o.fd}`);if(!e.startsWith("/")||e.endsWith(" (deleted)"))return;let a=await n.lstat(e,{bigint:!0});if(a.dev!==t.dev||a.ino!==t.ino)return;return e}catch{return}try{if(await n.realpath(i)!==i)return}catch{return}return i}async function H1n(o){return f(o,l.O_RDONLY|l.O_NONBLOCK|m_)}export{P1n,rwe,Hit,H1n};
