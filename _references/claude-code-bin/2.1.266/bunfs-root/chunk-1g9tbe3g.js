// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Yoe,b0,ZV}from"/$bunfs/root/chunk-se56pc48.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{Kt,Oe,v,d,Ct,L}from"/$bunfs/root/chunk-v21q572m.js";var KT=16;L();L();var l=Kt({isTerminalFocused:!0,terminalFocusState:"unknown"});l.displayName="TerminalFocusContext";function Uon(H){let N=y(6),{children:F}=H,b=Ct(ZV,Yoe),x=Ct(ZV,b0),P;if(N[0]!==b||N[1]!==x)P={isTerminalFocused:b,terminalFocusState:x},N[0]=b,N[1]=x,N[2]=P;else P=N[2];let C=P,A;if(N[3]!==F||N[4]!==C)A=e(l.Provider,{value:C,children:F}),N[3]=F,N[4]=C,N[5]=A;else A=N[5];return A}var m=l;function Xa(){let{isTerminalFocused:n}=Oe(m);return n}function Qce(){let{terminalFocusState:n}=Oe(m);return n}L();function U(){return S(KT)}var TI=(n,r)=>{let t=setTimeout(n,r);return()=>clearTimeout(t)},Zce=()=>()=>{},WLt=()=>null;function S(n){let r=new Map,t=null,c=n,f=performance.now(),a=0;function I(){a=performance.now()-f;for(let o of r.keys())o()}function s(){if([...r.values()].some(Boolean)){if(t)clearInterval(t),t=null;t=setInterval(I,c)}else if(t)clearInterval(t),t=null}function T(o,u){return r.set(o,u),s(),()=>{r.delete(o),s()}}return{subscribeKeepAlive(o){return T(o,!0)},subscribeFollower(o){return T(o,!1)},now(){if(t&&a)return a;return performance.now()-f},setTickInterval(o){if(o===c)return;c=o,s()},setTimeout(o,u){let w=setTimeout(o,u);return()=>clearTimeout(w)}}}var Cv=Kt(null),R=KT*2;function Bon(Y){let h=y(7),{children:k}=Y,[i]=d(U),p=Xa(),E,K;if(h[0]!==i||h[1]!==p)E=()=>{i.setTickInterval(p?KT:R)},K=[i,p],h[0]=i,h[1]=p,h[2]=E,h[3]=K;else E=h[2],K=h[3];v(E,K);let O;if(h[4]!==k||h[5]!==i)O=e(Cv.Provider,{value:i,children:k}),h[4]=k,h[5]=i,h[6]=O;else O=h[6];return O}
export{KT,Uon,Xa,Qce,TI,Zce,WLt,Cv,Bon};
