// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
function ji(e,t){return{code:"InvalidArgument",argument:e,...t!==void 0&&{reason:t}}}var v1t="OtherNames";var E1t="LeafMoved",EBo="HardeningUnavailable",mzr="RemoteLink",kBo="AsideStranded";var GYn="Unsupported";function f9e(e){return pBe(e)&&e.code==="Failed"&&e.telemetryCode===GYn}var n="ByteViewUnsupported";function hmt(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===n}var r="StoreFenced";function gzr(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===r}var TBo="SourceNotRegular",ABo="SourceTooLarge",CBo="SourceShared",RBo="SourceOutside";var o=new Set(["InvalidArgument","NotFound","AlreadyExists","PreconditionFailed","LeaseHeld","Unavailable","Failed","ScopeNotFound"]);function pBe(e){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"&&o.has(e.code)}var hzr="AbsentParent";function fBe(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===hzr}function mf(e){if(fBe(e))return"ENOENT";return"telemetryCode"in e?e.telemetryCode:void 0}var xBo="TooLarge";function rt(e){return e.code+("failureClass"in e?` ${e.failureClass}`:"")+("telemetryCode"in e&&e.telemetryCode?` ${e.telemetryCode}`:"")+("cause"in e&&e.cause?`: ${i(e.cause)}`:"")}function i(e){return e instanceof Error?e.message:String(e)}
export{ji,v1t,E1t,EBo,mzr,kBo,GYn,f9e,hmt,gzr,TBo,ABo,CBo,RBo,pBe,hzr,fBe,mf,xBo,rt};
