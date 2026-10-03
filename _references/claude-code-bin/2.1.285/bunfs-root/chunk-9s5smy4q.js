// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j}from"/$bunfs/root/chunk-bxhyh54r.js";class e{binding=void 0;currentToolUseContext=void 0;currentOnProgress=void 0;callsInFlight=0;unregisterLockCleanup=void 0;activeThisTurn=!1;runLoopPump=void 0;runLoopPumpRetainCount=0;escHotkeyRegistered=!1;frozenCoordinateMode=void 0;hostAdapter=void 0;swiftModule=void 0;inputModule=void 0;reset(){if(this.unregisterLockCleanup!==void 0||this.escHotkeyRegistered||this.runLoopPump!==void 0)throw Error("ComputerUseSession.reset() called while the lock cleanup, Esc hotkey, or run-loop pump is still registered");this.binding=void 0,this.currentToolUseContext=void 0,this.currentOnProgress=void 0,this.callsInFlight=0,this.activeThisTurn=!1,this.runLoopPumpRetainCount=0,this.frozenCoordinateMode=void 0,this.hostAdapter=void 0,this.swiftModule=void 0,this.inputModule=void 0}}var n=new q(()=>new e);function B4(){return n.of(j().host)}
export{B4};
