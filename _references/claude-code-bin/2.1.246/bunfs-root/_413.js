// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Hgd as u,Ngd as S,jhd as o,ohd as w}from"/$bunfs/root/_820.js";import{Uhd as c,nid as I}from"/$bunfs/root/_824.js";import{Ckd as m,atd as P}from"/$bunfs/root/_826.js";import{xxd as y}from"/$bunfs/root/_837.js";import{mkdir as b,open as D}from"fs/promises";import{join as s}from"path";function f(){return s(c(),d,m())}async function x(){let e=f();await b(e,{recursive:!0})}function p(e,t){let r=t.split("/")[1]||"png";return s(f(),`${e}.${r}`)}function E(e,t){if(e.type!=="image")return null;let r=p(e.id,e.mediaType||"image/png");return t((n)=>g(n,e.id,r)),r}async function F(e,t){let r=await l(e);if(r)t((n)=>g(n,e.id,r));return r}async function O(e,t){let r=new Map;for(let[n,i]of Object.entries(e))if(i.type==="image"){let a=await l(i);if(a)r.set(Number(n),a)}if(r.size>0)t((n)=>{let i=n;for(let[a,h]of r)i=g(i,a,h);return i});return r}async function l(e){if(e.type!=="image")return null;try{await x();let t=p(e.id,e.mediaType||"image/png"),r=await D(t,"w",384);try{await r.writeFile(e.content,{encoding:"base64"}),await r.datasync()}finally{await r.close()}return o(`Stored image ${e.id} to ${t}`),t}catch(t){return o(`Failed to store image: ${t}`),null}}function g(e,t,r){if(e.get(t)===r)return e;let n=new Map(e);if(!n.has(t))while(n.size>=M){let i=n.keys().next().value;if(i===void 0)break;n.delete(i)}return n.set(t,r),n}async function v(){let e=u(),t=s(c(),d),r=m();try{let n;try{n=await e.readdir(t)}catch{return}for(let i of n){if(i.name===r)continue;let a=s(t,i.name);try{await e.rm(a,{recursive:!0,force:!0}),o(`Cleaned up old image cache: ${a}`)}catch{}}try{if((await e.readdir(t)).length===0)await e.rmdir(t)}catch{}}catch{}}var d="image-cache",M=200;var C=y(()=>{P();w();I();S()});
export{E as bT,F as cT,O as dT,v as eT,C as fT};
