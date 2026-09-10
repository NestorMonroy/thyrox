// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{zi}from"/$bunfs/root/chunk-x722nt0q.js";import{H,ke}from"/$bunfs/root/chunk-qyvz15br.js";var d=H(function(t){Object.defineProperty(t,"__esModule",{value:!0});t.getMachineId=void 0;var c=ke("fs"),a=zi();async function s(){let i=["/etc/machine-id","/var/lib/dbus/machine-id"];for(let n of i)try{return(await c.promises.readFile(n,{encoding:"utf8"})).trim()}catch(e){a.diag.debug(`error reading machine id: ${e}`)}return}t.getMachineId=s});export default d();
