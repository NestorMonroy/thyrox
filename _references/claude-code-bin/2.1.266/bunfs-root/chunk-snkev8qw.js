// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{hee}from"/$bunfs/root/chunk-kgqcj5g2.js";import{vn}from"/$bunfs/root/chunk-knsrg480.js";var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,M7e=256,WEt=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function O7e(e){return e.length>0&&e.length<=256&&!WEt.test(e)}function TS(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function Rz(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function Nc(e){return t(Rz(String(e??"")))}function yse(e){return Nc(e).replaceAll('"',"&quot;")}function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function Gme(e){if(e.loadedFrom==="syncedSkills")return!Tkn();return i(e)}function Tkn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||hee()}function GEt(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function IUe(e){return{description:qEt(e.description),argumentHint:PUe(e.argumentHint),whenToUse:PUe(e.whenToUse),argumentNames:e.argumentNames.map(qEt)}}function PUe(e){return e===void 0?void 0:qEt(e)}function qEt(e){return Rz(vn(e))}function VEt(e){return Rz(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{M7e,WEt,O7e,TS,Rz,Nc,yse,Gme,Tkn,GEt,IUe,PUe,qEt,VEt};
