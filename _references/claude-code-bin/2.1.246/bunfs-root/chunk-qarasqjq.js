// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{AM as i,BM as s,rM as f}from"/$bunfs/root/_369.js";import"/$bunfs/root/_370.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_728.js";import{txd as o,xxd as r}from"/$bunfs/root/_837.js";var p,a,t,e;var c=r(()=>{p=o(f(),1),a=o(i(),1),t=o(s(),1);e=class e extends p.OTLPExporterBase{constructor(m={}){super(t.createOtlpHttpExportDelegate(t.convertLegacyHttpOptions(m,"TRACES","v1/traces",{"Content-Type":"application/x-protobuf"}),a.ProtobufTraceSerializer))}}});var x=r(()=>{c()});var T=r(()=>{x()});var n=r(()=>{T()});n();export{e as OTLPTraceExporter};
