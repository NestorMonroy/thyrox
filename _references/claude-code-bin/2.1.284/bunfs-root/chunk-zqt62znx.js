// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Cyn,Ryn}from"/$bunfs/root/chunk-e1ahn80a.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{cQe}from"/$bunfs/root/chunk-hyfr1bxs.js";import{dQe}from"/$bunfs/root/chunk-kr7ct3ay.js";import{s,n}from"/$bunfs/root/chunk-gjfhbdvy.js";import{iW}from"/$bunfs/root/chunk-5pz9emjp.js";import{e,r}from"/$bunfs/root/chunk-fr6qx5c3.js";var Woe=2;function Vkn(){return!1}function fw(l){let o=cQe(),f=dQe()?.isQueued===!0;return!l&&!o&&!f&&Vkn()}function BSe(l){let a=w(25),{tone:o,text:f,detail:m,subLines:x,linkify:h}=l,t=h?iW:n,A=l.state==="live"&&!l.reducedMotion?Ryn[l.frame%Ryn.length]:Cyn,d=o==="gold"?"warning":o==="red"?"error":void 0,i=o==="dim";const R=o==="red"?"error:":o==="gold"?"warning:":void 0;let c;if(a[0]!==d||a[1]!==i||a[2]!==A||a[3]!==R)c=r(n,{"aria-hidden":i,"aria-label":R,italic:!0,color:d,dimColor:i,children:[A," "]}),a[0]=d,a[1]=i,a[2]=A,a[3]=R,a[4]=c;else c=a[4];let C;if(a[5]!==t||a[6]!==f)C=e(t,{children:f}),a[5]=t,a[6]=f,a[7]=C;else C=a[7];let T;if(a[8]!==t||a[9]!==m)T=m!==void 0&&r(n,{dimColor:!0,children:[" \xB7 ",e(t,{children:m})]}),a[8]=t,a[9]=m,a[10]=T;else T=a[10];let _;if(a[11]!==d||a[12]!==i||a[13]!==C||a[14]!==T)_=r(n,{italic:!0,color:d,dimColor:i,children:[C,T]}),a[11]=d,a[12]=i,a[13]=C,a[14]=T,a[15]=_;else _=a[15];let g;if(a[16]!==t||a[17]!==x)g=x?.map((M,B)=>e(n,{dimColor:!0,children:e(t,{children:M})},B)),a[16]=t,a[17]=x,a[18]=g;else g=a[18];let b;if(a[19]!==_||a[20]!==g)b=r(s,{flexDirection:"column",flexGrow:1,children:[_,g]}),a[19]=_,a[20]=g,a[21]=b;else b=a[21];let D;if(a[22]!==c||a[23]!==b)D=r(s,{flexDirection:"row",children:[c,b]}),a[22]=c,a[23]=b,a[24]=D;else D=a[24];return D}
export{BSe,Woe,Vkn,fw};
