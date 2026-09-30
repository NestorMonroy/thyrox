// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{rn}from"/$bunfs/root/chunk-kp7gknaw.js";import{Y}from"/$bunfs/root/chunk-cqc88nqm.js";import{v,Ht}from"/$bunfs/root/chunk-2bj5eqbj.js";import{ce}from"/$bunfs/root/chunk-wfscmafr.js";import{UT}from"/$bunfs/root/chunk-bzbw9xhh.js";import{Ya}from"/$bunfs/root/chunk-402jrhr4.js";import{Mh}from"/$bunfs/root/chunk-88pjxs5w.js";import{lstat as u,readdir as w,rmdir as g,unlink as y}from"fs/promises";import{dirname as h,join as l}from"path";var xrr="images",Irr=/^(\d+)\.[a-z]+$/;async function C8r(a,p){let e={removed:0,errors:0},r=ce(),n,i;try{n=await r.realpath(p??Ya()),i=await r.readdir(n)}catch{return e}let o=Y();for(let t of i){if(!t.isDirectory())continue;let s=l(n,t.name),c;try{c=await r.readdir(s)}catch{continue}for(let m of c){if(!m.isDirectory()||m.name===o||rn(m.name)===null)continue;let d=l(s,m.name,xrr);try{let f=await r.lstat(d);if(!f.isDirectory()||f.mtime>=a)continue;if(await I(d,a))e.removed++}catch(f){if(!Ht(f))e.errors++}}}return e}async function I(a,p){let e=await Mh(a,[a],{leaf:"replace"});try{await e.recheckBeforeWrite();let r=await u(e.ioPath);if(!r.isDirectory()||r.mtime>=p)return!1;let n=l(a,"any"),i=await Mh(n,[n],{leaf:"replace"});try{let o=h(i.ioPath);await i.recheckBeforeWrite();for(let t of await w(o)){let s=t.lastIndexOf(".tmp."),c=s===-1?t:t.slice(0,s);if(!Irr.test(c)||s!==-1&&!UT(t,c))continue;await i.recheckBeforeWrite(),await y(l(o,t)).catch(()=>{})}}finally{await i.close()}await e.recheckBeforeWrite();try{await g(e.ioPath)}catch(o){let t=v(o);if(t==="ENOTEMPTY"||t==="EEXIST")return!1;throw o}return!0}finally{await e.close()}}
export{xrr,Irr,C8r};
