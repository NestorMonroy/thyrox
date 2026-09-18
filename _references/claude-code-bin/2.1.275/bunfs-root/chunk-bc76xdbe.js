// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{_d,p6,tkt,jje,FXr,Gv,QP}from"/$bunfs/root/chunk-gh1pqen9.js";var v$e="next";function rj(n,s,r){let e=!1,i;return s.update(n,(t)=>{if(i=t,t.notified)return t;if(e=!0,r?.skipStampIfRunning&&t.status==="running")return t;return{...t,notified:!0}}),{claimed:e,task:i}}function xi({taskId:n,toolUseId:s,taskType:r,outputFile:e,status:i,summary:t,body:u,trailing:d}){let f=[[p6,n],[tkt,s],[jje,r],[FXr,e],[Gv,i],[QP,t]],o=`<${_d}>`;for(let[a,T]of f)if(T)o+=`
<${a}>${T}</${a}>`;return`${o}${u??""}
</${_d}>${d??""}`}
export{v$e,rj,xi};
