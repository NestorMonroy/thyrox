// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{uf,I}from"/$bunfs/root/chunk-27bj2wbx.js";import{Pe}from"/$bunfs/root/chunk-tep8see7.js";import{a,zn}from"/$bunfs/root/chunk-j96jysac.js";import{oh}from"/$bunfs/root/chunk-r2c9k9kh.js";import{Gk}from"/$bunfs/root/chunk-q77993h4.js";function w8e(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(Gk()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function ub(){return!w8e()}async function v8e(e={}){if(Gk()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-w80ctrfb.js");t()}if(e.kickGrowthBook!==!1)uf().catch(()=>{})}function $gt(){return zn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||I("tengu_fleet_past_sessions",!1)}function R$e(){return ub()}function FZ(){return!1}function NAe(){return I("tengu_amber_anchor",!1)}function DYn(){return I("tengu_copper_lantern",!1)}function sZr(){return I("tengu_quiet_harbor",!1)?"ask":"transient"}function Qu(){return NAe()?"daemon":"background service"}function UZ(){return oh(Qu())}function hie(e){return R$e()?` \u2014 run 'claude daemon ${e}'`:""}function $Ae(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var Azt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function Dgn(){return!1}function LYn(){return!!a.CLAUDE_AGENTS_SELECT}function NYn(){let e=Pe(process.env[Azt]);return delete process.env[Azt],e}
export{w8e,ub,v8e,$gt,R$e,FZ,NAe,DYn,sZr,Qu,UZ,hie,$Ae,Azt,Dgn,LYn,NYn};
