// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{F}from"/$bunfs/root/chunk-7yckkh1m.js";import{c}from"/$bunfs/root/chunk-rnxz8hs2.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{Uln,kD}from"/$bunfs/root/chunk-wckxjewz.js";import{He}from"/$bunfs/root/chunk-6r1h1xyw.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{sn,PT}from"/$bunfs/root/chunk-pw35yar9.js";import{x}from"/$bunfs/root/chunk-5khn4tvf.js";import{C7}from"/$bunfs/root/chunk-adsaemws.js";function f_t(){return PT("feedbackDrafts")[0]??"notify"}function FQn(){if(C7()!==null)return!1;if(Uln())return!1;if(kD())return!1;if(He()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return x("tengu_juniper_relay",!1);return x("tengu_juniper_relay",!1)}function X$(){return f_t()!=="off"&&FQn()}function Zzt(e,{storageV5:t,via:r}){let n=F()&&t!==void 0?sn("userSettings",{feedbackDrafts:e},void 0,t):sn("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{f_t,FQn,X$,Zzt};
