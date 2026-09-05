// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{up,I}from"/$bunfs/root/chunk-hyqdn9c0.js";import{xe}from"/$bunfs/root/chunk-dcawh0q4.js";import{a,Gn}from"/$bunfs/root/chunk-a207t0vs.js";import{Bp}from"/$bunfs/root/chunk-py8dsda5.js";import{xH}from"/$bunfs/root/chunk-tcap6yb8.js";function uBe(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(xH()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function Zy(){return!uBe()}async function dBe(e={}){if(xH()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-fg87vamn.js");t()}if(e.kickGrowthBook!==!1)up().catch(()=>{})}function w7e(){return Gn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||I("tengu_fleet_past_sessions",!1)}function fke(){return Zy()}function j8(){return!1}function ume(){return I("tengu_amber_anchor",!1)}function YEn(){return I("tengu_copper_lantern",!1)}function Cyr(){return I("tengu_quiet_harbor",!1)?"ask":"transient"}function Pc(){return ume()?"daemon":"background service"}function G8(){return Bp(Pc())}function O7(e){return fke()?` \u2014 run 'claude daemon ${e}'`:""}function dme(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var BEt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function J4t(){return!1}function Ryr(e){return!1}function XEn(){return!!a.CLAUDE_AGENTS_SELECT}function JEn(){let e=xe(process.env[BEt]);return delete process.env[BEt],e}
export{uBe,Zy,dBe,w7e,fke,j8,ume,YEn,Cyr,Pc,G8,O7,dme,BEt,J4t,Ryr,XEn,JEn};
