// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{_Wt}from"/$bunfs/root/chunk-r358jr5n.js";import{Ygt}from"/$bunfs/root/chunk-fvrffw79.js";import{N$}from"/$bunfs/root/chunk-qqk95s8r.js";import"/$bunfs/root/chunk-mt6z9kds.js";import{E}from"/$bunfs/root/chunk-0dapr5gw.js";var u=E(function(i){Object.defineProperty(i,"__esModule",{value:!0});i.OTLPMetricExporter=void 0;var o=_Wt(),e=Ygt(),c=N$();class p extends o.OTLPMetricExporterBase{constructor(t){super(e.createOtlpGrpcExportDelegate(e.convertLegacyOtlpGrpcOptions(t??{},"METRICS"),c.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),t)}}i.OTLPMetricExporter=p});var n=E(function(r){Object.defineProperty(r,"__esModule",{value:!0});r.OTLPMetricExporter=void 0;var l=u();Object.defineProperty(r,"OTLPMetricExporter",{enumerable:!0,get:function(){return l.OTLPMetricExporter}})});export default n();
