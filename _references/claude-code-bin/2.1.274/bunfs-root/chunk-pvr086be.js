// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Mke,J6n,Q6n,Z6n}from"/$bunfs/root/chunk-qq8vrqdk.js";import{nOn}from"/$bunfs/root/chunk-11trjymx.js";import{PHn}from"/$bunfs/root/chunk-y1vmgg46.js";import{X_r}from"/$bunfs/root/chunk-jy1856dw.js";function wXt(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function vXt(t){let e=(r)=>t((o)=>{let i=typeof r==="function"?r(o.toolPermissionContext):r;return o.toolPermissionContext===i?o:{...o,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function HPe(t,e){return{markPrResolvedThisSession:()=>s(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>wXt(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...vXt(e),setWebBrowserSlice:nOn(e),setArtifactReadVersion:J6n(e),getArtifactReadObservation:Mke(t),artifactRegistries:PHn(t,e),setArtifactContractTarget:Q6n(e),getArtifactContractTarget:Z6n(t),agentLifecycle:X_r(t,e)}}
export{wXt,vXt,HPe};
