// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{nO,xH,pU}from"/$bunfs/root/chunk-34cjmv83.js";import"/$bunfs/root/chunk-r14ky4vr.js";import{ge}from"/$bunfs/root/chunk-7sg5wrey.js";var t=ge(nO()),e=ge(xH()),o=ge(pU());class r extends t.OTLPExporterBase{constructor(p={}){super(o.createOtlpHttpExportDelegate(o.convertLegacyHttpOptions(p,"LOGS","v1/logs",{"Content-Type":"application/json"}),e.JsonLogsSerializer))}}export{r as OTLPLogExporter};
