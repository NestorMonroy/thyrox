// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{oTc as u}from"/$bunfs/root/_727.js";import{pTc as c}from"/$bunfs/root/_728.js";import{Axd as s,vxd as n}from"/$bunfs/root/_837.js";var g=n(function(r){Object.defineProperty(r,"__esModule",{value:!0});r.getMachineId=void 0;var d=s("fs"),a=u(),t=c();async function o(){try{return(await d.promises.readFile("/etc/hostid",{encoding:"utf8"})).trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}try{return(await(0,a.execAsync)("kenv -q smbios.system.uuid")).stdout.trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}return}r.getMachineId=o});export default g();
