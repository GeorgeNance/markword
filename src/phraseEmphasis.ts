import { Extension } from '@codemirror/next/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  Range,
  themeClass,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/next/view';
import { isCursorInside } from './utils';
import { codeFontFamily } from './theme';

export function phraseEmphasis(): Extension {
  return [phraseEmphasisDecorationPlugin, baseTheme];
}

const emphasisRE = {
  bold: [/(?<!\*)\*\*([^\*]+?)\*\*(?!\*)/g, /(?<!_)__([^_]+?)__(?!_)/g],
  italic: [/(?<!\*)\*([^\*]+?)\*(?!\*)/g, /(?<!_)_([^_]+?)_(?!_)/g],
  inlineCode: [/(?<!`)`([^`]+?)`(?!`)/g],
};

const phraseEmphasisDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(public view: EditorView) {
      this.recompute();
    }

    recompute(update?: ViewUpdate) {
      let decorations: Range<Decoration>[] = [];
      for (let { from, to } of this.view.visibleRanges) {
        this.getDecorationsFor(from, to, decorations);
      }
      decorations.sort((deco1, deco2) => (deco1.from > deco2.from ? 1 : -1));
      this.decorations = Decoration.set(decorations);

      // Iterate all decorations and remove those shouldn't be created.
      let prevFrom: Number, prevTo: Number;
      this.decorations = this.decorations.update({
        filter: (from, to) => {
          // Filter out decorations if it's wrapped by another emphasis decoration.
          if (from > prevFrom && to < prevTo) {
            return false;
          }
          prevFrom = from;
          prevTo = to;

          // Filter out decorations when the cursor is inside.
          if (update && isCursorInside(update, from, to)) {
            return false;
          }
          return true;
        },
      });
    }

    update(update: ViewUpdate) {
      if (update.changes.length || update.viewportChanged) {
        this.recompute(update);
      }
    }

    getDecorationsFor(from: number, to: number, decorations: Range<Decoration>[]) {
      let { doc } = this.view.state;

      for (const r of emphasisRE.bold) {
        for (let pos = from, cursor = doc.iterRange(from, to), m; !cursor.next().done; ) {
          if (!cursor.lineBreak) {
            while ((m = r.exec(cursor.value))) {
              let deco = Decoration.replace({ widget: new BoldWidget(m[0], m[1]) });
              decorations.push(deco.range(pos + m.index, pos + m.index + m[0].length));
            }
          }
          pos += cursor.value.length;
        }
      }

      for (const r of emphasisRE.italic) {
        for (let pos = from, cursor = doc.iterRange(from, to), m; !cursor.next().done; ) {
          if (!cursor.lineBreak) {
            while ((m = r.exec(cursor.value))) {
              let deco = Decoration.replace({ widget: new ItalicWidget(m[0], m[1]) });
              decorations.push(deco.range(pos + m.index, pos + m.index + m[0].length));
            }
          }
          pos += cursor.value.length;
        }
      }

      for (const r of emphasisRE.inlineCode) {
        for (let pos = from, cursor = doc.iterRange(from, to), m; !cursor.next().done; ) {
          if (!cursor.lineBreak) {
            while ((m = r.exec(cursor.value))) {
              let deco = Decoration.replace({ widget: new InlineCodeWidget(m[0], m[1]) });
              decorations.push(deco.range(pos + m.index, pos + m.index + m[0].length));
            }
          }
          pos += cursor.value.length;
        }
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

class BoldWidget extends WidgetType {
  constructor(readonly rawValue: string, readonly visibleValue: string) {
    super();
  }
  eq(other: BoldWidget) {
    return this.rawValue === other.rawValue;
  }
  toDOM() {
    let span = document.createElement('span');
    span.textContent = this.visibleValue;
    span.classList.add(themeClass('bold'));
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class ItalicWidget extends WidgetType {
  constructor(readonly rawValue: string, readonly visibleValue: string) {
    super();
  }
  eq(other: ItalicWidget) {
    return this.rawValue === other.rawValue;
  }
  toDOM() {
    let span = document.createElement('span');
    span.textContent = this.visibleValue;
    span.classList.add(themeClass('italic'));
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

class InlineCodeWidget extends WidgetType {
  constructor(readonly rawValue: string, readonly visibleValue: string) {
    super();
  }
  eq(other: InlineCodeWidget) {
    return this.rawValue === other.rawValue;
  }
  toDOM() {
    let span = document.createElement('span');
    span.textContent = this.visibleValue;
    span.classList.add(themeClass('inline-code'));
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

const baseTheme = EditorView.baseTheme({
  $bold: {
    fontWeight: 'bold',
  },
  $italic: {
    fontStyle: 'italic',
  },
  '$inline-code': {
    ...codeFontFamily,
  },
});