// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ee}from"/$bunfs/root/chunk-bxhyh54r.js";import{Cn}from"/$bunfs/root/chunk-actz3rxp.js";import{Ae,ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{Ad}from"/$bunfs/root/chunk-g768q95w.js";import{ZBe,ur}from"/$bunfs/root/chunk-a1fdkwrj.js";import{VBe,KBe}from"/$bunfs/root/chunk-yp0c47d4.js";import{realpath as u}from"fs/promises";async function LYr(e){try{let o=await VBe();if(!o){t("Not in a GitHub repository, skipping path mapping update");return}let r=Ee(),s=ur(r)??r,i;try{i=Cn(await u(s))}catch{i=s}let n=o.toLowerCase(),p=ce().githubRepoPaths?.[n]??[];if(p[0]===i){t(`Path ${i} already tracked for repo ${n}`);return}let f=p.filter((c)=>c!==i),h=[i,...f];await Ae((c)=>({...c,githubRepoPaths:{...c.githubRepoPaths,[n]:h}}),e),t(`Added ${i} to tracked paths for repo ${n}`)}catch(o){t(`Error updating repo path mapping: ${o}`)}}function f2t(e){let o=ce(),r=e.toLowerCase();return o.githubRepoPaths?.[r]??[]}async function m2t(e){let o=await Promise.all(e.map(Ad));return e.filter((r,a)=>o[a])}async function lQn(e,o){try{let r=await ZBe(e);if(!r)return!1;let a=KBe(r);if(!a)return!1;return a.toLowerCase()===o.toLowerCase()}catch{return!1}}function cQn(e,o,r){let a=ce(),s=e.toLowerCase(),i=a.githubRepoPaths?.[s]??[],n=i.filter((p)=>p!==o);if(n.length===i.length)return;let g={...a.githubRepoPaths};if(n.length===0)delete g[s];else g[s]=n;Ae((p)=>({...p,githubRepoPaths:g}),r),t(`Removed ${o} from tracked paths for repo ${s}`)}
export{LYr,f2t,m2t,lQn,cQn};
