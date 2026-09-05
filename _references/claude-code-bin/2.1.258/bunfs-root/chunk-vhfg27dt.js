// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{YLn}from"/$bunfs/root/chunk-b1z7jvb2.js";import{Ue}from"/$bunfs/root/chunk-ycrs8y50.js";import{Ja}from"/$bunfs/root/chunk-szt6v4n4.js";var o={notice:null,shownLoggedForDraftId:null,promptedCount:0,sessionDraftCount:0,seededFromDisk:!1,seedStarted:!1,toolCallCount:0};class n{autoDenyPresence=Ue();mainLoopBusy=Ja({busy:!1});blockingToolProgress=Ja({active:!1});dialogHostUnmounted=Ja({unmounted:!1});onScreenBlockingDialog=Ja({surfaceMounted:!1,kind:null});pendingSurveyFeedbackSource=null;terminalFocus="unknown";terminalFocusGainedAt=Number.NEGATIVE_INFINITY;terminalFocusChanged=Ue();feedbackNotice=Ja(o);clawdEntranceTaken=!1;startupUpdateSummary=void 0;experimentEnrollmentsUnseen=void 0;orgMemoryWritesRowSeen=!1;orgMemoryReadRowSeen=!1;remoteHomeSettingsRowSeen=!1}var rs=new n;function zbn(e){if(e)rs.terminalFocusGainedAt=Date.now();rs.terminalFocus=e?"focused":"blurred",YLn(e),rs.terminalFocusChanged.emit()}function Zre(){return rs.terminalFocus!=="blurred"}function IB(){return rs.terminalFocus}function DZn(){return rs.terminalFocusGainedAt}function c7(e){return rs.terminalFocusChanged.subscribe(e)}
export{rs,zbn,Zre,IB,DZn,c7};
