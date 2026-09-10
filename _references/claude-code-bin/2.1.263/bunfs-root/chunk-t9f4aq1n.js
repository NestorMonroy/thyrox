// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{hp}from"/$bunfs/root/chunk-z4h5ym44.js";var zp={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function ZP(E){return hp(`?${E}h`)}function qz(E){return hp(`?${E}l`)}var HWe=ZP(zp.SYNCHRONIZED_UPDATE),V_e=qz(zp.SYNCHRONIZED_UPDATE),T1n=ZP(zp.BRACKETED_PASTE),Rat=qz(zp.BRACKETED_PASTE),Iat=ZP(zp.FOCUS_EVENTS),Mxe=qz(zp.FOCUS_EVENTS),C1n=ZP(zp.THEME_NOTIFY),xat=qz(zp.THEME_NOTIFY),wk=ZP(zp.CURSOR_VISIBLE),Ek=qz(zp.CURSOR_VISIBLE),Oxe=ZP(zp.ALT_SCREEN_CLEAR),Nxe=qz(zp.ALT_SCREEN_CLEAR),Lat=qz(zp.WIN32_INPUT_MODE),_=ZP(zp.MOUSE_NORMAL)+ZP(zp.MOUSE_BUTTON)+ZP(zp.MOUSE_ANY)+ZP(zp.MOUSE_SGR),t=ZP(zp.MOUSE_NORMAL)+ZP(zp.MOUSE_SGR),Q6=qz(zp.MOUSE_SGR)+qz(zp.MOUSE_ANY)+qz(zp.MOUSE_BUTTON)+qz(zp.MOUSE_NORMAL);function wWe(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{zp,ZP,qz,HWe,V_e,T1n,Rat,Iat,Mxe,C1n,xat,wk,Ek,Oxe,Nxe,Lat,Q6,wWe};
