// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{lht,gJn,yJn,cht,D1e,_Jn,dht,bJn,Aue,Cue,xIe,eoe,F7,$1e,f0}from"/$bunfs/root/chunk-bxhyh54r.js";import{Fue,fv}from"/$bunfs/root/chunk-actz3rxp.js";var v=Object.prototype,d=v.hasOwnProperty;function g(r,t,e){var o=r[t];if(!(d.call(r,t)&&Fue(o,e))||e===void 0&&!(t in r))Cue(r,t,e)}var m1e=g;function P(r,t,e,o){if(!fv(r))return r;t=eoe(t,r);var i=-1,m=t.length,s=m-1,n=r;while(n!=null&&++i<m){var f=F7(t[i]),a=e;if(f==="__proto__"||f==="constructor"||f==="prototype")return r;if(i!=s){var p=n[f];if(a=o?o(p,f,n):void 0,a===void 0)a=fv(p)?p:D1e(t[i+1])?[]:{}}m1e(n,f,a),n=n[f]}return r}var u=P;function x(r,t,e){var o=-1,i=t.length,m={};while(++o<i){var s=t[o],n=$1e(r,s);if(e(n,s))u(m,eoe(s,r),n)}return m}var TXn=x;var O=bJn(Object.getPrototypeOf,Object),nWt=O;var I=Object.getOwnPropertySymbols,h=!I?yJn:function(r){var t=[];while(r)lht(t,cht(r)),r=nWt(r);return t},AXn=h;function K(r){var t=[];if(r!=null)for(var e in Object(r))t.push(e);return t}var l=K;var c=Object.prototype,A=c.hasOwnProperty;function S(r){if(!fv(r))return l(r);var t=dht(r),e=[];for(var o in r)if(!(o=="constructor"&&(t||!A.call(r,o))))e.push(o);return e}var y=S;function w(r){return Aue(r)?_Jn(r,!0):y(r)}var oIe=w;function b(r){return gJn(r,oIe,AXn)}var rWt=b;function _(r,t){if(r==null)return{};var e=xIe(rWt(r),function(o){return[o]});return t=f0(t),TXn(r,e,function(o,i){return t(o,i[0])})}var Wr=_;
export{m1e,TXn,nWt,AXn,oIe,rWt,Wr};
