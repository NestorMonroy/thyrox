// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{He}from"/$bunfs/root/chunk-tgjjqfz6.js";import{b,Y}from"/$bunfs/root/chunk-fzpv8ev5.js";import{obe}from"/$bunfs/root/chunk-2kd50vvr.js";import{yn}from"/$bunfs/root/chunk-tdg690ym.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{n,Yr}from"/$bunfs/root/chunk-h8z84shc.js";import{upn}from"/$bunfs/root/chunk-qpwbvc04.js";import{xe}from"/$bunfs/root/chunk-tz86qz5x.js";import{lj}from"/$bunfs/root/chunk-ndrag3s4.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{fh}from"/$bunfs/root/chunk-rqapqcqk.js";import{_n,ze,K,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();j();j();var c=_n(!1);function JPt(J){let U=y(2),{children:h}=J,A;if(U[0]!==h)A=e(c.Provider,{value:!0,children:h}),U[0]=h,U[1]=A;else A=U[1];return A}function f(){return ze(c)}function C(r){try{let i=Y(r),s=b(i),t=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(t!==m)return r;return b(i,null,2)}catch{return r}}var H=1e4;function F(r){if(r.length>H)return r;return r.split(`
`).map(C).join(`
`)}var X=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,k=1e5;function QPt(r,i){if(r.length>k)return r;let s=(t)=>t.replace(X,(m)=>fh(m,void 0,{themeName:i}));if(!r.includes(obe))return s(r);return r.split(`
`).map((t)=>t.includes(obe)?t:s(t)).join(`
`)}function Hy(mr){let p=y(14),{content:N,verbose:ar,isError:cr,isWarning:fr}=mr,{columns:x}=He(),[_]=yn(),pr=f(),T=ze(lj),ur=ar||pr,E;if(p[0]!==N||p[1]!==_)E=QPt(F(N),_),p[0]=N,p[1]=_,p[2]=E;else E=p[2];let a=E,L;bb0:{if(ur){let o;if(p[3]!==a)o=u(a),p[3]=a,p[4]=o;else o=p[4];L=o;break bb0}let o;if(p[5]!==x||p[6]!==a||p[7]!==T)o=u(upn(a,x,T)),p[5]=x,p[6]=a,p[7]=T,p[8]=o;else o=p[8];L=o}let O=L,S=cr?"error":fr?"warning":void 0,o;if(p[9]!==O)o=e(Yr,{children:O}),p[9]=O,p[10]=o;else o=p[10];let I;if(p[11]!==S||p[12]!==o)I=e(xe,{children:e(n,{color:S,children:o})}),p[11]=S,p[12]=o,p[13]=I;else I=p[13];return I}function u(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{JPt,QPt,Hy};
