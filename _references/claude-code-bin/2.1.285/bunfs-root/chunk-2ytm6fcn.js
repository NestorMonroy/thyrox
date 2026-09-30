// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{fp,rr}from"/$bunfs/root/chunk-2sb5hqyj.js";import{sh}from"/$bunfs/root/chunk-d7tms3ge.js";import{Kk}from"/$bunfs/root/chunk-98a68crr.js";import{iD}from"/$bunfs/root/chunk-7jjx4s6h.js";import{Ycn}from"/$bunfs/root/chunk-dk4vhdtd.js";import{V_r,F7t,U7t,Y_r}from"/$bunfs/root/chunk-qazw855w.js";var d=14,f=10;async function lHe(){try{let e=Ycn();if(e===void 0)return[];if(iD()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=sh(),l=Kk(),c=ce().numStartups,g=Date.now(),r=[];for(let n of s){let{marketplace:o}=rr(n.repository);if(!o||fp(o))continue;if(Y_r(n,u,l)!=="user-install")continue;if(p(n))continue;let i=F7t(n.repository);if(!i)continue;if(V_r(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=U7t(i,c,g);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function aoo(e){if(iD()!==null)return null;let s=F7t(e);if(!s)return null;if(V_r(e))return 0;return U7t(s,ce().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{lHe,aoo};
