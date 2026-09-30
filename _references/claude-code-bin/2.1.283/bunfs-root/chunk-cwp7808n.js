// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{N}from"/$bunfs/root/chunk-8nz62976.js";import{c}from"/$bunfs/root/chunk-vyyazxfq.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{vhn,tN}from"/$bunfs/root/chunk-jwddn0q9.js";import{Pe}from"/$bunfs/root/chunk-4h0c4z04.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{cn,gA}from"/$bunfs/root/chunk-ckctvm5v.js";import{x}from"/$bunfs/root/chunk-t6pwageh.js";import{iee}from"/$bunfs/root/chunk-5t3x93y6.js";function qvt(){return gA("feedbackDrafts")[0]??"notify"}function tdr(){if(iee()!==null)return!1;if(vhn())return!1;if(tN())return!1;if(Pe()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return x("tengu_juniper_relay",!1);return x("tengu_juniper_relay",!1)}function TU(){return qvt()!=="off"&&tdr()}function _6t(e,{storageV5:t,via:r}){let n=N()&&t!==void 0?cn("userSettings",{feedbackDrafts:e},void 0,t):cn("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{qvt,tdr,TU,_6t};
