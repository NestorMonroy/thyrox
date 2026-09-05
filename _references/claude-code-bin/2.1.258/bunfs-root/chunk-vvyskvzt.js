// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{SH}from"/$bunfs/root/chunk-27c00td1.js";import{wi}from"/$bunfs/root/chunk-ctshp37x.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{n}from"/$bunfs/root/chunk-tj5q8vxd.js";import{e,r}from"/$bunfs/root/chunk-pbthxwmf.js";import{ln}from"/$bunfs/root/chunk-6zavqkd2.js";var p=[" ","\u258F","\u258E","\u258D","\u258C","\u258B","\u258A","\u2589","\u2588"],x={fill:"\u25B0",empty:"\u25B1"},A={fill:"\u2588",empty:"\u2591"},S=()=>SH.hasGeometricShapesInkBleedBug()?A:x,T=(a)=>Math.min(1,Math.max(0,a)),B=(a,o)=>{let t=Math.floor(a*o),s=[wi(p.at(-1),t)];if(t<o){let f=a*o-t,m=Math.floor(f*(p.length-1));s.push(p[m]);let l=o-t-1;if(l>0)s.push(p[0].repeat(l))}return s.join("")};function O_(q){let E=y(17),{ratio:g,width:c,fillColor:L,emptyColor:i,variant:I}=q,k=I===void 0?"block":I,u,h,P,b,d,C;if(E[0]!==i||E[1]!==L||E[2]!==g||E[3]!==k||E[4]!==c){C=ln;bb0:{let M=T(g);if(k==="pill"){let{fill:v,empty:K}=S();let H=Math.round(M*c);C=r(n,{children:[e(n,{color:L,children:wi(v,H)}),e(n,{color:i,dimColor:i===void 0,children:wi(K,c-H)})]});break bb0}u=n;h=L;P=i;b=`${Math.round(M*100)}%`;d=B(M,c)}E[0]=i,E[1]=L,E[2]=g,E[3]=k,E[4]=c,E[5]=u,E[6]=h,E[7]=P,E[8]=b,E[9]=d,E[10]=C}else u=E[5],h=E[6],P=E[7],b=E[8],d=E[9],C=E[10];if(C!==ln)return C;let Y;if(E[11]!==u||E[12]!==h||E[13]!==P||E[14]!==b||E[15]!==d)Y=e(u,{color:h,backgroundColor:P,"aria-label":b,children:d}),E[11]=u,E[12]=h,E[13]=P,E[14]=b,E[15]=d,E[16]=Y;else Y=E[16];return Y}
export{O_};
