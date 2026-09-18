// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Qv}from"/$bunfs/root/chunk-0hefd0r9.js";import{at,ID}from"/$bunfs/root/chunk-sjex7s6v.js";import{Co}from"/$bunfs/root/chunk-jat8c0jb.js";import{X_}from"/$bunfs/root/chunk-f7z6jxh1.js";import{oe,X,g,D}from"/$bunfs/root/chunk-347kpssc.js";D();function ks(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=X(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return at(a,{context:"Global",isActive:e}),o}function p0n(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:X(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=Qv(),[n,t]=g({pending:!1,keyName:null}),o=X(()=>r??e,[r,e]),a=X_(),l=Co("app:interrupt","Global","Ctrl-C"),p=Co("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",m=a&&p?p:"Ctrl-D",u=ID((s)=>t({pending:s,keyName:d}),o),x=ID((s)=>t({pending:s,keyName:m}),o),y=oe(()=>{if(i?.())return;u()},[u,i]),b=oe(()=>{x()},[x]);return{handleInterrupt:y,handleExit:b,exitState:n}}
export{ks,p0n};
