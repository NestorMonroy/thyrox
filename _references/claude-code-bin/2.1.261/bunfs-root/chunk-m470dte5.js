// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{A,G}from"/$bunfs/root/chunk-xzmtst7a.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{L}from"/$bunfs/root/chunk-4qz1hwvq.js";import{readdir as f,readlink as m,realpath as s,rmdir as p,unlink as w}from"fs/promises";import{basename as g,dirname as k,join as u,sep as b}from"path";function cg(e){return e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017F/g,"s")}async function Iq(e){if(L()!=="windows")return!0;let t=await s(k(e)).catch(()=>null);return!await c(e,t==null?null:cg(u(t,g(e))))}async function c(e,t){try{return await w(e),n(`[worktree] unlinked reparse point before removal: ${e}`),!1}catch{}try{return await p(e),n(`[worktree] removed reparse point or empty directory before removal: ${e}`),!1}catch(r){if(G(r))return!1;if(A(r)!=="ENOTEMPTY"){let i=await m(e).then(()=>"link",(o)=>A(o)==="EINVAL"||G(o)?"not-link":"unknown")!=="not-link"||t==null?null:await s(e).then((o)=>cg(o)).catch(()=>null);if(i==null||i!==t&&!i.startsWith(t+b))return n(`[worktree] refusing to enumerate unremovable entry before removal: ${e}`,{level:"warn"}),!0}}let l=await f(e,{withFileTypes:!0}).catch((r)=>G(r)?[]:null);if(l==null)return n(`[worktree] could not enumerate ${e} before removal; not certifying`,{level:"warn"}),!0;let a=!1;for(let r of l)if(r.isSymbolicLink()||r.isDirectory())a=await c(u(e,r.name),t)||a;return a}
export{cg,Iq};
