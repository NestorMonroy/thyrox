// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{hG}from"/$bunfs/root/chunk-27bj2wbx.js";import{s,n,ft}from"/$bunfs/root/chunk-x41kazpn.js";import{Ks}from"/$bunfs/root/chunk-gd2p0tvf.js";import{to}from"/$bunfs/root/chunk-1r5c67vz.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";import{A,m,L}from"/$bunfs/root/chunk-s59wj17y.js";import{y}from"/$bunfs/root/chunk-3z5w4bh8.js";L();function Y(p,P){let b=p.match(k);if(!b){return e(n,{dimColor:!0,children:p},P)}let d=b[0];let T=b.index??0;let J=p.slice(0,T);let K=p.slice(T+d.length);return r(n,{dimColor:!0,children:[J,e(ft,{url:d,children:d}),K]},P)}var k=/https?:\/\/\S+/;function wIe(){let i=S(10),I;if(i[0]===y)I=hG.getInstance().getStatus(),i[0]=I;else I=i[0];let[t,H]=m(I),B,D;if(i[1]===y)B=()=>hG.getInstance().subscribe(H),D=[],i[1]=B,i[2]=D;else B=i[1],D=i[2];if(A(B,D),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let l;if(i[3]!==t.output)l=t.output.length>0&&e(s,{flexDirection:"column",children:t.output.slice(-5).map(Y)}),i[3]=t.output,i[4]=l;else l=i[4];let f;if(i[5]!==t.error)f=t.error&&e(to,{error:t.error}),i[5]=t.error,i[6]=f;else f=i[6];let N;if(i[7]!==l||i[8]!==f)N=e(s,{marginY:1,children:r(Ks,{color:"permission",title:"Authentication",children:[l,f]})}),i[7]=l,i[8]=f,i[9]=N;else N=i[9];return N}
export{wIe};
