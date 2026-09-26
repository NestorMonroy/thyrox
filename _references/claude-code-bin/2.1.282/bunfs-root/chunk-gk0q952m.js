// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ws}from"/$bunfs/root/chunk-vv47c4c8.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{Tx,B,us}from"/$bunfs/root/chunk-ynhka9xd.js";import{Ie,A,sn,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();function z(){return ws().get(process.stdout)?.invalidatePrevFrame()}function F(e){return e.activeOverlays.size>0}function I(e){return x(e.activeOverlays)}function K(e){return __n(e.activeOverlays)}function M(e){for(const t of e.activeOverlays){if(u.has(t)){return!0}}return!1}function j(e){for(const t of e.activeOverlays){if(f.has(t)){return!0}}return!1}var E=new Set(["autocomplete"]),N=new Set(["above-prompt-input","above-prompt-select"]),u=new Set(["history-search"]),f=new Set(["elicitation","elicitation-url"]),Zye=2;function gi(e,t){let S=w(8),r=t===void 0?!0:t,n=Ie(Tx)?.setState,O,b;if(S[0]!==r||S[1]!==e||S[2]!==n)O=()=>{if(!r||!n){return}return n((c)=>{if(c.activeOverlays.has(e)){return c}let y=new Set(c.activeOverlays);return y.add(e),{...c,activeOverlays:y}}),()=>{n((v)=>{if(!v.activeOverlays.has(e)){return v}let h=new Set(v.activeOverlays);return h.delete(e),{...v,activeOverlays:h}})}},b=[e,r,n],S[0]=r,S[1]=e,S[2]=n,S[3]=O,S[4]=b;else O=S[3],b=S[4];A(O,b);let m,R;if(S[5]!==r)m=()=>{if(!r){return}return z},R=[r],S[5]=r,S[6]=m,S[7]=R;else m=S[6],R=S[7];sn(m,R)}function bXn(){return B(F)}function x(e){for(let t of e)if(!N.has(t))return!0;return!1}function YWt(){return B(I)}function __n(e){for(let t of e)if(!E.has(t))return!0;return!1}function kz(){return B(K)}function P9e(){return us(M)??!1}function b_n(){return us(j)??!1}
export{Zye,gi,bXn,YWt,__n,kz,P9e,b_n};
