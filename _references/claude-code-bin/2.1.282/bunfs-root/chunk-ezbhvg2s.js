// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{c}from"/$bunfs/root/chunk-zxcb8vnv.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Zun,ZD}from"/$bunfs/root/chunk-esvkqvk3.js";import{De}from"/$bunfs/root/chunk-txvgrx83.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{an,XI}from"/$bunfs/root/chunk-verj0kzw.js";import{x}from"/$bunfs/root/chunk-wbbthbh9.js";import{AQ}from"/$bunfs/root/chunk-ga02wneq.js";function Gbt(){return XI("feedbackDrafts")[0]??"notify"}function Err(){if(AQ()!==null)return!1;if(Zun())return!1;if(ZD())return!1;if(De()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return x("tengu_juniper_relay",!1);return x("tengu_juniper_relay",!1)}function uF(){return Gbt()!=="off"&&Err()}function wKt(e,{storageV5:t,via:r}){let n=N()&&t!==void 0?an("userSettings",{feedbackDrafts:e},void 0,t):an("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{Gbt,Err,uF,wKt};
