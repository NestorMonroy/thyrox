// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{zo,cs,bv,hl,Hk}from"/$bunfs/root/chunk-8gvnr64m.js";function Pye(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function $2t(r){if(r instanceof Hk)return!0;if(Pye(r))return!1;if(r instanceof bv&&(r.status===403||r.status===401))return r.code!==zo.ClientHttpAuthentication&&r.code!==zo.ClientHttpForbidden;if(r instanceof Error&&!(r instanceof hl)&&!(r instanceof cs)&&"code"in r&&(r.code===403||r.code===401))return!0;return!1}
export{Pye,$2t};
