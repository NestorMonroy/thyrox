// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import"/$bunfs/root/chunk-j1xd14r2.js";import"/$bunfs/root/chunk-0e5yc8ae.js";import"/$bunfs/root/chunk-f68fp7a3.js";import"/$bunfs/root/chunk-aap6zsd0.js";import{I}from"/$bunfs/root/chunk-vqpmen5t.js";import{V8}from"/$bunfs/root/chunk-kjg272z4.js";var o=new Set(["ClaudeAiProxyBearerRejectedError","McpAuthError","McpError","McpResponseSchemaError","McpToolCallError","ProtocolError","SdkError","SdkHttpError","StreamableHTTPError","TelemetrySafeError"]);function a(r){if(r instanceof DOMException)return r.name==="TimeoutError";if(!(r instanceof Error))return!1;if(r instanceof I)return!0;if(r instanceof V8)return!0;if((("errorCode"in r)&&typeof r.errorCode==="string"||("code"in r)&&typeof r.code==="string")&&/^HTTP 40[13]\b/.test(r.message))return!0;let e=r.name!=="Error"?r.name:r.constructor?.name??"";return o.has(e)}export{a as isExpectedMcpCallError};
