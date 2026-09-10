// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{VE,EI}from"/$bunfs/root/chunk-78e0pwfv.js";import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{okn,vQe}from"/$bunfs/root/chunk-hyqdn9c0.js";import{o,t}from"/$bunfs/root/chunk-fqnz5baq.js";import{dc}from"/$bunfs/root/chunk-1mkjay4g.js";import{D}from"/$bunfs/root/chunk-v1wwzp7y.js";import{e,r}from"/$bunfs/root/chunk-gbn257vp.js";import{q,F}from"/$bunfs/root/chunk-gwyyj914.js";import{M}from"/$bunfs/root/chunk-p20syc8v.js";import{f}from"/$bunfs/root/chunk-934z9d80.js";var P="cyan_FOR_SUBAGENTS_ONLY";function BS(n){if(!n)return P;if(EI(n))return VE[n];return`ansi:${n}`}F();var R={keyCase:"lower"};function kU(Q){let i=y(18),{displayName:_,count:h,addMargin:G,fallbackLabel:O,body:a}=Q,k=h===void 0?1:h,V=G===void 0?!0:G,x=dc("app:toggleTranscript","Global","ctrl+o"),S;if(i[0]!==_||i[1]!==O)S=vQe(_)||O,i[0]=_,i[1]=O,i[2]=S;else S=i[2];let C=S,B;if(i[3]!==a)B=a?okn(a):"",i[3]=a,i[4]=B;else B=i[4];let p=B;const E=V?1:0;let H;if(i[5]===f)H=r(t,{"aria-hidden":!0,children:[M.pointerSmall," "]}),i[5]=H;else H=i[5];const u=k===1?"Message":`${k} messages`;let m;if(i[6]!==p)m=p?r(t,{italic:!0,children:[": ",p]}):"",i[6]=p,i[7]=m;else m=i[7];let c;if(i[8]!==x)c=e(D,{chord:x,action:"expand",parens:!0,format:R}),i[8]=x,i[9]=c;else c=i[9];let T;if(i[10]!==C||i[11]!==u||i[12]!==m||i[13]!==c)T=r(t,{dimColor:!0,children:[H,u," from @",C,m," ",c]}),i[10]=C,i[11]=u,i[12]=m,i[13]=c,i[14]=T;else T=i[14];let U;if(i[15]!==T||i[16]!==E)U=e(o,{marginTop:E,children:T}),i[15]=T,i[16]=E,i[17]=U;else U=i[17];return U}
export{BS,kU};
