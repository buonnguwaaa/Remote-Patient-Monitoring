import React, { useRef, useEffect, useCallback } from 'react';
import { View, InteractionManager, Platform, findNodeHandle, UIManager } from 'react-native';
import { useTutorial } from '../../context/tutorial/TutorialContext';

export default function TutorialTarget({ name, routeName, children, style }) {
  const { registerTarget, unregisterTarget, tutorialMode, currentStep } = useTutorial();
  const viewRef = useRef(null);

  const measureAndRegister = useCallback(() => {
    if (!tutorialMode) return;

    let attempts = 0;
    let retryTimer = null;
    const tryMeasure = () => {
      attempts++;
      if (!viewRef.current) {
        if (attempts < 20) retryTimer = setTimeout(tryMeasure, 250);
        return;
      }
      if (Platform.OS === 'web') {
        try {
          // In some RNW versions, viewRef.current IS the DOM node
          const node = viewRef.current.getBoundingClientRect ? viewRef.current : findNodeHandle(viewRef.current);
          if (node && node.getBoundingClientRect) {
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              registerTarget(name, { x: rect.left, y: rect.top, width: rect.width, height: rect.height, routeName });
              return;
            }
          }
        } catch (e) { }
      }

      // Schedule next attempt in case measure callback is silently dropped
      if (attempts < 20) {
        retryTimer = setTimeout(tryMeasure, 250);
      }

      try {
        const handleMeasure = (x, y, w, h) => {
          if (w > 0 && h > 0) {
            clearTimeout(retryTimer);
            registerTarget(name, { x, y, width: w, height: h, routeName });
          }
        };

        if (viewRef.current.measureInWindow) {
          viewRef.current.measureInWindow((x, y, w, h) => {
            handleMeasure(x, y, w, h);
          });
        } else if (viewRef.current.measure) {
          viewRef.current.measure((x, y, w, h, pageX, pageY) => {
            handleMeasure(pageX, pageY, w, h);
          });
        }
      } catch (e) { }
    };

    retryTimer = setTimeout(tryMeasure, 100);
  }, [tutorialMode, name, routeName, registerTarget]);

  useEffect(() => {
    if (tutorialMode) {
      // Small delay just to ensure layout is completely settled, though InteractionManager handles most of it.
      const timer = setTimeout(measureAndRegister, 100);
      return () => {
        clearTimeout(timer);
        unregisterTarget(name);
      };
    }
  }, [tutorialMode, currentStep?.id, name, measureAndRegister, unregisterTarget]);

  if (!tutorialMode) {
    return <>{children}</>;
  }

  return (
    <View
      ref={viewRef}
      onLayout={measureAndRegister}
      style={style}
      collapsable={false}
    >
      {children}
    </View>
  );
}
