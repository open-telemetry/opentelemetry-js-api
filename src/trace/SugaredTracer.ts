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
import type {Context, Span, SpanOptions, Tracer} from '../';
import * as api from '../';
import {SpanStatusCode} from '../';

const defaultOnException = (e: Error, span: Span) => {
  span.recordException(e)
  span.setStatus({
    code: SpanStatusCode.ERROR
  })
};

/**
 * return a new SugaredTracer created from the supplied one
 * @param tracer
 */
export function wrapTracer(tracer: Tracer): SugaredTracer {
  return new SugaredTracer(tracer)
}

class SugaredTracer implements Tracer {
  _tracer: Tracer

  constructor(tracer: Tracer) {
    this._tracer = tracer
    this.startSpan = tracer.startSpan.bind(this._tracer);
    this.startActiveSpan = tracer.startActiveSpan.bind(this._tracer);
  }

  startActiveSpan: Tracer['startActiveSpan'];
  startSpan: Tracer['startSpan'];

  /**
   * Starts a new {@link Span} and calls the given function passing it the
   * created span as first argument.
   * Additionally, the new span gets set in context and this context is activated
   * for the duration of the function call.
   * The span will be closed after the function has executed.
   * If an exception occurs, it is recorded, the status is set to ERROR and the exception is rethrown.
   *
   * @param name The name of the span
   * @param [options] SpanOptions used for span creation
   * @param [context] Context to use to extract parent
   * @param [onException] function to overwrite default exception behaviour
   * @param fn function called in the context of the span and receives the newly created span as an argument
   * @returns return value of fn
   * @example
   *     const something = tracer.withActiveSpan('op', span => {
   *      // do some work
   *     });
   * @example
   *     const something = await tracer.withActiveSpan('op', span => {
   *      // do some async work
   *     });
   */
  withActiveSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    fn: F,
  ): ReturnType<F>
  withActiveSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions,
    fn: F,
  ): ReturnType<F>
  withActiveSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions | F,
    context: Context | F,
    fn: F,
  ): ReturnType<F>
  withActiveSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions,
    context: Context,
    onException: (span: Span) => void,
    fn: F,
  ): ReturnType<F>
  withActiveSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    arg2: SpanOptions | F,
    arg3?: Context | F,
    arg4?: (span: Span) => void | F,
    arg5?: F,
  ): ReturnType<F> {
    const {opts, ctx, onException, fn} = massageParams(arg2, arg3, arg4, arg5)

    return this._tracer.startActiveSpan(name, opts, ctx,
      (span: Span) => handleFn(span, onException, fn)) as ReturnType<F>
  }

  /**
   * Starts a new {@link Span} and ends it after execution of fn without setting it on context.
   * The span will be closed after the function has executed.
   * If an exception occurs, it is recorded, the status is et to ERROR and rethrown.
   *
   * This method do NOT modify the current Context.
   *
   * @param name The name of the span
   * @param [options] SpanOptions used for span creation
   * @param [context] Context to use to extract parent
   * @param [onException] function to overwrite default exception behaviour
   * @returns Span The newly created span
   * @example
   *     const something = tracer.withSpan('op', span => {
   *      // do some work
   *     });
   * @example
   *     const something = await tracer.withSpan('op', span => {
   *      // do some async work
   *     });
   */
  withSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    fn: F,
  ): ReturnType<F>
  withSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions,
    fn: F,
  ): ReturnType<F>
  withSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions,
    context: Context,
    fn: F,
  ): ReturnType<F>
  withSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions,
    context: Context,
    fn: F,
  ): ReturnType<F>
  withSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    options: SpanOptions,
    context: Context,
    onException: (span: Span) => void,
    fn: F,
  ): ReturnType<F>
  withSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    arg2: SpanOptions | F,
    arg3?: Context | F,
    arg4?: (span: Span) => void | F,
    arg5?: F,
  ): ReturnType<F> {
    const {opts, ctx, onException, fn} = massageParams(arg2, arg3, arg4, arg5)

    const span = this._tracer.startSpan(name, opts, ctx)
    return handleFn(span, onException, fn) as ReturnType<F>
  }
}

/**
 * Massages parameters of withSpan and withActiveSpan to allow signature overwrites
 * @param arg
 * @param arg2
 * @param arg3
 * @param arg4
 */
function massageParams<F extends (span: Span) => ReturnType<F>>(arg: SpanOptions | F,
                                                                arg2?: Context | F,
                                                                arg3?: ((e: Error, span: Span) => void) | F,
                                                                arg4?: F) {
  let opts: SpanOptions | undefined;
  let ctx: Context | undefined;
  let onException = defaultOnException
  let fn: F;

  if (arguments.length === 1) {
    fn = arg as F;
  } else if (arguments.length === 2) {
    opts = arg as SpanOptions;
    fn = arg2 as F;
  } else if (arguments.length === 3) {
    opts = arg as SpanOptions;
    ctx = arg2 as Context
    fn = arg3 as F;
  } else {
    opts = arg as SpanOptions;
    ctx = arg2 as Context
    onException = arg3 as (e: Error, span: Span) => void
    fn = arg4 as F;
  }
  opts = opts ?? {};
  ctx = ctx ?? api.context.active();

  return {opts, ctx, onException, fn}
}

/**
 * Executes fn, returns results and runs onException in the case of exception to allow overwriting of error handling
 * @param span
 * @param onException
 * @param fn
 */
function handleFn<F extends (span: Span) => ReturnType<F>>(span: Span, onException: ((e: Error, span: Span) => void), fn: F): ReturnType<F> {
  try {
    const ret = fn(span);
    // if fn is an async function attach a recordException and spanEnd callback to the promise
    if (ret instanceof Promise) {
      return ret
        .catch((e: Error) => {
          onException(e, span)
        })
        .finally(span.end) as ReturnType<F>;
    }
    span.end();
    return ret;
  } catch (e) {
    onException(e, span)
    span.end();
    throw e;
  }
}
