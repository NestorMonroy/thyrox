// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{hNn}from"/$bunfs/root/chunk-t8q7n4ta.js";import{Le}from"/$bunfs/root/chunk-a7esebzw.js";import{da}from"/$bunfs/root/chunk-xjq10gh9.js";var o={notice:null,shownLoggedForDraftId:null,promptedCount:0,sessionDraftCount:0,seededFromDisk:!1,seedStarted:!1,toolCallCount:0};class n{autoDenyPresence=Le();mainLoopBusy=da({busy:!1});blockingToolProgress=da({active:!1});dialogHostUnmounted=da({unmounted:!1});onScreenBlockingDialog=da({surfaceMounted:!1,kind:null});pendingSurveyFeedbackSource=null;terminalFocus="unknown";terminalFocusGainedAt=Number.NEGATIVE_INFINITY;terminalFocusChanged=Le();feedbackNotice=da(o);clawdEntranceTaken=!1;startupUpdateSummary=void 0;experimentEnrollmentsUnseen=void 0;orgMemoryWritesRowSeen=!1;orgMemoryReadRowSeen=!1;remoteHomeSettingsRowSeen=!1}var Ys=new n;function Svn(e){if(e)Ys.terminalFocusGainedAt=Date.now();Ys.terminalFocus=e?"focused":"blurred",hNn(e),Ys.terminalFocusChanged.emit()}function Yoe(){return Ys.terminalFocus!=="blurred"}function b0(){return Ys.terminalFocus}function Zer(){return Ys.terminalFocusGainedAt}function ZV(e){return Ys.terminalFocusChanged.subscribe(e)}
export{Ys,Svn,Yoe,b0,Zer,ZV};
