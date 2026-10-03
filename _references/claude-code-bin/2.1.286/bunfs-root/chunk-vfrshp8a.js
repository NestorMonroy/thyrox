// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
function Zi(e,t){return{code:"InvalidArgument",argument:e,...t!==void 0&&{reason:t}}}function UGt(e="unknown",t){return{code:"Unavailable",failureClass:e,...t?.key!==void 0&&{key:t.key},...t?.retryAfterMs!==void 0&&{retryAfterMs:t.retryAfterMs},...t?.telemetryCode!==void 0&&{telemetryCode:t.telemetryCode}}}var BGt="OtherNames";var jGt="LeafMoved",y4o="HardeningUnavailable",K6r="RemoteLink",_4o="AsideStranded";var _Zn="Unsupported";function w7e(e){return Gje(e)&&e.code==="Failed"&&e.telemetryCode===_Zn}var n="ByteViewUnsupported";function c_t(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===n}var r="StoreFenced";function Y6r(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===r}var b4o="SourceNotRegular",S4o="SourceTooLarge",w4o="SourceShared",v4o="SourceOutside";var o=new Set(["InvalidArgument","NotFound","AlreadyExists","PreconditionFailed","LeaseHeld","Unavailable","Failed","ScopeNotFound"]);function Gje(e){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"&&o.has(e.code)}var X6r="AbsentParent";function Vje(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===X6r}function Tf(e){if(Vje(e))return"ENOENT";return"telemetryCode"in e?e.telemetryCode:void 0}var E4o="TooLarge";function rt(e){return e.code+("failureClass"in e?` ${e.failureClass}`:"")+("telemetryCode"in e&&e.telemetryCode?` ${e.telemetryCode}`:"")+("cause"in e&&e.cause?`: ${i(e.cause)}`:"")}function i(e){return e instanceof Error?e.message:String(e)}
export{Zi,UGt,BGt,jGt,y4o,K6r,_4o,_Zn,w7e,c_t,Y6r,b4o,S4o,w4o,v4o,Gje,X6r,Vje,Tf,E4o,rt};
