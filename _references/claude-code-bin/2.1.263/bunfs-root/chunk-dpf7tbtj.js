// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{up,I}from"/$bunfs/root/chunk-32f2qmtc.js";import{xe}from"/$bunfs/root/chunk-8a7jwk3w.js";import{a,Gn}from"/$bunfs/root/chunk-bxegdt3f.js";import{Bp}from"/$bunfs/root/chunk-kqpqzcmv.js";import{xH}from"/$bunfs/root/chunk-v7vff0yy.js";function dBe(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(xH()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function Zy(){return!dBe()}async function fBe(e={}){if(xH()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-es2rk87a.js");t()}if(e.kickGrowthBook!==!1)up().catch(()=>{})}function E7e(){return Gn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||I("tengu_fleet_past_sessions",!1)}function pke(){return Zy()}function z8(){return!1}function dme(){return I("tengu_amber_anchor",!1)}function XEn(){return I("tengu_copper_lantern",!1)}function xyr(){return I("tengu_quiet_harbor",!1)?"ask":"transient"}function Pc(){return dme()?"daemon":"background service"}function W8(){return Bp(Pc())}function F7(e){return pke()?` \u2014 run 'claude daemon ${e}'`:""}function fme(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var UEt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function Q4t(){return!1}function Lyr(e){return!1}function JEn(){return!!a.CLAUDE_AGENTS_SELECT}function QEn(){let e=xe(process.env[UEt]);return delete process.env[UEt],e}
export{dBe,Zy,fBe,E7e,pke,z8,dme,XEn,xyr,Pc,W8,F7,fme,UEt,Q4t,Lyr,JEn,QEn};
