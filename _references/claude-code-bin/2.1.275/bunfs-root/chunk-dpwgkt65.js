// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{ki}from"/$bunfs/root/chunk-xbd48fav.js";import{v,Ce}from"/$bunfs/root/chunk-sr6jf0k1.js";var d=v(function(t){Object.defineProperty(t,"__esModule",{value:!0});t.getMachineId=void 0;var a=Ce("fs"),c=ki();async function s(){let r=["/etc/machine-id","/var/lib/dbus/machine-id"];for(let n of r)try{return(await a.promises.readFile(n,{encoding:"utf8"})).trim()}catch(e){c.diag.debug(`error reading machine id: ${e}`)}return}t.getMachineId=s});export default d();
