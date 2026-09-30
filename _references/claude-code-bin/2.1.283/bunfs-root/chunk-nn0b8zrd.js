// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{qe,_u,Yn}from"/$bunfs/root/chunk-nvht7ckf.js";import{$l}from"/$bunfs/root/chunk-4h0c4z04.js";import{pt,Rn,nr,FE,vt}from"/$bunfs/root/chunk-t6pwageh.js";import{gE}from"/$bunfs/root/chunk-csayct82.js";import{S2}from"/$bunfs/root/chunk-4sttekj6.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function fQe(){return pt()&&Rn()?.billingType!=="usage_based"&&$l()&&_u()&&!Yn()&&!vt()}function J7(e){return fQe()&&S2(e)&&e.rateLimitType==="five_hour"}var r=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function gKt(e){return fQe()&&S2(e)&&e.rateLimitType!==void 0&&r.includes(e.rateLimitType)}function mQe(){switch(nr()){case"pro":return"pro";case"max":switch(FE()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function SWe(){gE({agentId:qe(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{fQe,J7,gKt,mQe,SWe};
