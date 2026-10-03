// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ee}from"/$bunfs/root/chunk-hbjpbz2q.js";import{xn}from"/$bunfs/root/chunk-4dvekan0.js";import{Ae,ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{Dd}from"/$bunfs/root/chunk-fresvh3b.js";import{cje,dr}from"/$bunfs/root/chunk-dsxed40r.js";import{nje,oje}from"/$bunfs/root/chunk-h62skk5a.js";import{realpath as u}from"fs/promises";async function LJr(e){try{let o=await nje();if(!o){t("Not in a GitHub repository, skipping path mapping update");return}let r=Ee(),s=dr(r)??r,i;try{i=xn(await u(s))}catch{i=s}let n=o.toLowerCase(),p=ce().githubRepoPaths?.[n]??[];if(p[0]===i){t(`Path ${i} already tracked for repo ${n}`);return}let f=p.filter((c)=>c!==i),h=[i,...f];await Ae((c)=>({...c,githubRepoPaths:{...c.githubRepoPaths,[n]:h}}),e),t(`Added ${i} to tracked paths for repo ${n}`)}catch(o){t(`Error updating repo path mapping: ${o}`)}}function AVt(e){let o=ce(),r=e.toLowerCase();return o.githubRepoPaths?.[r]??[]}async function CVt(e){let o=await Promise.all(e.map(Dd));return e.filter((r,a)=>o[a])}async function ctr(e,o){try{let r=await cje(e);if(!r)return!1;let a=oje(r);if(!a)return!1;return a.toLowerCase()===o.toLowerCase()}catch{return!1}}function dtr(e,o,r){let a=ce(),s=e.toLowerCase(),i=a.githubRepoPaths?.[s]??[],n=i.filter((p)=>p!==o);if(n.length===i.length)return;let g={...a.githubRepoPaths};if(n.length===0)delete g[s];else g[s]=n;Ae((p)=>({...p,githubRepoPaths:g}),r),t(`Removed ${o} from tracked paths for repo ${s}`)}
export{LJr,AVt,CVt,ctr,dtr};
