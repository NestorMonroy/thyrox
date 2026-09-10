// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Ue}from"/$bunfs/root/chunk-jdw11prg.js";var c=50;function ZY(){let s=Ue(),e=[],i=0;return{publish(t,n){let r={line:t,level:n};if(i===0){e=[...e,r].slice(-c);return}s.emit(r)},takeBacklog(){let t=e;return e=[],t},subscribe(t){i+=1;let n=s.subscribe(t);return()=>{i-=1,n()}}}}
export{ZY};
