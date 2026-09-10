// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{plt}from"/$bunfs/root/chunk-gtmm2ppd.js";import{tVe}from"/$bunfs/root/chunk-nf4h6de7.js";import{Ux}from"/$bunfs/root/chunk-gt1wwcp5.js";import"/$bunfs/root/chunk-75kwmz13.js";import{H}from"/$bunfs/root/chunk-934z9d80.js";var i=H(function(c){Object.defineProperty(c,"__esModule",{value:!0});c.OTLPMetricExporter=void 0;var s=plt(),t=tVe(),u=Ux();class o extends s.OTLPMetricExporterBase{constructor(r){super((0,t.createOtlpGrpcExportDelegate)((0,t.convertLegacyOtlpGrpcOptions)(r??{},"METRICS"),u.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),r)}}c.OTLPMetricExporter=o});var n=H(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPMetricExporter=void 0;var l=i();Object.defineProperty(e,"OTLPMetricExporter",{enumerable:!0,get:function(){return l.OTLPMetricExporter}})});export default n();
