// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{be}from"/$bunfs/root/chunk-1jz51tqq.js";import{S,V}from"/$bunfs/root/chunk-fy3j7rz0.js";import{CSe}from"/$bunfs/root/chunk-25k3003k.js";import{dn}from"/$bunfs/root/chunk-81akr5s9.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{n,Dr}from"/$bunfs/root/chunk-5zps47bf.js";import{xe}from"/$bunfs/root/chunk-07nxs6zw.js";import{Dj}from"/$bunfs/root/chunk-v3xga0ky.js";import{hh}from"/$bunfs/root/chunk-e1ekccgx.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{Kt,Oe,q,L}from"/$bunfs/root/chunk-v21q572m.js";import{Dmn}from"/$bunfs/root/chunk-yw4jc948.js";L();L();L();var c=Kt(!1);function tDt(J){let U=y(2),{children:h}=J,E;if(U[0]!==h)E=e(c.Provider,{value:!0,children:h}),U[0]=h,U[1]=E;else E=U[1];return E}function f(){return Oe(c)}function C(r){try{let i=V(r),s=S(i),t=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(t!==m)return r;return S(i,null,2)}catch{return r}}var H=1e4;function M(r){if(r.length>H)return r;return r.split(`
`).map(C).join(`
`)}var X=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,k=1e5;function nDt(r,i){if(r.length>k)return r;let s=(t)=>t.replace(X,(m)=>hh(m,void 0,{themeName:i}));if(!r.includes(CSe))return s(r);return r.split(`
`).map((t)=>t.includes(CSe)?t:s(t)).join(`
`)}function Ey(mr){let p=y(14),{content:N,verbose:ar,isError:cr,isWarning:fr}=mr,{columns:x}=be(),[_]=dn(),pr=f(),b=Oe(Dj),ur=ar||pr,I;if(p[0]!==N||p[1]!==_)I=nDt(M(N),_),p[0]=N,p[1]=_,p[2]=I;else I=p[2];let a=I,T;bb0:{if(ur){let o;if(p[3]!==a)o=u(a),p[3]=a,p[4]=o;else o=p[4];T=o;break bb0}let o;if(p[5]!==x||p[6]!==a||p[7]!==b)o=u(Dmn(a,x,b)),p[5]=x,p[6]=a,p[7]=b,p[8]=o;else o=p[8];T=o}let O=T,F=cr?"error":fr?"warning":void 0,o;if(p[9]!==O)o=e(Dr,{children:O}),p[9]=O,p[10]=o;else o=p[10];let j;if(p[11]!==F||p[12]!==o)j=e(xe,{children:e(n,{color:F,children:o})}),p[11]=F,p[12]=o,p[13]=j;else j=p[13];return j}function u(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{tDt,nDt,Ey};
