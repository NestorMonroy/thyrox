// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
function Ti(e,t){return{code:"InvalidArgument",argument:e,...t!==void 0&&{reason:t}}}var cLt="OtherNames";var dLt="LeafMoved",SCo="HardeningUnavailable",SMr="RemoteLink",wCo="AsideStranded";var TGn="Unsupported";function c3e(e){return ONe(e)&&e.code==="Failed"&&e.telemetryCode===TGn}var n="ByteViewUnsupported";function Lct(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===n}var r="StoreFenced";function wMr(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===r}var vCo="SourceNotRegular",ECo="SourceTooLarge",kCo="SourceShared",TCo="SourceOutside";var o=new Set(["InvalidArgument","NotFound","AlreadyExists","PreconditionFailed","LeaseHeld","Unavailable","Failed","ScopeNotFound"]);function ONe(e){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"&&o.has(e.code)}var vMr="AbsentParent";function MNe(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===vMr}function zp(e){if(MNe(e))return"ENOENT";return"telemetryCode"in e?e.telemetryCode:void 0}var ACo="TooLarge";function Ze(e){return e.code+("failureClass"in e?` ${e.failureClass}`:"")+("telemetryCode"in e&&e.telemetryCode?` ${e.telemetryCode}`:"")+("cause"in e&&e.cause?`: ${i(e.cause)}`:"")}function i(e){return e instanceof Error?e.message:String(e)}
export{Ti,cLt,dLt,SCo,SMr,wCo,TGn,c3e,Lct,wMr,vCo,ECo,kCo,TCo,ONe,vMr,MNe,zp,ACo,Ze};
