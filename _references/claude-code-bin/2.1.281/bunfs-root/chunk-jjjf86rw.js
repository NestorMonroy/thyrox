// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Lp,x}from"/$bunfs/root/chunk-5khn4tvf.js";import{Oe}from"/$bunfs/root/chunk-4a5nddj6.js";import{a,On}from"/$bunfs/root/chunk-ay603yys.js";import{Lf}from"/$bunfs/root/chunk-nqsdwfmt.js";import{LI}from"/$bunfs/root/chunk-3hxvvnfw.js";function Uet(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(LI()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function vS(){return!Uet()}async function Bet(e={}){if(LI()===null){let{getSettingsWithErrors:n}=await import("/$bunfs/root/chunk-exyx6xze.js");n()}if(e.kickGrowthBook!==!1)Lp().catch(()=>{})}function Vkt(){return On.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||x("tengu_fleet_past_sessions",!1)}function tGe(){return vS()}function roe(){return!1}function aHe(){return x("tengu_amber_anchor",!1)}function Opr(){return x("tengu_copper_lantern",!1)}function i(){return x("tengu_quiet_harbor",!1)?"ask":"transient"}function APn(){let e=process.env.CLAUDE_CODE_DAEMON_COLD_START;if(e==="transient"||e==="ask")return e;let n=LI()?.settings.daemonColdStart;if(n!==void 0)return n;return i()}function Rp(){return aHe()?"daemon":"background service"}function ooe(){return Lf(Rp())}function Rue(e){return tGe()?` \u2014 run 'claude daemon ${e}'`:""}function lHe(e,n){let o=n??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var $8t="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function CPn(){return!1}function Mpr(){return!!a.CLAUDE_AGENTS_SELECT}function Dpr(){let e=Oe(process.env[$8t]);return delete process.env[$8t],e}
export{Uet,vS,Bet,Vkt,tGe,roe,aHe,Opr,APn,Rp,ooe,Rue,lHe,$8t,CPn,Mpr,Dpr};
