// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Inb as r,Znb as o,_nb as u}from"/$bunfs/root/_526.js";import{OTb as s,ZTb as c}from"/$bunfs/root/_599.js";import{xxd as l}from"/$bunfs/root/_837.js";function b(e,{requireStarted:n}){let t=d(e);if(t!==void 0)return{confined:!1,reason:t};if(!n)return{confined:!0};if(e.started!==!0||e.config===void 0)return{confined:!1,reason:"sandbox_failed_to_start"};let a=f(e.config);return a===void 0?{confined:!0}:{confined:!1,reason:a}}function d(e){if(!e.sandboxingEnabled){if(!e.enabledInSettings)return"sandbox_unavailable";return e.supportedHere?"sandbox_failed_to_start":"sandbox_unsupported"}if(e.filesystemPolicy!=="strict"||e.scrubMode)return"sandbox_unconfined";return}function f(e){if(e.weakensIsolation)return"sandbox_weakened";if(e.allowsUnixSockets)return"sandbox_allows_unix_sockets";if(e.injectsCredentials)return"sandbox_injects_credentials";return}function i(){let e=o.isSandboxingEnabled(),n=o.getConfig();return{sandboxingEnabled:e,enabledInSettings:o.isSandboxEnabledInSettings(),supportedHere:o.passesCheapSandboxGates(),filesystemPolicy:r(),scrubMode:s(),...n!==void 0&&{config:{allowsUnixSockets:n.network?.allowAllUnixSockets===!0||(n.network?.allowUnixSockets?.length??0)>0,injectsCredentials:[...n.credentials?.envVars??[],...n.credentials?.files??[]].some((t)=>t.mode==="mask"&&(t.injectHosts===void 0||t.injectHosts.length>0)),weakensIsolation:n.allowAppleEvents===!0||n.enableWeakerNestedSandbox===!0||(n.network?.allowMachLookup?.length??0)>0}}}}async function _(){let e=d(i());if(e!==void 0)return{confined:!1,reason:e};await o.initialize();let n=await o.waitForNetworkInitialization();return b({...i(),started:n},{requireStarted:!0})}var x=l(()=>{u();c()});
export{_ as Z0a,x as _0a};
