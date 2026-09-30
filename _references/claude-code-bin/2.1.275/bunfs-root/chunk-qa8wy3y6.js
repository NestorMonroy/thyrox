// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{UC,lM}from"/$bunfs/root/chunk-jbg7raey.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{zbt,_nr}from"/$bunfs/root/chunk-xbd48fav.js";import{s,n}from"/$bunfs/root/chunk-0hefd0r9.js";import{$u}from"/$bunfs/root/chunk-ynsqtb2t.js";import{L}from"/$bunfs/root/chunk-8sph2m8x.js";import{e,r}from"/$bunfs/root/chunk-4m6y8tt1.js";import{N}from"/$bunfs/root/chunk-dbb7kahj.js";import{X,D}from"/$bunfs/root/chunk-347kpssc.js";import{y}from"/$bunfs/root/chunk-sr6jf0k1.js";var P="cyan_FOR_SUBAGENTS_ONLY";function yk(o){if(!o)return P;if(lM(o))return UC[o];return`ansi:${o}`}D();var u={keyCase:"lower"};function pV(Q){let t=w(18),{displayName:l,count:h,addMargin:G,fallbackLabel:_,body:a}=Q,k=h===void 0?1:h,V=G===void 0?!0:G,O=$u("app:toggleTranscript","Global","ctrl+o"),S;if(t[0]!==l||t[1]!==_)S=zbt(l)||_,t[0]=l,t[1]=_,t[2]=S;else S=t[2];let x=S,B;if(t[3]!==a)B=a?_nr(a):"",t[3]=a,t[4]=B;else B=t[4];let p=B;const C=V?1:0;let F;if(t[5]===y)F=r(n,{"aria-hidden":!0,children:[N.pointerSmall," "]}),t[5]=F;else F=t[5];const E=k===1?"Message":`${k} messages`;let m;if(t[6]!==p)m=p?r(n,{italic:!0,children:[": ",p]}):"",t[6]=p,t[7]=m;else m=t[7];let f;if(t[8]!==O)f=e(L,{chord:O,action:"expand",parens:!0,format:u}),t[8]=O,t[9]=f;else f=t[9];let c;if(t[10]!==x||t[11]!==E||t[12]!==m||t[13]!==f)c=r(n,{dimColor:!0,children:[F,E," from @",x,m," ",f]}),t[10]=x,t[11]=E,t[12]=m,t[13]=f,t[14]=c;else c=t[14];let H;if(t[15]!==c||t[16]!==C)H=e(s,{marginTop:C,children:c}),t[15]=c,t[16]=C,t[17]=H;else H=t[17];return H}
export{yk,pV};
