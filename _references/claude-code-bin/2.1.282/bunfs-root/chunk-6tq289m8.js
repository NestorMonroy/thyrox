// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Gp,x}from"/$bunfs/root/chunk-wbbthbh9.js";import{Oe}from"/$bunfs/root/chunk-zt13kgz5.js";import{a,Mn}from"/$bunfs/root/chunk-h56wjcte.js";import{Su}from"/$bunfs/root/chunk-shebh248.js";import{JI}from"/$bunfs/root/chunk-e8ycfccz.js";function Fnt(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(JI()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function DS(){return!Fnt()}async function Unt(e={}){if(JI()===null){let{getSettingsWithErrors:n}=await import("/$bunfs/root/chunk-sdy8xy2w.js");n()}if(e.kickGrowthBook!==!1)Gp().catch(()=>{})}function PCt(){return Mn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||x("tengu_fleet_past_sessions",!1)}function F2e(){return DS()}function ise(){return!1}function KOe(){return x("tengu_amber_anchor",!1)}function Fyr(){return x("tengu_copper_lantern",!1)}function i(){return x("tengu_quiet_harbor",!1)?"ask":"transient"}function PMn(){let e=process.env.CLAUDE_CODE_DAEMON_COLD_START;if(e==="transient"||e==="ask")return e;let n=JI()?.settings.daemonColdStart;if(n!==void 0)return n;return i()}function pp(){return KOe()?"daemon":"background service"}function bQ(){return Su(pp())}function ase(e){return F2e()?` \u2014 run 'claude daemon ${e}'`:""}function YOe(e,n){let o=n??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var k7t="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function HMn(){return!1}function Uyr(){return!!a.CLAUDE_AGENTS_SELECT}function Byr(){let e=Oe(process.env[k7t]);return delete process.env[k7t],e}
export{Fnt,DS,Unt,PCt,F2e,ise,KOe,Fyr,PMn,pp,bQ,ase,YOe,k7t,HMn,Uyr,Byr};
