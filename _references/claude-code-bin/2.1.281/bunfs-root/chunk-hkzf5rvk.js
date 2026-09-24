// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{hv}from"/$bunfs/root/chunk-b8sc2vbx.js";import{WB,It}from"/$bunfs/root/chunk-aqyv8yk5.js";import{Uo}from"/$bunfs/root/chunk-eb70xtcp.js";import{pS}from"/$bunfs/root/chunk-kt5jefj6.js";import{oe,J,g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function Fr(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=J(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return It(a,{context:"Global",isActive:e}),o}function n8e(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:J(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=hv(),[n,t]=g({pending:!1,keyName:null}),o=J(()=>r??e,[r,e]),a=pS(),l=Uo("app:interrupt","Global","Ctrl-C"),p=Uo("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",m=a&&p?p:"Ctrl-D",u=WB((s)=>t({pending:s,keyName:d}),o),x=WB((s)=>t({pending:s,keyName:m}),o),y=oe(()=>{if(i?.())return;u()},[u,i]),b=oe(()=>{x()},[x]);return{handleInterrupt:y,handleExit:b,exitState:n}}
export{Fr,n8e};
