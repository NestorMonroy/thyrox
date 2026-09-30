// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{zue,ND,i5}from"/$bunfs/root/chunk-2z8gzkq5.js";import{bm}from"/$bunfs/root/chunk-jfpkcdhc.js";import{Xt,De,A,g,xt,D}from"/$bunfs/root/chunk-347kpssc.js";D();D();var l=Xt({isTerminalFocused:!0,terminalFocusState:"unknown"});l.displayName="TerminalFocusContext";function gOn(L){let I=w(6),{children:f}=L,T=xt(i5,zue),F=xt(i5,ND),R;if(I[0]!==T||I[1]!==F)R={isTerminalFocused:T,terminalFocusState:F},I[0]=T,I[1]=F,I[2]=R;else R=I[2];let b=R,N;if(I[3]!==f||I[4]!==b)N=e(l.Provider,{value:b,children:f}),I[3]=f,I[4]=b,I[5]=N;else N=I[5];return N}var m=l;function Ql(){let{isTerminalFocused:n}=De(m);return n}function ySe(){let{terminalFocusState:n}=De(m);return n}D();function U(){return C(bm)}var nC=(n,r)=>{let t=setTimeout(n,r);return()=>clearTimeout(t)},_Se=()=>()=>{},$7t=()=>null;function C(n){let r=new Map,t=null,c=n,d=performance.now(),a=0;function y(){a=performance.now()-d;for(let o of r.keys())o()}function s(){if([...r.values()].some(Boolean)){if(t)clearInterval(t),t=null;t=setInterval(y,c)}else if(t)clearInterval(t),t=null}function v(o,u){return r.set(o,u),s(),()=>{r.delete(o),s()}}return{subscribeKeepAlive(o){return v(o,!0)},subscribeFollower(o){return v(o,!1)},now(){if(t&&a)return a;return performance.now()-d},setTickInterval(o){if(o===c)return;c=o,s()},setTimeout(o,u){let S=setTimeout(o,u);return()=>clearTimeout(S)}}}var s_=Xt(null),k=bm*2;function hOn(X){let P=w(7),{children:x}=X,[i]=g(U),p=Ql(),h,K;if(P[0]!==i||P[1]!==p)h=()=>{i.setTickInterval(p?bm:k)},K=[i,p],P[0]=i,P[1]=p,P[2]=h,P[3]=K;else h=P[2],K=P[3];A(h,K);let O;if(P[4]!==x||P[5]!==i)O=e(s_.Provider,{value:i,children:x}),P[4]=x,P[5]=i,P[6]=O;else O=P[6];return O}
export{gOn,Ql,ySe,nC,_Se,$7t,s_,hOn};
