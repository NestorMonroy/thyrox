// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{lp,I}from"/$bunfs/root/chunk-xbd48fav.js";import{Oe}from"/$bunfs/root/chunk-aw1peprz.js";import{a,Jn}from"/$bunfs/root/chunk-crr3rzxx.js";import{Pm}from"/$bunfs/root/chunk-4bbpt7sc.js";import{dA}from"/$bunfs/root/chunk-q8sknw7e.js";function g9e(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(dA()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function wb(){return!g9e()}async function h9e(e={}){if(dA()===null){let{getSettingsWithErrors:t}=await import("/$bunfs/root/chunk-3gy4b88q.js");t()}if(e.kickGrowthBook!==!1)lp().catch(()=>{})}function c_t(){return Jn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||I("tengu_fleet_past_sessions",!1)}function b1e(){return wb()}function Iee(){return!1}function nCe(){return I("tengu_amber_anchor",!1)}function DQn(){return I("tengu_copper_lantern",!1)}function Wso(){return I("tengu_quiet_harbor",!1)?"ask":"transient"}function ud(){return nCe()?"daemon":"background service"}function Pee(){return Pm(ud())}function gae(e){return b1e()?` \u2014 run 'claude daemon ${e}'`:""}function rCe(e,t){let o=t??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var Fqt="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function kbn(){return!1}function LQn(){return!!a.CLAUDE_AGENTS_SELECT}function NQn(){let e=Oe(process.env[Fqt]);return delete process.env[Fqt],e}
export{g9e,wb,h9e,c_t,b1e,Iee,nCe,DQn,Wso,ud,Pee,gae,rCe,Fqt,kbn,LQn,NQn};
