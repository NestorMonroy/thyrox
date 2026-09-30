// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{_E}from"/$bunfs/root/chunk-k0qnyh4a.js";import{rW,Gt}from"/$bunfs/root/chunk-vtgx612r.js";import{Fo}from"/$bunfs/root/chunk-x1mpf080.js";import{ie,Y,g,D}from"/$bunfs/root/chunk-bqbammwz.js";import{hw}from"/$bunfs/root/chunk-xz8f6z67.js";D();function mo(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=Y(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return Gt(a,{context:"Global",isActive:e}),o}function bQe(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:Y(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=_E(),[n,t]=g({pending:!1,keyName:null}),o=Y(()=>r??e,[r,e]),a=hw(),l=Fo("app:interrupt","Global","Ctrl-C"),p=Fo("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",m=a&&p?p:"Ctrl-D",u=rW((s)=>t({pending:s,keyName:d}),o),x=rW((s)=>t({pending:s,keyName:m}),o),y=ie(()=>{if(i?.())return;u()},[u,i]),b=ie(()=>{x()},[x]);return{handleInterrupt:y,handleExit:b,exitState:n}}
export{mo,bQe};
