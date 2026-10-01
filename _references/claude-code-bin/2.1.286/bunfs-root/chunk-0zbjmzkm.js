// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{F}from"/$bunfs/root/chunk-616rkgbc.js";import{c}from"/$bunfs/root/chunk-dwaez71m.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Vwn,d$}from"/$bunfs/root/chunk-wk88sc60.js";import{Pe}from"/$bunfs/root/chunk-sygqycmd.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{mn,oC}from"/$bunfs/root/chunk-j27hwf9z.js";import{R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{ute}from"/$bunfs/root/chunk-q6jg9kg6.js";function OAt(){return oC("feedbackDrafts")[0]??"notify"}function lhr(){if(ute()!==null)return!1;if(Vwn())return!1;if(d$())return!1;if(Pe()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return R("tengu_juniper_relay",!1);return R("tengu_juniper_relay",!1)}function TB(){return OAt()!=="off"&&lhr()}function wXt(e,{storageV5:t,via:r}){let n=F()&&t!==void 0?mn("userSettings",{feedbackDrafts:e},void 0,t):mn("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{OAt,lhr,TB,wXt};
