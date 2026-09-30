// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Vot}from"/$bunfs/root/chunk-st1wk0jw.js";import{N$,FD}from"/$bunfs/root/chunk-axkamnzz.js";import"/$bunfs/root/chunk-1xkhk7gd.js";import{v}from"/$bunfs/root/chunk-sr6jf0k1.js";var c=v(function(o){Object.defineProperty(o,"__esModule",{value:!0});o.OTLPTraceExporter=void 0;var r=Vot(),_=FD(),s=N$();class t extends s.OTLPExporterBase{constructor(a={}){super(r.createOtlpGrpcExportDelegate(r.convertLegacyOtlpGrpcOptions(a,"TRACES"),_.ProtobufTraceSerializer,"TraceExportService","/opentelemetry.proto.collector.trace.v1.TraceService/Export"))}}o.OTLPTraceExporter=t});var x=v(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPTraceExporter=void 0;var l=c();Object.defineProperty(e,"OTLPTraceExporter",{enumerable:!0,get:function(){return l.OTLPTraceExporter}})});export default x();
