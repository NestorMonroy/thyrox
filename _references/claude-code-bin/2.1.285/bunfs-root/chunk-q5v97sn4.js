// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{a}from"/$bunfs/root/chunk-5054mktj.js";import{O}from"/$bunfs/root/chunk-hjabkkf1.js";import{b1n}from"/$bunfs/root/chunk-sxt6mreh.js";import{dLe}from"/$bunfs/root/chunk-5ansfsgk.js";import{wKt}from"/$bunfs/root/chunk-y4mbr44j.js";import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{TQe}from"/$bunfs/root/chunk-7wtjpxkg.js";import{A,g,D}from"/$bunfs/root/chunk-bqbammwz.js";import{Aoe}from"/$bunfs/root/chunk-zntqxazs.js";import{k4e,dL}from"/$bunfs/root/chunk-pmfry3fa.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";import{n8t,ltt,Bkt}from"/$bunfs/root/chunk-s9fzjjk9.js";import{S}from"/$bunfs/root/chunk-675ch139.js";D();var s={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function NXr(i,n,t){if(!t)return;let r;if(i==="auto"){if(n===void 0)return;r=n}else r=Bkt(i);return dLe(r)?s.light:s.dark}function l(){let t=w(4),[i,n]=g(n8t),r,o;if(t[0]===S)r=()=>ltt(()=>n(n8t())),o=[],t[0]=r,t[1]=o;else r=t[0],o=t[1];A(r,o);let m;if(t[2]!==i)m=NXr(wKt(),i,b1n()),t[2]=i,t[3]=m;else m=t[3];return m}function xvn(i){let m=w(9),{children:n,mouseTracking:t,killRing:r}=i,o=l(),c;if(m[0]!==n||m[1]!==r)c=e(TQe,{handle:r,children:n}),m[0]=n,m[1]=r,m[2]=c;else c=m[2];let f=c;if(k4e()){let d;if(m[3]!==t)d=t??dL(),m[3]=t,m[4]=d;else d=m[4];let p;if(m[5]!==o||m[6]!==d||m[7]!==f)p=e(Aoe,{mouseTracking:d,surface:o,children:f}),m[5]=o,m[6]=d,m[7]=f,m[8]=p;else p=m[8];return p}return f}function p6o(){if(O()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{NXr,xvn,p6o};
