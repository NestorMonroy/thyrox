// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{pM as x}from"/$bunfs/root/_367.js";import{qM as l}from"/$bunfs/root/_368.js";import{AM as u}from"/$bunfs/root/_369.js";import"/$bunfs/root/_370.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_728.js";import{vxd as o}from"/$bunfs/root/_837.js";var s=o(function(p){Object.defineProperty(p,"__esModule",{value:!0});p.OTLPMetricExporter=void 0;var n=l(),t=x(),_=u();class c extends n.OTLPMetricExporterBase{constructor(r){super((0,t.createOtlpGrpcExportDelegate)((0,t.convertLegacyOtlpGrpcOptions)(r??{},"METRICS"),_.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),r)}}p.OTLPMetricExporter=c});var a=o(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPMetricExporter=void 0;var M=s();Object.defineProperty(e,"OTLPMetricExporter",{enumerable:!0,get:function(){return M.OTLPMetricExporter}})});export default a();
