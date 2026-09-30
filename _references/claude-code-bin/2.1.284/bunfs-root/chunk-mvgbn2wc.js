// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{vie,O_r,H_r,M_r}from"/$bunfs/root/chunk-er45rrqn.js";import{glr}from"/$bunfs/root/chunk-y91ngkks.js";import{mfr}from"/$bunfs/root/chunk-vrtqpb6q.js";import{aoo}from"/$bunfs/root/chunk-0rycxrry.js";function aRn(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){return(e)=>t((o)=>({...o,pendingMemoryUpdates:[...o.pendingMemoryUpdates,e]}))}function n(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function lRn(t){let e=(o)=>t((r)=>{let i=typeof o==="function"?o(r.toolPermissionContext):o;return r.toolPermissionContext===i?r:{...r,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function BGe(t,e){return{markPrResolvedThisSession:()=>n(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>aRn(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...lRn(e),setWebBrowserSlice:mfr(e),setArtifactReadVersion:O_r(e),getArtifactReadObservation:vie(t),artifactRegistries:glr(t,e),setArtifactContractTarget:H_r(e),getArtifactContractTarget:M_r(t),enqueuePendingMemoryUpdate:s(e),agentLifecycle:aoo(t,e)}}
export{aRn,lRn,BGe};
