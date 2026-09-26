// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
function Pi(e,t){return{code:"InvalidArgument",argument:e,...t!==void 0&&{reason:t}}}var W$t="OtherNames";var z$t="LeafMoved",WHo="HardeningUnavailable",G$r="RemoteLink",zHo="AsideStranded";var pKn="Unsupported";function B6e(e){return sFe(e)&&e.code==="Failed"&&e.telemetryCode===pKn}var n="ByteViewUnsupported";function Eut(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===n}var r="StoreFenced";function V$r(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===r}var GHo="SourceNotRegular",VHo="SourceTooLarge",qHo="SourceShared",KHo="SourceOutside";var o=new Set(["InvalidArgument","NotFound","AlreadyExists","PreconditionFailed","LeaseHeld","Unavailable","Failed","ScopeNotFound"]);function sFe(e){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"&&o.has(e.code)}var q$r="AbsentParent";function iFe(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===q$r}function ef(e){if(iFe(e))return"ENOENT";return"telemetryCode"in e?e.telemetryCode:void 0}var YHo="TooLarge";function Ze(e){return e.code+("failureClass"in e?` ${e.failureClass}`:"")+("telemetryCode"in e&&e.telemetryCode?` ${e.telemetryCode}`:"")+("cause"in e&&e.cause?`: ${i(e.cause)}`:"")}function i(e){return e instanceof Error?e.message:String(e)}
export{Pi,W$t,z$t,WHo,G$r,zHo,pKn,B6e,Eut,V$r,GHo,VHo,qHo,KHo,sFe,q$r,iFe,ef,YHo,Ze};
