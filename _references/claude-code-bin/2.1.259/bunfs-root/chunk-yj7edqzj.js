// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Y0n}from"/$bunfs/root/chunk-x1rrg5j2.js";import{Ue}from"/$bunfs/root/chunk-jdw11prg.js";import{rl}from"/$bunfs/root/chunk-31e4aq9f.js";var o={notice:null,shownLoggedForDraftId:null,promptedCount:0,sessionDraftCount:0,seededFromDisk:!1,seedStarted:!1,toolCallCount:0};class n{autoDenyPresence=Ue();mainLoopBusy=rl({busy:!1});blockingToolProgress=rl({active:!1});dialogHostUnmounted=rl({unmounted:!1});onScreenBlockingDialog=rl({surfaceMounted:!1,kind:null});pendingSurveyFeedbackSource=null;terminalFocus="unknown";terminalFocusGainedAt=Number.NEGATIVE_INFINITY;terminalFocusChanged=Ue();feedbackNotice=rl(o);clawdEntranceTaken=!1;startupUpdateSummary=void 0;experimentEnrollmentsUnseen=void 0;orgMemoryWritesRowSeen=!1;orgMemoryReadRowSeen=!1;remoteHomeSettingsRowSeen=!1}var os=new n;function eSn(e){if(e)os.terminalFocusGainedAt=Date.now();os.terminalFocus=e?"focused":"blurred",Y0n(e),os.terminalFocusChanged.emit()}function doe(){return os.terminalFocus!=="blurred"}function MB(){return os.terminalFocus}function ZZn(){return os.terminalFocusGainedAt}function h7(e){return os.terminalFocusChanged.subscribe(e)}
export{os,eSn,doe,MB,ZZn,h7};
