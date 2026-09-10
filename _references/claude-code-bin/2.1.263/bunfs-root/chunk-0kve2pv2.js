// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{cE}from"/$bunfs/root/chunk-ne2fkdm9.js";import{Ze}from"/$bunfs/root/chunk-eez5re3r.js";import{Zr}from"/$bunfs/root/chunk-xhka0b1r.js";import{Ox}from"/$bunfs/root/chunk-k50zcsr0.js";import{Th}from"/$bunfs/root/chunk-jakn759h.js";import{re,q,d,F}from"/$bunfs/root/chunk-1c6mq242.js";F();function is(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=q(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return Ze(a,{context:"Global",isActive:e}),o}function len(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:q(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=cE(),[n,t]=d({pending:!1,keyName:null}),o=q(()=>r??e,[r,e]),a=Th(),l=Zr("app:interrupt","Global","Ctrl-C"),p=Zr("app:exit","Global","Ctrl-D"),m=a&&l?l:"Ctrl-C",y=a&&p?p:"Ctrl-D",u=Ox((s)=>t({pending:s,keyName:m}),o),x=Ox((s)=>t({pending:s,keyName:y}),o),b=re(()=>{if(i?.())return;u()},[u,i]),C=re(()=>{x()},[x]);return{handleInterrupt:b,handleExit:C,exitState:n}}
export{is,len};
