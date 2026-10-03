// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ra}from"/$bunfs/root/chunk-aqx56v12.js";var Tm={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function M0(E){return Ra(`?${E}h`)}function aW(E){return Ra(`?${E}l`)}var xSt=M0(Tm.SYNCHRONIZED_UPDATE),ZWe=aW(Tm.SYNCHRONIZED_UPDATE),BQr=M0(Tm.BRACKETED_PASTE),LKt=aW(Tm.BRACKETED_PASTE),NKt=M0(Tm.FOCUS_EVENTS),RQe=aW(Tm.FOCUS_EVENTS),jQr=M0(Tm.THEME_NOTIFY),$Kt=aW(Tm.THEME_NOTIFY),CI=M0(Tm.CURSOR_VISIBLE),RI=aW(Tm.CURSOR_VISIBLE),xQe=M0(Tm.ALT_SCREEN_CLEAR),IQe=aW(Tm.ALT_SCREEN_CLEAR),FKt=aW(Tm.WIN32_INPUT_MODE),S=M0(Tm.MOUSE_NORMAL)+M0(Tm.MOUSE_BUTTON)+M0(Tm.MOUSE_ANY)+M0(Tm.MOUSE_SGR),_=M0(Tm.MOUSE_NORMAL)+M0(Tm.MOUSE_SGR),Qoe=aW(Tm.MOUSE_SGR)+aW(Tm.MOUSE_ANY)+aW(Tm.MOUSE_BUTTON)+aW(Tm.MOUSE_NORMAL),WQr=M0(Tm.MOUSE_SGR_PIXELS),zQr=aW(Tm.MOUSE_SGR_PIXELS)+M0(Tm.MOUSE_SGR);function UKt(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{Tm,M0,aW,xSt,ZWe,BQr,LKt,NKt,RQe,jQr,$Kt,CI,RI,xQe,IQe,FKt,Qoe,WQr,zQr,UKt};
