// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{ctd as S}from"/$bunfs/root/_827.js";import{pxd as c}from"/$bunfs/root/_836.js";import{xxd as u}from"/$bunfs/root/_837.js";function y(){let s=c(),e=[],i=0;return{publish(t,n){let r={line:t,level:n};if(i===0){e=[...e,r].slice(-a);return}s.emit(r)},takeBacklog(){let t=e;return e=[],t},subscribe(t){i+=1;let n=s.subscribe(t);return()=>{i-=1,n()}}}}var a=50;var l=u(()=>{S()});
export{y as nW,l as oW};
