// @bun @bytecode @bun-cjs
(function(exports, require, module, __filename, __dirname) {// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.241
var o=Object.create;var{getPrototypeOf:B,defineProperty:E,getOwnPropertyNames:e,getOwnPropertyDescriptor:n}=Object,f=Object.prototype.hasOwnProperty;function M(H){return this[H]}var l=(H,L,A)=>{var t=L&&typeof L==="object"||typeof L==="function"?e(L):[];for(let I of t)if(!f.call(H,I)&&I!=="default")E(H,I,{get:M.bind(L,I),enumerable:!0});if(A){for(let I of t)if(!f.call(A,I)&&I!=="default")E(A,I,{get:M.bind(L,I),enumerable:!0});return A}},p,_,c=(H,L,A)=>{var t=H!=null&&typeof H==="object";if(t){var I=L?p??=new WeakMap:_??=new WeakMap,r=I.get(H);if(r)return r}A=H!=null?o(B(H)):{};let D=L||!H||!H.__esModule?E(A,"default",{value:H,enumerable:!0}):A;if(H&&typeof H==="object"||typeof H==="function"){for(let u of e(H))if(!f.call(D,u))E(D,u,{get:M.bind(H,u),enumerable:!0})}if(t)I.set(H,D);return D},P=(H)=>{var L=(s??=new WeakMap).get(H),A;if(L)return L;if(L=E({},"__esModule",{value:!0}),H&&typeof H==="object"||typeof H==="function"){for(var t of e(H))if(!f.call(L,t))E(L,t,{get:M.bind(H,t),enumerable:!(A=n(H,t))||A.enumerable})}return s.set(H,L),L},s,a=(H,L)=>()=>(L||H((L={exports:{}}).exports,L),L.exports);var C=(H)=>H;function U(H,L){this[H]=C.bind(null,L)}var F=(H,L)=>{for(var A in L)E(H,A,{get:L[A],enumerable:!0,configurable:!0,set:U.bind(L,A)})};var T=(H,L)=>()=>(H&&(L=H(H=0)),L);var G=Symbol.for("react.memo_cache_sentinel"),x=Symbol.for("react.early_return_sentinel");var i=a(function(S,d){d.exports=require("/$bunfs/root/audio-capture.node")});module.exports=i();})
