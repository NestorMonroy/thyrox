// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{a}from"/$bunfs/root/chunk-ay603yys.js";import{H}from"/$bunfs/root/chunk-0n80jtth.js";import{CPn}from"/$bunfs/root/chunk-jjjf86rw.js";import{X8t}from"/$bunfs/root/chunk-4nfma80y.js";import{w1t,l8e}from"/$bunfs/root/chunk-k1grbw7c.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{qee}from"/$bunfs/root/chunk-8r6x2ra7.js";import{eGe,lM}from"/$bunfs/root/chunk-hwaks3hb.js";import{e}from"/$bunfs/root/chunk-srmsc891.js";import{eVt,CXe,b_t}from"/$bunfs/root/chunk-pe29r23z.js";import{A,g,D}from"/$bunfs/root/chunk-av0brfrs.js";import{_}from"/$bunfs/root/chunk-0dapr5gw.js";D();var s={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function jBr(i,n,t){if(!t)return;let r;if(i==="auto"){if(n===void 0)return;r=n}else r=b_t(i);return X8t(r)?s.light:s.dark}function l(){let t=w(4),[i,n]=g(eVt),r,o;if(t[0]===_)r=()=>CXe(()=>n(eVt())),o=[],t[0]=r,t[1]=o;else r=t[0],o=t[1];A(r,o);let m;if(t[2]!==i)m=jBr(w1t(),i,CPn()),t[2]=i,t[3]=m;else m=t[3];return m}function Qun(i){let m=w(9),{children:n,mouseTracking:t,killRing:r}=i,o=l(),c;if(m[0]!==n||m[1]!==r)c=e(l8e,{handle:r,children:n}),m[0]=n,m[1]=r,m[2]=c;else c=m[2];let f=c;if(eGe()){let d;if(m[3]!==t)d=t??lM(),m[3]=t,m[4]=d;else d=m[4];let p;if(m[5]!==o||m[6]!==d||m[7]!==f)p=e(qee,{mouseTracking:d,surface:o,children:f}),m[5]=o,m[6]=d,m[7]=f,m[8]=p;else p=m[8];return p}return f}function I0o(){if(H()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{jBr,Qun,I0o};
