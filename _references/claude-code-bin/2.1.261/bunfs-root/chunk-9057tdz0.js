// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{t}from"/$bunfs/root/chunk-fqnz5baq.js";import{vt}from"/$bunfs/root/chunk-sws7k734.js";import{N,e,r}from"/$bunfs/root/chunk-gbn257vp.js";import{JS,Ol,Ly,re,E,kr,v,F}from"/$bunfs/root/chunk-gwyyj914.js";import{en}from"/$bunfs/root/chunk-934z9d80.js";F();F();function P(q){return q!==""}function L(R,S){Ly(R)?R.key??S:S;return r(N,{children:[S>0&&e(t,{dimColor:!0,children:" \xB7 "}),R]})}function ue(I){let T=y(5),{children:m}=I,i,p;if(T[0]!==m){p=en;bb0:{let b=JS.toArray(m).filter(P);if(b.length===0){p=null;break bb0}i=b.map(L)}T[0]=m,T[1]=i,T[2]=p}else i=T[1],p=T[2];if(p!==en)return p;let D;if(T[3]!==i)D=e(N,{children:i}),T[3]=i,T[4]=D;else D=T[4];return D}F();var _=800;function Mx(c,u,o,s=_){let a=vt(),l=v(0),n=v(void 0),k=kr(()=>c(!1)),f=re(()=>{if(n.current)n.current(),n.current=void 0},[]);return E(()=>()=>{if(n.current)f(),k()},[f]),re(()=>{let d=Date.now();if(d-l.current<=s&&n.current!==void 0)f(),c(!1),u();else o?.(),c(!0),f(),n.current=a.setTimeout(()=>{c(!1),n.current=void 0},s);l.current=d},[c,u,o,f,a,s])}
export{ue,Mx};
