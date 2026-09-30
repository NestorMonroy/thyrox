// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{YG}from"/$bunfs/root/chunk-xbd48fav.js";import{s,n,gt}from"/$bunfs/root/chunk-0hefd0r9.js";import{ri}from"/$bunfs/root/chunk-50nm69x8.js";import{eo}from"/$bunfs/root/chunk-qrbhvgr3.js";import{e,r}from"/$bunfs/root/chunk-4m6y8tt1.js";import{A,g,D}from"/$bunfs/root/chunk-347kpssc.js";import{y}from"/$bunfs/root/chunk-sr6jf0k1.js";D();function T(f,N){let b=f.match(d);if(!b){return e(n,{dimColor:!0,children:f},N)}let S=b[0];let P=b.index??0;let H=f.slice(0,P);let J=f.slice(P+S.length);return r(n,{dimColor:!0,children:[H,e(gt,{url:S,children:S}),J]},N)}var d=/https?:\/\/\S+/;function aHe(){let i=w(10),C;if(i[0]===y)C=YG.getInstance().getStatus(),i[0]=C;else C=i[0];let[t,G]=g(C),I,B;if(i[1]===y)I=()=>YG.getInstance().subscribe(G),B=[],i[1]=I,i[2]=B;else I=i[1],B=i[2];if(A(I,B),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(i[3]!==t.output)a=t.output.length>0&&e(s,{flexDirection:"column",children:t.output.slice(-5).map(T)}),i[3]=t.output,i[4]=a;else a=i[4];let l;if(i[5]!==t.error)l=t.error&&e(eo,{error:t.error}),i[5]=t.error,i[6]=l;else l=i[6];let L;if(i[7]!==a||i[8]!==l)L=e(s,{marginY:1,children:r(ri,{color:"permission",title:"Authentication",children:[a,l]})}),i[7]=a,i[8]=l,i[9]=L;else L=i[9];return L}
export{aHe};
