// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ZB,N$,eq}from"/$bunfs/root/chunk-qqk95s8r.js";import"/$bunfs/root/chunk-mt6z9kds.js";import{Se}from"/$bunfs/root/chunk-0dapr5gw.js";var t=Se(ZB()),e=Se(N$()),o=Se(eq());class r extends t.OTLPExporterBase{constructor(p={}){super(o.createOtlpHttpExportDelegate(o.convertLegacyHttpOptions(p,"LOGS","v1/logs",{"Content-Type":"application/json"}),e.JsonLogsSerializer))}}export{r as OTLPLogExporter};
