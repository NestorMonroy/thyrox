// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{M}from"/$bunfs/root/chunk-gh1pqen9.js";import{kbn}from"/$bunfs/root/chunk-5rndj9dj.js";import{Xjt}from"/$bunfs/root/chunk-0qq5n111.js";import{vxt,vWe}from"/$bunfs/root/chunk-carmz1jg.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{uJ}from"/$bunfs/root/chunk-zcd4h2zw.js";import{r$e,tM}from"/$bunfs/root/chunk-2ekqm7br.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{HDt,vVe,Bat}from"/$bunfs/root/chunk-te0y774k.js";import{A,g,D}from"/$bunfs/root/chunk-347kpssc.js";import{y}from"/$bunfs/root/chunk-sr6jf0k1.js";D();var h={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function Lhr(r,o,n){if(!n)return;let t;if(r==="auto"){if(o===void 0)return;t=o}else t=Bat(r);return Xjt(t)?h.light:h.dark}function m(){let S=w(4),[u,I]=g(HDt),R,k;if(S[0]===y)R=()=>vVe(()=>I(HDt())),k=[],S[0]=R,S[1]=k;else R=S[0],k=S[1];A(R,k);let E;if(S[2]!==u)E=Lhr(vxt(),u,kbn()),S[2]=u,S[3]=E;else E=S[3];return E}function g9t(O){let T=w(9),{children:l,mouseTracking:p,killRing:s}=O,c=m(),N;if(T[0]!==l||T[1]!==s)N=e(vWe,{handle:s,children:l}),T[0]=l,T[1]=s,T[2]=N;else N=T[2];let i=N;if(r$e()){let f;if(T[3]!==p)f=p??tM(),T[3]=p,T[4]=f;else f=T[4];let _;if(T[5]!==c||T[6]!==f||T[7]!==i)_=e(uJ,{mouseTracking:f,surface:c,children:i}),T[5]=c,T[6]=f,T[7]=i,T[8]=_;else _=T[8];return _}return i}function Vto(){if(M()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{Lhr,g9t,Vto};
