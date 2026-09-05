// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Tbd as f}from"/$bunfs/root/_811.js";import{ncd as p}from"/$bunfs/root/_812.js";import{xxd as d}from"/$bunfs/root/_837.js";function M(){if(p.TERM==="xterm-ghostty")return R;return l}function S(){if(p.TERM==="xterm-ghostty")return m;return b}function y(r){return Math.round(r*T)/T}function E(r){return y(r/360)*360}function G(r,t){return(1-Math.cos(2*Math.PI*r/t))/2}function B(r,t,a){return{r:Math.round(r.r+(t.r-r.r)*a),g:Math.round(r.g+(t.g-r.g)*a),b:Math.round(r.b+(t.b-r.b)*a)}}function I(r){return`rgb(${r.r},${r.g},${r.b})`}function x(r){let t=(r%360+360)%360,a=0.7,c=0.6,e=(1-Math.abs(0.19999999999999996))*0.7,n=e*(1-Math.abs(t/60%2-1)),i=0.6-e/2,o=0,s=0,u=0;if(t<60)o=e,s=n;else if(t<120)o=n,s=e;else if(t<180)s=e,u=n;else if(t<240)s=n,u=e;else if(t<300)o=n,u=e;else o=e,u=n;return{r:Math.round((o+i)*255),g:Math.round((s+i)*255),b:Math.round((u+i)*255)}}function _(r){let t=r.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);return t?{r:parseInt(t[1],10),g:parseInt(t[2],10),b:parseInt(t[3],10)}:null}var R,g,l,m,A,b,T=8;var C=d(()=>{f();R=["\xB7","\u2722","\u2733","\u2736","\u273B","\u273B"],g=["\xB7","\u2722","\u2733","\u2736","\u273B","\u273D"],l=["\xB7","\u2722","*","\u2736","\u273B","\u273D"],m=[...R,...R.toReversed()],A=[...g,...g.toReversed()],b=[...l,...l.toReversed()]});
export{M as UD,S as VD,y as WD,E as XD,G as YD,B as ZD,I as _D,x as $D,_ as aE,C as bE};
