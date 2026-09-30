// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ia}from"/$bunfs/root/chunk-rx56hxr8.js";var Cm={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function kD(E){return Ia(`?${E}h`)}function pW(E){return Ia(`?${E}l`)}var RSt=kD(Cm.SYNCHRONIZED_UPDATE),zWe=pW(Cm.SYNCHRONIZED_UPDATE),rQr=kD(Cm.BRACKETED_PASTE),YKt=pW(Cm.BRACKETED_PASTE),XKt=kD(Cm.FOCUS_EVENTS),CQe=pW(Cm.FOCUS_EVENTS),oQr=kD(Cm.THEME_NOTIFY),JKt=pW(Cm.THEME_NOTIFY),RP=kD(Cm.CURSOR_VISIBLE),xP=pW(Cm.CURSOR_VISIBLE),RQe=kD(Cm.ALT_SCREEN_CLEAR),xQe=pW(Cm.ALT_SCREEN_CLEAR),QKt=pW(Cm.WIN32_INPUT_MODE),S=kD(Cm.MOUSE_NORMAL)+kD(Cm.MOUSE_BUTTON)+kD(Cm.MOUSE_ANY)+kD(Cm.MOUSE_SGR),_=kD(Cm.MOUSE_NORMAL)+kD(Cm.MOUSE_SGR),Qoe=pW(Cm.MOUSE_SGR)+pW(Cm.MOUSE_ANY)+pW(Cm.MOUSE_BUTTON)+pW(Cm.MOUSE_NORMAL),sQr=kD(Cm.MOUSE_SGR_PIXELS),iQr=pW(Cm.MOUSE_SGR_PIXELS)+kD(Cm.MOUSE_SGR);function ZKt(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{Cm,kD,pW,RSt,zWe,rQr,YKt,XKt,CQe,oQr,JKt,RP,xP,RQe,xQe,QKt,Qoe,sQr,iQr,ZKt};
