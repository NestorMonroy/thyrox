// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{bI,uN}from"/$bunfs/root/chunk-1z65s61j.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{ZMt,nOr}from"/$bunfs/root/chunk-2c4t9j03.js";import{s,n}from"/$bunfs/root/chunk-29mppvsc.js";import{Rd}from"/$bunfs/root/chunk-98pg3yjn.js";import{F}from"/$bunfs/root/chunk-c31k524r.js";import{e,r}from"/$bunfs/root/chunk-rygnxyqy.js";import{X}from"/$bunfs/root/chunk-g30jw8yf.js";import{J,D}from"/$bunfs/root/chunk-cvh5tjew.js";import{b}from"/$bunfs/root/chunk-j14wpeqn.js";var v="cyan_FOR_SUBAGENTS_ONLY";function mA(a){if(!a)return v;if(uN(a))return bI[a];return`ansi:${a}`}D();var _={keyCase:"lower"};function F3(a){let o=w(19),{displayName:f,qualifier:k,count:M,addMargin:R,fallbackLabel:c,body:t}=a,h=M===void 0?1:M,U=R===void 0?!0:R,u=Rd("app:toggleTranscript","Global","ctrl+o"),A;if(o[0]!==f||o[1]!==c)A=ZMt(f)||c,o[0]=f,o[1]=c,o[2]=A;else A=o[2];let g=A,P;if(o[3]!==t)P=t?nOr(t):"",o[3]=t,o[4]=P;else P=o[4];let i=P;const y=U?1:0;let q;if(o[5]===b)q=r(n,{"aria-hidden":!0,children:[X.pointerSmall," "]}),o[5]=q;else q=o[5];const T=h===1?"Message":`${h} messages`,N=k?` (${k})`:"";let p;if(o[6]!==i)p=i?r(n,{italic:!0,children:[": ",i]}):"",o[6]=i,o[7]=p;else p=o[7];let l;if(o[8]!==u)l=e(F,{chord:u,action:"expand",parens:!0,format:_}),o[8]=u,o[9]=l;else l=o[9];let m;if(o[10]!==g||o[11]!==l||o[12]!==T||o[13]!==N||o[14]!==p)m=r(n,{dimColor:!0,children:[q,T," from @",g,N,p," ",l]}),o[10]=g,o[11]=l,o[12]=T,o[13]=N,o[14]=p,o[15]=m;else m=o[15];let G;if(o[16]!==m||o[17]!==y)G=e(s,{marginTop:y,children:m}),o[16]=m,o[17]=y,o[18]=G;else G=o[18];return G}
export{mA,F3};
