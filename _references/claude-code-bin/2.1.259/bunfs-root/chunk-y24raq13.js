// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{U,v,d,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();function jh(r){let[t,n]=d({attempts:0,refused:null}),s=U((e)=>{n((a)=>({attempts:a.attempts+1,refused:e}))},[]),u=U((e)=>{if(r(e)===!1)return s(e),!1;return!0},[r,s]);return v(()=>{if(t.refused!==null)n((e)=>({attempts:e.attempts,refused:null}))},[t.refused]),{answer:u,refuse:s,refused:t.refused,attempts:t.attempts}}
export{jh};
