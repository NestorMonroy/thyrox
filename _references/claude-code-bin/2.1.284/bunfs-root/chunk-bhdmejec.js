// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{bp,x}from"/$bunfs/root/chunk-swk3rjnt.js";import{Le}from"/$bunfs/root/chunk-37s48y77.js";import{a,Dn}from"/$bunfs/root/chunk-8whxj5sg.js";import{ou}from"/$bunfs/root/chunk-k6n2tyj0.js";import{JI}from"/$bunfs/root/chunk-m399t3d8.js";function Yit(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(JI()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function Aw(){return!Yit()}async function Xit(e={}){if(JI()===null){let{getSettingsWithErrors:n}=await import("/$bunfs/root/chunk-y1yxaqfq.js");n()}if(e.kickGrowthBook!==!1)bp().catch(()=>{})}function GOt(){return Dn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||x("tengu_fleet_past_sessions",!1)}function T4e(){return Aw()}function WV(){return!1}function mLe(){return x("tengu_amber_anchor",!1)}function DCr(){return x("tengu_copper_lantern",!1)}function i(){return x("tengu_quiet_harbor",!1)?"ask":"transient"}function W1n(){let e=process.env.CLAUDE_CODE_DAEMON_COLD_START;if(e==="transient"||e==="ask")return e;let n=JI()?.settings.daemonColdStart;if(n!==void 0)return n;return i()}function $p(){return mLe()?"daemon":"background service"}function Pee(){return ou($p())}function qae(e){return T4e()?` \u2014 run 'claude daemon ${e}'`:""}function gLe(e,n){let o=n??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var Yrn="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function G1n(){return!1}function LCr(){return!!a.CLAUDE_AGENTS_SELECT}function NCr(){let e=Le(process.env[Yrn]);return delete process.env[Yrn],e}
export{Yit,Aw,Xit,GOt,T4e,WV,mLe,DCr,W1n,$p,Pee,qae,gLe,Yrn,G1n,LCr,NCr};
