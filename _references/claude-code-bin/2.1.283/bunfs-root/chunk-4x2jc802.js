// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ip,x}from"/$bunfs/root/chunk-t6pwageh.js";import{Le}from"/$bunfs/root/chunk-2j44ssk9.js";import{a,Dn}from"/$bunfs/root/chunk-v49zfq06.js";import{Jd}from"/$bunfs/root/chunk-vq0drrah.js";import{LP}from"/$bunfs/root/chunk-sctj0cwn.js";function wst(){return r()!==null}function r(){if(a.CLAUDE_CODE_DISABLE_AGENT_VIEW)return"is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";if(LP()?.settings.disableAgentView===!0)return"is disabled by the 'disableAgentView' setting";return null}function pw(){return!wst()}async function vst(e={}){if(LP()===null){let{getSettingsWithErrors:n}=await import("/$bunfs/root/chunk-67b7qdd3.js");n()}if(e.kickGrowthBook!==!1)ip().catch(()=>{})}function $It(){return Dn.CLAUDE_CODE_FLEET_PAST_SESSIONS===!0||x("tengu_fleet_past_sessions",!1)}function Zqe(){return pw()}function pV(){return!1}function nDe(){return x("tengu_amber_anchor",!1)}function ckr(){return x("tengu_copper_lantern",!1)}function i(){return x("tengu_quiet_harbor",!1)?"ask":"transient"}function RFn(){let e=process.env.CLAUDE_CODE_DAEMON_COLD_START;if(e==="transient"||e==="ask")return e;let n=LP()?.settings.daemonColdStart;if(n!==void 0)return n;return i()}function kp(){return nDe()?"daemon":"background service"}function qZ(){return Jd(kp())}function Zie(e){return Zqe()?` \u2014 run 'claude daemon ${e}'`:""}function rDe(e,n){let o=n??r()??"is not available in this environment";process.stderr.write(`'${e}' ${o}.
`),process.exit(1)}var Etn="CLAUDE_CODE_AGENT_VIEW_RELAUNCH";function xFn(){return!1}function dkr(){return!!a.CLAUDE_AGENTS_SELECT}function ukr(){let e=Le(process.env[Etn]);return delete process.env[Etn],e}
export{wst,pw,vst,$It,Zqe,pV,nDe,ckr,RFn,kp,qZ,Zie,rDe,Etn,xFn,dkr,ukr};
