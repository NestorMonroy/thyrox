// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{a}from"/$bunfs/root/chunk-j96jysac.js";import{P1}from"/$bunfs/root/chunk-esk1bxsv.js";import{kn}from"/$bunfs/root/chunk-qk2a968b.js";var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,g6e=256,lBt=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function k8(e){return e.length>0&&e.length<=256&&!lBt.test(e)}function uke(e){return e.length<=256&&/^[A-Za-z0-9_:.-]+$/.test(e)}function qg(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function WK(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function ru(e){return t(WK(String(e??"")))}function zfe(e){return ru(e).replaceAll('"',"&quot;")}function o(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function dke(e){if(e.loadedFrom==="syncedSkills")return!s3n();return o(e)}function s3n(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||P1()}function cBt(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function h6e(e){return{description:uBt(e.description),argumentHint:y6e(e.argumentHint),whenToUse:y6e(e.whenToUse),argumentNames:e.argumentNames.map(uBt)}}function y6e(e){return e===void 0?void 0:uBt(e)}function uBt(e){return WK(kn(e))}function dBt(e){return WK(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{g6e,lBt,k8,uke,qg,WK,ru,zfe,dke,s3n,cBt,h6e,y6e,uBt,dBt};
