// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{$ct,xGn,PGn,Fct,LNe,HGn,Uct,OGn,Dae,Lae,VTe,Eee,M9,$Ne,ID}from"/$bunfs/root/chunk-cqc88nqm.js";import{Yae,uw}from"/$bunfs/root/chunk-35k7s716.js";var v=Object.prototype,d=v.hasOwnProperty;function g(r,t,e){var o=r[t];if(!(d.call(r,t)&&Yae(o,e))||e===void 0&&!(t in r))Lae(r,t,e)}var fNe=g;function P(r,t,e,o){if(!uw(r))return r;t=Eee(t,r);var i=-1,m=t.length,s=m-1,n=r;while(n!=null&&++i<m){var f=M9(t[i]),a=e;if(f==="__proto__"||f==="constructor"||f==="prototype")return r;if(i!=s){var p=n[f];if(a=o?o(p,f,n):void 0,a===void 0)a=uw(p)?p:LNe(t[i+1])?[]:{}}fNe(n,f,a),n=n[f]}return r}var u=P;function x(r,t,e){var o=-1,i=t.length,m={};while(++o<i){var s=t[o],n=$Ne(r,s);if(e(n,s))u(m,Eee(s,r),n)}return m}var V2n=x;var O=OGn(Object.getPrototypeOf,Object),FDt=O;var I=Object.getOwnPropertySymbols,h=!I?PGn:function(r){var t=[];while(r)$ct(t,Fct(r)),r=FDt(r);return t},q2n=h;function K(r){var t=[];if(r!=null)for(var e in Object(r))t.push(e);return t}var l=K;var c=Object.prototype,A=c.hasOwnProperty;function S(r){if(!uw(r))return l(r);var t=Uct(r),e=[];for(var o in r)if(!(o=="constructor"&&(t||!A.call(r,o))))e.push(o);return e}var y=S;function w(r){return Dae(r)?HGn(r,!0):y(r)}var xTe=w;function b(r){return xGn(r,xTe,q2n)}var UDt=b;function _(r,t){if(r==null)return{};var e=VTe(UDt(r),function(o){return[o]});return t=ID(t),V2n(r,e,function(o,i){return t(o,i[0])})}var Jo=_;
export{fNe,V2n,FDt,q2n,xTe,UDt,Jo};
