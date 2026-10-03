// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{w}from"/$bunfs/root/chunk-beptw75w.js";import{s,Mv}from"/$bunfs/root/chunk-fsx1dvsr.js";import{e}from"/$bunfs/root/chunk-9av83rwa.js";import{uit,ZKe,pit}from"/$bunfs/root/chunk-kt4703ww.js";function HH(n){let r=w(10),p,a,i;if(r[0]!==n)({active:p,children:i,...a}=n),r[0]=n,r[1]=p,r[2]=a,r[3]=i;else p=r[1],a=r[2],i=r[3];let l;if(r[4]!==p)l={line:0,column:0,active:p},r[4]=p,r[5]=l;else l=r[5];let c=Mv(l),h;if(r[6]!==a||r[7]!==i||r[8]!==c)h=e(s,{...a,ref:c,children:i}),r[6]=a,r[7]=i,r[8]=c,r[9]=h;else h=r[9];return h}function y(n){let r=pit(n),p=Math.min(r.length,uit());return 2+n.name.length+2+p+1}function MZe(n,r,p){let a=new Map;for(let t of n){if(t.type!=="prompt"||t.disableModelInvocation)continue;let o=t.pluginInfo?.pluginManifest.name;if(!o)continue;let u=y(t),m=a.get(o)??[];m.push({name:t.name,chars:u,approxTokens:Math.round(u/r)}),a.set(o,m)}let i=[...a.entries()].map(([t,o])=>{o.sort((m,d)=>d.chars-m.chars);let u=o.reduce((m,d)=>m+d.chars,0);return{pluginName:t,skillCount:o.length,chars:u,approxTokens:Math.round(u/r),skills:o}}).sort((t,o)=>o.chars-t.chars),l=i.reduce((t,o)=>t+o.chars,0),c=ZKe(p,r),h=l>c,g=h?c:l;return{byPlugin:i,totalChars:g,totalTokens:Math.round(g/r),overBudget:h,budgetTokens:Math.round(c/r)}}
export{HH,MZe};
