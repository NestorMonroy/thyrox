// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{uR}from"/$bunfs/root/chunk-65x0x96q.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{Ft}from"/$bunfs/root/chunk-br7qz22q.js";import{o,n,dte}from"/$bunfs/root/chunk-tj5q8vxd.js";import{jU}from"/$bunfs/root/chunk-hybpnwg9.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";import{We,Dn,uC,k,j}from"/$bunfs/root/chunk-db688wrz.js";function MW(w){let a=y(10),{elapsedTimeSeconds:b,timeoutMs:l}=w;if(b===void 0&&!l){return null}let v;if(a[0]!==l)v=l?Ft(l,{hideTrailingZeros:!0}):void 0,a[0]=l,a[1]=v;else v=a[1];let x=v;if(b===void 0){const m=`(timeout ${x})`;let p;if(a[2]!==m)p=e(n,{dimColor:!0,children:m}),a[2]=m,a[3]=p;else p=a[3];return p}const m=b*1000;let p;if(a[4]!==m)p=Ft(m),a[4]=m,a[5]=p;else p=a[5];let O=p;if(x){const u=`(${O} \xB7 timeout ${x})`;let d;if(a[6]!==u)d=e(n,{dimColor:!0,children:u}),a[6]=u,a[7]=d;else d=a[7];return d}const u=`(${O})`;let d;if(a[8]!==u)d=e(n,{dimColor:!0,children:u}),a[8]=u,a[9]=d;else d=a[9];return d}j();function z(){let r=We(jU),[t,i,s,f]=dte(),c=f()??i.isVisible;return[t,c||r,s]}function $_({children:r}){let t=We(uR),[i,s,f]=z(),c=k(r),[,C]=uC((T)=>T+1,0),R=!s;if(!R)c.current=r;let V=t?.columns,L=t?.rows;return Dn(()=>{if(R&&f())C()},[V,L,R,f]),e(o,{ref:i,children:c.current})}function CGe(r){let[t,i]=z(),s=k(r);if(i)s.current=r;return[t,s.current]}
export{$_,CGe,MW};
