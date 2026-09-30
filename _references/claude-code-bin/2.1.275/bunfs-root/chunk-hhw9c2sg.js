// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{jPt}from"/$bunfs/root/chunk-m0s4reya.js";import{Vot}from"/$bunfs/root/chunk-st1wk0jw.js";import{FD}from"/$bunfs/root/chunk-axkamnzz.js";import"/$bunfs/root/chunk-1xkhk7gd.js";import{v}from"/$bunfs/root/chunk-sr6jf0k1.js";var s=v(function(p){Object.defineProperty(p,"__esModule",{value:!0});p.OTLPMetricExporter=void 0;var i=jPt(),t=Vot(),_=FD();class o extends i.OTLPMetricExporterBase{constructor(r){super(t.createOtlpGrpcExportDelegate(t.convertLegacyOtlpGrpcOptions(r??{},"METRICS"),_.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),r)}}p.OTLPMetricExporter=o});var x=v(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPMetricExporter=void 0;var l=s();Object.defineProperty(e,"OTLPMetricExporter",{enumerable:!0,get:function(){return l.OTLPMetricExporter}})});export default x();
