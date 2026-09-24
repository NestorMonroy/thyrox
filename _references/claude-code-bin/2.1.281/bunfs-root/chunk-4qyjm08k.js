// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{qe,Wd,Vn}from"/$bunfs/root/chunk-cqc88nqm.js";import{Xl}from"/$bunfs/root/chunk-6r1h1xyw.js";import{pt,xn,tr,VA,Tt}from"/$bunfs/root/chunk-5khn4tvf.js";import{Rv}from"/$bunfs/root/chunk-4n4g22z6.js";import{b2}from"/$bunfs/root/chunk-0k8hskk2.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function s9e(){return pt()&&xn()?.billingType!=="usage_based"&&Xl()&&Wd()&&!Vn()&&!Tt()}function RX(e){return s9e()&&b2(e)&&e.rateLimitType==="five_hour"}var r=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function Vjt(e){return s9e()&&b2(e)&&e.rateLimitType!==void 0&&r.includes(e.rateLimitType)}function i9e(){switch(tr()){case"pro":return"pro";case"max":switch(VA()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function $Ue(){Rv({agentId:qe(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{s9e,RX,Vjt,i9e,$Ue};
