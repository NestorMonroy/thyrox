// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{pTc as s}from"/$bunfs/root/_728.js";import{Axd as a,vxd as c}from"/$bunfs/root/_837.js";var h=c(function(t){Object.defineProperty(t,"__esModule",{value:!0});t.getMachineId=void 0;var d=a("fs"),o=s();async function u(){let i=["/etc/machine-id","/var/lib/dbus/machine-id"];for(let n of i)try{return(await d.promises.readFile(n,{encoding:"utf8"})).trim()}catch(e){o.diag.debug(`error reading machine id: ${e}`)}return}t.getMachineId=u});export default h();
