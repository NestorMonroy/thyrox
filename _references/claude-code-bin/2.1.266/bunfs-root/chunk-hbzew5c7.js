// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Mf}from"/$bunfs/root/chunk-ydsbq05f.js";var cm={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function eO(E){return Mf(`?${E}h`)}function dq(E){return Mf(`?${E}l`)}var FVe=eO(cm.SYNCHRONIZED_UPDATE),HSe=dq(cm.SYNCHRONIZED_UPDATE),lWn=eO(cm.BRACKETED_PASTE),eut=dq(cm.BRACKETED_PASTE),tut=eO(cm.FOCUS_EVENTS),U0e=dq(cm.FOCUS_EVENTS),cWn=eO(cm.THEME_NOTIFY),nut=dq(cm.THEME_NOTIFY),XT=eO(cm.CURSOR_VISIBLE),JT=dq(cm.CURSOR_VISIBLE),B0e=eO(cm.ALT_SCREEN_CLEAR),j0e=dq(cm.ALT_SCREEN_CLEAR),rut=dq(cm.WIN32_INPUT_MODE),_=eO(cm.MOUSE_NORMAL)+eO(cm.MOUSE_BUTTON)+eO(cm.MOUSE_ANY)+eO(cm.MOUSE_SGR),t=eO(cm.MOUSE_NORMAL)+eO(cm.MOUSE_SGR),aX=dq(cm.MOUSE_SGR)+dq(cm.MOUSE_ANY)+dq(cm.MOUSE_BUTTON)+dq(cm.MOUSE_NORMAL);function UVe(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{cm,eO,dq,FVe,HSe,lWn,eut,tut,U0e,cWn,nut,XT,JT,B0e,j0e,rut,aX,UVe};
