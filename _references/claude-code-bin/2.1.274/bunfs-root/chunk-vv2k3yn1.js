// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{pC,LO}from"/$bunfs/root/chunk-5mzvkfyk.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{Xht,kJn}from"/$bunfs/root/chunk-27bj2wbx.js";import{s,n}from"/$bunfs/root/chunk-x41kazpn.js";import{Pu}from"/$bunfs/root/chunk-w4701qrk.js";import{D}from"/$bunfs/root/chunk-d82c5e8g.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";import{N}from"/$bunfs/root/chunk-x7szm81w.js";import{X,L}from"/$bunfs/root/chunk-s59wj17y.js";import{y}from"/$bunfs/root/chunk-3z5w4bh8.js";var P="cyan_FOR_SUBAGENTS_ONLY";function UE(o){if(!o)return P;if(LO(o))return pC[o];return`ansi:${o}`}L();var u={keyCase:"lower"};function Nq(Q){let t=S(18),{displayName:l,count:h,addMargin:G,fallbackLabel:_,body:a}=Q,k=h===void 0?1:h,V=G===void 0?!0:G,O=Pu("app:toggleTranscript","Global","ctrl+o"),B;if(t[0]!==l||t[1]!==_)B=Xht(l)||_,t[0]=l,t[1]=_,t[2]=B;else B=t[2];let x=B,F;if(t[3]!==a)F=a?kJn(a):"",t[3]=a,t[4]=F;else F=t[4];let p=F;const C=V?1:0;let H;if(t[5]===y)H=r(n,{"aria-hidden":!0,children:[N.pointerSmall," "]}),t[5]=H;else H=t[5];const E=k===1?"Message":`${k} messages`;let m;if(t[6]!==p)m=p?r(n,{italic:!0,children:[": ",p]}):"",t[6]=p,t[7]=m;else m=t[7];let f;if(t[8]!==O)f=e(D,{chord:O,action:"expand",parens:!0,format:u}),t[8]=O,t[9]=f;else f=t[9];let c;if(t[10]!==x||t[11]!==E||t[12]!==m||t[13]!==f)c=r(n,{dimColor:!0,children:[H,E," from @",x,m," ",f]}),t[10]=x,t[11]=E,t[12]=m,t[13]=f,t[14]=c;else c=t[14];let U;if(t[15]!==c||t[16]!==C)U=e(s,{marginTop:C,children:c}),t[15]=c,t[16]=C,t[17]=U;else U=t[17];return U}
export{UE,Nq};
