// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{M8a as k,O8a as S}from"/$bunfs/root/_481.js";import{L$a as x,M$a as M,c_a as u,d_a as C}from"/$bunfs/root/_483.js";import{nSb as d,oSb as y,uSb as p,vSb as E,ySb as P}from"/$bunfs/root/_593.js";P();M();C();S();function j(e,o,t){let s=u(e-t+1,0,Math.max(0,o-t)),a=Math.min(s+t,o);return{windowStart:s,windowEnd:a,moreAbove:s,moreBelow:o-a}}function H({count:e,visibleCount:o,isDisabled:t=!1,onAccept:s,onRowKeyDown:a,onCursorChange:R,edge:h="clamp"}){let b=p(null),[l,m]=E(0),w=x(b),i=Math.max(0,e-1),r=u(l,0,i);function c(n){m((O)=>{let v=u(O,0,i)+n;if(h==="wrap"&&e>0)return(v%e+e)%e;return u(v,0,i)})}d(()=>{if(l!==r)m(r)},[l,r]);let D=y((n)=>R?.(n)),f=p(null);d(()=>{if(e===0){f.current=null;return}if(f.current!==r)f.current=r,D(r)},[r,e]),k({"select:next":()=>c(1),"select:previous":()=>c(-1),"select:pageDown":()=>c(o),"select:pageUp":()=>c(-o),"select:first":()=>m(0),"select:last":()=>m(i)},{context:"Select",isActive:w&&!t&&e>0});function g(n){if(t||e===0)return;if(n.key==="return"&&s){s(r),n.preventDefault(),n.stopImmediatePropagation();return}a?.(n,r)}let K=j(r,e,o);return{cursor:r,...K,isCursor:(n)=>n===r&&e>0,hasFocus:w,setCursor:(n)=>m(u(n,0,i)),containerRef:b,bind:{ref:b,tabIndex:0,onKeyDown:g}}}
export{j as $q,H as ar};
