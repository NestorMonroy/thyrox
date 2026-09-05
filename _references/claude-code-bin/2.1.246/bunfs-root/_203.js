// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{bab as E,k$a as x,p$a as h}from"/$bunfs/root/_483.js";import{jcb as N,kcb as k}from"/$bunfs/root/_493.js";import{mcb as l,ocb as P}from"/$bunfs/root/_494.js";import{nRc as d,oRc as A}from"/$bunfs/root/_722.js";import{xxd as T}from"/$bunfs/root/_837.js";function m(e){while(e.length>0){let t=e.at(-1);if(".,;:!?".includes(t)){e=e.slice(0,-1);continue}let f=w[t];if(!f)break;let n=0,s=0;for(let o of e)if(o===f)n++;else if(o===t)s++;if(s>n)e=e.slice(0,-1);else break}return e}function q(e){for(let t of e.matchAll(d))return m(t[0]);return}function F(z){let R=N(9),{children:r,color:u,bold:y}=z,i;if(R[0]!==r){i=[];let c=0;for(const p of r.matchAll(d)){let b=m(p[0]);if(p.index>c)i.push(r.slice(c,p.index));i.push(l(h,{url:b,children:b},p.index)),c=p.index+b.length}let a;if(R[2]!==r||R[3]!==c)a=r.slice(c),R[2]=r,R[3]=c,R[4]=a;else a=R[4];i.push(a);R[0]=r,R[1]=i}else i=R[1];let a;if(R[5]!==y||R[6]!==u||R[7]!==i)a=l(x,{color:u,bold:y,children:i}),R[5]=y,R[6]=u,R[7]=i,R[8]=a;else a=R[8];return a}var w;var L=T(()=>{A();E();P();k();w={")":"(","]":"[","}":"{"}});
export{m as lw,q as mw,F as nw,L as ow};
