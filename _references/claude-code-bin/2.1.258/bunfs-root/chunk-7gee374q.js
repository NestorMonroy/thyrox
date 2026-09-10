// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{OWe}from"/$bunfs/root/chunk-9x4136s5.js";import{dD,Vx}from"/$bunfs/root/chunk-4aqd3gpq.js";import"/$bunfs/root/chunk-eng0vc3w.js";import{H}from"/$bunfs/root/chunk-6zavqkd2.js";var p=H(function(o){Object.defineProperty(o,"__esModule",{value:!0});o.OTLPTraceExporter=void 0;var r=OWe(),s=Vx(),u=dD();class t extends u.OTLPExporterBase{constructor(a={}){super((0,r.createOtlpGrpcExportDelegate)((0,r.convertLegacyOtlpGrpcOptions)(a,"TRACES"),s.ProtobufTraceSerializer,"TraceExportService","/opentelemetry.proto.collector.trace.v1.TraceService/Export"))}}o.OTLPTraceExporter=t});var l=H(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPTraceExporter=void 0;var i=p();Object.defineProperty(e,"OTLPTraceExporter",{enumerable:!0,get:function(){return i.OTLPTraceExporter}})});export default l();
