// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ms}from"/$bunfs/root/chunk-btbsn9s4.js";import{Yrt}from"/$bunfs/root/chunk-sxksexn1.js";import{w,Te}from"/$bunfs/root/chunk-7sg5wrey.js";var u=w(function(r){Object.defineProperty(r,"__esModule",{value:!0});r.getMachineId=void 0;var n=Te("fs"),s=Yrt(),t=Ms();async function c(){try{return(await n.promises.readFile("/etc/hostid",{encoding:"utf8"})).trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}try{return(await(0,s.execAsync)("kenv -q smbios.system.uuid")).stdout.trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}return}r.getMachineId=c});export default u();
