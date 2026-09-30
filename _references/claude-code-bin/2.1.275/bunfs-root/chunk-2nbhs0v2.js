// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
function WDt(e){return e.kind==="loop"?"loop_wakeup":"schedule_wakeup"}function GDt({promptSource:e,wakeupSource:r}){if(r)return r;switch(e){case"sdk":return"sdk";case"system":return"system";case"typed":case"queued":case"suggestion_accepted":return"user"}}function PVe({isNonInteractive:e,isMeta:r,callerSource:t}){if(r||t==="system")return"system";if(e)return"sdk";return t??"typed"}
export{WDt,GDt,PVe};
