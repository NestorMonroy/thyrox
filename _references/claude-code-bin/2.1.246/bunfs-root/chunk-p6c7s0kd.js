// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Pcd as n,Rcd as s}from"/$bunfs/root/_814.js";import{Eod as o,Fod as t,atd as a}from"/$bunfs/root/_826.js";import"/$bunfs/root/_827.js";import"/$bunfs/root/_828.js";import"/$bunfs/root/_829.js";import"/$bunfs/root/_836.js";import{xxd as m}from"/$bunfs/root/_837.js";var f=async(d,r)=>{let e=!o();return t(e),r.sessionState?.notifyInternalMetadataChanged({memory_toggled_off:e?!0:null}),n("tengu_memory_toggled",{toggled_off:e}),{type:"text",value:e?`Memory paused for this session \xB7 this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.

Run /pause-memory again to resume.`:"Memory resumed \xB7 memory content may be referenced and new memories can be saved."}};var l=m(()=>{a();s()});l();export{f as call};
