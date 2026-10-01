// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{bu,dQ,uQ,rpe,evn,NT,hO}from"/$bunfs/root/chunk-hqt9kt0y.js";var R6e="next";function Yq(n,s,r){let e=!1,i;return s.update(n,(t)=>{if(i=t,t.notified)return t;if(e=!0,r?.skipStampIfRunning&&t.status==="running")return t;return{...t,notified:!0}}),{claimed:e,task:i}}function $i({taskId:n,toolUseId:s,taskType:r,outputFile:e,status:i,summary:t,body:u,trailing:d}){let f=[[dQ,n],[uQ,s],[rpe,r],[evn,e],[NT,i],[hO,t]],o=`<${bu}>`;for(let[a,T]of f)if(T)o+=`
<${a}>${T}</${a}>`;return`${o}${u??""}
</${bu}>${d??""}`}
export{R6e,Yq,$i};
