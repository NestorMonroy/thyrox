// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{pM as T}from"/$bunfs/root/_367.js";import{AM as i,rM as u}from"/$bunfs/root/_369.js";import"/$bunfs/root/_370.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_728.js";import{vxd as t}from"/$bunfs/root/_837.js";var a=t(function(c){Object.defineProperty(c,"__esModule",{value:!0});c.OTLPTraceExporter=void 0;var r=T(),l=i(),n=u();class o extends n.OTLPExporterBase{constructor(s={}){super((0,r.createOtlpGrpcExportDelegate)((0,r.convertLegacyOtlpGrpcOptions)(s,"TRACES"),l.ProtobufTraceSerializer,"TraceExportService","/opentelemetry.proto.collector.trace.v1.TraceService/Export"))}}c.OTLPTraceExporter=o});var O=t(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPTraceExporter=void 0;var x=a();Object.defineProperty(e,"OTLPTraceExporter",{enumerable:!0,get:function(){return x.OTLPTraceExporter}})});export default O();
