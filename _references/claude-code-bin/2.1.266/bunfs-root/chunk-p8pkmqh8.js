// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{CI}from"/$bunfs/root/chunk-gbjaaczn.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{Dt}from"/$bunfs/root/chunk-ydsbq05f.js";import{o,n,hte}from"/$bunfs/root/chunk-5zps47bf.js";import{Dj}from"/$bunfs/root/chunk-v3xga0ky.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{Oe,fn,OR,k,L}from"/$bunfs/root/chunk-v21q572m.js";function oq(F){let a=y(10),{elapsedTimeSeconds:b,timeoutMs:l}=F;if(b===void 0&&!l){return null}let O;if(a[0]!==l)O=l?Dt(l,{hideTrailingZeros:!0}):void 0,a[0]=l,a[1]=O;else O=a[1];let x=O;if(b===void 0){const m=`(timeout ${x})`;let p;if(a[2]!==m)p=e(n,{dimColor:!0,children:m}),a[2]=m,a[3]=p;else p=a[3];return p}const m=b*1000;let p;if(a[4]!==m)p=Dt(m),a[4]=m,a[5]=p;else p=a[5];let E=p;if(x){const u=`(${E} \xB7 timeout ${x})`;let d;if(a[6]!==u)d=e(n,{dimColor:!0,children:u}),a[6]=u,a[7]=d;else d=a[7];return d}const u=`(${E})`;let d;if(a[8]!==u)d=e(n,{dimColor:!0,children:u}),a[8]=u,a[9]=d;else d=a[9];return d}L();function z(){let r=Oe(Dj),[t,i,s,f]=hte(),c=f()??i.isVisible;return[t,c||r,s]}function K_({children:r}){let t=Oe(CI),[i,s,f]=z(),c=k(r),[,C]=OR((v)=>v+1,0),R=!s;if(!R)c.current=r;let V=t?.columns,T=t?.rows;return fn(()=>{if(R&&f())C()},[V,T,R,f]),e(o,{ref:i,children:c.current})}function jqe(r){let[t,i]=z(),s=k(r);if(i)s.current=r;return[t,s.current]}
export{K_,jqe,oq};
