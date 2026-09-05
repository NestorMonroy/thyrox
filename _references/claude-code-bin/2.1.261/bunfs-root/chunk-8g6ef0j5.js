// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{GQ}from"/$bunfs/root/chunk-s0879eds.js";import{bn}from"/$bunfs/root/chunk-sh3w3snz.js";var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,gXe=256,mHt=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function hXe(e){return e.length>0&&e.length<=256&&!mHt.test(e)}function Xb(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function H2(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function Rc(e){return t(H2(String(e??"")))}function noe(e){return Rc(e).replaceAll('"',"&quot;")}function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function ape(e){if(e.loadedFrom==="syncedSkills")return!$Sn();return i(e)}function $Sn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||GQ()}function gHt(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function HNe(e){return{description:hHt(e.description),argumentHint:wNe(e.argumentHint),whenToUse:wNe(e.whenToUse),argumentNames:e.argumentNames.map(hHt)}}function wNe(e){return e===void 0?void 0:hHt(e)}function hHt(e){return H2(bn(e))}function yHt(e){return H2(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{gXe,mHt,hXe,Xb,H2,Rc,noe,ape,$Sn,gHt,HNe,wNe,hHt,yHt};
