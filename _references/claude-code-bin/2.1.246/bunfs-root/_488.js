// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{jcb as a,kcb as c}from"/$bunfs/root/_493.js";import{mcb as d,ocb as y}from"/$bunfs/root/_494.js";import{eSb as R,lSb as l,vSb as o,ySb as s}from"/$bunfs/root/_593.js";import{xxd as f}from"/$bunfs/root/_837.js";function L(e,n){switch(n.type){case"kill":{if(n.text.length===0)return e.mode.type==="idle"?e:{...e,mode:{type:"idle"}};return{ring:e.mode.type==="killing"&&e.ring.length>0?[n.direction==="prepend"?n.text+e.ring[0]:e.ring[0]+n.text,...e.ring.slice(1)]:[n.text,...e.ring].slice(0,I),mode:{type:"killing"}}}case"yank":return{...e,mode:{type:"yanked",start:n.start,length:n.length,index:0}};case"yankPop":{if(e.mode.type!=="yanked"||e.ring.length<=1)return e;let t=(e.mode.index+1)%e.ring.length;return{...e,mode:{...e.mode,index:t}}}case"updateYankLength":if(e.mode.type!=="yanked")return e;return{...e,mode:{...e.mode,length:n.length}};case"interrupt":if(e.mode.type==="idle")return e;return{...e,mode:{type:"idle"}}}}function H(e){return e.ring[0]??""}function N(e){if(e.mode.type!=="yanked"||e.ring.length<=1)return null;let n=(e.mode.index+1)%e.ring.length,{start:t,length:g}=e.mode;return{text:e.ring[n]??"",start:t,length:g}}function m(){let e=b;return{get state(){return e},dispatch(n){e=L(e,n)}}}function P(w){let x=a(5),{handle:r,children:p}=w,h;if(x[0]!==r)h=()=>r??m(),x[0]=r,x[1]=h;else h=x[1];let[M]=o(h);const u=r??M;let K;if(x[2]!==p||x[3]!==u)K=d(i.Provider,{value:u,children:p}),x[2]=p,x[3]=u,x[4]=K;else K=x[4];return K}function S(){let k=l(i);if(!k){throw ReferenceError("useKillRing cannot be called outside of a <KillRingProvider /> (mounted around every Ink root by src/ink.ts)")}return k}var I=10,b,i;var v=f(()=>{s();y();c();b={ring:[],mode:{type:"idle"}};i=R(null)});
export{H as Sbb,N as Tbb,m as Ubb,P as Vbb,S as Wbb,v as Xbb};
