// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{txt}from"/$bunfs/root/chunk-rsftke8q.js";import{znt}from"/$bunfs/root/chunk-sqmbm9kq.js";import{wD}from"/$bunfs/root/chunk-dpjnjz4v.js";import"/$bunfs/root/chunk-bex8yv5b.js";import{v}from"/$bunfs/root/chunk-3z5w4bh8.js";var s=v(function(p){Object.defineProperty(p,"__esModule",{value:!0});p.OTLPMetricExporter=void 0;var i=txt(),t=znt(),_=wD();class o extends i.OTLPMetricExporterBase{constructor(r){super(t.createOtlpGrpcExportDelegate(t.convertLegacyOtlpGrpcOptions(r??{},"METRICS"),_.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),r)}}p.OTLPMetricExporter=o});var x=v(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPMetricExporter=void 0;var l=s();Object.defineProperty(e,"OTLPMetricExporter",{enumerable:!0,get:function(){return l.OTLPMetricExporter}})});export default x();
