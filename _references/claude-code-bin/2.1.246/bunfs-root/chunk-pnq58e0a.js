// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{AM as g,BM as i,rM as a}from"/$bunfs/root/_369.js";import"/$bunfs/root/_370.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_728.js";import{txd as e,xxd as o}from"/$bunfs/root/_837.js";var p,L,r,t;var s=o(()=>{p=e(a(),1),L=e(g(),1),r=e(i(),1);t=class t extends p.OTLPExporterBase{constructor(n={}){super(r.createOtlpHttpExportDelegate(r.convertLegacyHttpOptions(n,"LOGS","v1/logs",{"Content-Type":"application/json"}),L.JsonLogsSerializer))}}});var x=o(()=>{s()});var m=o(()=>{x()});var O=o(()=>{m()});O();export{t as OTLPLogExporter};
