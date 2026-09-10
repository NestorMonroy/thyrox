// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
function uct(s){return"method"in s&&"id"in s&&s.id!==null}class cqe{serverName;sendMcpMessage;isClosed=!1;onclose;onerror;onmessage;constructor(s,e){this.serverName=s;this.sendMcpMessage=e}async start(){}async send(s){if(this.isClosed)throw Error("Transport is closed");let e=await this.sendMcpMessage(this.serverName,s);if(this.onmessage)this.onmessage(e)}async close(){if(this.isClosed)return;this.isClosed=!0,this.onclose?.()}}class Son{sendMcpMessage;isClosed=!1;constructor(s){this.sendMcpMessage=s}onclose;onerror;onmessage;async start(){}async send(s){if(this.isClosed)throw Error("Transport is closed");this.sendMcpMessage(s)}async close(){if(this.isClosed)return;this.isClosed=!0,this.onclose?.()}}
export{uct,cqe,Son};
