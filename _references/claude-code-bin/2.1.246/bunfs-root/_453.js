// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{K1a as v,R1a as O}from"/$bunfs/root/_454.js";import{atd as b,trd as l,urd as d,wrd as k}from"/$bunfs/root/_826.js";import{xxd as g}from"/$bunfs/root/_837.js";function h(e){return typeof e==="object"&&e!==null&&"deviceOwner"in e&&typeof e.deviceOwner==="string"}function p(e,n,t){if(!h(e)||e.deviceOwner!==n)return!1;let r=e.deviceTemplate!==void 0;return t==="both"||t==="templates"===r}function H(e,n){let t=d()??{},r={};for(let[i,o]of Object.entries(t)){let a=(o??[]).filter(e);if(a.length>0)r[i]=a}for(let[i,o]of Object.entries(n))if(o!==void 0&&o.length>0)r[i]=[...r[i]??[],...o];if(k(),Object.keys(r).length>0)l(r)}function D(e,n,t,r){let i={};for(let[o,a]of Object.entries(n)){if(!v(o))continue;i[o]=(a??[]).map((c)=>({...{...c.matcher!==void 0&&{matcher:c.matcher},hooks:c.hooks.map(({callback:f,timeout:s})=>({type:"callback",callback:f,...s!==void 0&&{timeout:s}}))},deviceOwner:e,...t==="templates"&&{deviceTemplate:r?.(o,c)??"template"}}))}H((o)=>!p(o,e,t),i)}function R(e,n){H((t)=>!p(t,e,n),{})}var u=g(()=>{b();O()});
export{h as G1a,D as H1a,R as I1a,u as J1a};
