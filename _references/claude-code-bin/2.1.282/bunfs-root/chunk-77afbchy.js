// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{qe,ou,qn}from"/$bunfs/root/chunk-zwm3fybx.js";import{Cl}from"/$bunfs/root/chunk-txvgrx83.js";import{gt,In,rr,_E,Et}from"/$bunfs/root/chunk-wbbthbh9.js";import{Yv}from"/$bunfs/root/chunk-c9jscxk0.js";import{Wz}from"/$bunfs/root/chunk-fn4p1t25.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function UXe(){return gt()&&In()?.billingType!=="usage_based"&&Cl()&&ou()&&!qn()&&!Et()}function kJ(e){return UXe()&&Wz(e)&&e.rateLimitType==="five_hour"}var r=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function $Gt(e){return UXe()&&Wz(e)&&e.rateLimitType!==void 0&&r.includes(e.rateLimitType)}function BXe(){switch(rr()){case"pro":return"pro";case"max":switch(_E()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function f1e(){Yv({agentId:qe(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{UXe,kJ,$Gt,BXe,f1e};
