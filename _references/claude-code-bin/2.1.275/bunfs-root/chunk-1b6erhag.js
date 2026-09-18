// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ee}from"/$bunfs/root/chunk-7v7hydcr.js";import{tOn}from"/$bunfs/root/chunk-knfw31n5.js";import{S,J}from"/$bunfs/root/chunk-4bbpt7sc.js";import{In}from"/$bunfs/root/chunk-carmz1jg.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{n,to}from"/$bunfs/root/chunk-0hefd0r9.js";import{Ie}from"/$bunfs/root/chunk-hdpv13yk.js";import{gV}from"/$bunfs/root/chunk-245ep240.js";import{ty}from"/$bunfs/root/chunk-aj8nwtkg.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{l5n}from"/$bunfs/root/chunk-vran751w.js";import{Xt,De,X,D}from"/$bunfs/root/chunk-347kpssc.js";D();D();D();var c=Xt(!1);function eXt(U){let K=w(2),{children:h}=U,v;if(K[0]!==h)v=e(c.Provider,{value:!0,children:h}),K[0]=h,K[1]=v;else v=K[1];return v}function f(){return De(c)}function I(r){try{let i=J(r),s=S(i),t=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(t!==m)return r;return S(i,null,2)}catch{return r}}var j=1e4;function O(r){if(r.length>j)return r;return r.split(`
`).map(I).join(`
`)}var C=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,H=1e5;function tXt(r,i){if(r.length>H)return r;let s=(t)=>t.replace(C,(m)=>ty(m,void 0,{themeName:i}));if(!r.includes(tOn))return s(r);return r.split(`
`).map((t)=>t.includes(tOn)?t:s(t)).join(`
`)}function V_(mr){let p=w(14),{content:N,verbose:ar,isError:cr,isWarning:fr}=mr,{columns:x}=Ee(),[_]=In(),pr=f(),b=De(gV),ur=ar||pr,A;if(p[0]!==N||p[1]!==_)A=tXt(O(N),_),p[0]=N,p[1]=_,p[2]=A;else A=p[2];let a=A,T;bb0:{if(ur){let o;if(p[3]!==a)o=u(a),p[3]=a,p[4]=o;else o=p[4];T=o;break bb0}let o;if(p[5]!==x||p[6]!==a||p[7]!==b)o=u(l5n(a,x,b)),p[5]=x,p[6]=a,p[7]=b,p[8]=o;else o=p[8];T=o}let y=T,L=cr?"error":fr?"warning":void 0,o;if(p[9]!==y)o=e(to,{children:y}),p[9]=y,p[10]=o;else o=p[10];let E;if(p[11]!==L||p[12]!==o)E=e(Ie,{children:e(n,{color:L,children:o})}),p[11]=L,p[12]=o,p[13]=E;else E=p[13];return E}function u(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{eXt,tXt,V_};
