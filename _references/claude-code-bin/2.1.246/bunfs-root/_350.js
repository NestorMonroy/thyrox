// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Eaa as R,daa as a,eaa as M,iaa as u,kaa as l,laa as N,uaa as y}from"/$bunfs/root/_441.js";import{Nfb as _,ofb as i}from"/$bunfs/root/_497.js";import{Vfb as S,jgb as P,xgb as O}from"/$bunfs/root/_499.js";import{bkb as d,dkb as x}from"/$bunfs/root/_512.js";import{oob as f,uob as I,vob as p,xob as H}from"/$bunfs/root/_527.js";import{Lvc as E,puc as r}from"/$bunfs/root/_668.js";import{jhd as m,ohd as k}from"/$bunfs/root/_820.js";import{xxd as b}from"/$bunfs/root/_837.js";async function Q(){try{let e=p().pluginLoadCacheOnly;if(e===void 0)return[];if(i()!==null)return[];let{enabled:n}=await e;if(n.length===0)return[];let h=d(),D=f(),L=r().numStartups,U=Date.now(),o=[];for(let t of n){let{marketplace:s}=P(t.repository);if(!s||S(s))continue;if(y(t,h,D)!=="user-install")continue;if(V(t))continue;let g=u(t.repository);if(!g)continue;if(a(t.repository))continue;let{sessionsSinceLastUse:w,daysSinceLastUse:c}=l(g,L,U);if(c>=C&&w>=T)o.push({pluginId:t.repository,name:t.name,daysSinceLastUse:c})}return o.sort((t,s)=>s.daysSinceLastUse-t.daysSinceLastUse),o}catch(e){return m(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function W(e){if(i()!==null)return null;let n=u(e);if(!n)return null;if(a(e))return 0;return l(n,r().numStartups,Date.now()).daysSinceLastUse}function V(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}var C=14,T=10;var j=b(()=>{E();k();x();I();O();_();H();R();M();N()});
export{Q as rK,W as sK,j as tK};
