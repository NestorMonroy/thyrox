// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{YAe,UXn,BXn,jXn}from"/$bunfs/root/chunk-y4mqcs47.js";import{INn}from"/$bunfs/root/chunk-vrtrwtwd.js";import{ZDn}from"/$bunfs/root/chunk-7tp6neza.js";import{Ekr}from"/$bunfs/root/chunk-p31s7v71.js";function eZt(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function tZt(t){let e=(r)=>t((o)=>{let i=typeof r==="function"?r(o.toolPermissionContext):r;return o.toolPermissionContext===i?o:{...o,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function p0e(t,e){return{markPrResolvedThisSession:()=>s(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>eZt(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...tZt(e),setWebBrowserSlice:INn(e),setArtifactReadVersion:UXn(e),getArtifactReadObservation:YAe(t),artifactRegistries:ZDn(t,e),setArtifactContractTarget:BXn(e),getArtifactContractTarget:jXn(t),agentLifecycle:Ekr(t,e)}}
export{eZt,tZt,p0e};
