// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{KHn}from"/$bunfs/root/chunk-y5128fce.js";import{iWe}from"/$bunfs/root/chunk-s62zxyad.js";import{y6t,_6t}from"/$bunfs/root/chunk-q8sknw7e.js";import{s,n}from"/$bunfs/root/chunk-0hefd0r9.js";import{FU}from"/$bunfs/root/chunk-zjke0045.js";import{e,r}from"/$bunfs/root/chunk-4m6y8tt1.js";function L(){return!1}function DR(i){let o=KHn(),d=iWe()?.isQueued===!0;return!i&&!o&&!d&&L()}function mue(p){let l=w(25),{tone:u,text:R,detail:C,subLines:D,linkify:X}=p,t=X?FU:n,V=p.state==="live"&&!p.reducedMotion?_6t[p.frame%_6t.length]:y6t,f=u==="gold"?"warning":u==="red"?"error":void 0,a=u==="dim";const v=u==="red"?"error:":u==="gold"?"warning:":void 0;let g;if(l[0]!==f||l[1]!==a||l[2]!==V||l[3]!==v)g=r(n,{"aria-hidden":a,"aria-label":v,italic:!0,color:f,dimColor:a,children:[V," "]}),l[0]=f,l[1]=a,l[2]=V,l[3]=v,l[4]=g;else g=l[4];let b;if(l[5]!==t||l[6]!==R)b=e(t,{children:R}),l[5]=t,l[6]=R,l[7]=b;else b=l[7];let T;if(l[8]!==t||l[9]!==C)T=C!==void 0&&r(n,{dimColor:!0,children:[" \xB7 ",e(t,{children:C})]}),l[8]=t,l[9]=C,l[10]=T;else T=l[10];let _;if(l[11]!==f||l[12]!==a||l[13]!==b||l[14]!==T)_=r(n,{italic:!0,color:f,dimColor:a,children:[b,T]}),l[11]=f,l[12]=a,l[13]=b,l[14]=T,l[15]=_;else _=l[15];let E;if(l[16]!==t||l[17]!==D)E=D?.map((Y,Z)=>e(n,{dimColor:!0,children:e(t,{children:Y})},Z)),l[16]=t,l[17]=D,l[18]=E;else E=l[18];let y;if(l[19]!==_||l[20]!==E)y=r(s,{flexDirection:"column",flexGrow:1,children:[_,E]}),l[19]=_,l[20]=E,l[21]=y;else y=l[21];let h;if(l[22]!==g||l[23]!==y)h=r(s,{flexDirection:"row",children:[g,y]}),l[22]=g,l[23]=y,l[24]=h;else h=l[24];return h}
export{mue,DR};
