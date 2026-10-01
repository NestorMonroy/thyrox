// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Xt}from"/$bunfs/root/chunk-9wvhp90s.js";import{q}from"/$bunfs/root/chunk-hbjpbz2q.js";import{k,Ht}from"/$bunfs/root/chunk-ctczby4m.js";import{ae}from"/$bunfs/root/chunk-6w550002.js";import{fC}from"/$bunfs/root/chunk-e0kf4km8.js";import{Za}from"/$bunfs/root/chunk-byfkk95g.js";import{$y}from"/$bunfs/root/chunk-7zeygz19.js";import{lstat as u,readdir as w,rmdir as g,unlink as y}from"fs/promises";import{dirname as h,join as l}from"path";var ofr="images",sfr=/^(\d+)\.[a-z]+$/;async function rco(a,p){let e={removed:0,errors:0},r=ae(),n,i;try{n=await r.realpath(p??Za()),i=await r.readdir(n)}catch{return e}let o=q();for(let t of i){if(!t.isDirectory())continue;let s=l(n,t.name),c;try{c=await r.readdir(s)}catch{continue}for(let m of c){if(!m.isDirectory()||m.name===o||Xt(m.name)===null)continue;let d=l(s,m.name,ofr);try{let f=await r.lstat(d);if(!f.isDirectory()||f.mtime>=a)continue;if(await I(d,a))e.removed++}catch(f){if(!Ht(f))e.errors++}}}return e}async function I(a,p){let e=await $y(a,[a],{leaf:"replace"});try{await e.recheckBeforeWrite();let r=await u(e.ioPath);if(!r.isDirectory()||r.mtime>=p)return!1;let n=l(a,"any"),i=await $y(n,[n],{leaf:"replace"});try{let o=h(i.ioPath);await i.recheckBeforeWrite();for(let t of await w(o)){let s=t.lastIndexOf(".tmp."),c=s===-1?t:t.slice(0,s);if(!sfr.test(c)||s!==-1&&!fC(t,c))continue;await i.recheckBeforeWrite(),await y(l(o,t)).catch(()=>{})}}finally{await i.close()}await e.recheckBeforeWrite();try{await g(e.ioPath)}catch(o){let t=k(o);if(t==="ENOTEMPTY"||t==="EEXIST")return!1;throw o}return!0}finally{await e.close()}}
export{ofr,sfr,rco};
