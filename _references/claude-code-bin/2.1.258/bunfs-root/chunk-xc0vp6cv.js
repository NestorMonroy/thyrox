// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{EKt}from"/$bunfs/root/chunk-ekygqhfy.js";import{gSt}from"/$bunfs/root/chunk-27c00td1.js";import{Idt,tDe}from"/$bunfs/root/chunk-gwf9t3dy.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{w4}from"/$bunfs/root/chunk-bhq4c6ym.js";import{VAe,BR}from"/$bunfs/root/chunk-y7ghz8m1.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";import{v,d,j}from"/$bunfs/root/chunk-db688wrz.js";import{Vdt,sDe,t4e}from"/$bunfs/root/chunk-afktssqj.js";import{D}from"/$bunfs/root/chunk-dwwp0b8c.js";import{p}from"/$bunfs/root/chunk-6zavqkd2.js";j();var T={light:"#f9f9f7",dark:"#1f1f1e"};function tNn(t,o,n){if(!n)return;let i;if(t==="auto"){if(o===void 0)return;i=o}else i=t4e(t);return gSt(i)?T.light:T.dark}function f(){let E=y(4),[l,b]=d(Vdt),S,k;if(E[0]===p)S=()=>sDe(()=>b(Vdt())),k=[],E[0]=S,E[1]=k;else S=E[0],k=E[1];v(S,k);let N;if(E[2]!==l)N=tNn(Idt(),l,EKt()),E[2]=l,E[3]=N;else N=E[3];return N}function txt(x){let R=y(9),{children:u,mouseTracking:c,killRing:g}=x,h=f(),_;if(R[0]!==u||R[1]!==g)_=e(tDe,{handle:g,children:u}),R[0]=u,R[1]=g,R[2]=_;else _=R[2];let r=_;if(VAe()){let m;if(R[3]!==c)m=c??BR(),R[3]=c,R[4]=m;else m=R[4];let A;if(R[5]!==h||R[6]!==m||R[7]!==r)A=e(w4,{mouseTracking:m,background:h,children:r}),R[5]=h,R[6]=m,R[7]=r,R[8]=A;else A=R[8];return A}return r}function cvr(){if(D()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{tNn,txt,cvr};
