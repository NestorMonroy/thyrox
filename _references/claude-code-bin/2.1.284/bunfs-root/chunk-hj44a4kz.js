// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Hs}from"/$bunfs/root/chunk-0dfxm50d.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{AP,W,_s}from"/$bunfs/root/chunk-wx4aqxv5.js";import{Ce,C,sn,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function z(){return Hs().get(process.stdout)?.invalidatePrevFrame()}function F(e){return e.activeOverlays.size>0}function I(e){return x(e.activeOverlays)}function K(e){return _Tn(e.activeOverlays)}function M(e){for(const t of e.activeOverlays){if(u.has(t)){return!0}}return!1}function j(e){for(const t of e.activeOverlays){if(f.has(t)){return!0}}return!1}var R=new Set(["autocomplete"]),E=new Set(["above-prompt-input","above-prompt-select"]),u=new Set(["history-search"]),f=new Set(["elicitation","elicitation-url"]),KSe=2;function Ti(e,t){let S=w(8),r=t===void 0?!0:t,n=Ce(AP)?.setState,O,b;if(S[0]!==r||S[1]!==e||S[2]!==n)O=()=>{if(!r||!n){return}return n((c)=>{if(c.activeOverlays.has(e)){return c}let y=new Set(c.activeOverlays);return y.add(e),{...c,activeOverlays:y}}),()=>{n((v)=>{if(!v.activeOverlays.has(e)){return v}let A=new Set(v.activeOverlays);return A.delete(e),{...v,activeOverlays:A}})}},b=[e,r,n],S[0]=r,S[1]=e,S[2]=n,S[3]=O,S[4]=b;else O=S[3],b=S[4];C(O,b);let h,m;if(S[5]!==r)h=()=>{if(!r){return}return z},m=[r],S[5]=r,S[6]=h,S[7]=m;else h=S[6],m=S[7];sn(h,m)}function Zrr(){return W(F)}function x(e){for(let t of e)if(!E.has(t))return!0;return!1}function RKt(){return W(I)}function _Tn(e){for(let t of e)if(!R.has(t))return!0;return!1}function k2(){return W(K)}function hQe(){return _s(M)??!1}function bTn(){return _s(j)??!1}
export{KSe,Ti,Zrr,RKt,_Tn,k2,hQe,bTn};
