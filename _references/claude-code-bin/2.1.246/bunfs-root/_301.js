// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Jjd as t,Kjd as i}from"/$bunfs/root/_826.js";import{xxd as s}from"/$bunfs/root/_837.js";class n{activeSocketPath=void 0;connectedClients=new Set;onEnqueue=null;onRename=null;onEnableRemoteControl=null;onPeerMessageStatus=null;processingChain=Promise.resolve();activeTokens=void 0;activeKeyFile=void 0;authRequired=!1;authOkReported=!1;authDropReported=!1;firstLineDeadlineMs=e;silentDropReported=!1;lastStartFailureCause=void 0;lastStartDegradedCause=void 0;reset(){this.onEnqueue=null,this.onRename=null,this.onEnableRemoteControl=null,this.onPeerMessageStatus=null,this.activeSocketPath=void 0,this.connectedClients.clear(),this.processingChain=Promise.resolve(),this.activeTokens=void 0,this.activeKeyFile=void 0,this.authRequired=!1,this.authOkReported=!1,this.authDropReported=!1,this.firstLineDeadlineMs=e,this.silentDropReported=!1,this.lastStartFailureCause=void 0,this.lastStartDegradedCause=void 0}}var e=30000,o;var a=s(()=>{i();o=new t(()=>new n)});
export{e as BF,o as CF,a as DF};
