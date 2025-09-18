import React from "react";
import { FlatList, ScrollView, SectionList, VirtualizedList } from "react-native";

type ScrollableComponent = FlatList<any> | ScrollView | SectionList<any> | VirtualizedList<any>;

interface ScrollToOptions {
  animated?: boolean;
  offset?: number;
  viewPosition?: number;
  viewOffset?: number;
}

export class ScrollManager {
  private scrollRef: React.RefObject<ScrollableComponent> | null = null;
  private pendingScroll: (() => void) | null = null;
  private scrollTimeout: NodeJS.Timeout | null = null;

  setRef(ref: React.RefObject<ScrollableComponent>) {
    this.scrollRef = ref;
    if (this.pendingScroll) {
      this.executePendingScroll();
    }
  }

  private executePendingScroll() {
    if (this.pendingScroll && this.scrollRef?.current) {
      this.pendingScroll();
      this.pendingScroll = null;
    }
  }

  scrollToEnd(options: ScrollToOptions = { animated: true }) {
    const scroll = () => {
      if (!this.scrollRef?.current) return;

      const component = this.scrollRef.current;

      if ("scrollToEnd" in component) {
        component.scrollToEnd({ animated: options.animated });
      } else if ("scrollTo" in component) {
        (component as unknown as ScrollView).scrollTo({ y: Number.MAX_SAFE_INTEGER, animated: options.animated });
      }
    };

    if (this.scrollRef?.current) {
      scroll();
    } else {
      this.pendingScroll = scroll;
    }
  }

  scrollToIndex(index: number, options: ScrollToOptions = {}) {
    const scroll = () => {
      if (!this.scrollRef?.current) return;

      const component = this.scrollRef.current;

      if ("scrollToIndex" in component) {
        try {
          component.scrollToIndex({
            index,
            animated: options.animated ?? true,
            viewPosition: options.viewPosition,
            viewOffset: options.viewOffset,
          });
        } catch (error) {
          console.warn("ScrollToIndex failed:", error);
          this.scrollToOffset(index * 100, options);
        }
      } else {
        this.scrollToOffset(index * 100, options);
      }
    };

    if (this.scrollRef?.current) {
      scroll();
    } else {
      this.pendingScroll = scroll;
    }
  }

  scrollToOffset(offset: number, options: ScrollToOptions = {}) {
    const scroll = () => {
      if (!this.scrollRef?.current) return;

      const component = this.scrollRef.current;

      if ("scrollToOffset" in component) {
        component.scrollToOffset({
          offset,
          animated: options.animated ?? true,
        });
      } else if ("scrollTo" in component) {
        (component as ScrollView).scrollTo({
          y: offset,
          animated: options.animated ?? true,
        });
      }
    };

    if (this.scrollRef?.current) {
      scroll();
    } else {
      this.pendingScroll = scroll;
    }
  }

  scrollToItem(
    item: any,
    getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number },
  ) {
    if (!this.scrollRef?.current) {
      this.pendingScroll = () => this.scrollToItem(item, getItemLayout);
      return;
    }

    const component = this.scrollRef.current;

    if ("scrollToItem" in component && component.scrollToItem) {
      try {
        component.scrollToItem({ item, animated: true });
      } catch (error) {
        console.warn("ScrollToItem failed:", error);
      }
    }
  }

  safeScrollToEnd(delay: number = 100) {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.scrollToEnd();
      this.scrollTimeout = null;
    }, delay);
  }

  cleanup() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    this.pendingScroll = null;
    this.scrollRef = null;
  }
}

export function createScrollManager(): ScrollManager {
  return new ScrollManager();
}

export function useScrollManager() {
  const [manager] = React.useState(() => createScrollManager());

  React.useEffect(() => {
    return () => {
      manager.cleanup();
    };
  }, [manager]);

  return manager;
}
