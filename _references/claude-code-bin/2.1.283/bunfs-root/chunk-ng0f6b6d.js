// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ve}from"/$bunfs/root/chunk-wfq5cw95.js";import{Ler}from"/$bunfs/root/chunk-j3kxae8b.js";import{b,J}from"/$bunfs/root/chunk-zkn0228z.js";import{Zn}from"/$bunfs/root/chunk-0ywwnrtd.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{n,Jr}from"/$bunfs/root/chunk-mtq6m3s7.js";import{De}from"/$bunfs/root/chunk-fhveqs19.js";import{tU}from"/$bunfs/root/chunk-7vq28y87.js";import{W_}from"/$bunfs/root/chunk-6ayv7r2w.js";import{e}from"/$bunfs/root/chunk-s81ftaa6.js";import{KEr}from"/$bunfs/root/chunk-6mcmnwh3.js";import{Vt,Ie,X,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();L();L();var c=Vt(!1);function cwn(r){let s=w(2),{children:t}=r,o;if(s[0]!==t)o=e(c.Provider,{value:!0,children:t}),s[0]=t,s[1]=o;else o=s[1];return o}function u(){return Ie(c)}function P(r){try{let t=J(r),s=b(t),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return b(t,null,2)}catch{return r}}var A=1e4;function _(r){if(r.length>A)return r;return r.split(`
`).map(P).join(`
`)}var C=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,I=1e5;function dwn(r,t){if(r.length>I)return r;let s=(o)=>o.replace(C,(m)=>W_(m,void 0,{themeName:t}));if(!r.includes(Ler))return s(r);return r.split(`
`).map((o)=>o.includes(Ler)?o:s(o)).join(`
`)}function cT(r){let l=w(14),{content:t,verbose:s,isError:o,isWarning:m}=r,{columns:d}=ve(),[g]=Zn(),G=u(),h=Ie(tU),U=s||G,v;if(l[0]!==t||l[1]!==g)v=dwn(_(t),g),l[0]=t,l[1]=g,l[2]=v;else v=l[2];let a=v,N;fr:{if(U){let i;if(l[3]!==a)i=f(a),l[3]=a,l[4]=i;else i=l[4];N=i;break fr}let i;if(l[5]!==d||l[6]!==a||l[7]!==h)i=f(KEr(a,d,h)),l[5]=d,l[6]=a,l[7]=h,l[8]=i;else i=l[8];N=i}let R=N,x=o?"error":m?"warning":void 0,i;if(l[9]!==R)i=e(Jr,{children:R}),l[9]=R,l[10]=i;else i=l[10];let E;if(l[11]!==x||l[12]!==i)E=e(De,{children:e(n,{color:x,children:i})}),l[11]=x,l[12]=i,l[13]=E;else E=l[13];return E}function f(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{cwn,dwn,cT};
