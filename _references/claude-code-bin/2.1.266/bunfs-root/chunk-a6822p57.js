// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{ws}from"/$bunfs/root/chunk-z8w4nkmm.js";import{YM,F,Ps}from"/$bunfs/root/chunk-c6x7scb2.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{Oe,v,fn,L}from"/$bunfs/root/chunk-v21q572m.js";L();function b(){return ws().get(process.stdout)?.invalidatePrevFrame()}function g(I){return I.activeOverlays.size>0}function T(K){return O(K.activeOverlays)}function d(M){return tLt(M.activeOverlays)}function C(j){for(const k of j.activeOverlays){if(f.has(k)){return!0}}return!1}function P(q){for(const B of q.activeOverlays){if(l.has(B)){return!0}}return!1}var N=new Set(["autocomplete"]),_=new Set(["above-prompt-input","above-prompt-select"]),f=new Set(["history-search"]),l=new Set(["elicitation","elicitation-url"]),Uce=2;function ls(n,S){let h=y(8),o=S===void 0?!0:S,s=Oe(YM)?.setState,m,p;if(h[0]!==o||h[1]!==n||h[2]!==s)m=()=>{if(!o||!s){return}return s((c)=>{if(c.activeOverlays.has(n)){return c}let R=new Set(c.activeOverlays);return R.add(n),{...c,activeOverlays:R}}),()=>{s((u)=>{if(!u.activeOverlays.has(n)){return u}let w=new Set(u.activeOverlays);return w.delete(n),{...u,activeOverlays:w}})}},p=[n,o,s],h[0]=o,h[1]=n,h[2]=s,h[3]=m,h[4]=p;else m=h[3],p=h[4];v(m,p);let A,E;if(h[5]!==o)A=()=>{if(!o){return}return b},E=[o],h[5]=o,h[6]=A,h[7]=E;else A=h[6],E=h[7];fn(A,E)}function Orn(){return F(g)}function O(t){for(let e of t)if(!_.has(e))return!0;return!1}function Drn(){return F(T)}function tLt(t){for(let e of t)if(!N.has(e))return!0;return!1}function XL(){return F(d)}function _Ve(){return Ps(C)??!1}function nLt(){return Ps(P)??!1}
export{Uce,ls,Orn,Drn,tLt,XL,_Ve,nLt};
