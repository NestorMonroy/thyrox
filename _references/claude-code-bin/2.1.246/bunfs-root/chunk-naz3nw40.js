// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{DM as d}from"/$bunfs/root/_371.js";import{pTc as o}from"/$bunfs/root/_728.js";import{Axd as a,vxd as s}from"/$bunfs/root/_837.js";var p=s(function(n){Object.defineProperty(n,"__esModule",{value:!0});n.getMachineId=void 0;var i=a("process"),u=d(),g=o();async function h(){let e="%windir%\\System32\\REG.exe";if(i.arch==="ia32"&&"PROCESSOR_ARCHITEW6432"in i.env)e="%windir%\\sysnative\\cmd.exe /c "+e;try{let r=(await(0,u.execAsync)(`${e} QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid`)).stdout.split("REG_SZ");if(r.length===2)return r[1].trim()}catch(t){g.diag.debug(`error reading machine id: ${t}`)}return}n.getMachineId=h});export default p();
