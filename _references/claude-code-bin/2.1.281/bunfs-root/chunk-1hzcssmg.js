// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{a}from"/$bunfs/root/chunk-ay603yys.js";import{OW}from"/$bunfs/root/chunk-wckxjewz.js";import{An}from"/$bunfs/root/chunk-5wq5hbjb.js";var i=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,Fnt=256,AQt=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function Z7(e){return e.length>0&&e.length<=256&&!AQt.test(e)}function MOe(e){return e.length<=256&&/^[A-Za-z0-9_:.-]+$/.test(e)}function R_(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(i,(n)=>`&#${n.charCodeAt(0)};`)}function kY(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function kd(e){return t(kY(String(e??"")))}function Vwe(e){return kd(e).replaceAll('"',"&quot;")}function r(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function DOe(e){if(e.loadedFrom==="syncedSkills")return!R_r();return r(e)}function R_r(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||OW()}function CQt(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function KCt(e){return{description:xQt(e.description),argumentHint:RQt(e.argumentHint),whenToUse:RQt(e.whenToUse),argumentNames:e.argumentNames.map(xQt)}}function quo(e){return{...KCt(e),displayName:RQt(e.displayName),argumentHint:e.argumentHint===void 0?void 0:An(e.argumentHint),fallback:void 0}}function RQt(e){return e===void 0?void 0:xQt(e)}function xQt(e){return kY(An(e))}function IQt(e){return kY(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{Fnt,AQt,Z7,MOe,R_,kY,kd,Vwe,DOe,R_r,CQt,KCt,quo,RQt,xQt,IQt};
