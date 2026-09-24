// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{As}from"/$bunfs/root/chunk-s9dcdjbm.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{lx,U,hs}from"/$bunfs/root/chunk-t7d01j86.js";import{Pe,A,cn,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function z(){return As().get(process.stdout)?.invalidatePrevFrame()}function F(e){return e.activeOverlays.size>0}function I(e){return x(e.activeOverlays)}function K(e){return sgn(e.activeOverlays)}function M(e){for(const t of e.activeOverlays){if(u.has(t)){return!0}}return!1}function j(e){for(const t of e.activeOverlays){if(f.has(t)){return!0}}return!1}var E=new Set(["autocomplete"]),N=new Set(["above-prompt-input","above-prompt-select"]),u=new Set(["history-search"]),f=new Set(["elicitation","elicitation-url"]),Uhe=2;function di(e,t){let S=w(8),r=t===void 0?!0:t,n=Pe(lx)?.setState,O,b;if(S[0]!==r||S[1]!==e||S[2]!==n)O=()=>{if(!r||!n){return}return n((c)=>{if(c.activeOverlays.has(e)){return c}let y=new Set(c.activeOverlays);return y.add(e),{...c,activeOverlays:y}}),()=>{n((v)=>{if(!v.activeOverlays.has(e)){return v}let h=new Set(v.activeOverlays);return h.delete(e),{...v,activeOverlays:h}})}},b=[e,r,n],S[0]=r,S[1]=e,S[2]=n,S[3]=O,S[4]=b;else O=S[3],b=S[4];A(O,b);let m,R;if(S[5]!==r)m=()=>{if(!r){return}return z},R=[r],S[5]=r,S[6]=m,S[7]=R;else m=S[6],R=S[7];cn(m,R)}function _6n(){return U(F)}function x(e){for(let t of e)if(!N.has(t))return!0;return!1}function n1t(){return U(I)}function sgn(e){for(let t of e)if(!E.has(t))return!0;return!1}function n2(){return U(K)}function ZYe(){return hs(M)??!1}function ign(){return hs(j)??!1}
export{Uhe,di,_6n,n1t,sgn,n2,ZYe,ign};
