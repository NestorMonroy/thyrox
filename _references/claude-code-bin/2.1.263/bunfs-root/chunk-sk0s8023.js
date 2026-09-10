// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Ve,ad,On}from"/$bunfs/root/chunk-k6vqz9fa.js";import{yt,gt,kn,Qn,Fw}from"/$bunfs/root/chunk-32f2qmtc.js";import{ju}from"/$bunfs/root/chunk-1wrntbps.js";import{Bb}from"/$bunfs/root/chunk-9wa0ka8p.js";import{GDt}from"/$bunfs/root/chunk-2c0zm87n.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function Mtn(){return gt()&&kn()?.billingType!=="usage_based"&&ju()&&ad()&&!On()&&!yt()}function Rle(e){return Mtn()&&GDt(e)&&e.rateLimitType==="five_hour"}function Vat(){switch(Qn()){case"pro":return"pro";case"max":switch(Fw()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function NWe(){Bb({agentId:Ve(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{Mtn,Rle,Vat,NWe};
