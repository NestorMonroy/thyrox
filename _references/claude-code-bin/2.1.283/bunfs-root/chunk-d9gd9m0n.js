// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{wo}from"/$bunfs/root/chunk-nvht7ckf.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{N0}from"/$bunfs/root/chunk-fmsbxtrp.js";import{Gn}from"/$bunfs/root/chunk-4h0c4z04.js";function e(){if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;return!Gn()}function lDo(){return a.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!a.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function t(){return a.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function Lg(){return e()||wo()!==null||N0()||t()}function cDo(){return e()||wo()!==null||t()}function X5(){return a.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function RL(){if(X5())return!1;return N0()}
export{lDo,Lg,cDo,X5,RL};
