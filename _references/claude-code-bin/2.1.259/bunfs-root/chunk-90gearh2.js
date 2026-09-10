// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{E,q}from"/$bunfs/root/chunk-058caznt.js";import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{P}from"/$bunfs/root/chunk-v10h0yg2.js";import{readdir as f,readlink as m,realpath as s,rmdir as p,unlink as w}from"fs/promises";import{basename as g,dirname as k,join as u,sep as b}from"path";function bg(e){return e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017F/g,"s")}async function Vq(e){if(P()!=="windows")return!0;let n=await s(k(e)).catch(()=>null);return!await c(e,n==null?null:bg(u(n,g(e))))}async function c(e,n){try{return await w(e),t(`[worktree] unlinked reparse point before removal: ${e}`),!1}catch{}try{return await p(e),t(`[worktree] removed reparse point or empty directory before removal: ${e}`),!1}catch(r){if(q(r))return!1;if(E(r)!=="ENOTEMPTY"){let i=await m(e).then(()=>"link",(o)=>E(o)==="EINVAL"||q(o)?"not-link":"unknown")!=="not-link"||n==null?null:await s(e).then((o)=>bg(o)).catch(()=>null);if(i==null||i!==n&&!i.startsWith(n+b))return t(`[worktree] refusing to enumerate unremovable entry before removal: ${e}`,{level:"warn"}),!0}}let l=await f(e,{withFileTypes:!0}).catch((r)=>q(r)?[]:null);if(l==null)return t(`[worktree] could not enumerate ${e} before removal; not certifying`,{level:"warn"}),!0;let a=!1;for(let r of l)if(r.isSymbolicLink()||r.isDirectory())a=await c(u(e,r.name),n)||a;return a}
export{bg,Vq};
