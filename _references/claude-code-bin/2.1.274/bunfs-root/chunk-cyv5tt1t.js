// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{aht}from"/$bunfs/root/chunk-y9eb6m6t.js";import{Ei}from"/$bunfs/root/chunk-27bj2wbx.js";import{v,Ce}from"/$bunfs/root/chunk-3z5w4bh8.js";var d=v(function(s){Object.defineProperty(s,"__esModule",{value:!0});s.getMachineId=void 0;var i=Ce("process"),n=aht(),a=Ei();async function o(){let e="%windir%\\System32\\REG.exe";if(i.arch==="ia32"&&"PROCESSOR_ARCHITEW6432"in i.env)e="%windir%\\sysnative\\cmd.exe /c "+e;try{let t=(await n.execAsync(`${e} QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid`)).stdout.split("REG_SZ");if(t.length===2)return t[1].trim()}catch(r){a.diag.debug(`error reading machine id: ${r}`)}return}s.getMachineId=o});export default d();
