// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{uDe,BHe,dDe}from"/$bunfs/root/chunk-vd630rs0.js";function h(s){let o=dDe(s),a=Math.min(o.length,uDe());return 2+s.name.length+2+a+1}function VIe(s,o,a){let p=new Map;for(let n of s){if(n.type!=="prompt"||n.disableModelInvocation)continue;let t=n.pluginInfo?.pluginManifest.name;if(!t)continue;let e=h(n),r=p.get(t)??[];r.push({name:n.name,chars:e,approxTokens:Math.round(e/o)}),p.set(t,r)}let m=[...p.entries()].map(([n,t])=>{t.sort((r,u)=>u.chars-r.chars);let e=t.reduce((r,u)=>r+u.chars,0);return{pluginName:n,skillCount:t.length,chars:e,approxTokens:Math.round(e/o),skills:t}}).sort((n,t)=>t.chars-n.chars),c=m.reduce((n,t)=>n+t.chars,0),i=BHe(a,o),l=c>i,g=l?i:c;return{byPlugin:m,totalChars:g,totalTokens:Math.round(g/o),overBudget:l,budgetTokens:Math.round(i/o)}}
export{VIe};
