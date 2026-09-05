// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{hp}from"/$bunfs/root/chunk-z9pce9zb.js";var zp={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function QP(E){return hp(`?${E}h`)}function Vz(E){return hp(`?${E}l`)}var bWe=QP(zp.SYNCHRONIZED_UPDATE),W_e=Vz(zp.SYNCHRONIZED_UPDATE),A1n=QP(zp.BRACKETED_PASTE),Cat=Vz(zp.BRACKETED_PASTE),Rat=QP(zp.FOCUS_EVENTS),Mxe=Vz(zp.FOCUS_EVENTS),v1n=QP(zp.THEME_NOTIFY),Iat=Vz(zp.THEME_NOTIFY),wk=QP(zp.CURSOR_VISIBLE),Ek=Vz(zp.CURSOR_VISIBLE),Oxe=QP(zp.ALT_SCREEN_CLEAR),Nxe=Vz(zp.ALT_SCREEN_CLEAR),xat=Vz(zp.WIN32_INPUT_MODE),_=QP(zp.MOUSE_NORMAL)+QP(zp.MOUSE_BUTTON)+QP(zp.MOUSE_ANY)+QP(zp.MOUSE_SGR),t=QP(zp.MOUSE_NORMAL)+QP(zp.MOUSE_SGR),Y6=Vz(zp.MOUSE_SGR)+Vz(zp.MOUSE_ANY)+Vz(zp.MOUSE_BUTTON)+Vz(zp.MOUSE_NORMAL);function SWe(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{zp,QP,Vz,bWe,W_e,A1n,Cat,Rat,Mxe,v1n,Iat,wk,Ek,Oxe,Nxe,xat,Y6,SWe};
