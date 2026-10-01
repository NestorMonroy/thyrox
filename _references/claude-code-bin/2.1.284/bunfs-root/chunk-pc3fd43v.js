// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{rn}from"/$bunfs/root/chunk-8zeg9165.js";import{Y}from"/$bunfs/root/chunk-d37h8mav.js";import{v,Rt}from"/$bunfs/root/chunk-31aa9k3a.js";import{ae}from"/$bunfs/root/chunk-6b6gfk00.js";import{FA}from"/$bunfs/root/chunk-1qy944sj.js";import{Qa}from"/$bunfs/root/chunk-1zd4bz7m.js";import{Ey}from"/$bunfs/root/chunk-myxh1mq4.js";import{lstat as u,readdir as w,rmdir as g,unlink as y}from"fs/promises";import{dirname as h,join as l}from"path";var Ydr="images",Xdr=/^(\d+)\.[a-z]+$/;async function Sso(a,p){let e={removed:0,errors:0},r=ae(),n,i;try{n=await r.realpath(p??Qa()),i=await r.readdir(n)}catch{return e}let o=Y();for(let t of i){if(!t.isDirectory())continue;let s=l(n,t.name),c;try{c=await r.readdir(s)}catch{continue}for(let m of c){if(!m.isDirectory()||m.name===o||rn(m.name)===null)continue;let d=l(s,m.name,Ydr);try{let f=await r.lstat(d);if(!f.isDirectory()||f.mtime>=a)continue;if(await I(d,a))e.removed++}catch(f){if(!Rt(f))e.errors++}}}return e}async function I(a,p){let e=await Ey(a,[a],{leaf:"replace"});try{await e.recheckBeforeWrite();let r=await u(e.ioPath);if(!r.isDirectory()||r.mtime>=p)return!1;let n=l(a,"any"),i=await Ey(n,[n],{leaf:"replace"});try{let o=h(i.ioPath);await i.recheckBeforeWrite();for(let t of await w(o)){let s=t.lastIndexOf(".tmp."),c=s===-1?t:t.slice(0,s);if(!Xdr.test(c)||s!==-1&&!FA(t,c))continue;await i.recheckBeforeWrite(),await y(l(o,t)).catch(()=>{})}}finally{await i.close()}await e.recheckBeforeWrite();try{await g(e.ioPath)}catch(o){let t=v(o);if(t==="ENOTEMPTY"||t==="EEXIST")return!1;throw o}return!0}finally{await e.close()}}
export{Ydr,Xdr,Sso};
