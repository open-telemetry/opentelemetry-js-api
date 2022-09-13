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
import * as context from '../../src/trace/context-utils';
import { NonRecordingSpan } from '../../src/trace/NonRecordingSpan';
import { ROOT_CONTEXT, TraceFlags } from '../../src';

describe('context-utils', () => {
  const spanContext = {
    traceId: 'd4cda95b652f4a1592b449d5929fda1b',
    spanId: '6e0c63257de34c92',
    traceFlags: TraceFlags.NONE,
  };
  const dummySpan = new NonRecordingSpan(spanContext);

  it('should return the current span', () => {
    const ctx = context.setSpan(ROOT_CONTEXT, dummySpan);
    assert.strictEqual(context.getSpan(ctx), dummySpan);
  });

  it('should default to a non-recording span', () => {
    const ctx = ROOT_CONTEXT;
    assert.deepEqual(context.getSpan(ctx), new NonRecordingSpan());
  });
});
