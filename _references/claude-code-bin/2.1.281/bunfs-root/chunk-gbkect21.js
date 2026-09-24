// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ho}from"/$bunfs/root/chunk-cqc88nqm.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{g0}from"/$bunfs/root/chunk-0n80jtth.js";import{Bn}from"/$bunfs/root/chunk-6r1h1xyw.js";function e(){if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;return!Bn()}function ywo(){return a.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!a.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function t(){return a.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function Pg(){return e()||ho()!==null||g0()||t()}function $4(){return a.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function oD(){if($4())return!1;return g0()}
export{ywo,Pg,$4,oD};
