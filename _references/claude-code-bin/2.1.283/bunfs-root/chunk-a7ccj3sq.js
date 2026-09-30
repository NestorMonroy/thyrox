// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{le}from"/$bunfs/root/chunk-t6pwageh.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{Qg}from"/$bunfs/root/chunk-aqjnefpv.js";import{JT}from"/$bunfs/root/chunk-0cqpxx2s.js";import{qM}from"/$bunfs/root/chunk-dw3eh2qr.js";import{Sln}from"/$bunfs/root/chunk-mfecbx5p.js";import{ehr,qXt,KXt,rhr}from"/$bunfs/root/chunk-csayct82.js";import{sp,or}from"/$bunfs/root/chunk-krwpsn0e.js";var d=14,f=10;async function eOe(){try{let e=Sln();if(e===void 0)return[];if(qM()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=Qg(),l=JT(),c=le().numStartups,g=Date.now(),r=[];for(let n of s){let{marketplace:o}=or(n.repository);if(!o||sp(o))continue;if(rhr(n,u,l)!=="user-install")continue;if(p(n))continue;let i=qXt(n.repository);if(!i)continue;if(ehr(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=KXt(i,c,g);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function eZr(e){if(qM()!==null)return null;let s=qXt(e);if(!s)return null;if(ehr(e))return 0;return KXt(s,le().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{eOe,eZr};
