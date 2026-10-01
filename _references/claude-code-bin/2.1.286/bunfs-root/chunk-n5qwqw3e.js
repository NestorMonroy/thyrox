// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Fu,R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{Le}from"/$bunfs/root/chunk-dj0a6j9w.js";import{a,Cn}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Su}from"/$bunfs/root/chunk-xjjs8j5r.js";import{aO}from"/$bunfs/root/chunk-3fx39wvj.js";function jct(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(aO()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function Eb(){return!jct()}async function Wct(e={}){if(aO()===null){let{getSettingsWithErrors:n}=await import("/$bunfs/root/chunk-2km8c778.js");n()}if(e.kickGrowthBook!==!1)Fu().catch(()=>{})}function X0t(){return Cn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||R("tengu_fleet_past_sessions",!1)}function P3e(){return Eb()}function Nq(){return!1}function l$e(){return R("tengu_amber_anchor",!1)}function QMr(){return R("tengu_copper_lantern",!1)}function i(){return R("tengu_quiet_harbor",!1)?"ask":"transient"}function y2n(){let e=process.env.CLAUDE_CODE_DAEMON_COLD_START;if(e==="transient"||e==="ask")return e;let n=aO()?.settings.daemonColdStart;if(n!==void 0)return n;return i()}function Fp(){return l$e()?"daemon":"background service"}function Tte(){return Su(Fp())}function qle(e){return P3e()?` \u2014 run 'claude daemon ${e}'`:""}function c$e(e,n){let o=n??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var Kan="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function _2n(){return!1}function ZMr(){return!!a.CLAUDE_AGENTS_SELECT}function eHr(){let e=Le(process.env[Kan]);return delete process.env[Kan],e}
export{jct,Eb,Wct,X0t,P3e,Nq,l$e,QMr,y2n,Fp,Tte,qle,c$e,Kan,_2n,ZMr,eHr};
