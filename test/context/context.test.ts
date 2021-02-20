/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import {
  createContextKey,
  getSpan,
  isInstrumentationSuppressed,
  ROOT_CONTEXT,
  suppressInstrumentation,
  unsuppressInstrumentation,
  withSpan,
} from '../../src/context/context';
import { NoopSpan } from '../../src/trace/NoopSpan';
import { Context, context, NoopContextManager } from '../../src';

const SUPPRESS_INSTRUMENTATION_KEY = createContextKey(
  'OpenTelemetry Context Key SUPPRESS_INSTRUMENTATION'
);

// simple ContextManager supporting sync calls (NoopContextManager.active returns always ROOT_CONTEXT)
class SimpleContextManager extends NoopContextManager {
  active(): Context {
    return this._activeContext;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    const prevContext = this._activeContext;
    try {
      this._activeContext = context;
      return fn.call(thisArg, ...args);
    } finally {
      this._activeContext = prevContext;
    }
  }

  private _activeContext = ROOT_CONTEXT;
}

describe('Context Helpers', () => {
  describe('suppressInstrumentation', () => {
    it('should set suppress to true', () => {
      const context = suppressInstrumentation(ROOT_CONTEXT);
      assert.deepStrictEqual(isInstrumentationSuppressed(context), true);
    });
  });

  describe('unsuppressInstrumentation', () => {
    it('should set suppress to false', () => {
      const context = unsuppressInstrumentation(ROOT_CONTEXT);
      assert.deepStrictEqual(isInstrumentationSuppressed(context), false);
    });
  });

  describe('isInstrumentationSuppressed', () => {
    it('should get value as bool', () => {
      const expectedValue = true;
      const context = ROOT_CONTEXT.setValue(
        SUPPRESS_INSTRUMENTATION_KEY,
        expectedValue
      );

      const value = isInstrumentationSuppressed(context);

      assert.equal(value, expectedValue);
    });

    describe('when suppress instrumentation set to null', () => {
      const context = ROOT_CONTEXT.setValue(SUPPRESS_INSTRUMENTATION_KEY, null);

      it('should return false', () => {
        const value = isInstrumentationSuppressed(context);

        assert.equal(value, false);
      });
    });

    describe('when suppress instrumentation set to undefined', () => {
      const context = ROOT_CONTEXT.setValue(
        SUPPRESS_INSTRUMENTATION_KEY,
        undefined
      );

      it('should return false', () => {
        const value = isInstrumentationSuppressed(context);

        assert.equal(value, false);
      });
    });
  });

  describe('withSpan', () => {
    before(() => {
      const mgr = new SimpleContextManager();
      context.setGlobalContextManager(mgr);
    });

    after(() => {
      context.disable();
    });

    it('should run callback with span on context', () => {
      const span = new NoopSpan();

      function fnWithThis(this: string, a: string, b: number): string {
        assert.strictEqual(getSpan(context.active()), span);
        assert.strictEqual(this, 'that');
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(a, 'one');
        assert.strictEqual(b, 2);
        return 'done';
      }

      const res = withSpan(span, fnWithThis, 'that', 'one', 2);
      assert.strictEqual(res, 'done');
    });
  });
});
