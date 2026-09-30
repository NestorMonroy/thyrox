// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{O}from"/$bunfs/root/chunk-fmsbxtrp.js";import{xFn}from"/$bunfs/root/chunk-4x2jc802.js";import{Ytn}from"/$bunfs/root/chunk-zw18v94q.js";import{lVt}from"/$bunfs/root/chunk-0ywwnrtd.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{KJe}from"/$bunfs/root/chunk-n3gx3yan.js";import{Pre}from"/$bunfs/root/chunk-1fd87t5a.js";import{iKe,DD}from"/$bunfs/root/chunk-t71336y2.js";import{e}from"/$bunfs/root/chunk-s81ftaa6.js";import{S6t,GZe,Zvt}from"/$bunfs/root/chunk-8mkm75qc.js";import{C,g,L}from"/$bunfs/root/chunk-8fdrzdn0.js";import{S}from"/$bunfs/root/chunk-ghttqp33.js";L();var s={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function L5r(i,n,t){if(!t)return;let r;if(i==="auto"){if(n===void 0)return;r=n}else r=Zvt(i);return Ytn(r)?s.light:s.dark}function l(){let t=w(4),[i,n]=g(S6t),r,o;if(t[0]===S)r=()=>GZe(()=>n(S6t())),o=[],t[0]=r,t[1]=o;else r=t[0],o=t[1];C(r,o);let m;if(t[2]!==i)m=L5r(lVt(),i,xFn()),t[2]=i,t[3]=m;else m=t[3];return m}function Ibn(i){let m=w(9),{children:n,mouseTracking:t,killRing:r}=i,o=l(),c;if(m[0]!==n||m[1]!==r)c=e(KJe,{handle:r,children:n}),m[0]=n,m[1]=r,m[2]=c;else c=m[2];let f=c;if(iKe()){let d;if(m[3]!==t)d=t??DD(),m[3]=t,m[4]=d;else d=m[4];let p;if(m[5]!==o||m[6]!==d||m[7]!==f)p=e(Pre,{mouseTracking:d,surface:o,children:f}),m[5]=o,m[6]=d,m[7]=f,m[8]=p;else p=m[8];return p}return f}function eqo(){if(O()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{L5r,Ibn,eqo};
