// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{DM as u}from"/$bunfs/root/_371.js";import{pTc as d}from"/$bunfs/root/_728.js";import{vxd as s}from"/$bunfs/root/_837.js";var f=s(function(i){Object.defineProperty(i,"__esModule",{value:!0});i.getMachineId=void 0;var o=u(),a=d();async function l(){try{let t=(await(0,o.execAsync)('ioreg -rd1 -c "IOPlatformExpertDevice"')).stdout.split(`
`).find((c)=>c.includes("IOPlatformUUID"));if(!t)return;let r=t.split('" = "');if(r.length===2)return r[1].slice(0,-1)}catch(e){a.diag.debug(`error reading machine id: ${e}`)}return}i.getMachineId=l});export default f();
