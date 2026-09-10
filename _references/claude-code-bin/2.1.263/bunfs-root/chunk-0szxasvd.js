// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{mlt}from"/$bunfs/root/chunk-vs3e6cfp.js";import{rVe}from"/$bunfs/root/chunk-g66vqdya.js";import{jx}from"/$bunfs/root/chunk-1dsh8ts2.js";import"/$bunfs/root/chunk-rexbnaj0.js";import{H}from"/$bunfs/root/chunk-1r5dbh9v.js";var i=H(function(c){Object.defineProperty(c,"__esModule",{value:!0});c.OTLPMetricExporter=void 0;var s=mlt(),t=rVe(),u=jx();class o extends s.OTLPMetricExporterBase{constructor(r){super((0,t.createOtlpGrpcExportDelegate)((0,t.convertLegacyOtlpGrpcOptions)(r??{},"METRICS"),u.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),r)}}c.OTLPMetricExporter=o});var n=H(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPMetricExporter=void 0;var l=i();Object.defineProperty(e,"OTLPMetricExporter",{enumerable:!0,get:function(){return l.OTLPMetricExporter}})});export default n();
