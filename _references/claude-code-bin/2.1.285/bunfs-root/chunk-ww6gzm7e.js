// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{a}from"/$bunfs/root/chunk-5054mktj.js";import{MN}from"/$bunfs/root/chunk-gph9jdam.js";import{Tn}from"/$bunfs/root/chunk-thv2q2wm.js";import{t2}from"/$bunfs/root/chunk-e94rvf2h.js";function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function U$e(e){if(e.loadedFrom==="syncedSkills")return!Bqn();return i(e)}function Bqn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||MN()}function nun(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function _Nt(e){return{description:e2(e.description),argumentHint:run(e.argumentHint),whenToUse:run(e.whenToUse),argumentNames:e.argumentNames.map(e2)}}function MMo(e){return{..._Nt(e),displayName:run(e.displayName),argumentHint:e.argumentHint===void 0?void 0:Tn(e.argumentHint),fallback:void 0}}function run(e){return e===void 0?void 0:e2(e)}function e2(e){return t2(Tn(e))}function oun(e){return t2(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{U$e,Bqn,nun,_Nt,MMo,run,e2,oun};
