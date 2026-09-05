// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import"/$bunfs/root/_837.js";var t=new Set(["update","upgrade","doctor"]);function r(n){let e=n.indexOf("mcp");return e!==-1&&n[e+1]==="serve"}function i(n){return n.some((e,o)=>(e==="plugin"||e==="plugins")&&n[o+1]==="eval")}export{t as NON_REPL_SUBCOMMANDS,r as isMcpServeInvocation,i as isPluginEvalInvocation};
