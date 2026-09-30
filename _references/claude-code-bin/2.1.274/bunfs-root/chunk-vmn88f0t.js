// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{a}from"/$bunfs/root/chunk-j96jysac.js";import{M}from"/$bunfs/root/chunk-b565vq97.js";import{Dgn}from"/$bunfs/root/chunk-h0vkrkye.js";import{Q1t}from"/$bunfs/root/chunk-nzydtwjt.js";import{jTt,R2e}from"/$bunfs/root/chunk-w1zswehx.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{CX}from"/$bunfs/root/chunk-5x23xft3.js";import{uLe,IO}from"/$bunfs/root/chunk-9xksja9g.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{z0t,TGe,Ost}from"/$bunfs/root/chunk-cfakfnjy.js";import{A,m,L}from"/$bunfs/root/chunk-s59wj17y.js";import{y}from"/$bunfs/root/chunk-3z5w4bh8.js";L();var h={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function sdr(r,o,n){if(!n)return;let t;if(r==="auto"){if(o===void 0)return;t=o}else t=Ost(r);return Q1t(t)?h.light:h.dark}function d(){let R=S(4),[l,I]=m(z0t),k,E;if(R[0]===y)k=()=>TGe(()=>I(z0t())),E=[],R[0]=k,R[1]=E;else k=R[0],E=R[1];A(k,E);let N;if(R[2]!==l)N=sdr(jTt(),l,Dgn()),R[2]=l,R[3]=N;else N=R[3];return N}function O6t(O){let g=S(9),{children:p,mouseTracking:s,killRing:c}=O,T=d(),_;if(g[0]!==p||g[1]!==c)_=e(R2e,{handle:c,children:p}),g[0]=p,g[1]=c,g[2]=_;else _=g[2];let i=_;if(uLe()){let f;if(g[3]!==s)f=s??IO(),g[3]=s,g[4]=f;else f=g[4];let v;if(g[5]!==T||g[6]!==f||g[7]!==i)v=e(CX,{mouseTracking:f,surface:T,children:i}),g[5]=T,g[6]=f,g[7]=i,g[8]=v;else v=g[8];return v}return i}function pXr(){if(M()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{sdr,O6t,pXr};
