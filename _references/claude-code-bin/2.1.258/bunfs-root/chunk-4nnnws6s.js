// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{OG}from"/$bunfs/root/chunk-vvp6yg1e.js";import{En}from"/$bunfs/root/chunk-6tm4k51s.js";var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,O6e=256,q_t=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function N6e(e){return e.length>0&&e.length<=256&&!q_t.test(e)}function Dw(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function P2(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function Vc(e){return t(P2(String(e??"")))}function $fe(e){return Vc(e).replaceAll('"',"&quot;")}function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function Mfe(e){if(e.loadedFrom==="syncedSkills")return!Kyn();return i(e)}function Kyn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||OG()}function K_t(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function lOe(e){return{description:Y_t(e.description),argumentHint:cOe(e.argumentHint),whenToUse:cOe(e.whenToUse),argumentNames:e.argumentNames.map(Y_t)}}function cOe(e){return e===void 0?void 0:Y_t(e)}function Y_t(e){return P2(En(e))}function X_t(e){return P2(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{O6e,q_t,N6e,Dw,P2,Vc,$fe,Mfe,Kyn,K_t,lOe,cOe,Y_t,X_t};
