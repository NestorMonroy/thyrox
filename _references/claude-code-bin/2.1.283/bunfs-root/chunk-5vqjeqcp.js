// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{we}from"/$bunfs/root/chunk-nvht7ckf.js";import{xn}from"/$bunfs/root/chunk-yqm14hey.js";import{ke,le}from"/$bunfs/root/chunk-t6pwageh.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{Md}from"/$bunfs/root/chunk-nhz4atva.js";import{LUe,$n}from"/$bunfs/root/chunk-m8ebe51k.js";import{xUe,PUe}from"/$bunfs/root/chunk-47q8f7xm.js";import{realpath as u}from"fs/promises";async function t4r(e){try{let o=await xUe();if(!o){t("Not in a GitHub repository, skipping path mapping update");return}let r=we(),s=$n(r)??r,i;try{i=xn(await u(s))}catch{i=s}let n=o.toLowerCase(),p=le().githubRepoPaths?.[n]??[];if(p[0]===i){t(`Path ${i} already tracked for repo ${n}`);return}let f=p.filter((c)=>c!==i),h=[i,...f];await ke((c)=>({...c,githubRepoPaths:{...c.githubRepoPaths,[n]:h}}),e),t(`Added ${i} to tracked paths for repo ${n}`)}catch(o){t(`Error updating repo path mapping: ${o}`)}}function Zjt(e){let o=le(),r=e.toLowerCase();return o.githubRepoPaths?.[r]??[]}async function eWt(e){let o=await Promise.all(e.map(Md));return e.filter((r,a)=>o[a])}async function F9n(e,o){try{let r=await LUe(e);if(!r)return!1;let a=PUe(r);if(!a)return!1;return a.toLowerCase()===o.toLowerCase()}catch{return!1}}function U9n(e,o,r){let a=le(),s=e.toLowerCase(),i=a.githubRepoPaths?.[s]??[],n=i.filter((p)=>p!==o);if(n.length===i.length)return;let g={...a.githubRepoPaths};if(n.length===0)delete g[s];else g[s]=n;ke((p)=>({...p,githubRepoPaths:g}),r),t(`Removed ${o} from tracked paths for repo ${s}`)}
export{t4r,Zjt,eWt,F9n,U9n};
