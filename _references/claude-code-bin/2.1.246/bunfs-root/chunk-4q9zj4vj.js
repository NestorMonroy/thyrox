// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{pM as l}from"/$bunfs/root/_367.js";import{AM as i,rM as L}from"/$bunfs/root/_369.js";import"/$bunfs/root/_370.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_728.js";import{vxd as t}from"/$bunfs/root/_837.js";var c=t(function(p){Object.defineProperty(p,"__esModule",{value:!0});p.OTLPLogExporter=void 0;var r=l(),n=i(),x=L();class o extends x.OTLPExporterBase{constructor(u={}){super((0,r.createOtlpGrpcExportDelegate)((0,r.convertLegacyOtlpGrpcOptions)(u,"LOGS"),n.ProtobufLogsSerializer,"LogsExportService","/opentelemetry.proto.collector.logs.v1.LogsService/Export"))}}p.OTLPLogExporter=o});var _=t(function(e){Object.defineProperty(e,"__esModule",{value:!0});e.OTLPLogExporter=void 0;var g=c();Object.defineProperty(e,"OTLPLogExporter",{enumerable:!0,get:function(){return g.OTLPLogExporter}})});export default _();
