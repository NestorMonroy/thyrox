// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{dp}from"/$bunfs/root/chunk-ns7q42ah.js";var Jp={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function HD(E){return dp(`?${E}h`)}function _z(E){return dp(`?${E}l`)}var zKe=HD(Jp.SYNCHRONIZED_UPDATE),ySe=_z(Jp.SYNCHRONIZED_UPDATE),yFt=HD(Jp.BRACKETED_PASTE),VKe=_z(Jp.BRACKETED_PASTE),Bdt=HD(Jp.FOCUS_EVENTS),rDe=_z(Jp.FOCUS_EVENTS),_Ft=HD(Jp.THEME_NOTIFY),qKe=_z(Jp.THEME_NOTIFY),Nk=HD(Jp.CURSOR_VISIBLE),lC=_z(Jp.CURSOR_VISIBLE),Udt=HD(Jp.ALT_SCREEN_CLEAR),Zzn=_z(Jp.ALT_SCREEN_CLEAR),jdt=_z(Jp.WIN32_INPUT_MODE),_=HD(Jp.MOUSE_NORMAL)+HD(Jp.MOUSE_BUTTON)+HD(Jp.MOUSE_ANY)+HD(Jp.MOUSE_SGR),t=HD(Jp.MOUSE_NORMAL)+HD(Jp.MOUSE_SGR),SF=_z(Jp.MOUSE_SGR)+_z(Jp.MOUSE_ANY)+_z(Jp.MOUSE_BUTTON)+_z(Jp.MOUSE_NORMAL);function PY(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{Jp,HD,_z,zKe,ySe,yFt,VKe,Bdt,rDe,_Ft,qKe,Nk,lC,Udt,Zzn,jdt,SF,PY};
