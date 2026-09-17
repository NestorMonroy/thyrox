// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{c}from"/$bunfs/root/chunk-64dkx51v.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{m4t,k0}from"/$bunfs/root/chunk-esk1bxsv.js";import{He}from"/$bunfs/root/chunk-zsdbd62x.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{Zt,WC}from"/$bunfs/root/chunk-m0am9fba.js";import{I}from"/$bunfs/root/chunk-27bj2wbx.js";import{F5}from"/$bunfs/root/chunk-ayyj05ne.js";function Cst(){return WC("feedbackDrafts")[0]??"notify"}function dNn(){if(F5()!==null)return!1;if(m4t())return!1;if(k0())return!1;if(He()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return I("tengu_juniper_relay",!1);return I("tengu_juniper_relay",!1)}function MD(){return Cst()!=="off"&&dNn()}function B0t(e,{storageV5:t,via:r}){let n=F()&&t!==void 0?Zt("userSettings",{feedbackDrafts:e},void 0,t):Zt("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{Cst,dNn,MD,B0t};
