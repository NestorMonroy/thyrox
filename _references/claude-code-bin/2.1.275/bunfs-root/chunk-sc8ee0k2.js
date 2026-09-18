// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{As}from"/$bunfs/root/chunk-tq3hyhj9.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{QT,B,di}from"/$bunfs/root/chunk-3m04gsj3.js";import{De,A,pn,D}from"/$bunfs/root/chunk-347kpssc.js";D();function b(){return As().get(process.stdout)?.invalidatePrevFrame()}function L(F){return F.activeOverlays.size>0}function g(I){return v(I.activeOverlays)}function T(K){return BJt(K.activeOverlays)}function d(M){for(const j of M.activeOverlays){if(f.has(j)){return!0}}return!1}function C(k){for(const q of k.activeOverlays){if(l.has(q)){return!0}}return!1}var N=new Set(["autocomplete"]),_=new Set(["above-prompt-input","above-prompt-select"]),f=new Set(["history-search"]),l=new Set(["elicitation","elicitation-url"]),nSe=2;function ui(n,y){let x=w(8),o=y===void 0?!0:y,s=De(QT)?.setState,S,h;if(x[0]!==o||x[1]!==n||x[2]!==s)S=()=>{if(!o||!s){return}return s((c)=>{if(c.activeOverlays.has(n)){return c}let m=new Set(c.activeOverlays);return m.add(n),{...c,activeOverlays:m}}),()=>{s((u)=>{if(!u.activeOverlays.has(n)){return u}let p=new Set(u.activeOverlays);return p.delete(n),{...u,activeOverlays:p}})}},h=[n,o,s],x[0]=o,x[1]=n,x[2]=s,x[3]=S,x[4]=h;else S=x[3],h=x[4];A(S,h);let R,E;if(x[5]!==o)R=()=>{if(!o){return}return b},E=[o],x[5]=o,x[6]=R,x[7]=E;else R=x[6],E=x[7];pn(R,E)}function s0n(){return B(L)}function v(t){for(let e of t)if(!_.has(e))return!0;return!1}function i0n(){return B(g)}function BJt(t){for(let e of t)if(!N.has(e))return!0;return!1}function UU(){return B(T)}function cnt(){return di(d)??!1}function jJt(){return di(C)??!1}
export{nSe,ui,s0n,i0n,BJt,UU,cnt,jJt};
