// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{i0n}from"/$bunfs/root/chunk-k6vqz9fa.js";import{$e}from"/$bunfs/root/chunk-8a7jwk3w.js";import{Ya}from"/$bunfs/root/chunk-a4fh8a2g.js";var o={notice:null,shownLoggedForDraftId:null,promptedCount:0,sessionDraftCount:0,seededFromDisk:!1,seedStarted:!1,toolCallCount:0};class n{autoDenyPresence=$e();mainLoopBusy=Ya({busy:!1});blockingToolProgress=Ya({active:!1});dialogHostUnmounted=Ya({unmounted:!1});onScreenBlockingDialog=Ya({surfaceMounted:!1,kind:null});pendingSurveyFeedbackSource=null;terminalFocus="unknown";terminalFocusGainedAt=Number.NEGATIVE_INFINITY;terminalFocusChanged=$e();feedbackNotice=Ya(o);clawdEntranceTaken=!1;startupUpdateSummary=void 0;experimentEnrollmentsUnseen=void 0;orgMemoryWritesRowSeen=!1;orgMemoryReadRowSeen=!1;remoteHomeSettingsRowSeen=!1}var Vs=new n;function u_n(e){if(e)Vs.terminalFocusGainedAt=Date.now();Vs.terminalFocus=e?"focused":"blurred",i0n(e),Vs.terminalFocusChanged.emit()}function kre(){return Vs.terminalFocus!=="blurred"}function TL(){return Vs.terminalFocus}function XXn(){return Vs.terminalFocusGainedAt}function OV(e){return Vs.terminalFocusChanged.subscribe(e)}
export{Vs,u_n,kre,TL,XXn,OV};
