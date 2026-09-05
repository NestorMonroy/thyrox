// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{fR}from"/$bunfs/root/chunk-p97n3qf8.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{Nt}from"/$bunfs/root/chunk-7y5wjz4e.js";import{o,n,jee}from"/$bunfs/root/chunk-h8z84shc.js";import{lj}from"/$bunfs/root/chunk-ndrag3s4.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{ze,Mn,SC,k,j}from"/$bunfs/root/chunk-w71cs9yg.js";function az(w){let a=y(10),{elapsedTimeSeconds:b,timeoutMs:l}=w;if(b===void 0&&!l){return null}let v;if(a[0]!==l)v=l?Nt(l,{hideTrailingZeros:!0}):void 0,a[0]=l,a[1]=v;else v=a[1];let x=v;if(b===void 0){const m=`(timeout ${x})`;let p;if(a[2]!==m)p=e(n,{dimColor:!0,children:m}),a[2]=m,a[3]=p;else p=a[3];return p}const m=b*1000;let p;if(a[4]!==m)p=Nt(m),a[4]=m,a[5]=p;else p=a[5];let O=p;if(x){const u=`(${O} \xB7 timeout ${x})`;let d;if(a[6]!==u)d=e(n,{dimColor:!0,children:u}),a[6]=u,a[7]=d;else d=a[7];return d}const u=`(${O})`;let d;if(a[8]!==u)d=e(n,{dimColor:!0,children:u}),a[8]=u,a[9]=d;else d=a[9];return d}j();function z(){let r=ze(lj),[t,i,s,f]=jee(),c=f()??i.isVisible;return[t,c||r,s]}function W_({children:r}){let t=ze(fR),[i,s,f]=z(),c=k(r),[,C]=SC((T)=>T+1,0),R=!s;if(!R)c.current=r;let V=t?.columns,L=t?.rows;return Mn(()=>{if(R&&f())C()},[V,L,R,f]),e(o,{ref:i,children:c.current})}function cze(r){let[t,i]=z(),s=k(r);if(i)s.current=r;return[t,s.current]}
export{W_,cze,az};
