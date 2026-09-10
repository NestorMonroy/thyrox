// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{TE as S,UE as i,ZE as c,_E as C}from"/$bunfs/root/_296.js";import{Qbb as x,Rbb as z}from"/$bunfs/root/_487.js";import{jcb as _,kcb as h}from"/$bunfs/root/_493.js";import{lSb as v,nSb as O,rSb as y,ySb as d}from"/$bunfs/root/_593.js";import{xxd as b}from"/$bunfs/root/_837.js";function j(){return x.get(process.stdout)?.invalidatePrevFrame()}function k(Z){return Z.activeOverlays.size>0}function q(tt){return R(tt.activeOverlays)}function B(et){for(const rt of et.activeOverlays){if(m.has(rt)){return!0}}return!1}function G(nt){for(const ot of nt.activeOverlays){if(w.has(ot)){return!0}}return!1}function I(o,p){let A=_(8),n=p===void 0?!0:p,s=v(S)?.setState,E,L;if(A[0]!==n||A[1]!==o||A[2]!==s)E=()=>{if(!n||!s){return}return s((f)=>{if(f.activeOverlays.has(o)){return f}let N=new Set(f.activeOverlays);return N.add(o),{...f,activeOverlays:N}}),()=>{s((l)=>{if(!l.activeOverlays.has(o)){return l}let D=new Set(l.activeOverlays);return D.delete(o),{...l,activeOverlays:D}})}},L=[o,n,s],A[0]=n,A[1]=o,A[2]=s,A[3]=E,A[4]=L;else E=A[3],L=A[4];O(E,L);let P,T;if(A[5]!==n)P=()=>{if(!n){return}return j},T=[n],A[5]=n,A[6]=P,A[7]=T;else P=A[6],T=A[7];y(P,T)}function K(){return i(k)}function R(t){for(let e of t)if(!F.has(e))return!0;return!1}function M(){return i(q)}function V(){return c(B)??!1}function Y(){return c(G)??!1}var F,m,w,W=2;var H=b(()=>{d();z();C();h();F=new Set(["autocomplete"]),m=new Set(["history-search"]),w=new Set(["elicitation","elicitation-url"])});
export{W as KD,I as LD,K as MD,R as ND,M as OD,V as PD,Y as QD,H as RD};
