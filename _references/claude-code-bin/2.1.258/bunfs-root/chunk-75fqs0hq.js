// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Ze,Wu,Mn}from"/$bunfs/root/chunk-b1z7jvb2.js";import{St,wt,Pn,tr,Jw}from"/$bunfs/root/chunk-8qt7d28b.js";import{mf}from"/$bunfs/root/chunk-cnazfz7b.js";import{Jb}from"/$bunfs/root/chunk-vw215j9f.js";import{sDt}from"/$bunfs/root/chunk-5qtwk945.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function oen(){return wt()&&Pn()?.billingType!=="usage_based"&&mf()&&Wu()&&!Mn()&&!St()}function sle(e){return oen()&&sDt(e)&&e.rateLimitType==="five_hour"}function ust(){switch(tr()){case"pro":return"pro";case"max":switch(Jw()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function SWe(){Jb({agentId:Ze(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{oen,sle,ust,SWe};
