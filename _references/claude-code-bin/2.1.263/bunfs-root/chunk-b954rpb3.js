// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{BR}from"/$bunfs/root/chunk-gkqebe2m.js";import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{Pt}from"/$bunfs/root/chunk-z4h5ym44.js";import{o,t,QZ}from"/$bunfs/root/chunk-ne2fkdm9.js";import{IU}from"/$bunfs/root/chunk-ygpdnc29.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{De,dn,sC,v,F}from"/$bunfs/root/chunk-1c6mq242.js";function jz(N){let a=y(10),{elapsedTimeSeconds:b,timeoutMs:l}=N;if(b===void 0&&!l){return null}let O;if(a[0]!==l)O=l?Pt(l,{hideTrailingZeros:!0}):void 0,a[0]=l,a[1]=O;else O=a[1];let x=O;if(b===void 0){const m=`(timeout ${x})`;let p;if(a[2]!==m)p=e(t,{dimColor:!0,children:m}),a[2]=m,a[3]=p;else p=a[3];return p}const m=b*1000;let p;if(a[4]!==m)p=Pt(m),a[4]=m,a[5]=p;else p=a[5];let E=p;if(x){const u=`(${E} \xB7 timeout ${x})`;let d;if(a[6]!==u)d=e(t,{dimColor:!0,children:u}),a[6]=u,a[7]=d;else d=a[7];return d}const u=`(${E})`;let d;if(a[8]!==u)d=e(t,{dimColor:!0,children:u}),a[8]=u,a[9]=d;else d=a[9];return d}F();function z(){let r=De(IU),[n,i,s,f]=QZ(),c=f()??i.isVisible;return[n,c||r,s]}function y_({children:r}){let n=De(BR),[i,s,f]=z(),c=v(r),[,C]=sC((T)=>T+1,0),R=!s;if(!R)c.current=r;let V=n?.columns,L=n?.rows;return dn(()=>{if(R&&f())C()},[V,L,R,f]),e(o,{ref:i,children:c.current})}function kze(r){let[n,i]=z(),s=v(r);if(i)s.current=r;return[n,s.current]}
export{y_,kze,jz};
