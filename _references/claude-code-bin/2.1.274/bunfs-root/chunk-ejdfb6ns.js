// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{se,Vhe}from"/$bunfs/root/chunk-hf9yhhhe.js";import{ue}from"/$bunfs/root/chunk-zbq9bkhj.js";import{FA,tUt,VEe,SLe}from"/$bunfs/root/chunk-y5fqhwd4.js";function c_(r,o,t){let n=tUt(FA),e=VEe(r,o,n);if(e===void 0){let i=`${r}:${o}`,s=FA.loggedShortcutFallbacks;if(!s.has(i))s.add(i),SLe(r,o,t,"action_not_found");return t}return e===null?"":e}function h(){let r=c_("app:toggleTranscript","Global","ctrl+o");return ue.dim(`(${r} to expand)`)}var d=3,u=10;function b(r,o){let t=r.split(`
`),n=[];for(let i of t){let s=se(i);if(s<=o)n.push(i.trimEnd());else{let a=0;while(a<s){let c=Bun.sliceAnsi(i,a,a+o);n.push(c.trimEnd()),a+=o}}}let e=n.length-d;if(e===1)return{aboveTheFold:n.slice(0,d+1).join(`
`).trimEnd(),remainingLines:0};return{aboveTheFold:n.slice(0,d).join(`
`).trimEnd(),remainingLines:Math.max(0,e)}}function vVn(r,o,t=!1){let n=r.trimEnd();if(!n)return"";let e=Math.max(o-u,10),i=d*e*4,s=n.length>i,a=s?n.slice(0,i):n,{aboveTheFold:c,remainingLines:l}=b(a,e),m=l;if(s){let g=0,f=-1;for(;;){if(f=n.indexOf(`
`,f+1),f===-1)break;g++}let p=Math.max(g+1,Math.ceil(n.length/e));m=Math.max(l,p-d)}return[c,m>0?ue.dim(Vhe(m)+(t?"":` ${h()}`)):""].filter(Boolean).join(`
`)}function GR(r,o){if(typeof r!=="string")return!1;let t=r.trimEnd(),n=0,e=0;for(let l=0;l<=d;l++){if(n=t.indexOf(`
`,n),n===-1)break;e++,n++}if(n!==-1&&n<t.length)return!0;if(o===void 0)return!1;let i=Math.max(o-u,10),s=d+1,a=d*i*4;if(t.length>a)return!0;if(e===0){let l=s*i;if(t.length<=l)return!1;return se(t)>l}let c=0;for(let l of t.split(`
`))if(c+=Math.max(1,Math.ceil(se(l)/i)),c>s)return!0;return!1}
export{c_,vVn,GR};
