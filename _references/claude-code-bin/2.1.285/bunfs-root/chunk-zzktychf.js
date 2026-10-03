// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{We,bu,Fn}from"/$bunfs/root/chunk-bxhyh54r.js";import{Fl}from"/$bunfs/root/chunk-n2v4180x.js";import{ut,kn,sr,tv,At}from"/$bunfs/root/chunk-f74xvn8g.js";import{Rv}from"/$bunfs/root/chunk-qazw855w.js";import{YG}from"/$bunfs/root/chunk-2dsremax.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function QZe(){return ut()&&kn()?.billingType!=="usage_based"&&Fl()&&bu()&&!Fn()&&!At()}function NQ(e){return QZe()&&YG(e)&&e.rateLimitType==="five_hour"}var r=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function D5t(e){return QZe()&&YG(e)&&e.rateLimitType!==void 0&&r.includes(e.rateLimitType)}function ZZe(){switch(sr()){case"pro":return"pro";case"max":switch(tv()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function e2e(){Rv({agentId:We(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{QZe,NQ,D5t,ZZe,e2e};
