// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Wm,L}from"/$bunfs/root/chunk-x722nt0q.js";import{$e}from"/$bunfs/root/chunk-jdw11prg.js";import{a,Kn}from"/$bunfs/root/chunk-m92n5xra.js";import{km}from"/$bunfs/root/chunk-ras23w04.js";import{VH}from"/$bunfs/root/chunk-mzmfq60a.js";function xBe(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(VH()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function v_(){return!xBe()}async function LBe(e={}){if(VH()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-8decz3s7.js");t()}if(e.kickGrowthBook!==!1)Wm().catch(()=>{})}function q7e(){return Kn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||L("tengu_fleet_past_sessions",!1)}function Kke(){return v_()}function r3(){return!1}function qme(){return L("tengu_amber_anchor",!1)}function GAn(){return L("tengu_copper_lantern",!1)}function CPr(){return L("tengu_quiet_harbor",!1)?"ask":"transient"}function $c(){return qme()?"daemon":"background service"}function o3(){return km($c())}function fQ(e){return Kke()?` \u2014 run 'claude daemon ${e}'`:""}function Kme(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var VEt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function R9t(){return!1}function IPr(e){return!1}function WAn(){return!!a.CLAUDE_AGENTS_SELECT}function zAn(){let e=$e(process.env[VEt]);return delete process.env[VEt],e}
export{xBe,v_,LBe,q7e,Kke,r3,qme,GAn,CPr,$c,o3,fQ,Kme,VEt,R9t,IPr,WAn,zAn};
