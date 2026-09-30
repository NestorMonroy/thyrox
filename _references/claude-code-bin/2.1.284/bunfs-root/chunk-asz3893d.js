// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{_ht,DJn,NJn,bht,H1e,$Jn,Sht,FJn,Cue,Rue,FPe,Qre,L7,D1e,oD}from"/$bunfs/root/chunk-d37h8mav.js";import{Uue,lv}from"/$bunfs/root/chunk-zy97v06w.js";var v=Object.prototype,d=v.hasOwnProperty;function g(r,t,e){var o=r[t];if(!(d.call(r,t)&&Uue(o,e))||e===void 0&&!(t in r))Rue(r,t,e)}var g1e=g;function P(r,t,e,o){if(!lv(r))return r;t=Qre(t,r);var i=-1,m=t.length,s=m-1,n=r;while(n!=null&&++i<m){var f=L7(t[i]),a=e;if(f==="__proto__"||f==="constructor"||f==="prototype")return r;if(i!=s){var p=n[f];if(a=o?o(p,f,n):void 0,a===void 0)a=lv(p)?p:H1e(t[i+1])?[]:{}}g1e(n,f,a),n=n[f]}return r}var u=P;function x(r,t,e){var o=-1,i=t.length,m={};while(++o<i){var s=t[o],n=D1e(r,s);if(e(n,s))u(m,Qre(s,r),n)}return m}var JXn=x;var O=FJn(Object.getPrototypeOf,Object),kWt=O;var I=Object.getOwnPropertySymbols,h=!I?NJn:function(r){var t=[];while(r)_ht(t,bht(r)),r=kWt(r);return t},QXn=h;function K(r){var t=[];if(r!=null)for(var e in Object(r))t.push(e);return t}var l=K;var c=Object.prototype,A=c.hasOwnProperty;function S(r){if(!lv(r))return l(r);var t=Sht(r),e=[];for(var o in r)if(!(o=="constructor"&&(t||!A.call(r,o))))e.push(o);return e}var y=S;function w(r){return Cue(r)?$Jn(r,!0):y(r)}var SPe=w;function b(r){return DJn(r,SPe,QXn)}var TWt=b;function _(r,t){if(r==null)return{};var e=FPe(TWt(r),function(o){return[o]});return t=oD(t),JXn(r,e,function(o,i){return t(o,i[0])})}var Wr=_;
export{g1e,JXn,kWt,QXn,SPe,TWt,Wr};
