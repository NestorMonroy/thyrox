// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{JCn}from"/$bunfs/root/chunk-h033djce.js";import{ZVt,eKt}from"/$bunfs/root/chunk-q77993h4.js";import{s,n}from"/$bunfs/root/chunk-x41kazpn.js";import{e2e}from"/$bunfs/root/chunk-q0kdxhfn.js";import{nU}from"/$bunfs/root/chunk-n38s302r.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";function L(){return!1}function uR(i){let o=JCn(),d=e2e()?.isQueued===!0;return!i&&!o&&!d&&L()}function rce(p){let l=S(25),{tone:u,text:R,detail:C,subLines:D,linkify:X}=p,t=X?nU:n,V=p.state==="live"&&!p.reducedMotion?eKt[p.frame%eKt.length]:ZVt,f=u==="gold"?"warning":u==="red"?"error":void 0,a=u==="dim";const v=u==="red"?"error:":u==="gold"?"warning:":void 0;let g;if(l[0]!==f||l[1]!==a||l[2]!==V||l[3]!==v)g=r(n,{"aria-hidden":a,"aria-label":v,italic:!0,color:f,dimColor:a,children:[V," "]}),l[0]=f,l[1]=a,l[2]=V,l[3]=v,l[4]=g;else g=l[4];let b;if(l[5]!==t||l[6]!==R)b=e(t,{children:R}),l[5]=t,l[6]=R,l[7]=b;else b=l[7];let T;if(l[8]!==t||l[9]!==C)T=C!==void 0&&r(n,{dimColor:!0,children:[" \xB7 ",e(t,{children:C})]}),l[8]=t,l[9]=C,l[10]=T;else T=l[10];let _;if(l[11]!==f||l[12]!==a||l[13]!==b||l[14]!==T)_=r(n,{italic:!0,color:f,dimColor:a,children:[b,T]}),l[11]=f,l[12]=a,l[13]=b,l[14]=T,l[15]=_;else _=l[15];let E;if(l[16]!==t||l[17]!==D)E=D?.map((Y,Z)=>e(n,{dimColor:!0,children:e(t,{children:Y})},Z)),l[16]=t,l[17]=D,l[18]=E;else E=l[18];let y;if(l[19]!==_||l[20]!==E)y=r(s,{flexDirection:"column",flexGrow:1,children:[_,E]}),l[19]=_,l[20]=E,l[21]=y;else y=l[21];let h;if(l[22]!==g||l[23]!==y)h=r(s,{flexDirection:"row",children:[g,y]}),l[22]=g,l[23]=y,l[24]=h;else h=l[24];return h}
export{rce,uR};
