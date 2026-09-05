// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{doe,MB,h7}from"/$bunfs/root/chunk-yj7edqzj.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{_n,ze,v,K,d,Tt,j}from"/$bunfs/root/chunk-w71cs9yg.js";var Gk=16;j();j();var l=_n({isTerminalFocused:!0,terminalFocusState:"unknown"});l.displayName="TerminalFocusContext";function bnn(H){let N=y(6),{children:F}=H,b=Tt(h7,doe),x=Tt(h7,MB),P;if(N[0]!==b||N[1]!==x)P={isTerminalFocused:b,terminalFocusState:x},N[0]=b,N[1]=x,N[2]=P;else P=N[2];let C=P,A;if(N[3]!==F||N[4]!==C)A=e(l.Provider,{value:C,children:F}),N[3]=F,N[4]=C,N[5]=A;else A=N[5];return A}var m=l;function Za(){let{isTerminalFocused:n}=ze(m);return n}function Qle(){let{terminalFocusState:n}=ze(m);return n}j();function U(){return S(Gk)}var gF=(n,r)=>{let t=setTimeout(n,r);return()=>clearTimeout(t)},Zle=()=>()=>{},v0t=()=>null;function S(n){let r=new Map,t=null,c=n,f=performance.now(),s=0;function I(){s=performance.now()-f;for(let o of r.keys())o()}function a(){if([...r.values()].some(Boolean)){if(t)clearInterval(t),t=null;t=setInterval(I,c)}else if(t)clearInterval(t),t=null}function T(o,u){return r.set(o,u),a(),()=>{r.delete(o),a()}}return{subscribeKeepAlive(o){return T(o,!0)},subscribeFollower(o){return T(o,!1)},now(){if(t&&s)return s;return performance.now()-f},setTickInterval(o){if(o===c)return;c=o,a()},setTimeout(o,u){let w=setTimeout(o,u);return()=>clearTimeout(w)}}}var uC=_n(null),R=Gk*2;function Snn(Y){let h=y(7),{children:k}=Y,[i]=d(U),p=Za(),E,M;if(h[0]!==i||h[1]!==p)E=()=>{i.setTickInterval(p?Gk:R)},M=[i,p],h[0]=i,h[1]=p,h[2]=E,h[3]=M;else E=h[2],M=h[3];v(E,M);let O;if(h[4]!==k||h[5]!==i)O=e(uC.Provider,{value:i,children:k}),h[4]=k,h[5]=i,h[6]=O;else O=h[6];return O}
export{Gk,bnn,Za,Qle,gF,Zle,v0t,uC,Snn};
