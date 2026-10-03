// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{hp,x}from"/$bunfs/root/chunk-f74xvn8g.js";import{Le}from"/$bunfs/root/chunk-fkak21hw.js";import{a,Pn}from"/$bunfs/root/chunk-5054mktj.js";import{rm}from"/$bunfs/root/chunk-rg63yke9.js";import{KP}from"/$bunfs/root/chunk-xzfbbx57.js";function zit(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(KP()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function pb(){return!zit()}async function Git(e={}){if(KP()===null){let{getSettingsWithErrors:n}=await import("/$bunfs/root/chunk-mwk7404x.js");n()}if(e.kickGrowthBook!==!1)hp().catch(()=>{})}function GOt(){return Pn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||x("tengu_fleet_past_sessions",!1)}function S4e(){return pb()}function XV(){return!1}function tLe(){return x("tengu_amber_anchor",!1)}function dCr(){return x("tengu_copper_lantern",!1)}function i(){return x("tengu_quiet_harbor",!1)?"ask":"transient"}function _1n(){let e=process.env.CLAUDE_CODE_DAEMON_COLD_START;if(e==="transient"||e==="ask")return e;let n=KP()?.settings.daemonColdStart;if(n!==void 0)return n;return i()}function Op(){return tLe()?"daemon":"background service"}function Oee(){return rm(Op())}function rle(e){return S4e()?` \u2014 run 'claude daemon ${e}'`:""}function nLe(e,n){let o=n??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var xrn="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function b1n(){return!1}function uCr(){return!!a.CLAUDE_AGENTS_SELECT}function pCr(){let e=Le(process.env[xrn]);return delete process.env[xrn],e}
export{zit,pb,Git,GOt,S4e,XV,tLe,dCr,_1n,Op,Oee,rle,nLe,xrn,b1n,uCr,pCr};
