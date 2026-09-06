// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{kre,TL,OV}from"/$bunfs/root/chunk-fp58hzfn.js";import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{Qt,De,E,d,At,F}from"/$bunfs/root/chunk-1c6mq242.js";var Sk=16;F();F();var l=Qt({isTerminalFocused:!0,terminalFocusState:"unknown"});l.displayName="TerminalFocusContext";function atn(H){let N=y(6),{children:T}=H,b=At(OV,kre),x=At(OV,TL),P;if(N[0]!==b||N[1]!==x)P={isTerminalFocused:b,terminalFocusState:x},N[0]=b,N[1]=x,N[2]=P;else P=N[2];let C=P,A;if(N[3]!==T||N[4]!==C)A=e(l.Provider,{value:C,children:T}),N[3]=T,N[4]=C,N[5]=A;else A=N[5];return A}var m=l;function qa(){let{isTerminalFocused:n}=De(m);return n}function _le(){let{terminalFocusState:n}=De(m);return n}F();function _(){return S(Sk)}var tF=(n,r)=>{let t=setTimeout(n,r);return()=>clearTimeout(t)},ble=()=>()=>{},j0t=()=>null;function S(n){let r=new Map,t=null,c=n,v=performance.now(),a=0;function I(){a=performance.now()-v;for(let o of r.keys())o()}function s(){if([...r.values()].some(Boolean)){if(t)clearInterval(t),t=null;t=setInterval(I,c)}else if(t)clearInterval(t),t=null}function f(o,u){return r.set(o,u),s(),()=>{r.delete(o),s()}}return{subscribeKeepAlive(o){return f(o,!0)},subscribeFollower(o){return f(o,!1)},now(){if(t&&a)return a;return performance.now()-v},setTickInterval(o){if(o===c)return;c=o,s()},setTimeout(o,u){let w=setTimeout(o,u);return()=>clearTimeout(w)}}}var JT=Qt(null),R=Sk*2;function ltn(Y){let h=y(7),{children:k}=Y,[i]=d(_),p=qa(),K,O;if(h[0]!==i||h[1]!==p)K=()=>{i.setTickInterval(p?Sk:R)},O=[i,p],h[0]=i,h[1]=p,h[2]=K,h[3]=O;else K=h[2],O=h[3];E(K,O);let U;if(h[4]!==k||h[5]!==i)U=e(JT.Provider,{value:i,children:k}),h[4]=k,h[5]=i,h[6]=U;else U=h[6];return U}
export{Sk,atn,qa,_le,tF,ble,j0t,JT,ltn};
