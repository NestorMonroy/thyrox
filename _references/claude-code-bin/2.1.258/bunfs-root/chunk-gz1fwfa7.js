// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Zre,IB,c7}from"/$bunfs/root/chunk-vhfg27dt.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";import{hn,We,v,V,d,It,j}from"/$bunfs/root/chunk-db688wrz.js";var Ok=16;j();j();var l=hn({isTerminalFocused:!0,terminalFocusState:"unknown"});l.displayName="TerminalFocusContext";function gln(g){let N=y(6),{children:F}=g,b=It(c7,Zre),x=It(c7,IB),P;if(N[0]!==b||N[1]!==x)P={isTerminalFocused:b,terminalFocusState:x},N[0]=b,N[1]=x,N[2]=P;else P=N[2];let C=P,A;if(N[3]!==F||N[4]!==C)A=e(l.Provider,{value:C,children:F}),N[3]=F,N[4]=C,N[5]=A;else A=N[5];return A}var m=l;function Ka(){let{isTerminalFocused:n}=We(m);return n}function Oce(){let{terminalFocusState:n}=We(m);return n}j();function O(){return S(Ok)}var bF=(n,r)=>{let t=setTimeout(n,r);return()=>clearTimeout(t)},Nce=()=>()=>{},cFt=()=>null;function S(n){let r=new Map,t=null,c=n,f=performance.now(),s=0;function I(){s=performance.now()-f;for(let o of r.keys())o()}function a(){if([...r.values()].some(Boolean)){if(t)clearInterval(t),t=null;t=setInterval(I,c)}else if(t)clearInterval(t),t=null}function T(o,u){return r.set(o,u),a(),()=>{r.delete(o),a()}}return{subscribeKeepAlive(o){return T(o,!0)},subscribeFollower(o){return T(o,!1)},now(){if(t&&s)return s;return performance.now()-f},setTickInterval(o){if(o===c)return;c=o,a()},setTimeout(o,u){let w=setTimeout(o,u);return()=>clearTimeout(w)}}}var oC=hn(null),R=Ok*2;function hln(Y){let h=y(7),{children:k}=Y,[i]=d(O),p=Ka(),E,K;if(h[0]!==i||h[1]!==p)E=()=>{i.setTickInterval(p?Ok:R)},K=[i,p],h[0]=i,h[1]=p,h[2]=E,h[3]=K;else E=h[2],K=h[3];v(E,K);let M;if(h[4]!==k||h[5]!==i)M=e(oC.Provider,{value:i,children:k}),h[4]=k,h[5]=i,h[6]=M;else M=h[6];return M}
export{Ok,gln,Ka,Oce,bF,Nce,cFt,oC,hln};
