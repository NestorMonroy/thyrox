// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{en}from"/$bunfs/root/chunk-s1pmhfks.js";import{Y}from"/$bunfs/root/chunk-nvht7ckf.js";import{v,kt}from"/$bunfs/root/chunk-ern0s5ks.js";import{ce}from"/$bunfs/root/chunk-zkn0228z.js";import{kA}from"/$bunfs/root/chunk-797phdpb.js";import{nl}from"/$bunfs/root/chunk-nzbykwxn.js";import{ly}from"/$bunfs/root/chunk-skc0kcp7.js";import{lstat as u,readdir as w,rmdir as g,unlink as y}from"fs/promises";import{dirname as h,join as l}from"path";var kar="images",Tar=/^(\d+)\.[a-z]+$/;async function sto(a,p){let e={removed:0,errors:0},r=ce(),n,i;try{n=await r.realpath(p??nl()),i=await r.readdir(n)}catch{return e}let o=Y();for(let t of i){if(!t.isDirectory())continue;let s=l(n,t.name),c;try{c=await r.readdir(s)}catch{continue}for(let m of c){if(!m.isDirectory()||m.name===o||en(m.name)===null)continue;let d=l(s,m.name,kar);try{let f=await r.lstat(d);if(!f.isDirectory()||f.mtime>=a)continue;if(await I(d,a))e.removed++}catch(f){if(!kt(f))e.errors++}}}return e}async function I(a,p){let e=await ly(a,[a],{leaf:"replace"});try{await e.recheckBeforeWrite();let r=await u(e.ioPath);if(!r.isDirectory()||r.mtime>=p)return!1;let n=l(a,"any"),i=await ly(n,[n],{leaf:"replace"});try{let o=h(i.ioPath);await i.recheckBeforeWrite();for(let t of await w(o)){let s=t.lastIndexOf(".tmp."),c=s===-1?t:t.slice(0,s);if(!Tar.test(c)||s!==-1&&!kA(t,c))continue;await i.recheckBeforeWrite(),await y(l(o,t)).catch(()=>{})}}finally{await i.close()}await e.recheckBeforeWrite();try{await g(e.ioPath)}catch(o){let t=v(o);if(t==="ENOTEMPTY"||t==="EEXIST")return!1;throw o}return!0}finally{await e.close()}}
export{kar,Tar,sto};
