// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as u}from"/$bunfs/root/_837.js";function c(i,s){let e=0,n=[];function o(){if(e<i)return e++,Promise.resolve();return new Promise((r)=>n.push(r))}function t(){let r=n.shift();if(r)r();else e--}return async(...r)=>{await o();try{return await s(...r)}finally{t()}}}var a=()=>{};
export{c as OXc,a as PXc};
