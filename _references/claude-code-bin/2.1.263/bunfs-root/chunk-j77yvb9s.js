// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{be}from"/$bunfs/root/chunk-3hqchk2p.js";import{S,V}from"/$bunfs/root/chunk-mh9y4c2z.js";import{U_e}from"/$bunfs/root/chunk-850xskm4.js";import{cn}from"/$bunfs/root/chunk-rx3ttece.js";import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{t,jr}from"/$bunfs/root/chunk-ne2fkdm9.js";import{Re}from"/$bunfs/root/chunk-5ecc20p7.js";import{IU}from"/$bunfs/root/chunk-ygpdnc29.js";import{Jg}from"/$bunfs/root/chunk-b3c4dwfy.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{Qt,De,q,F}from"/$bunfs/root/chunk-1c6mq242.js";import{$un}from"/$bunfs/root/chunk-9wa0ka8p.js";F();F();F();var c=Qt(!1);function iPt(J){let U=y(2),{children:h}=J,E;if(U[0]!==h)E=e(c.Provider,{value:!0,children:h}),U[0]=h,U[1]=E;else E=U[1];return E}function f(){return De(c)}function C(r){try{let i=V(r),s=S(i),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return S(i,null,2)}catch{return r}}var H=1e4;function M(r){if(r.length>H)return r;return r.split(`
`).map(C).join(`
`)}var X=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,k=1e5;function aPt(r,i){if(r.length>k)return r;let s=(o)=>o.replace(X,(m)=>Jg(m,void 0,{themeName:i}));if(!r.includes(U_e))return s(r);return r.split(`
`).map((o)=>o.includes(U_e)?o:s(o)).join(`
`)}function sy(mr){let p=y(14),{content:N,verbose:ar,isError:cr,isWarning:fr}=mr,{columns:x}=be(),[_]=cn(),pr=f(),b=De(IU),ur=ar||pr,I;if(p[0]!==N||p[1]!==_)I=aPt(M(N),_),p[0]=N,p[1]=_,p[2]=I;else I=p[2];let a=I,T;bb0:{if(ur){let n;if(p[3]!==a)n=u(a),p[3]=a,p[4]=n;else n=p[4];T=n;break bb0}let n;if(p[5]!==x||p[6]!==a||p[7]!==b)n=u($un(a,x,b)),p[5]=x,p[6]=a,p[7]=b,p[8]=n;else n=p[8];T=n}let L=T,O=cr?"error":fr?"warning":void 0,n;if(p[9]!==L)n=e(jr,{children:L}),p[9]=L,p[10]=n;else n=p[10];let j;if(p[11]!==O||p[12]!==n)j=e(Re,{children:e(t,{color:O,children:n})}),p[11]=O,p[12]=n,p[13]=j;else j=p[13];return j}function u(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{iPt,aPt,sy};
