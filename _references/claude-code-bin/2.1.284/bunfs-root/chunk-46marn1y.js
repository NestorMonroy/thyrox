// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{c}from"/$bunfs/root/chunk-czwr6846.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{Ebn,AN}from"/$bunfs/root/chunk-2rw92xpq.js";import{Ie}from"/$bunfs/root/chunk-12vsw1j8.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{hn,IA}from"/$bunfs/root/chunk-r03mjfax.js";import{x}from"/$bunfs/root/chunk-swk3rjnt.js";import{Wee}from"/$bunfs/root/chunk-45s965ek.js";function Qkt(){return IA("feedbackDrafts")[0]??"notify"}function Tfr(){if(Wee()!==null)return!1;if(Ebn())return!1;if(AN())return!1;if(Ie()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return x("tengu_juniper_relay",!1);return x("tengu_juniper_relay",!1)}function zU(){return Qkt()!=="off"&&Tfr()}function X8t(e,{storageV5:t,via:r}){let n=N()&&t!==void 0?hn("userSettings",{feedbackDrafts:e},void 0,t):hn("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{Qkt,Tfr,zU,X8t};
