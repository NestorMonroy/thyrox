// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{aht}from"/$bunfs/root/chunk-y9eb6m6t.js";import{Ei}from"/$bunfs/root/chunk-27bj2wbx.js";import{v}from"/$bunfs/root/chunk-3z5w4bh8.js";var a=v(function(n){Object.defineProperty(n,"__esModule",{value:!0});n.getMachineId=void 0;var s=aht(),d=Ei();async function u(){try{let t=(await s.execAsync('ioreg -rd1 -c "IOPlatformExpertDevice"')).stdout.split(`
`).find((c)=>c.includes("IOPlatformUUID"));if(!t)return;let i=t.split('" = "');if(i.length===2)return i[1].slice(0,-1)}catch(e){d.diag.debug(`error reading machine id: ${e}`)}return}n.getMachineId=u});export default a();
