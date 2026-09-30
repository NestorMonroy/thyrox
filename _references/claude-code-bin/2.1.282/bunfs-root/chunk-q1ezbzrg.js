// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{DPe,vlr,Elr,klr}from"/$bunfs/root/chunk-etvwvvwh.js";import{uQn}from"/$bunfs/root/chunk-vwkqbfxk.js";import{frr}from"/$bunfs/root/chunk-54a4bd7s.js";import{S6r}from"/$bunfs/root/chunk-tyy5swz9.js";function oSn(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function sSn(t){let e=(r)=>t((o)=>{let i=typeof r==="function"?r(o.toolPermissionContext):r;return o.toolPermissionContext===i?o:{...o,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function i1e(t,e){return{markPrResolvedThisSession:()=>s(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>oSn(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...sSn(e),setWebBrowserSlice:frr(e),setArtifactReadVersion:vlr(e),getArtifactReadObservation:DPe(t),artifactRegistries:uQn(t,e),setArtifactContractTarget:Elr(e),getArtifactContractTarget:klr(t),agentLifecycle:S6r(t,e)}}
export{oSn,sSn,i1e};
