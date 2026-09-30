// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{d0e,oSr,sSr,iSr}from"/$bunfs/root/chunk-n6mnwwn5.js";import{NXn}from"/$bunfs/root/chunk-b3peqa8h.js";import{c9n}from"/$bunfs/root/chunk-rd90w35x.js";import{Aqr}from"/$bunfs/root/chunk-n2rece43.js";function Whn(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function Ghn(t){let e=(r)=>t((o)=>{let i=typeof r==="function"?r(o.toolPermissionContext):r;return o.toolPermissionContext===i?o:{...o,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function PUe(t,e){return{markPrResolvedThisSession:()=>s(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>Whn(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...Ghn(e),setWebBrowserSlice:NXn(e),setArtifactReadVersion:oSr(e),getArtifactReadObservation:d0e(t),artifactRegistries:c9n(t,e),setArtifactContractTarget:sSr(e),getArtifactContractTarget:iSr(t),agentLifecycle:Aqr(t,e)}}
export{Whn,Ghn,PUe};
