// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{nn}from"/$bunfs/root/chunk-bjy6zt8z.js";import{Y}from"/$bunfs/root/chunk-zwm3fybx.js";import{v,Ht}from"/$bunfs/root/chunk-dw9y6h6j.js";import{ce}from"/$bunfs/root/chunk-nbcqw6vp.js";import{tA}from"/$bunfs/root/chunk-1s5hx5dz.js";import{qa}from"/$bunfs/root/chunk-xacp3rm8.js";import{Jh}from"/$bunfs/root/chunk-evtqhmze.js";import{lstat as u,readdir as w,rmdir as g,unlink as y}from"fs/promises";import{dirname as h,join as l}from"path";var Yer="images",Xer=/^(\d+)\.[a-z]+$/;async function OYr(a,p){let e={removed:0,errors:0},r=ce(),n,i;try{n=await r.realpath(p??qa()),i=await r.readdir(n)}catch{return e}let o=Y();for(let t of i){if(!t.isDirectory())continue;let s=l(n,t.name),c;try{c=await r.readdir(s)}catch{continue}for(let m of c){if(!m.isDirectory()||m.name===o||nn(m.name)===null)continue;let d=l(s,m.name,Yer);try{let f=await r.lstat(d);if(!f.isDirectory()||f.mtime>=a)continue;if(await I(d,a))e.removed++}catch(f){if(!Ht(f))e.errors++}}}return e}async function I(a,p){let e=await Jh(a,[a],{leaf:"replace"});try{await e.recheckBeforeWrite();let r=await u(e.ioPath);if(!r.isDirectory()||r.mtime>=p)return!1;let n=l(a,"any"),i=await Jh(n,[n],{leaf:"replace"});try{let o=h(i.ioPath);await i.recheckBeforeWrite();for(let t of await w(o)){let s=t.lastIndexOf(".tmp."),c=s===-1?t:t.slice(0,s);if(!Xer.test(c)||s!==-1&&!tA(t,c))continue;await i.recheckBeforeWrite(),await y(l(o,t)).catch(()=>{})}}finally{await i.close()}await e.recheckBeforeWrite();try{await g(e.ioPath)}catch(o){let t=v(o);if(t==="ENOTEMPTY"||t==="EEXIST")return!1;throw o}return!0}finally{await e.close()}}
export{Yer,Xer,OYr};
