// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{kk,pP}from"/$bunfs/root/chunk-p1w3e187.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{xIn,ttt}from"/$bunfs/root/chunk-btbsn9s4.js";import{o,n}from"/$bunfs/root/chunk-5zps47bf.js";import{_c}from"/$bunfs/root/chunk-b9bahykk.js";import{O}from"/$bunfs/root/chunk-6p8jfbh3.js";import{e,r}from"/$bunfs/root/chunk-zhg3ync1.js";import{q,L}from"/$bunfs/root/chunk-v21q572m.js";import{D}from"/$bunfs/root/chunk-y1keqvk9.js";import{p}from"/$bunfs/root/chunk-7sg5wrey.js";var h="cyan_FOR_SUBAGENTS_ONLY";function pw(t){if(!t)return h;if(pP(t))return kk[t];return`ansi:${t}`}L();var N={keyCase:"lower"};function Mj(Q){let i=y(18),{displayName:_,count:G,addMargin:k,fallbackLabel:x,body:a}=Q,S=G===void 0?1:G,V=k===void 0?!0:k,C=_c("app:toggleTranscript","Global","ctrl+o"),B;if(i[0]!==_||i[1]!==x)B=ttt(_)||x,i[0]=_,i[1]=x,i[2]=B;else B=i[2];let E=B,F;if(i[3]!==a)F=a?xIn(a):"",i[3]=a,i[4]=F;else F=i[4];let m=F;const u=V?1:0;let H;if(i[5]===p)H=r(n,{"aria-hidden":!0,children:[D.pointerSmall," "]}),i[5]=H;else H=i[5];const R=S===1?"Message":`${S} messages`;let f;if(i[6]!==m)f=m?r(n,{italic:!0,children:[": ",m]}):"",i[6]=m,i[7]=f;else f=i[7];let c;if(i[8]!==C)c=e(O,{chord:C,action:"expand",parens:!0,format:N}),i[8]=C,i[9]=c;else c=i[9];let T;if(i[10]!==E||i[11]!==R||i[12]!==f||i[13]!==c)T=r(n,{dimColor:!0,children:[H,R," from @",E,f," ",c]}),i[10]=E,i[11]=R,i[12]=f,i[13]=c,i[14]=T;else T=i[14];let U;if(i[15]!==T||i[16]!==u)U=e(o,{marginTop:u,children:T}),i[15]=T,i[16]=u,i[17]=U;else U=i[17];return U}
export{pw,Mj};
