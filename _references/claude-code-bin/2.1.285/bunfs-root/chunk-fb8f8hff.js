// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Re,A,nn,D,xs}from"/$bunfs/root/chunk-bqbammwz.js";import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{TI,B,us}from"/$bunfs/root/chunk-tcenmmfc.js";D();function z(){return xs().get(process.stdout)?.invalidatePrevFrame()}function F(e){return e.activeOverlays.size>0}function I(e){return x(e.activeOverlays)}function K(e){return gTn(e.activeOverlays)}function M(e){for(const t of e.activeOverlays){if(u.has(t)){return!0}}return!1}function j(e){for(const t of e.activeOverlays){if(f.has(t)){return!0}}return!1}var E=new Set(["autocomplete"]),N=new Set(["above-prompt-input","above-prompt-select"]),u=new Set(["history-search"]),f=new Set(["elicitation","elicitation-url"]),KSe=2;function Ci(e,t){let S=w(8),r=t===void 0?!0:t,n=Re(TI)?.setState,O,b;if(S[0]!==r||S[1]!==e||S[2]!==n)O=()=>{if(!r||!n){return}return n((c)=>{if(c.activeOverlays.has(e)){return c}let y=new Set(c.activeOverlays);return y.add(e),{...c,activeOverlays:y}}),()=>{n((v)=>{if(!v.activeOverlays.has(e)){return v}let h=new Set(v.activeOverlays);return h.delete(e),{...v,activeOverlays:h}})}},b=[e,r,n],S[0]=r,S[1]=e,S[2]=n,S[3]=O,S[4]=b;else O=S[3],b=S[4];A(O,b);let m,R;if(S[5]!==r)m=()=>{if(!r){return}return z},R=[r],S[5]=r,S[6]=m,S[7]=R;else m=S[6],R=S[7];nn(m,R)}function Krr(){return B(F)}function x(e){for(let t of e)if(!N.has(t))return!0;return!1}function yKt(){return B(I)}function gTn(e){for(let t of e)if(!E.has(t))return!0;return!1}function AG(){return B(K)}function yQe(){return us(M)??!1}function hTn(){return us(j)??!1}
export{KSe,Ci,Krr,yKt,gTn,AG,yQe,hTn};
