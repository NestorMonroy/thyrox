// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{h1}from"/$bunfs/root/chunk-btbsn9s4.js";import{o,n,ut}from"/$bunfs/root/chunk-5zps47bf.js";import{ys}from"/$bunfs/root/chunk-hbzywdxx.js";import{Br}from"/$bunfs/root/chunk-8szrqpsk.js";import{e,r}from"/$bunfs/root/chunk-zhg3ync1.js";import{v,d,L}from"/$bunfs/root/chunk-v21q572m.js";import{p}from"/$bunfs/root/chunk-7sg5wrey.js";L();function T(f,N){let b=f.match(S);if(!b){return e(n,{dimColor:!0,children:f},N)}let A=b[0];let P=b.index??0;let J=f.slice(0,P);let K=f.slice(P+A.length);return r(n,{dimColor:!0,children:[J,e(ut,{url:A,children:A}),K]},N)}var S=/https?:\/\/\S+/;function fSe(){let i=y(10),C;if(i[0]===p)C=h1.getInstance().getStatus(),i[0]=C;else C=i[0];let[t,H]=d(C),I,B;if(i[1]===p)I=()=>h1.getInstance().subscribe(H),B=[],i[1]=I,i[2]=B;else I=i[1],B=i[2];if(v(I,B),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(i[3]!==t.output)a=t.output.length>0&&e(o,{flexDirection:"column",children:t.output.slice(-5).map(T)}),i[3]=t.output,i[4]=a;else a=i[4];let l;if(i[5]!==t.error)l=t.error&&e(Br,{error:t.error}),i[5]=t.error,i[6]=l;else l=i[6];let D;if(i[7]!==a||i[8]!==l)D=e(o,{marginY:1,children:r(ys,{color:"permission",title:"Authentication",children:[a,l]})}),i[7]=a,i[8]=l,i[9]=D;else D=i[9];return D}
export{fSe};
