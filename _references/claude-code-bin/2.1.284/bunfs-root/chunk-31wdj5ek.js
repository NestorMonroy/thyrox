// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ie,C,g,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function pw(r){let[t,n]=g({attempts:0,refused:null}),s=ie((e)=>{n((a)=>({attempts:a.attempts+1,refused:e}))},[]),u=ie((e)=>{if(r(e)===!1)return s(e),!1;return!0},[r,s]);return C(()=>{if(t.refused!==null)n((e)=>({attempts:e.attempts,refused:null}))},[t.refused]),{answer:u,refuse:s,refused:t.refused,attempts:t.attempts}}
export{pw};
