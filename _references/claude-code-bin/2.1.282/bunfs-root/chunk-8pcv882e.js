// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
var HRe="tengu_wise_bear_copy";function lqr(e){switch(e){case"five_hour":return"session";case"seven_day":return"weekly";case"seven_day_opus":case"seven_day_sonnet":case"seven_day_overage_included":return"model";default:return}}function p8n(e){return typeof e==="object"&&e!==null&&Reflect.get(e,"only_if_unused_reset")===!0}function cqr(e,i,u,s){if(typeof e!=="object"||e===null)return;if(p8n(e)&&s!==!0)return;let n=Reflect.get(e,`note_${i}`);if(typeof n!=="string")return;let t=u(n);return t&&!(t.endsWith("\u2026")&&!n.trimEnd().endsWith("\u2026"))?t:void 0}
export{HRe,lqr,p8n,cqr};
