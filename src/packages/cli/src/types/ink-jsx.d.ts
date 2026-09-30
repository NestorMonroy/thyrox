/**
 * Ink custom JSX intrinsic elements.
 *
 * With "jsx": "react-jsx", TypeScript resolves JSX types from react/jsx-runtime
 * whose IntrinsicElements extends React.JSX.IntrinsicElements. We augment the
 * 'react' module to inject our custom elements into React.JSX.IntrinsicElements.
 *
 * This file must be a module (have an import/export) for `declare module`
 * augmentation to work correctly.
 */
import type { ReactNode, Ref } from 'react';
// Con alias: dentro de `declare module 'react'` un nombre sin calificar
// resuelve primero en el ámbito de React, y `FocusEvent`/`KeyboardEvent`
// pasaban a ser los eventos DOM de React, no los de ink.
import type { ClickEvent, FocusEvent as InkFocusEvent, KeyboardEvent as InkKeyboardEvent, Styles, TextStyles, DOMElement } from '@anthropic/ink';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ink-box': {
        ref?: Ref<DOMElement>;
        tabIndex?: number;
        autoFocus?: boolean;
        onClick?: (event: ClickEvent) => void;
        onFocus?: (event: InkFocusEvent) => void;
        onFocusCapture?: (event: InkFocusEvent) => void;
        onBlur?: (event: InkFocusEvent) => void;
        onBlurCapture?: (event: InkFocusEvent) => void;
        onMouseEnter?: () => void;
        onMouseLeave?: () => void;
        onKeyDown?: (event: InkKeyboardEvent) => void;
        onKeyDownCapture?: (event: InkKeyboardEvent) => void;
        style?: Styles;
        stickyScroll?: boolean;
        children?: ReactNode;
      };
      'ink-text': {
        style?: Styles;
        textStyles?: TextStyles;
        children?: ReactNode;
      };
      'ink-link': {
        href?: string;
        children?: ReactNode;
      };
      'ink-raw-ansi': {
        rawText?: string;
        rawWidth?: number;
        rawHeight?: number;
      };
    }
  }
}
