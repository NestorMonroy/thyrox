// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{oP,v$}from"/$bunfs/root/chunk-ex4n0jxy.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{oFt,aFt}from"/$bunfs/root/chunk-q8a07cv0.js";import{s,n}from"/$bunfs/root/chunk-mtq6m3s7.js";import{Hc}from"/$bunfs/root/chunk-sheqk5kt.js";import{F}from"/$bunfs/root/chunk-1t4xwezf.js";import{e,r}from"/$bunfs/root/chunk-s81ftaa6.js";import{Z}from"/$bunfs/root/chunk-yzk2pa6b.js";import{X,L}from"/$bunfs/root/chunk-8fdrzdn0.js";import{S}from"/$bunfs/root/chunk-ghttqp33.js";var v="cyan_FOR_SUBAGENTS_ONLY";function FA(a){if(!a)return v;if(v$(a))return oP[a];return`ansi:${a}`}L();var N={keyCase:"lower"};function mY(a){let o=w(19),{displayName:f,qualifier:k,count:M,addMargin:R,fallbackLabel:c,body:t}=a,h=M===void 0?1:M,D=R===void 0?!0:R,b=Hc("app:toggleTranscript","Global","ctrl+o"),A;if(o[0]!==f||o[1]!==c)A=oFt(f)||c,o[0]=f,o[1]=c,o[2]=A;else A=o[2];let u=A,P;if(o[3]!==t)P=t?aFt(t):"",o[3]=t,o[4]=P;else P=o[4];let i=P;const g=D?1:0;let q;if(o[5]===S)q=r(n,{"aria-hidden":!0,children:[Z.pointerSmall," "]}),o[5]=q;else q=o[5];const y=h===1?"Message":`${h} messages`,T=k?` (${k})`:"";let p;if(o[6]!==i)p=i?r(n,{italic:!0,children:[": ",i]}):"",o[6]=i,o[7]=p;else p=o[7];let l;if(o[8]!==b)l=e(F,{chord:b,action:"expand",parens:!0,format:N}),o[8]=b,o[9]=l;else l=o[9];let m;if(o[10]!==u||o[11]!==l||o[12]!==y||o[13]!==T||o[14]!==p)m=r(n,{dimColor:!0,children:[q,y," from @",u,T,p," ",l]}),o[10]=u,o[11]=l,o[12]=y,o[13]=T,o[14]=p,o[15]=m;else m=o[15];let G;if(o[16]!==m||o[17]!==g)G=e(s,{marginTop:g,children:m}),o[16]=m,o[17]=g,o[18]=G;else G=o[18];return G}
export{FA,mY};
