// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ee}from"/$bunfs/root/chunk-964y2ne1.js";import{Bxn}from"/$bunfs/root/chunk-vgns83es.js";import{w,J}from"/$bunfs/root/chunk-r2c9k9kh.js";import{Tn}from"/$bunfs/root/chunk-w1zswehx.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{n,no}from"/$bunfs/root/chunk-x41kazpn.js";import{xe}from"/$bunfs/root/chunk-44st6mqy.js";import{Fq}from"/$bunfs/root/chunk-qg5c0yv1.js";import{vy}from"/$bunfs/root/chunk-4s5dpmb9.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{vVn}from"/$bunfs/root/chunk-ejdfb6ns.js";import{Kt,Me,X,L}from"/$bunfs/root/chunk-s59wj17y.js";L();L();L();var c=Kt(!1);function A5t(K){let V=S(2),{children:h}=K,A;if(V[0]!==h)A=e(c.Provider,{value:!0,children:h}),V[0]=h,V[1]=A;else A=V[1];return A}function f(){return Me(c)}function j(r){try{let i=J(r),s=w(i),t=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(t!==m)return r;return w(i,null,2)}catch{return r}}var C=1e4;function F(r){if(r.length>C)return r;return r.split(`
`).map(j).join(`
`)}var H=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,k=1e5;function T5t(r,i){if(r.length>k)return r;let s=(t)=>t.replace(H,(m)=>vy(m,void 0,{themeName:i}));if(!r.includes(Bxn))return s(r);return r.split(`
`).map((t)=>t.includes(Bxn)?t:s(t)).join(`
`)}function Eb(mr){let p=S(14),{content:N,verbose:ar,isError:cr,isWarning:fr}=mr,{columns:x}=Ee(),[_]=Tn(),pr=f(),b=Me(Fq),ur=ar||pr,E;if(p[0]!==N||p[1]!==_)E=T5t(F(N),_),p[0]=N,p[1]=_,p[2]=E;else E=p[2];let a=E,T;bb0:{if(ur){let o;if(p[3]!==a)o=u(a),p[3]=a,p[4]=o;else o=p[4];T=o;break bb0}let o;if(p[5]!==x||p[6]!==a||p[7]!==b)o=u(vVn(a,x,b)),p[5]=x,p[6]=a,p[7]=b,p[8]=o;else o=p[8];T=o}let y=T,O=cr?"error":fr?"warning":void 0,o;if(p[9]!==y)o=e(no,{children:y}),p[9]=y,p[10]=o;else o=p[10];let I;if(p[11]!==O||p[12]!==o)I=e(xe,{children:e(n,{color:O,children:o})}),p[11]=O,p[12]=o,p[13]=I;else I=p[13];return I}function u(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{A5t,T5t,Eb};
