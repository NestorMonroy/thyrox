// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{F}from"/$bunfs/root/chunk-h401nbms.js";import{c}from"/$bunfs/root/chunk-gytndg57.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{U5t,K0}from"/$bunfs/root/chunk-1d5n9rp4.js";import{He}from"/$bunfs/root/chunk-ffayvr1z.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{tn,gR}from"/$bunfs/root/chunk-v49f6nqy.js";import{I}from"/$bunfs/root/chunk-xbd48fav.js";import{x8}from"/$bunfs/root/chunk-q2gh92k2.js";function Dat(){return gR("feedbackDrafts")[0]??"notify"}function NUn(){if(x8()!==null)return!1;if(U5t())return!1;if(K0())return!1;if(He()!=="firstParty")return!1;let e=a.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return I("tengu_juniper_relay",!1);return I("tengu_juniper_relay",!1)}function ZD(){return Dat()!=="off"&&NUn()}function IDt(e,{storageV5:t,via:r}){let n=F()&&t!==void 0?tn("userSettings",{feedbackDrafts:e},void 0,t):tn("userSettings",{feedbackDrafts:e});return i("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{Dat,NUn,ZD,IDt};
