// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{$Je,sEn,aEn,FJe,XRe,lEn,UJe,cEn,ute,dte,Sye,Z9,I3,QRe,QM}from"/$bunfs/root/chunk-ja309z9r.js";import{wte,Sb}from"/$bunfs/root/chunk-g5h2a16k.js";var v=Object.prototype,d=v.hasOwnProperty;function g(r,t,e){var o=r[t];if(!(d.call(r,t)&&wte(o,e))||e===void 0&&!(t in r))dte(r,t,e)}var RRe=g;function P(r,t,e,o){if(!Sb(r))return r;t=Z9(t,r);var i=-1,m=t.length,s=m-1,n=r;while(n!=null&&++i<m){var f=I3(t[i]),a=e;if(f==="__proto__"||f==="constructor"||f==="prototype")return r;if(i!=s){var p=n[f];if(a=o?o(p,f,n):void 0,a===void 0)a=Sb(p)?p:XRe(t[i+1])?[]:{}}RRe(n,f,a),n=n[f]}return r}var u=P;function x(r,t,e){var o=-1,i=t.length,m={};while(++o<i){var s=t[o],n=QRe(r,s);if(e(n,s))u(m,Z9(s,r),n)}return m}var Tvn=x;var O=cEn(Object.getPrototypeOf,Object),Swt=O;var I=Object.getOwnPropertySymbols,h=!I?aEn:function(r){var t=[];while(r)$Je(t,FJe(r)),r=Swt(r);return t},Cvn=h;function K(r){var t=[];if(r!=null)for(var e in Object(r))t.push(e);return t}var l=K;var c=Object.prototype,A=c.hasOwnProperty;function S(r){if(!Sb(r))return l(r);var t=UJe(r),e=[];for(var o in r)if(!(o=="constructor"&&(t||!A.call(r,o))))e.push(o);return e}var y=S;function w(r){return ute(r)?lEn(r,!0):y(r)}var Qhe=w;function b(r){return sEn(r,Qhe,Cvn)}var wwt=b;function _(r,t){if(r==null)return{};var e=Sye(wwt(r),function(o){return[o]});return t=QM(t),Tvn(r,e,function(o,i){return t(o,i[0])})}var ui=_;
export{RRe,Tvn,Swt,Cvn,Qhe,wwt,ui};
