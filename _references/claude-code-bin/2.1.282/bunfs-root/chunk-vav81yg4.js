// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{H}from"/$bunfs/root/chunk-xt60grfb.js";import{HMn}from"/$bunfs/root/chunk-6tq289m8.js";import{L7t}from"/$bunfs/root/chunk-md7p1res.js";import{gzt,F9e}from"/$bunfs/root/chunk-4vcr7wav.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{zte}from"/$bunfs/root/chunk-8v5dybsy.js";import{$2e,NM}from"/$bunfs/root/chunk-ss2d9ysw.js";import{e}from"/$bunfs/root/chunk-rygnxyqy.js";import{vKt,n7e,Jbt}from"/$bunfs/root/chunk-5h4an5p7.js";import{A,g,D}from"/$bunfs/root/chunk-cvh5tjew.js";import{b}from"/$bunfs/root/chunk-j14wpeqn.js";D();var s={light:{background:"#f9f9f7",foreground:"#000000"},dark:{background:"#1f1f1e",foreground:"#ffffff"}};function hGr(i,n,t){if(!t)return;let r;if(i==="auto"){if(n===void 0)return;r=n}else r=Jbt(i);return L7t(r)?s.light:s.dark}function l(){let t=w(4),[i,n]=g(vKt),r,o;if(t[0]===b)r=()=>n7e(()=>n(vKt())),o=[],t[0]=r,t[1]=o;else r=t[0],o=t[1];A(r,o);let m;if(t[2]!==i)m=hGr(gzt(),i,HMn()),t[2]=i,t[3]=m;else m=t[3];return m}function agn(i){let m=w(9),{children:n,mouseTracking:t,killRing:r}=i,o=l(),c;if(m[0]!==n||m[1]!==r)c=e(F9e,{handle:r,children:n}),m[0]=n,m[1]=r,m[2]=c;else c=m[2];let f=c;if($2e()){let d;if(m[3]!==t)d=t??NM(),m[3]=t,m[4]=d;else d=m[4];let p;if(m[5]!==o||m[6]!==d||m[7]!==f)p=e(zte,{mouseTracking:d,surface:o,children:f}),m[5]=o,m[6]=d,m[7]=f,m[8]=p;else p=m[8];return p}return f}function rFo(){if(H()==="windows"||a.WT_SESSION)process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT??="1"}
export{hGr,agn,rFo};
