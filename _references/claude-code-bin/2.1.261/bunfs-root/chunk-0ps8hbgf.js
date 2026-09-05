// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Ve,id,On}from"/$bunfs/root/chunk-annedm50.js";import{yt,gt,kn,Qn,Fw}from"/$bunfs/root/chunk-hyqdn9c0.js";import{vd}from"/$bunfs/root/chunk-hs05644q.js";import{Fb}from"/$bunfs/root/chunk-vd630rs0.js";import{jDt}from"/$bunfs/root/chunk-4hp4250a.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function $tn(){return gt()&&kn()?.billingType!=="usage_based"&&vd()&&id()&&!On()&&!yt()}function Cle(e){return $tn()&&jDt(e)&&e.rateLimitType==="five_hour"}function Wat(){switch(Qn()){case"pro":return"pro";case"max":switch(Fw()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function MWe(){Fb({agentId:Ve(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{$tn,Cle,Wat,MWe};
