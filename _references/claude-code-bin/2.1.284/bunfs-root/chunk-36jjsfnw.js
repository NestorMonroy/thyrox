// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{O}from"/$bunfs/root/chunk-320rdak1.js";import{G1n}from"/$bunfs/root/chunk-bhdmejec.js";import{Eon}from"/$bunfs/root/chunk-k7mkzvfg.js";import{OKt}from"/$bunfs/root/chunk-v5p67206.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{kQe}from"/$bunfs/root/chunk-e593f5jd.js";import{Aoe}from"/$bunfs/root/chunk-v1tn2n4h.js";import{O4e,ZD}from"/$bunfs/root/chunk-nmdn2zmq.js";import{e}from"/$bunfs/root/chunk-fr6qx5c3.js";import{Q8t,Stt,sTt}from"/$bunfs/root/chunk-pev1f7ry.js";import{C,g,L}from"/$bunfs/root/chunk-68gegf2j.js";import{S}from"/$bunfs/root/chunk-2dxhgqgt.js";L();var s={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function x9r(i,n,t){if(!t)return;let r;if(i==="auto"){if(n===void 0)return;r=n}else r=sTt(i);return Eon(r)?s.light:s.dark}function l(){let t=w(4),[i,n]=g(Q8t),r,o;if(t[0]===S)r=()=>Stt(()=>n(Q8t())),o=[],t[0]=r,t[1]=o;else r=t[0],o=t[1];C(r,o);let m;if(t[2]!==i)m=x9r(OKt(),i,G1n()),t[2]=i,t[3]=m;else m=t[3];return m}function Tvn(i){let m=w(9),{children:n,mouseTracking:t,killRing:r}=i,o=l(),c;if(m[0]!==n||m[1]!==r)c=e(kQe,{handle:r,children:n}),m[0]=n,m[1]=r,m[2]=c;else c=m[2];let f=c;if(O4e()){let d;if(m[3]!==t)d=t??ZD(),m[3]=t,m[4]=d;else d=m[4];let p;if(m[5]!==o||m[6]!==d||m[7]!==f)p=e(Aoe,{mouseTracking:d,surface:o,children:f}),m[5]=o,m[6]=d,m[7]=f,m[8]=p;else p=m[8];return p}return f}function n6o(){if(O()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{x9r,Tvn,n6o};
