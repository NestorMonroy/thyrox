// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{xf,I}from"/$bunfs/root/chunk-btbsn9s4.js";import{He}from"/$bunfs/root/chunk-a7esebzw.js";import{a,Nn}from"/$bunfs/root/chunk-9fmxymtw.js";import{sm}from"/$bunfs/root/chunk-xj9n0xxp.js";import{dv}from"/$bunfs/root/chunk-hfjb09vk.js";function I1e(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(dv()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function A_(){return!I1e()}async function P1e(e={}){if(dv()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-kgcrajeh.js");t()}if(e.kickGrowthBook!==!1)xf().catch(()=>{})}function uet(){return Nn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||I("tengu_fleet_past_sessions",!1)}function gRe(){return A_()}function p9(){return!1}function rhe(){return I("tengu_amber_anchor",!1)}function zRn(){return I("tengu_copper_lantern",!1)}function AEr(){return I("tengu_quiet_harbor",!1)?"ask":"transient"}function jc(){return rhe()?"daemon":"background service"}function f9(){return sm(jc())}function tZ(e){return gRe()?` \u2014 run 'claude daemon ${e}'`:""}function ohe(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var GTt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function z8t(){return!1}function TEr(e){return!1}function WRn(){return!!a.CLAUDE_AGENTS_SELECT}function GRn(){let e=He(process.env[GTt]);return delete process.env[GTt],e}
export{I1e,A_,P1e,uet,gRe,p9,rhe,zRn,AEr,jc,f9,tZ,ohe,GTt,z8t,TEr,WRn,GRn};
