// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{gE}from"/$bunfs/root/chunk-gjfhbdvy.js";import{lW,Vt}from"/$bunfs/root/chunk-qscqg3s6.js";import{Go}from"/$bunfs/root/chunk-7y1an4hw.js";import{mw}from"/$bunfs/root/chunk-bbak1kgc.js";import{ie,X,g,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function Vr(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=X(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return Vt(a,{context:"Global",isActive:e}),o}function _Qe(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:X(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=gE(),[n,t]=g({pending:!1,keyName:null}),o=X(()=>r??e,[r,e]),a=mw(),l=Go("app:interrupt","Global","Ctrl-C"),p=Go("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",m=a&&p?p:"Ctrl-D",u=lW((s)=>t({pending:s,keyName:d}),o),x=lW((s)=>t({pending:s,keyName:m}),o),y=ie(()=>{if(i?.())return;u()},[u,i]),b=ie(()=>{x()},[x]);return{handleInterrupt:y,handleExit:b,exitState:n}}
export{Vr,_Qe};
