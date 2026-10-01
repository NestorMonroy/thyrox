// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{wie,i_r,a_r,l_r}from"/$bunfs/root/chunk-engpw3kj.js";import{plr}from"/$bunfs/root/chunk-vz6d99j9.js";import{Lpr}from"/$bunfs/root/chunk-65n5tp28.js";import{Xoo}from"/$bunfs/root/chunk-f4knnxy3.js";function aRn(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){return(e)=>t((o)=>({...o,pendingMemoryUpdates:[...o.pendingMemoryUpdates,e]}))}function n(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function lRn(t){let e=(o)=>t((r)=>{let i=typeof o==="function"?o(r.toolPermissionContext):o;return r.toolPermissionContext===i?r:{...r,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function Kze(t,e){return{markPrResolvedThisSession:()=>n(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>aRn(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...lRn(e),setWebBrowserSlice:Lpr(e),setArtifactReadVersion:i_r(e),getArtifactReadObservation:wie(t),artifactRegistries:plr(t,e),setArtifactContractTarget:a_r(e),getArtifactContractTarget:l_r(t),enqueuePendingMemoryUpdate:s(e),agentLifecycle:Xoo(t,e)}}
export{aRn,lRn,Kze};
