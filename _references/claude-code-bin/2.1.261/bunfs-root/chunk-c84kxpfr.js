// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{d1}from"/$bunfs/root/chunk-hyqdn9c0.js";import{o,t,ct}from"/$bunfs/root/chunk-fqnz5baq.js";import{ys}from"/$bunfs/root/chunk-ertcfe69.js";import{Br}from"/$bunfs/root/chunk-2ycax3bx.js";import{e,r}from"/$bunfs/root/chunk-gbn257vp.js";import{E,d,F}from"/$bunfs/root/chunk-gwyyj914.js";import{f}from"/$bunfs/root/chunk-934z9d80.js";F();function P(p,L){let b=p.match(S);if(!b){return e(t,{dimColor:!0,children:p},L)}let A=b[0];let N=b.index??0;let J=p.slice(0,N);let K=p.slice(N+A.length);return r(t,{dimColor:!0,children:[J,e(ct,{url:A,children:A}),K]},L)}var S=/https?:\/\/\S+/;function k_e(){let i=y(10),C;if(i[0]===f)C=d1.getInstance().getStatus(),i[0]=C;else C=i[0];let[n,H]=d(C),I,B;if(i[1]===f)I=()=>d1.getInstance().subscribe(H),B=[],i[1]=I,i[2]=B;else I=i[1],B=i[2];if(E(I,B),!n.isAuthenticating&&!n.error&&n.output.length===0){return null}if(!n.isAuthenticating&&!n.error){return null}let a;if(i[3]!==n.output)a=n.output.length>0&&e(o,{flexDirection:"column",children:n.output.slice(-5).map(P)}),i[3]=n.output,i[4]=a;else a=i[4];let l;if(i[5]!==n.error)l=n.error&&e(Br,{error:n.error}),i[5]=n.error,i[6]=l;else l=i[6];let D;if(i[7]!==a||i[8]!==l)D=e(o,{marginY:1,children:r(ys,{color:"permission",title:"Authentication",children:[a,l]})}),i[7]=a,i[8]=l,i[9]=D;else D=i[9];return D}
export{k_e};
