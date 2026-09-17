// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{Dce,bD,y6}from"/$bunfs/root/chunk-p23d9ghy.js";import{Kt,Me,A,m,Ot,L}from"/$bunfs/root/chunk-s59wj17y.js";var Gh=16,egr=50,tgr=4;L();L();var l=Kt({isTerminalFocused:!0,terminalFocusState:"unknown"});l.displayName="TerminalFocusContext";function tIn(D){let N=S(6),{children:f}=D,F=Ot(y6,Dce),x=Ot(y6,bD),_;if(N[0]!==F||N[1]!==x)_={isTerminalFocused:F,terminalFocusState:x},N[0]=F,N[1]=x,N[2]=_;else _=N[2];let I=_,P;if(N[3]!==f||N[4]!==I)P=e(l.Provider,{value:I,children:f}),N[3]=f,N[4]=I,N[5]=P;else P=N[5];return P}var p=l;function Gl(){let{isTerminalFocused:n}=Me(p);return n}function J_e(){let{terminalFocusState:n}=Me(p);return n}L();function U(){return R(Gh)}var xT=(n,r)=>{let t=setTimeout(n,r);return()=>clearTimeout(t)},Q_e=()=>()=>{},d9t=()=>null;function R(n){let r=new Map,t=null,i=n,T=performance.now(),s=0;function k(){s=performance.now()-T;for(let o of r.keys())o()}function a(){if([...r.values()].some(Boolean)){if(t)clearInterval(t),t=null;t=setInterval(k,i)}else if(t)clearInterval(t),t=null}function v(o,u){return r.set(o,u),a(),()=>{r.delete(o),a()}}return{subscribeKeepAlive(o){return v(o,!0)},subscribeFollower(o){return v(o,!1)},now(){if(t&&s)return s;return performance.now()-T},setTickInterval(o){if(o===i)return;i=o,a()},setTimeout(o,u){let y=setTimeout(o,u);return()=>clearTimeout(y)}}}var Xy=Kt(null),C=Gh*2;function nIn(X){let w=S(7),{children:b}=X,[c]=m(U),d=Gl(),M,E;if(w[0]!==c||w[1]!==d)M=()=>{c.setTickInterval(d?Gh:C)},E=[c,d],w[0]=c,w[1]=d,w[2]=M,w[3]=E;else M=w[2],E=w[3];A(M,E);let O;if(w[4]!==b||w[5]!==c)O=e(Xy.Provider,{value:c,children:b}),w[4]=b,w[5]=c,w[6]=O;else O=w[6];return O}
export{Gh,egr,tgr,tIn,Gl,J_e,xT,Q_e,d9t,Xy,nIn};
