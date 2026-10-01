// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{d_t,vZn,kZn,u_t,Yje,TZn,p_t,AZn,cpe,dpe,RPe,Ooe,SQ,Qje,FD}from"/$bunfs/root/chunk-hbjpbz2q.js";import{kpe,xv}from"/$bunfs/root/chunk-4dvekan0.js";var v=Object.prototype,d=v.hasOwnProperty;function g(r,t,e){var o=r[t];if(!(d.call(r,t)&&kpe(o,e))||e===void 0&&!(t in r))dpe(r,t,e)}var Eje=g;function P(r,t,e,o){if(!xv(r))return r;t=Ooe(t,r);var i=-1,m=t.length,s=m-1,n=r;while(n!=null&&++i<m){var f=SQ(t[i]),a=e;if(f==="__proto__"||f==="constructor"||f==="prototype")return r;if(i!=s){var p=n[f];if(a=o?o(p,f,n):void 0,a===void 0)a=xv(p)?p:Yje(t[i+1])?[]:{}}Eje(n,f,a),n=n[f]}return r}var u=P;function x(r,t,e){var o=-1,i=t.length,m={};while(++o<i){var s=t[o],n=Qje(r,s);if(e(n,s))u(m,Ooe(s,r),n)}return m}var OQn=x;var O=AZn(Object.getPrototypeOf,Object),pGt=O;var I=Object.getOwnPropertySymbols,h=!I?kZn:function(r){var t=[];while(r)d_t(t,u_t(r)),r=pGt(r);return t},MQn=h;function K(r){var t=[];if(r!=null)for(var e in Object(r))t.push(e);return t}var l=K;var c=Object.prototype,A=c.hasOwnProperty;function S(r){if(!xv(r))return l(r);var t=p_t(r),e=[];for(var o in r)if(!(o=="constructor"&&(t||!A.call(r,o))))e.push(o);return e}var y=S;function w(r){return cpe(r)?TZn(r,!0):y(r)}var nPe=w;function b(r){return vZn(r,nPe,MQn)}var fGt=b;function _(r,t){if(r==null)return{};var e=RPe(fGt(r),function(o){return[o]});return t=FD(t),OQn(r,e,function(o,i){return t(o,i[0])})}var Gr=_;
export{Eje,OQn,pGt,MQn,nPe,fGt,Gr};
