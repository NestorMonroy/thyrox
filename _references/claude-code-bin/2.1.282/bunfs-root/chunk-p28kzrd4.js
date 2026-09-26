// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Iv}from"/$bunfs/root/chunk-29mppvsc.js";import{h1,It}from"/$bunfs/root/chunk-rj4gmkys.js";import{qo}from"/$bunfs/root/chunk-1fpf2jg1.js";import{AS}from"/$bunfs/root/chunk-a0njem81.js";import{oe,J,g,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();function Ur(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=J(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return It(a,{context:"Global",isActive:e}),o}function N9e(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:J(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=Iv(),[n,t]=g({pending:!1,keyName:null}),o=J(()=>r??e,[r,e]),a=AS(),l=qo("app:interrupt","Global","Ctrl-C"),p=qo("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",m=a&&p?p:"Ctrl-D",u=h1((s)=>t({pending:s,keyName:d}),o),x=h1((s)=>t({pending:s,keyName:m}),o),y=oe(()=>{if(i?.())return;u()},[u,i]),b=oe(()=>{x()},[x]);return{handleInterrupt:y,handleExit:b,exitState:n}}
export{Ur,N9e};
