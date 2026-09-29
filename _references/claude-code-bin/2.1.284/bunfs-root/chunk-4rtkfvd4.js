// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ve}from"/$bunfs/root/chunk-vqta99k5.js";import{dor}from"/$bunfs/root/chunk-gdm53jqt.js";import{b,J}from"/$bunfs/root/chunk-6b6gfk00.js";import{tr}from"/$bunfs/root/chunk-v5p67206.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{n,oo}from"/$bunfs/root/chunk-gjfhbdvy.js";import{De}from"/$bunfs/root/chunk-x24k3gbw.js";import{TU}from"/$bunfs/root/chunk-bsghrvyw.js";import{nb}from"/$bunfs/root/chunk-ny1wh7hq.js";import{e}from"/$bunfs/root/chunk-fr6qx5c3.js";import{SCr}from"/$bunfs/root/chunk-aejj2h5k.js";import{zt,Ce,X,L}from"/$bunfs/root/chunk-68gegf2j.js";L();L();L();var c=zt(!1);function ZEn(r){let s=w(2),{children:t}=r,o;if(s[0]!==t)o=e(c.Provider,{value:!0,children:t}),s[0]=t,s[1]=o;else o=s[1];return o}function u(){return Ce(c)}function P(r){try{let t=J(r),s=b(t),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return b(t,null,2)}catch{return r}}var A=1e4;function _(r){if(r.length>A)return r;return r.split(`
`).map(P).join(`
`)}var C=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,I=1e5;function ekn(r,t){if(r.length>I)return r;let s=(o)=>o.replace(C,(m)=>nb(m,void 0,{themeName:t}));if(!r.includes(dor))return s(r);return r.split(`
`).map((o)=>o.includes(dor)?o:s(o)).join(`
`)}function wT(r){let l=w(14),{content:t,verbose:s,isError:o,isWarning:m}=r,{columns:d}=ve(),[g]=tr(),G=u(),h=Ce(TU),U=s||G,v;if(l[0]!==t||l[1]!==g)v=ekn(_(t),g),l[0]=t,l[1]=g,l[2]=v;else v=l[2];let a=v,N;pr:{if(U){let i;if(l[3]!==a)i=f(a),l[3]=a,l[4]=i;else i=l[4];N=i;break pr}let i;if(l[5]!==d||l[6]!==a||l[7]!==h)i=f(SCr(a,d,h)),l[5]=d,l[6]=a,l[7]=h,l[8]=i;else i=l[8];N=i}let R=N,x=o?"error":m?"warning":void 0,i;if(l[9]!==R)i=e(oo,{children:R}),l[9]=R,l[10]=i;else i=l[10];let E;if(l[11]!==x||l[12]!==i)E=e(De,{children:e(n,{color:x,children:i})}),l[11]=x,l[12]=i,l[13]=E;else E=l[13];return E}function f(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{ZEn,ekn,wT};
