// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{L}from"/$bunfs/root/chunk-k3gp1qmc.js";import{c}from"/$bunfs/root/chunk-aap6zsd0.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{mbn,DN}from"/$bunfs/root/chunk-gph9jdam.js";import{Ie}from"/$bunfs/root/chunk-n2v4180x.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{fn,BA}from"/$bunfs/root/chunk-g6a51st9.js";import{x}from"/$bunfs/root/chunk-f74xvn8g.js";import{yte}from"/$bunfs/root/chunk-9v35ka7v.js";function Mkt(){return BA("feedbackDrafts")[0]??"notify"}function Kpr(){if(yte()!==null)return!1;if(mbn())return!1;if(DN())return!1;if(Ie()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return x("tengu_juniper_relay",!1);return x("tengu_juniper_relay",!1)}function WU(){return Mkt()!=="off"&&Kpr()}function e8t(e,{storageV5:t,via:r}){let n=L()&&t!==void 0?fn("userSettings",{feedbackDrafts:e},void 0,t):fn("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{Mkt,Kpr,WU,e8t};
