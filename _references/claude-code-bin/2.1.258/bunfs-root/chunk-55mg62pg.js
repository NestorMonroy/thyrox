// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{lA,xR}from"/$bunfs/root/chunk-1ag0ee2m.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{rAn,d7e}from"/$bunfs/root/chunk-8qt7d28b.js";import{o,n}from"/$bunfs/root/chunk-tj5q8vxd.js";import{ef}from"/$bunfs/root/chunk-60p1kghv.js";import{F}from"/$bunfs/root/chunk-rhbkhtf4.js";import{e,r}from"/$bunfs/root/chunk-pbthxwmf.js";import{V,j}from"/$bunfs/root/chunk-db688wrz.js";import{N}from"/$bunfs/root/chunk-tb0rqh1q.js";import{p}from"/$bunfs/root/chunk-6zavqkd2.js";var P="cyan_FOR_SUBAGENTS_ONLY";function VS(t){if(!t)return P;if(xR(t))return lA[t];return`ansi:${t}`}j();var R={keyCase:"lower"};function BU(K){let i=y(18),{displayName:_,count:h,addMargin:G,fallbackLabel:O,body:a}=K,k=h===void 0?1:h,Q=G===void 0?!0:G,x=ef("app:toggleTranscript","Global","ctrl+o"),S;if(i[0]!==_||i[1]!==O)S=d7e(_)||O,i[0]=_,i[1]=O,i[2]=S;else S=i[2];let C=S,B;if(i[3]!==a)B=a?rAn(a):"",i[3]=a,i[4]=B;else B=i[4];let m=B;const E=Q?1:0;let H;if(i[5]===p)H=r(n,{"aria-hidden":!0,children:[N.pointerSmall," "]}),i[5]=H;else H=i[5];const u=k===1?"Message":`${k} messages`;let f;if(i[6]!==m)f=m?r(n,{italic:!0,children:[": ",m]}):"",i[6]=m,i[7]=f;else f=i[7];let c;if(i[8]!==x)c=e(F,{chord:x,action:"expand",parens:!0,format:R}),i[8]=x,i[9]=c;else c=i[9];let T;if(i[10]!==C||i[11]!==u||i[12]!==f||i[13]!==c)T=r(n,{dimColor:!0,children:[H,u," from @",C,f," ",c]}),i[10]=C,i[11]=u,i[12]=f,i[13]=c,i[14]=T;else T=i[14];let U;if(i[15]!==T||i[16]!==E)U=e(o,{marginTop:E,children:T}),i[15]=T,i[16]=E,i[17]=U;else U=i[17];return U}
export{VS,BU};
