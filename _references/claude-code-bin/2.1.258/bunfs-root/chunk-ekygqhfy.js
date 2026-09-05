// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{jm,L}from"/$bunfs/root/chunk-8qt7d28b.js";import{$e}from"/$bunfs/root/chunk-ycrs8y50.js";import{a,Yn}from"/$bunfs/root/chunk-sr28hb79.js";import{Am}from"/$bunfs/root/chunk-ctshp37x.js";import{$H}from"/$bunfs/root/chunk-64kpb0yv.js";function tFe(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if($H()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function y_(){return!tFe()}async function nFe(e={}){if($H()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-jyap1948.js");t()}if(e.kickGrowthBook!==!1)jm().catch(()=>{})}function _Je(){return Yn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||L("tengu_fleet_past_sessions",!1)}function Lve(){return y_()}function A5(){return!1}function tme(){return L("tengu_amber_anchor",!1)}function QHn(){return L("tengu_copper_lantern",!1)}function OIr(){return L("tengu_quiet_harbor",!1)?"ask":"transient"}function Cc(){return tme()?"daemon":"background service"}function v5(){return Am(Cc())}function C7(e){return Lve()?` \u2014 run 'claude daemon ${e}'`:""}function nme(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var iwt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function EKt(){return!1}function NIr(e){return!1}function ZHn(){return!!a.CLAUDE_AGENTS_SELECT}function ewn(){let e=$e(process.env[iwt]);return delete process.env[iwt],e}
export{tFe,y_,nFe,_Je,Lve,A5,tme,QHn,OIr,Cc,v5,C7,nme,iwt,EKt,NIr,ZHn,ewn};
