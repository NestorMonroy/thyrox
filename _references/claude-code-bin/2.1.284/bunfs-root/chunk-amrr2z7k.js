// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ve,wu,Zn}from"/$bunfs/root/chunk-d37h8mav.js";import{zl}from"/$bunfs/root/chunk-12vsw1j8.js";import{ut,Cn,ar,Xw,kt}from"/$bunfs/root/chunk-swk3rjnt.js";import{HE}from"/$bunfs/root/chunk-77kn462z.js";import{Y2}from"/$bunfs/root/chunk-5spe3fq0.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function XZe(){return ut()&&Cn()?.billingType!=="usage_based"&&zl()&&wu()&&!Zn()&&!kt()}function MQ(e){return XZe()&&Y2(e)&&e.rateLimitType==="five_hour"}var r=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function K5t(e){return XZe()&&Y2(e)&&e.rateLimitType!==void 0&&r.includes(e.rateLimitType)}function JZe(){switch(ar()){case"pro":return"pro";case"max":switch(Xw()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function qGe(){HE({agentId:Ve(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{XZe,MQ,K5t,JZe,qGe};
