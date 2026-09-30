// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{MQe,gCn,yCn,DQe,wIe,_Cn,LQe,bCn,ane,lne,B_e,LX,h6,EIe,gD}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Sne,Hb}from"/$bunfs/root/chunk-gfewy5rb.js";var v=Object.prototype,d=v.hasOwnProperty;function g(r,t,e){var o=r[t];if(!(d.call(r,t)&&Sne(o,e))||e===void 0&&!(t in r))lne(r,t,e)}var Qxe=g;function P(r,t,e,o){if(!Hb(r))return r;t=LX(t,r);var i=-1,m=t.length,s=m-1,n=r;while(n!=null&&++i<m){var f=h6(t[i]),a=e;if(f==="__proto__"||f==="constructor"||f==="prototype")return r;if(i!=s){var p=n[f];if(a=o?o(p,f,n):void 0,a===void 0)a=Hb(p)?p:wIe(t[i+1])?[]:{}}Qxe(n,f,a),n=n[f]}return r}var u=P;function x(r,t,e){var o=-1,i=t.length,m={};while(++o<i){var s=t[o],n=EIe(r,s);if(e(n,s))u(m,LX(s,r),n)}return m}var DTn=x;var O=bCn(Object.getPrototypeOf,Object),VEt=O;var I=Object.getOwnPropertySymbols,h=!I?yCn:function(r){var t=[];while(r)MQe(t,DQe(r)),r=VEt(r);return t},LTn=h;function K(r){var t=[];if(r!=null)for(var e in Object(r))t.push(e);return t}var l=K;var c=Object.prototype,A=c.hasOwnProperty;function S(r){if(!Hb(r))return l(r);var t=LQe(r),e=[];for(var o in r)if(!(o=="constructor"&&(t||!A.call(r,o))))e.push(o);return e}var y=S;function w(r){return ane(r)?_Cn(r,!0):y(r)}var b_e=w;function b(r){return gCn(r,b_e,LTn)}var KEt=b;function _(r,t){if(r==null)return{};var e=B_e(KEt(r),function(o){return[o]});return t=gD(t),DTn(r,e,function(o,i){return t(o,i[0])})}var Xs=_;
export{Qxe,DTn,VEt,LTn,b_e,KEt,Xs};
