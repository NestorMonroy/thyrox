// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{EE}from"/$bunfs/root/chunk-0qq5n111.js";import{xs}from"/$bunfs/root/chunk-4bbpt7sc.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{n}from"/$bunfs/root/chunk-0hefd0r9.js";import{e,r}from"/$bunfs/root/chunk-4m6y8tt1.js";import{ln}from"/$bunfs/root/chunk-sr6jf0k1.js";var p=[" ","\u258F","\u258E","\u258D","\u258C","\u258B","\u258A","\u2589","\u2588"],Y={fill:"\u25B0",empty:"\u25B1"},x={fill:"\u2588",empty:"\u2591"},M=()=>EE.hasGeometricShapesInkBleedBug()?x:Y,S=(a)=>Math.min(1,Math.max(0,a)),T=(a,o)=>{let t=Math.floor(a*o),s=[xs(p.at(-1),t)];if(t<o){let f=a*o-t,m=Math.floor(f*(p.length-1));s.push(p[m]);let l=o-t-1;if(l>0)s.push(p[0].repeat(l))}return s.join("")};function HS(j){let I=w(17),{ratio:_,width:c,fillColor:L,emptyColor:i,variant:G}=j,g=G===void 0?"block":G,u,h,P,y,b,k;if(I[0]!==i||I[1]!==L||I[2]!==_||I[3]!==g||I[4]!==c){k=ln;bb0:{let C=S(_);if(g==="pill"){let{fill:q,empty:v}=M();let E=Math.round(C*c);k=r(n,{children:[e(n,{color:L,children:xs(q,E)}),e(n,{color:i,dimColor:i===void 0,children:xs(v,c-E)})]});break bb0}u=n;h=L;P=i;y=`${Math.round(C*100)}%`;b=T(C,c)}I[0]=i,I[1]=L,I[2]=_,I[3]=g,I[4]=c,I[5]=u,I[6]=h,I[7]=P,I[8]=y,I[9]=b,I[10]=k}else u=I[5],h=I[6],P=I[7],y=I[8],b=I[9],k=I[10];if(k!==ln)return k;let H;if(I[11]!==u||I[12]!==h||I[13]!==P||I[14]!==y||I[15]!==b)H=e(u,{color:h,backgroundColor:P,"aria-label":y,children:b}),I[11]=u,I[12]=h,I[13]=P,I[14]=y,I[15]=b,I[16]=H;else H=I[16];return H}
export{HS};
