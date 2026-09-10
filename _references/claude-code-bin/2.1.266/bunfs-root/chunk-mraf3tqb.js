// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ve,pu,Ln}from"/$bunfs/root/chunk-t8q7n4ta.js";import{_t,gt,In,Qn,hE}from"/$bunfs/root/chunk-btbsn9s4.js";import{Zu}from"/$bunfs/root/chunk-5jacf3nm.js";import{o_}from"/$bunfs/root/chunk-yw4jc948.js";import{W$t}from"/$bunfs/root/chunk-nfkb1gwg.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function dsn(){return gt()&&In()?.billingType!=="usage_based"&&Zu()&&pu()&&!Ln()&&!_t()}function lue(e){return dsn()&&W$t(e)&&e.rateLimitType==="five_hour"}function mut(){switch(Qn()){case"pro":return"pro";case"max":switch(hE()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function tKe(){o_({agentId:Ve(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{dsn,lue,mut,tKe};
