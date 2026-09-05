// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{dW}from"/$bunfs/root/chunk-1v541dwj.js";import{En}from"/$bunfs/root/chunk-7xxnrgeg.js";var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,SXe=256,qSt=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function HXe(e){return e.length>0&&e.length<=256&&!qSt.test(e)}function qw(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function nG(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function Qc(e){return t(nG(String(e??"")))}function Mpe(e){return Qc(e).replaceAll('"',"&quot;")}function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function Ope(e){if(e.loadedFrom==="syncedSkills")return!YSn();return i(e)}function YSn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||dW()}function KSt(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function WNe(e){return{description:YSt(e.description),argumentHint:zNe(e.argumentHint),whenToUse:zNe(e.whenToUse),argumentNames:e.argumentNames.map(YSt)}}function zNe(e){return e===void 0?void 0:YSt(e)}function YSt(e){return nG(En(e))}function XSt(e){return nG(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{SXe,qSt,HXe,qw,nG,Qc,Mpe,Ope,YSn,KSt,WNe,zNe,YSt,XSt};
