// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{SA,YR}from"/$bunfs/root/chunk-11mcqc6q.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{tTn,UQe}from"/$bunfs/root/chunk-x722nt0q.js";import{o,n}from"/$bunfs/root/chunk-h8z84shc.js";import{cf}from"/$bunfs/root/chunk-4jxzmesc.js";import{F}from"/$bunfs/root/chunk-aejk3fcb.js";import{e,r}from"/$bunfs/root/chunk-g3erx2ps.js";import{K,j}from"/$bunfs/root/chunk-w71cs9yg.js";import{N}from"/$bunfs/root/chunk-zbjsms1x.js";import{p}from"/$bunfs/root/chunk-qyvz15br.js";var P="cyan_FOR_SUBAGENTS_ONLY";function tH(t){if(!t)return P;if(YR(t))return SA[t];return`ansi:${t}`}j();var R={keyCase:"lower"};function aj(Q){let i=y(18),{displayName:_,count:h,addMargin:G,fallbackLabel:O,body:a}=Q,k=h===void 0?1:h,V=G===void 0?!0:G,x=cf("app:toggleTranscript","Global","ctrl+o"),S;if(i[0]!==_||i[1]!==O)S=UQe(_)||O,i[0]=_,i[1]=O,i[2]=S;else S=i[2];let C=S,B;if(i[3]!==a)B=a?tTn(a):"",i[3]=a,i[4]=B;else B=i[4];let m=B;const E=V?1:0;let H;if(i[5]===p)H=r(n,{"aria-hidden":!0,children:[N.pointerSmall," "]}),i[5]=H;else H=i[5];const u=k===1?"Message":`${k} messages`;let f;if(i[6]!==m)f=m?r(n,{italic:!0,children:[": ",m]}):"",i[6]=m,i[7]=f;else f=i[7];let c;if(i[8]!==x)c=e(F,{chord:x,action:"expand",parens:!0,format:R}),i[8]=x,i[9]=c;else c=i[9];let T;if(i[10]!==C||i[11]!==u||i[12]!==f||i[13]!==c)T=r(n,{dimColor:!0,children:[H,u," from @",C,f," ",c]}),i[10]=C,i[11]=u,i[12]=f,i[13]=c,i[14]=T;else T=i[14];let U;if(i[15]!==T||i[16]!==E)U=e(o,{marginTop:E,children:T}),i[15]=T,i[16]=E,i[17]=U;else U=i[17];return U}
export{tH,aj};
