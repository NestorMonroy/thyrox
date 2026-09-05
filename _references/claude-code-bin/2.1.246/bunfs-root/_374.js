// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{ncd as _,qcd as T}from"/$bunfs/root/_812.js";import{xxd as D}from"/$bunfs/root/_837.js";function o(E,O){if(E==="ANTHROPIC_DEFAULT_SONNET_MODEL")_.set("CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT",O);else if(E==="ANTHROPIC_DEFAULT_OPUS_MODEL")_.set("CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT",O)}function t(E){let O=E==="sonnet"?_.ANTHROPIC_DEFAULT_SONNET_MODEL:_.ANTHROPIC_DEFAULT_OPUS_MODEL,e=E==="sonnet"?_.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT:_.CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT;return O!==void 0&&O===e}var n=D(()=>{T()});
export{o as QM,t as RM,n as SM};
