// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{D_t}from"/$bunfs/root/chunk-22sd36h2.js";import{ki}from"/$bunfs/root/chunk-xbd48fav.js";import{v,Ce}from"/$bunfs/root/chunk-sr6jf0k1.js";var u=v(function(r){Object.defineProperty(r,"__esModule",{value:!0});r.getMachineId=void 0;var s=Ce("fs"),n=D_t(),t=ki();async function c(){try{return(await s.promises.readFile("/etc/hostid",{encoding:"utf8"})).trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}try{return(await n.execAsync("kenv -q smbios.system.uuid")).stdout.trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}return}r.getMachineId=c});export default u();
