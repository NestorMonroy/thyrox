// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
function zi(e,t){return{code:"InvalidArgument",argument:e,...t!==void 0&&{reason:t}}}function xWt(e="unknown",t){return{code:"Unavailable",failureClass:e,...t?.key!==void 0&&{key:t.key},...t?.retryAfterMs!==void 0&&{retryAfterMs:t.retryAfterMs},...t?.telemetryCode!==void 0&&{telemetryCode:t.telemetryCode}}}var IWt="OtherNames";var PWt="LeafMoved",D2o="HardeningUnavailable",s4r="RemoteLink",L2o="AsideStranded";var uJn="Unsupported";function GXe(e){return O1e(e)&&e.code==="Failed"&&e.telemetryCode===uJn}var n="ByteViewUnsupported";function aht(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===n}var r="StoreFenced";function i4r(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===r}var N2o="SourceNotRegular",$2o="SourceTooLarge",F2o="SourceShared",U2o="SourceOutside";var o=new Set(["InvalidArgument","NotFound","AlreadyExists","PreconditionFailed","LeaseHeld","Unavailable","Failed","ScopeNotFound"]);function O1e(e){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"&&o.has(e.code)}var a4r="AbsentParent";function H1e(e){return e.code==="Failed"&&"telemetryCode"in e&&e.telemetryCode===a4r}function yf(e){if(H1e(e))return"ENOENT";return"telemetryCode"in e?e.telemetryCode:void 0}var B2o="TooLarge";function nt(e){return e.code+("failureClass"in e?` ${e.failureClass}`:"")+("telemetryCode"in e&&e.telemetryCode?` ${e.telemetryCode}`:"")+("cause"in e&&e.cause?`: ${i(e.cause)}`:"")}function i(e){return e instanceof Error?e.message:String(e)}
export{zi,xWt,IWt,PWt,D2o,s4r,L2o,uJn,GXe,aht,i4r,N2o,$2o,F2o,U2o,O1e,a4r,H1e,yf,B2o,nt};
