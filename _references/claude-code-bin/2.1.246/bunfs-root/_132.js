// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Axd as t}from"/$bunfs/root/_837.js";async function s(i){let e=await import("/$bunfs/root/chunk-defp4v29.js").then((n)=>n.listAllLiveSessions()).catch(()=>[]);for(let n of e)if(n.sessionId===i&&n.pid!==process.pid&&n.kind&&n.kind!=="interactive")return{kind:n.kind,jobId:n.jobId};return null}
export{s as vo};
