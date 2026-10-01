// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{We,wu,Fn}from"/$bunfs/root/chunk-hbjpbz2q.js";import{xa}from"/$bunfs/root/chunk-sygqycmd.js";import{ct,kn,or,gv,Rt}from"/$bunfs/root/chunk-4hjp8tw4.js";import{Gv}from"/$bunfs/root/chunk-kt4703ww.js";import{vV}from"/$bunfs/root/chunk-xfe4zqhy.js";import{randomUUID as t}from"crypto";var o="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function Ptt(){return ct()&&kn()?.billingType!=="usage_based"&&xa()&&wu()&&!Fn()&&!Rt()}function hZ(e){return Ptt()&&vV(e)&&e.rateLimitType==="five_hour"}var r=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function J6t(e){return Ptt()&&vV(e)&&e.rateLimitType!==void 0&&r.includes(e.rateLimitType)}function Ott(){switch(or()){case"pro":return"pro";case"max":switch(gv()){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}function y2e(){Gv({agentId:We(),mode:"prompt",priority:"later",value:o,uuid:t(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{Ptt,hZ,J6t,Ott,y2e};
