// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ao,bo,A_,Ki,zA}from"/$bunfs/root/chunk-qwg4jb6f.js";function mee(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function Klt(r){if(r instanceof zA)return!0;if(mee(r))return!1;if(r instanceof A_&&(r.status===403||r.status===401))return r.code!==ao.ClientHttpAuthentication&&r.code!==ao.ClientHttpForbidden;if(r instanceof Error&&!(r instanceof Ki)&&!(r instanceof bo)&&"code"in r&&(r.code===403||r.code===401))return!0;return!1}
export{mee,Klt};
