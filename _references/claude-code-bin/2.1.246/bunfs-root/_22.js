// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Lvc as F,luc as h,puc as f}from"/$bunfs/root/_668.js";import{FYc as d,dZc as v}from"/$bunfs/root/_748.js";import{b7c as P,p7c as R,q7c as L}from"/$bunfs/root/_769.js";import{i8c as l,j9c as B,l8c as G,r8c as b}from"/$bunfs/root/_770.js";import{jhd as p,ohd as k}from"/$bunfs/root/_820.js";import{Lkd as m,atd as x}from"/$bunfs/root/_826.js";import{Dtd as u,mud as C}from"/$bunfs/root/_828.js";x();C();F();k();L();v();G();B();import{realpath as K}from"fs/promises";async function N(o){try{let t=await P();if(!t){p("Not in a GitHub repository, skipping path mapping update");return}let e=m(),n=b(e)??e,r;try{r=u(await K(n))}catch{r=n}let a=t.toLowerCase(),s=f().githubRepoPaths?.[a]??[];if(s[0]===r){p(`Path ${r} already tracked for repo ${a}`);return}let w=s.filter((c)=>c!==r),y=[r,...w];await h((c)=>({...c,githubRepoPaths:{...c.githubRepoPaths,[a]:y}}),o),p(`Added ${r} to tracked paths for repo ${a}`)}catch(t){p(`Error updating repo path mapping: ${t}`)}}function O(o){let t=f(),e=o.toLowerCase();return t.githubRepoPaths?.[e]??[]}async function _(o){let t=await Promise.all(o.map(d));return o.filter((e,i)=>t[i])}async function q(o,t){try{let e=await l(o);if(!e)return!1;let i=R(e);if(!i)return!1;return i.toLowerCase()===t.toLowerCase()}catch{return!1}}function I(o,t,e){let i=f(),n=o.toLowerCase(),r=i.githubRepoPaths?.[n]??[],a=r.filter((s)=>s!==t);if(a.length===r.length)return;let g={...i.githubRepoPaths};if(a.length===0)delete g[n];else g[n]=a;h((s)=>({...s,githubRepoPaths:g}),e),p(`Removed ${t} from tracked paths for repo ${n}`)}
export{N as Sb,O as Tb,_ as Ub,q as Vb,I as Wb};
