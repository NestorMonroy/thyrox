// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ys}from"/$bunfs/root/chunk-68jr61g3.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{kT,B,ni}from"/$bunfs/root/chunk-52363y4x.js";import{Me,A,fn,L}from"/$bunfs/root/chunk-s59wj17y.js";L();function b(){return ys().get(process.stdout)?.invalidatePrevFrame()}function g(F){return F.activeOverlays.size>0}function T(I){return v(I.activeOverlays)}function d(K){return yYt(K.activeOverlays)}function C(M){for(const j of M.activeOverlays){if(f.has(j)){return!0}}return!1}function P(k){for(const q of k.activeOverlays){if(l.has(q)){return!0}}return!1}var N=new Set(["autocomplete"]),_=new Set(["above-prompt-input","above-prompt-select"]),f=new Set(["history-search"]),l=new Set(["elicitation","elicitation-url"]),L_e=2;function ti(n,y){let x=S(8),o=y===void 0?!0:y,s=Me(kT)?.setState,h,m;if(x[0]!==o||x[1]!==n||x[2]!==s)h=()=>{if(!o||!s){return}return s((c)=>{if(c.activeOverlays.has(n)){return c}let p=new Set(c.activeOverlays);return p.add(n),{...c,activeOverlays:p}}),()=>{s((u)=>{if(!u.activeOverlays.has(n)){return u}let R=new Set(u.activeOverlays);return R.delete(n),{...u,activeOverlays:R}})}},m=[n,o,s],x[0]=o,x[1]=n,x[2]=s,x[3]=h,x[4]=m;else h=x[3],m=x[4];A(h,m);let w,E;if(x[5]!==o)w=()=>{if(!o){return}return b},E=[o],x[5]=o,x[6]=w,x[7]=E;else w=x[6],E=x[7];fn(w,E)}function URn(){return B(g)}function v(t){for(let e of t)if(!_.has(e))return!0;return!1}function BRn(){return B(T)}function yYt(t){for(let e of t)if(!N.has(e))return!0;return!1}function rU(){return B(d)}function fet(){return ni(C)??!1}function _Yt(){return ni(P)??!1}
export{L_e,ti,URn,BRn,yYt,rU,fet,_Yt};
