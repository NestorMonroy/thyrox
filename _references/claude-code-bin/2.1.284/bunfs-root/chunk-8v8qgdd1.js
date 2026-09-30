// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{we}from"/$bunfs/root/chunk-d37h8mav.js";import{En}from"/$bunfs/root/chunk-zy97v06w.js";import{ke,ce}from"/$bunfs/root/chunk-swk3rjnt.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{Pd}from"/$bunfs/root/chunk-qcjafqk2.js";import{ZBe,Fn}from"/$bunfs/root/chunk-hqy3a2gr.js";import{VBe,KBe}from"/$bunfs/root/chunk-023680d9.js";import{realpath as u}from"fs/promises";async function hYr(e){try{let o=await VBe();if(!o){t("Not in a GitHub repository, skipping path mapping update");return}let r=we(),s=Fn(r)??r,i;try{i=En(await u(s))}catch{i=s}let n=o.toLowerCase(),p=ce().githubRepoPaths?.[n]??[];if(p[0]===i){t(`Path ${i} already tracked for repo ${n}`);return}let f=p.filter((c)=>c!==i),h=[i,...f];await ke((c)=>({...c,githubRepoPaths:{...c.githubRepoPaths,[n]:h}}),e),t(`Added ${i} to tracked paths for repo ${n}`)}catch(o){t(`Error updating repo path mapping: ${o}`)}}function xzt(e){let o=ce(),r=e.toLowerCase();return o.githubRepoPaths?.[r]??[]}async function Pzt(e){let o=await Promise.all(e.map(Pd));return e.filter((r,a)=>o[a])}async function TQn(e,o){try{let r=await ZBe(e);if(!r)return!1;let a=KBe(r);if(!a)return!1;return a.toLowerCase()===o.toLowerCase()}catch{return!1}}function AQn(e,o,r){let a=ce(),s=e.toLowerCase(),i=a.githubRepoPaths?.[s]??[],n=i.filter((p)=>p!==o);if(n.length===i.length)return;let g={...a.githubRepoPaths};if(n.length===0)delete g[s];else g[s]=n;ke((p)=>({...p,githubRepoPaths:g}),r),t(`Removed ${o} from tracked paths for repo ${s}`)}
export{hYr,xzt,Pzt,TQn,AQn};
