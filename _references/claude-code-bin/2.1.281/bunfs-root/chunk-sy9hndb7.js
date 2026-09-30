// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ve}from"/$bunfs/root/chunk-hncbthj7.js";import{O6n}from"/$bunfs/root/chunk-06k5ykny.js";import{S,Q}from"/$bunfs/root/chunk-wfscmafr.js";import{Yn}from"/$bunfs/root/chunk-k1grbw7c.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{n,Zr}from"/$bunfs/root/chunk-b8sc2vbx.js";import{Le}from"/$bunfs/root/chunk-f68tdm3t.js";import{A$}from"/$bunfs/root/chunk-ege7hjad.js";import{p_}from"/$bunfs/root/chunk-7nndzyf5.js";import{e}from"/$bunfs/root/chunk-srmsc891.js";import{Kur}from"/$bunfs/root/chunk-nhzgvfzr.js";import{Vt,Pe,J,D}from"/$bunfs/root/chunk-av0brfrs.js";D();D();D();var c=Vt(!1);function Dfn(r){let s=w(2),{children:t}=r,o;if(s[0]!==t)o=e(c.Provider,{value:!0,children:t}),s[0]=t,s[1]=o;else o=s[1];return o}function u(){return Pe(c)}function M(r){try{let t=Q(r),s=S(t),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return S(t,null,2)}catch{return r}}var P=1e4;function b(r){if(r.length>P)return r;return r.split(`
`).map(M).join(`
`)}var A=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,C=1e5;function Lfn(r,t){if(r.length>C)return r;let s=(o)=>o.replace(A,(m)=>p_(m,void 0,{themeName:t}));if(!r.includes(O6n))return s(r);return r.split(`
`).map((o)=>o.includes(O6n)?o:s(o)).join(`
`)}function Ek(r){let l=w(14),{content:t,verbose:s,isError:o,isWarning:m}=r,{columns:d}=ve(),[g]=Yn(),k=u(),h=Pe(A$),z=s||k,O;if(l[0]!==t||l[1]!==g)O=Lfn(b(t),g),l[0]=t,l[1]=g,l[2]=O;else O=l[2];let a=O,N;fr:{if(z){let i;if(l[3]!==a)i=f(a),l[3]=a,l[4]=i;else i=l[4];N=i;break fr}let i;if(l[5]!==d||l[6]!==a||l[7]!==h)i=f(Kur(a,d,h)),l[5]=d,l[6]=a,l[7]=h,l[8]=i;else i=l[8];N=i}let R=N,x=o?"error":m?"warning":void 0,i;if(l[9]!==R)i=e(Zr,{children:R}),l[9]=R,l[10]=i;else i=l[10];let v;if(l[11]!==x||l[12]!==i)v=e(Le,{children:e(n,{color:x,children:i})}),l[11]=x,l[12]=i,l[13]=v;else v=l[13];return v}function f(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{Dfn,Lfn,Ek};
