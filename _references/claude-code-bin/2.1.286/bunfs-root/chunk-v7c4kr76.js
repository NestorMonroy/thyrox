// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{M}from"/$bunfs/root/chunk-hqt9kt0y.js";import{_2n}from"/$bunfs/root/chunk-n5qwqw3e.js";import{y$e}from"/$bunfs/root/chunk-0xhvdj8h.js";import{D5t}from"/$bunfs/root/chunk-783bf2jx.js";import{w}from"/$bunfs/root/chunk-beptw75w.js";import{ret}from"/$bunfs/root/chunk-pns8f1hd.js";import{C,g,D}from"/$bunfs/root/chunk-mqace48v.js";import{ose}from"/$bunfs/root/chunk-b5b2845p.js";import{D3e,jL}from"/$bunfs/root/chunk-0q25y8sd.js";import{e}from"/$bunfs/root/chunk-9av83rwa.js";import{EXt,Wnt,FAt}from"/$bunfs/root/chunk-83djeqqq.js";import{S}from"/$bunfs/root/chunk-qr34qg3p.js";D();var s={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function gZr(i,n,t){if(!t)return;let r;if(i==="auto"){if(n===void 0)return;r=n}else r=FAt(i);return y$e(r)?s.light:s.dark}function l(){let t=w(4),[i,n]=g(EXt),r,o;if(t[0]===S)r=()=>Wnt(()=>n(EXt())),o=[],t[0]=r,t[1]=o;else r=t[0],o=t[1];C(r,o);let m;if(t[2]!==i)m=gZr(D5t(),i,_2n()),t[2]=i,t[3]=m;else m=t[3];return m}function Xkn(i){let m=w(9),{children:n,mouseTracking:t,killRing:r}=i,o=l(),c;if(m[0]!==n||m[1]!==r)c=e(ret,{handle:r,children:n}),m[0]=n,m[1]=r,m[2]=c;else c=m[2];let f=c;if(D3e()){let d;if(m[3]!==t)d=t??jL(),m[3]=t,m[4]=d;else d=m[4];let p;if(m[5]!==o||m[6]!==d||m[7]!==f)p=e(ose,{mouseTracking:d,surface:o,children:f}),m[5]=o,m[6]=d,m[7]=f,m[8]=p;else p=m[8];return p}return f}function VXo(){if(M()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{gZr,Xkn,VXo};
