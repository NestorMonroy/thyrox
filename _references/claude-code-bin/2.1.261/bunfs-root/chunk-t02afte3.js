// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Hs}from"/$bunfs/root/chunk-q8wcnq4y.js";import{qP,B,Ps}from"/$bunfs/root/chunk-z0dggj7a.js";import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{De,E,dn,F}from"/$bunfs/root/chunk-gwyyj914.js";F();function b(){return Hs().get(process.stdout)?.invalidatePrevFrame()}function L(z){return z.activeOverlays.size>0}function g(I){return v(I.activeOverlays)}function T(K){return e0t(K.activeOverlays)}function d(M){for(const j of M.activeOverlays){if(f.has(j)){return!0}}return!1}function C(k){for(const q of k.activeOverlays){if(l.has(q)){return!0}}return!1}var N=new Set(["autocomplete"]),_=new Set(["above-prompt-input","above-prompt-select"]),f=new Set(["history-search"]),l=new Set(["elicitation","elicitation-url"]),ile=2;function Ts(n,x){let S=y(8),o=x===void 0?!0:x,s=De(qP)?.setState,h,m;if(S[0]!==o||S[1]!==n||S[2]!==s)h=()=>{if(!o||!s){return}return s((c)=>{if(c.activeOverlays.has(n)){return c}let p=new Set(c.activeOverlays);return p.add(n),{...c,activeOverlays:p}}),()=>{s((u)=>{if(!u.activeOverlays.has(n)){return u}let R=new Set(u.activeOverlays);return R.delete(n),{...u,activeOverlays:R}})}},m=[n,o,s],S[0]=o,S[1]=n,S[2]=s,S[3]=h,S[4]=m;else h=S[3],m=S[4];E(h,m);let w,A;if(S[5]!==o)w=()=>{if(!o){return}return b},A=[o],S[5]=o,S[6]=w,S[7]=A;else w=S[6],A=S[7];dn(w,A)}function een(){return B(L)}function v(t){for(let e of t)if(!_.has(e))return!0;return!1}function ten(){return B(g)}function e0t(t){for(let e of t)if(!N.has(e))return!0;return!1}function V$(){return B(T)}function Zze(){return Ps(d)??!1}function t0t(){return Ps(C)??!1}
export{ile,Ts,een,ten,e0t,V$,Zze,t0t};
