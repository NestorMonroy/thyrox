// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{HE}from"/$bunfs/root/chunk-fsx1dvsr.js";import{IW,qt}from"/$bunfs/root/chunk-mtdq9gav.js";import{Oo}from"/$bunfs/root/chunk-8768f31s.js";import{le,X,g,D}from"/$bunfs/root/chunk-mqace48v.js";import{Rw}from"/$bunfs/root/chunk-m3qr9kbd.js";D();function To(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=X(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return qt(a,{context:"Global",isActive:e}),o}function JZe(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:X(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=HE(),[n,t]=g({pending:!1,keyName:null}),o=X(()=>r??e,[r,e]),a=Rw(),l=Oo("app:interrupt","Global","Ctrl-C"),p=Oo("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",m=a&&p?p:"Ctrl-D",u=IW((s)=>t({pending:s,keyName:d}),o),x=IW((s)=>t({pending:s,keyName:m}),o),y=le(()=>{if(i?.())return;u()},[u,i]),b=le(()=>{x()},[x]);return{handleInterrupt:y,handleExit:b,exitState:n}}
export{To,JZe};
