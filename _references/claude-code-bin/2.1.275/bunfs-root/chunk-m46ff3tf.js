// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{CI}from"/$bunfs/root/chunk-s09hj0q3.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{Wt}from"/$bunfs/root/chunk-qwxqekf7.js";import{s,n,Y6}from"/$bunfs/root/chunk-0hefd0r9.js";import{gV}from"/$bunfs/root/chunk-245ep240.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{De,pn,iP,T,D}from"/$bunfs/root/chunk-347kpssc.js";function U6(F){let a=w(10),{elapsedTimeSeconds:b,timeoutMs:l}=F;if(b===void 0&&!l){return null}let v;if(a[0]!==l)v=l?Wt(l,{hideTrailingZeros:!0}):void 0,a[0]=l,a[1]=v;else v=a[1];let x=v;if(b===void 0){const m=`(timeout ${x})`;let p;if(a[2]!==m)p=e(n,{dimColor:!0,children:m}),a[2]=m,a[3]=p;else p=a[3];return p}const m=b*1000;let p;if(a[4]!==m)p=Wt(m),a[4]=m,a[5]=p;else p=a[5];let O=p;if(x){const u=`(${O} \xB7 timeout ${x})`;let d;if(a[6]!==u)d=e(n,{dimColor:!0,children:u}),a[6]=u,a[7]=d;else d=a[7];return d}const u=`(${O})`;let d;if(a[8]!==u)d=e(n,{dimColor:!0,children:u}),a[8]=u,a[9]=d;else d=a[9];return d}D();function y(){let r=De(gV),[o,t,i,f]=Y6(),c=f()??t.isVisible;return[o,c||r,i]}function Bw({children:r}){let o=De(CI),[t,i,f]=y(),c=T(r),[,z]=iP((L)=>L+1,0),R=!i;if(!R)c.current=r;let C=o?.columns,V=o?.rows;return pn(()=>{if(R&&f())z()},[C,V,R,f]),e(s,{ref:t,children:c.current})}function ttt(r){let[o,t]=y(),i=T(r);if(t)i.current=r;return[o,i.current]}
export{Bw,ttt,U6};
