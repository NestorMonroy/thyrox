// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{t0,jx,iF}from"/$bunfs/root/chunk-1dsh8ts2.js";import"/$bunfs/root/chunk-rexbnaj0.js";import{fe}from"/$bunfs/root/chunk-1r5dbh9v.js";var e=fe(t0()),o=fe(jx()),r=fe(iF());class t extends e.OTLPExporterBase{constructor(p={}){super(r.createOtlpHttpExportDelegate(r.convertLegacyHttpOptions(p,"TRACES","v1/traces",{"Content-Type":"application/x-protobuf"}),o.ProtobufTraceSerializer))}}export{t as OTLPTraceExporter};
