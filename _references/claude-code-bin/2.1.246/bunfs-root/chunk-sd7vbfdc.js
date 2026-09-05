// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{qM as E}from"/$bunfs/root/_368.js";import{AM as a,BM as f}from"/$bunfs/root/_369.js";import"/$bunfs/root/_370.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_728.js";import{txd as o,xxd as r}from"/$bunfs/root/_837.js";var i,c,t,e;var x=r(()=>{i=o(E(),1),c=o(a(),1),t=o(f(),1);e=class e extends i.OTLPMetricExporterBase{constructor(p){super(t.createOtlpHttpExportDelegate(t.convertLegacyHttpOptions(p??{},"METRICS","v1/metrics",{"Content-Type":"application/x-protobuf"}),c.ProtobufMetricsSerializer),p)}}});var m=r(()=>{x()});var s=r(()=>{m()});var M=r(()=>{s()});M();export{e as OTLPMetricExporter};
