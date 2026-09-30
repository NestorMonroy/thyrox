// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{sI,VL}from"/$bunfs/root/chunk-tb73cqmq.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{AOt,WRr}from"/$bunfs/root/chunk-jcesa5j7.js";import{s,n}from"/$bunfs/root/chunk-b8sc2vbx.js";import{Vd}from"/$bunfs/root/chunk-q6xny90h.js";import{N}from"/$bunfs/root/chunk-v3qag9kb.js";import{e,r}from"/$bunfs/root/chunk-srmsc891.js";import{X}from"/$bunfs/root/chunk-7grzwhk6.js";import{J,D}from"/$bunfs/root/chunk-av0brfrs.js";import{_}from"/$bunfs/root/chunk-0dapr5gw.js";var S="cyan_FOR_SUBAGENTS_ONLY";function QT(a){if(!a)return S;if(VL(a))return sI[a];return`ansi:${a}`}D();var x={keyCase:"lower"};function e3(a){let o=w(19),{displayName:f,qualifier:M,count:R,addMargin:h,fallbackLabel:c,body:t}=a,A=R===void 0?1:R,U=h===void 0?!0:h,b=Vd("app:toggleTranscript","Global","ctrl+o"),P;if(o[0]!==f||o[1]!==c)P=AOt(f)||c,o[0]=f,o[1]=c,o[2]=P;else P=o[2];let u=P,q;if(o[3]!==t)q=t?WRr(t):"",o[3]=t,o[4]=q;else q=o[4];let i=q;const g=U?1:0;let G;if(o[5]===_)G=r(n,{"aria-hidden":!0,children:[X.pointerSmall," "]}),o[5]=G;else G=o[5];const y=A===1?"Message":`${A} messages`,T=M?` (${M})`:"";let p;if(o[6]!==i)p=i?r(n,{italic:!0,children:[": ",i]}):"",o[6]=i,o[7]=p;else p=o[7];let l;if(o[8]!==b)l=e(N,{chord:b,action:"expand",parens:!0,format:x}),o[8]=b,o[9]=l;else l=o[9];let m;if(o[10]!==u||o[11]!==l||o[12]!==y||o[13]!==T||o[14]!==p)m=r(n,{dimColor:!0,children:[G,y," from @",u,T,p," ",l]}),o[10]=u,o[11]=l,o[12]=y,o[13]=T,o[14]=p,o[15]=m;else m=o[15];let v;if(o[16]!==m||o[17]!==g)v=e(s,{marginTop:g,children:m}),o[16]=m,o[17]=g,o[18]=v;else v=o[18];return v}
export{QT,e3};
