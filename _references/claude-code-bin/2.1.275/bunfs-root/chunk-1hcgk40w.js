// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{gU}from"/$bunfs/root/chunk-1d5n9rp4.js";import{An}from"/$bunfs/root/chunk-75n2g1wh.js";var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,p8e=256,gzt=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function bY(e){return e.length>0&&e.length<=256&&!gzt.test(e)}function TAe(e){return e.length<=256&&/^[A-Za-z0-9_:.-]+$/.test(e)}function th(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function k4(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function uu(e){return t(k4(String(e??"")))}function sge(e){return uu(e).replaceAll('"',"&quot;")}function o(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function CAe(e){if(e.loadedFrom==="syncedSkills")return!XYn();return o(e)}function XYn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||gU()}function hzt(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function f8e(e){return{description:yzt(e.description),argumentHint:m8e(e.argumentHint),whenToUse:m8e(e.whenToUse),argumentNames:e.argumentNames.map(yzt)}}function m8e(e){return e===void 0?void 0:yzt(e)}function yzt(e){return k4(An(e))}function _zt(e){return k4(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{p8e,gzt,bY,TAe,th,k4,uu,sge,CAe,XYn,hzt,f8e,m8e,yzt,_zt};
