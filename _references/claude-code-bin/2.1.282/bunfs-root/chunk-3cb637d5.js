// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{we}from"/$bunfs/root/chunk-ekrtdptv.js";import{DXn}from"/$bunfs/root/chunk-97an4vx7.js";import{S,Q}from"/$bunfs/root/chunk-nbcqw6vp.js";import{Xn}from"/$bunfs/root/chunk-4vcr7wav.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{n,qr}from"/$bunfs/root/chunk-29mppvsc.js";import{Le}from"/$bunfs/root/chunk-rr5jwnpb.js";import{W$}from"/$bunfs/root/chunk-r3gynrza.js";import{A_}from"/$bunfs/root/chunk-edp49svx.js";import{e}from"/$bunfs/root/chunk-rygnxyqy.js";import{Zhr}from"/$bunfs/root/chunk-dnpfw9ga.js";import{Vt,Ie,J,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();D();D();var c=Vt(!1);function zhn(r){let s=w(2),{children:t}=r,o;if(s[0]!==t)o=e(c.Provider,{value:!0,children:t}),s[0]=t,s[1]=o;else o=s[1];return o}function u(){return Ie(c)}function M(r){try{let t=Q(r),s=S(t),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return S(t,null,2)}catch{return r}}var P=1e4;function b(r){if(r.length>P)return r;return r.split(`
`).map(M).join(`
`)}var A=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,C=1e5;function Ghn(r,t){if(r.length>C)return r;let s=(o)=>o.replace(A,(m)=>A_(m,void 0,{themeName:t}));if(!r.includes(DXn))return s(r);return r.split(`
`).map((o)=>o.includes(DXn)?o:s(o)).join(`
`)}function jk(r){let l=w(14),{content:t,verbose:s,isError:o,isWarning:m}=r,{columns:d}=we(),[g]=Xn(),k=u(),h=Ie(W$),z=s||k,O;if(l[0]!==t||l[1]!==g)O=Ghn(b(t),g),l[0]=t,l[1]=g,l[2]=O;else O=l[2];let a=O,N;fr:{if(z){let i;if(l[3]!==a)i=f(a),l[3]=a,l[4]=i;else i=l[4];N=i;break fr}let i;if(l[5]!==d||l[6]!==a||l[7]!==h)i=f(Zhr(a,d,h)),l[5]=d,l[6]=a,l[7]=h,l[8]=i;else i=l[8];N=i}let R=N,x=o?"error":m?"warning":void 0,i;if(l[9]!==R)i=e(qr,{children:R}),l[9]=R,l[10]=i;else i=l[10];let v;if(l[11]!==x||l[12]!==i)v=e(Le,{children:e(n,{color:x,children:i})}),l[11]=x,l[12]=i,l[13]=v;else v=l[13];return v}function f(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{zhn,Ghn,jk};
