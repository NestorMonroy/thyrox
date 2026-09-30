// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ve}from"/$bunfs/root/chunk-rt1hha9a.js";import{b,Q}from"/$bunfs/root/chunk-055ns4k8.js";import{sor}from"/$bunfs/root/chunk-bj1nat4s.js";import{Vn}from"/$bunfs/root/chunk-y4mbr44j.js";import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{n,Zr}from"/$bunfs/root/chunk-k0qnyh4a.js";import{Ft,Re,Y,D}from"/$bunfs/root/chunk-bqbammwz.js";import{Ne}from"/$bunfs/root/chunk-rnf9hmd3.js";import{AU}from"/$bunfs/root/chunk-47fdh92k.js";import{nb}from"/$bunfs/root/chunk-00vggsa0.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";import{EAr}from"/$bunfs/root/chunk-hq0xsczw.js";D();D();D();var c=Ft(!1);function KEn(r){let s=w(2),{children:t}=r,o;if(s[0]!==t)o=e(c.Provider,{value:!0,children:t}),s[0]=t,s[1]=o;else o=s[1];return o}function u(){return Re(c)}function M(r){try{let t=Q(r),s=b(t),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return b(t,null,2)}catch{return r}}var P=1e4;function _(r){if(r.length>P)return r;return r.split(`
`).map(M).join(`
`)}var A=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,C=1e5;function YEn(r,t){if(r.length>C)return r;let s=(o)=>o.replace(A,(m)=>nb(m,void 0,{themeName:t}));if(!r.includes(sor))return s(r);return r.split(`
`).map((o)=>o.includes(sor)?o:s(o)).join(`
`)}function IT(r){let l=w(14),{content:t,verbose:s,isError:o,isWarning:m}=r,{columns:d}=ve(),[g]=Vn(),k=u(),h=Re(AU),z=s||k,O;if(l[0]!==t||l[1]!==g)O=YEn(_(t),g),l[0]=t,l[1]=g,l[2]=O;else O=l[2];let a=O,N;fr:{if(z){let i;if(l[3]!==a)i=f(a),l[3]=a,l[4]=i;else i=l[4];N=i;break fr}let i;if(l[5]!==d||l[6]!==a||l[7]!==h)i=f(EAr(a,d,h)),l[5]=d,l[6]=a,l[7]=h,l[8]=i;else i=l[8];N=i}let R=N,x=o?"error":m?"warning":void 0,i;if(l[9]!==R)i=e(Zr,{children:R}),l[9]=R,l[10]=i;else i=l[10];let v;if(l[11]!==x||l[12]!==i)v=e(Ne,{children:e(n,{color:x,children:i})}),l[11]=x,l[12]=i,l[13]=v;else v=l[13];return v}function f(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{KEn,YEn,IT};
