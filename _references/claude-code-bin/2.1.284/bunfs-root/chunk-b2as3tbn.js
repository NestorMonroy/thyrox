// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
function Gi(e,t){return{code:"InvalidArgument",argument:e,...t!==void 0&&{reason:t}}}var JWt="OtherNames";var QWt="LeafMoved",kzo="HardeningUnavailable",AKr="RemoteLink",Tzo="AsideStranded";var IJn="Unsupported";function jXe(e){return P1e(e)&&e.code==="Failed"&&e.telemetryCode===IJn}var n="ByteViewUnsupported";function yht(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===n}var r="StoreFenced";function CKr(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===r}var Azo="SourceNotRegular",Czo="SourceTooLarge",Rzo="SourceShared",xzo="SourceOutside";var o=new Set(["InvalidArgument","NotFound","AlreadyExists","PreconditionFailed","LeaseHeld","Unavailable","Failed","ScopeNotFound"]);function P1e(e){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"&&o.has(e.code)}var RKr="AbsentParent";function I1e(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===RKr}function wf(e){if(I1e(e))return"ENOENT";return"telemetryCode"in e?e.telemetryCode:void 0}var Pzo="TooLarge";function ot(e){return e.code+("failureClass"in e?` ${e.failureClass}`:"")+("telemetryCode"in e&&e.telemetryCode?` ${e.telemetryCode}`:"")+("cause"in e&&e.cause?`: ${i(e.cause)}`:"")}function i(e){return e instanceof Error?e.message:String(e)}
export{Gi,JWt,QWt,kzo,AKr,Tzo,IJn,jXe,yht,CKr,Azo,Czo,Rzo,xzo,P1e,RKr,I1e,wf,Pzo,ot};
