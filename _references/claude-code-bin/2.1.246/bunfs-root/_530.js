// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Xcd as c,bdd as y}from"/$bunfs/root/_815.js";import{jhd as n,ohd as b}from"/$bunfs/root/_820.js";import{Nud as s,hvd as a,zvd as k}from"/$bunfs/root/_831.js";import{xxd as g}from"/$bunfs/root/_837.js";import{readdir as h,readlink as v,realpath as f,rmdir as E,unlink as d}from"fs/promises";import{basename as P,dirname as N,join as m,sep as T}from"path";function p(e){return e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017F/g,"s")}async function j(e){if(c()!=="windows")return!0;let t=await f(N(e)).catch(()=>null);return!await w(e,t==null?null:p(m(t,P(e))))}async function w(e,t){try{return await d(e),n(`[worktree] unlinked reparse point before removal: ${e}`),!1}catch{}try{return await E(e),n(`[worktree] removed reparse point or empty directory before removal: ${e}`),!1}catch(r){if(a(r))return!1;if(s(r)!=="ENOTEMPTY"){let l=await v(e).then(()=>"link",(o)=>s(o)==="EINVAL"||a(o)?"not-link":"unknown")!=="not-link"||t==null?null:await f(e).then((o)=>p(o)).catch(()=>null);if(l==null||l!==t&&!l.startsWith(t+T))return n(`[worktree] refusing to enumerate unremovable entry before removal: ${e}`,{level:"warn"}),!0}}let u=await h(e,{withFileTypes:!0}).catch((r)=>a(r)?[]:null);if(u==null)return n(`[worktree] could not enumerate ${e} before removal; not certifying`,{level:"warn"}),!0;let i=!1;for(let r of u)if(r.isSymbolicLink()||r.isDirectory())i=await w(m(e,r.name),t)||i;return i}var C=g(()=>{b();k();y()});
export{p as Bub,j as Cub,C as Dub};
