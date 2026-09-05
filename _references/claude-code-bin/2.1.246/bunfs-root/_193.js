// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Hyc as R,Nyc as _}from"/$bunfs/root/_679.js";import{nzc as u,ozc as I}from"/$bunfs/root/_681.js";import{NJc as p,gKc as h}from"/$bunfs/root/_708.js";import{xxd as g}from"/$bunfs/root/_837.js";function j(e){let t=e.split(p).map((n)=>n.trim()).filter(Boolean);if(t.length===0)return;let[r,...i]=t;return i.length===0?r:`${r} ${p} ${i.join(c)}`}function w(e){if(!e.startsWith(l)&&!e.startsWith(f))return null;if(e.includes(`
`))return null;let t=e.split(c),r=t[0];if(r!==l&&r!==f)return null;let i=t.findLastIndex((F)=>E.test(F)),n=i===-1?void 0:t[i],s=i===-1?t.length:i,o=t.slice(1,s),a=o.length>0?o.join(c):void 0,d=i===-1?[]:t.slice(i+1);return{state:r,name:a,id:n,chips:d}}function G(e,t,r=!0){let i=(s)=>u(O(s)),n={...e,chips:[...e.chips]};if(i(n)<=t)return n;if(n.state===f){if(n={...n,state:k},i(n)<=t)return n}if(n.id!==void 0&&n.name!==void 0&&r){if(n={...n,id:void 0},i(n)<=t)return n}if(n.name!==void 0){let s=i({...n,name:void 0}),o=t-s-u(c),a=u(n.name),d=a>m?Math.max(o,m):o;if(d>=1&&d<a)n={...n,name:R(n.name,d)}}return n}function O(e){return[e.state,...e.name?[e.name]:[],...e.id?[e.id]:[],...e.chips].join(c)}var l="session running",f="session waiting for a prompt",k="session waiting",c=" \xB7 ",E,m=20;var T=g(()=>{h();I();_();E=/^[0-9a-f]{8}$/});
export{l as bv,f as cv,j as dv,w as ev,G as fv,O as gv,T as hv};
