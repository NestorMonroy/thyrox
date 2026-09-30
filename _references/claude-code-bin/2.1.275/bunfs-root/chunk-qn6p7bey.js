// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Oo,jo,$S,ja,sE}from"/$bunfs/root/chunk-ef7ymgv3.js";function ade(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function YHt(r){if(r instanceof sE)return!0;if(ade(r))return!1;if(r instanceof $S&&(r.status===403||r.status===401))return r.code!==Oo.ClientHttpAuthentication&&r.code!==Oo.ClientHttpForbidden;if(r instanceof Error&&!(r instanceof ja)&&!(r instanceof jo)&&"code"in r&&(r.code===403||r.code===401))return!0;return!1}
export{ade,YHt};
