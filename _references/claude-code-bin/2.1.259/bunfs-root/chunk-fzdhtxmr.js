// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Ze,nd,Fn}from"/$bunfs/root/chunk-x1rrg5j2.js";import{St,wt,Ln,er,uE}from"/$bunfs/root/chunk-x722nt0q.js";import{Sf}from"/$bunfs/root/chunk-xfn8hpdj.js";import{rS}from"/$bunfs/root/chunk-qpwbvc04.js";import{T$t}from"/$bunfs/root/chunk-9bm3jpvn.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function qnn(){return wt()&&Ln()?.billingType!=="usage_based"&&Sf()&&nd()&&!Fn()&&!St()}function ace(e){return qnn()&&T$t(e)&&e.rateLimitType==="five_hour"}function tlt(){switch(er()){case"pro":return"pro";case"max":switch(uE()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function yVe(){rS({agentId:Ze(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{qnn,ace,tlt,yVe};
