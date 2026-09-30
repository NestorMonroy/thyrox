// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{n}from"/$bunfs/root/chunk-5zps47bf.js";import{Tt}from"/$bunfs/root/chunk-yq5hnqm6.js";import{U,e,r}from"/$bunfs/root/chunk-zhg3ync1.js";import{Ew,zl,e_,re,v,Rr,k,L}from"/$bunfs/root/chunk-v21q572m.js";import{en}from"/$bunfs/root/chunk-7sg5wrey.js";L();L();function P(q){return q!==""}function _(R,E){e_(R)?R.key??E:E;return r(U,{children:[E>0&&e(n,{dimColor:!0,children:" \xB7 "}),R]})}function de(I){let T=y(5),{children:m}=I,i,p;if(T[0]!==m){p=en;bb0:{let b=Ew.toArray(m).filter(P);if(b.length===0){p=null;break bb0}i=b.map(_)}T[0]=m,T[1]=i,T[2]=p}else i=T[1],p=T[2];if(p!==en)return p;let D;if(T[3]!==i)D=e(U,{children:i}),T[3]=i,T[4]=D;else D=T[4];return D}L();var N=800;function AH(o,u,t,c=N){let a=Tt(),l=k(0),s=k(void 0),S=Rr(()=>o(!1)),f=re(()=>{if(s.current)s.current(),s.current=void 0},[]);return v(()=>()=>{if(s.current)f(),S()},[f]),re(()=>{let d=Date.now();if(d-l.current<=c&&s.current!==void 0)f(),o(!1),u();else t?.(),o(!0),f(),s.current=a.setTimeout(()=>{o(!1),s.current=void 0},c);l.current=d},[o,u,t,f,a,c])}
export{de,AH};
