// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{xs}from"/$bunfs/root/chunk-zgt6j43h.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{pI,W,ys}from"/$bunfs/root/chunk-6ms3480f.js";import{Ie,C,sn,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();function z(){return xs().get(process.stdout)?.invalidatePrevFrame()}function F(e){return e.activeOverlays.size>0}function I(e){return x(e.activeOverlays)}function K(e){return hvn(e.activeOverlays)}function M(e){for(const t of e.activeOverlays){if(u.has(t)){return!0}}return!1}function j(e){for(const t of e.activeOverlays){if(f.has(t)){return!0}}return!1}var R=new Set(["autocomplete"]),E=new Set(["above-prompt-input","above-prompt-select"]),u=new Set(["history-search"]),f=new Set(["elicitation","elicitation-url"]),$be=2;function vi(e,t){let S=w(8),r=t===void 0?!0:t,n=Ie(pI)?.setState,O,b;if(S[0]!==r||S[1]!==e||S[2]!==n)O=()=>{if(!r||!n){return}return n((c)=>{if(c.activeOverlays.has(e)){return c}let y=new Set(c.activeOverlays);return y.add(e),{...c,activeOverlays:y}}),()=>{n((v)=>{if(!v.activeOverlays.has(e)){return v}let A=new Set(v.activeOverlays);return A.delete(e),{...v,activeOverlays:A}})}},b=[e,r,n],S[0]=r,S[1]=e,S[2]=n,S[3]=O,S[4]=b;else O=S[3],b=S[4];C(O,b);let h,m;if(S[5]!==r)h=()=>{if(!r){return}return z},m=[r],S[5]=r,S[6]=h,S[7]=m;else h=S[6],m=S[7];sn(h,m)}function Ser(){return W(F)}function x(e){for(let t of e)if(!E.has(t))return!0;return!1}function W2t(){return W(I)}function hvn(e){for(let t of e)if(!R.has(t))return!0;return!1}function Jz(){return W(K)}function FJe(){return ys(M)??!1}function yvn(){return ys(j)??!1}
export{$be,vi,Ser,W2t,hvn,Jz,FJe,yvn};
