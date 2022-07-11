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

import { NoopContextManager } from '../context/NoopContextManager';
import { Context, ContextManager } from '../context/types';
import {
  getGlobal,
  registerGlobal,
  unregisterGlobal,
} from '../internal/global-utils';
import { DiagAPI } from './diag';

const API_NAME = 'context';
const NOOP_CONTEXT_MANAGER = new NoopContextManager();

/**
 * Singleton object which represents the entry point to the OpenTelemetry Context API
 */
export class ContextAPI {
  private static _instance?: ContextAPI;

  /** Empty private constructor prevents end users from constructing a new instance of the API */
  private constructor() {}

  /** Get the singleton instance of the Context API */
  public static getInstance(): ContextAPI {
    if (!this._instance) {
      this._instance = new ContextAPI();
    }

    return this._instance;
  }

  /**
   * Set the current context manager.
   *
   * @returns true if the context manager was successfully registered, else false
   */
  public setGlobalContextManager(contextManager: ContextManager): boolean {
    return registerGlobal(API_NAME, contextManager, DiagAPI.instance());
  }

  /**
   * Get the currently active context
   */
  public active(): Context {
    return this._getContextManager().active();
  }

  /**
   * Execute a function with an active context
   *
   * @param context context to be active during function execution
   * @param fn function to execute in a context
   * @param thisArg optional receiver to be used for calling fn
   * @param args optional arguments forwarded to fn
   */
  public with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    return this._getContextManager().with(context, fn, thisArg, ...args);
  }

  /**
   * Bind a context to a target function or event emitter
   *
   * @param context context to bind to the event emitter or function. Defaults to the currently active context
   * @param target function or event emitter to bind
   */
  public bind<T>(context: Context, target: T): T {
    return this._getContextManager().bind(context, target);
  }

  /**
   * @experimental this operation should be considered experimental and may make use of experimental APIs.
   * {@link with} should be preferred over `attach`/{@link detach} unless there are strong reasons to use this method.
   * 
   * Make a context active in the current execution. Returns a unique restore
   * key which must be used with detach to restore the previous context.
   * 
   * The context will remain the active context for the entire asynchronous
   * execution unless another context is made active by calling `attach`,
   * {@link with}, or {@link detach}, or if a {@link with} callback ends.
   * 
   * If `attach` is used within a {@link with} callback, the context which was active
   * before {@link with} was called will be made the active context when the callback
   * ends.
   * 
   * Note that every call to this operation should result in a corresponding call to {@link detach} in the reverse order.
   * 
   * @example <caption>Example of using context.attach to make context active in a sibling execution</caption>
   * 
   * ```typescript
   * function func1() {
   *   api.context.attach(ctx1)
   * }
   * 
   * function func2() {
   *   api.context.active() // returns ctx1
   * }
   * 
   * func1() // ctx1 is made active within this execution
   * func2() // ctx1 is still active
   * ```
   * 
   * @example <caption>Example of using context.with to override the context set by context.attach</caption>
   * 
   * ```typescript
   * function func1() {
   *   api.context.attach(ctx1)
   * }
   * 
   * function func2() {
   *   api.context.active() // returns ctx2
   * }
   * 
   * func1()
   * api.context.active() // returns ctx1
   * api.context.with(ctx2, func2) // run func2 with ctx2 active
   * api.context.active() // returns ctx1
   * ```
   * 
   * @example <caption>Example of incorrect use of context.attach inside a context.with callback. This is incorrect because attach is called within a with callback, but there is no corresponding detach within the same callback.</caption>
   * 
   * ```typescript
   * function foo() {
   *   api.context.active()     // returns ctx1
   *   api.context.attach(ctx2) // make ctx2 active
   *   api.context.active()     // returns ctx2
   * }
   * 
   * api.context.active() // returns root context
   * api.context.with(ctx1, foo)
   * api.context.active() // returns root context
   * ```
   * 
   * @param context context to make active in the current execution
   * @returns a restore key
   */
  public attach(context: Context): symbol {
    return this._getContextManager().attach(context);
  }

  /**
   * @experimental this operation should be considered experimental and may make use of experimental APIs.
   * {@link with} should be preferred over {@link attach}/`detach` unless there are strong reasons to use this method.
   *
   * Restore the context which was active when attach was called using the restore
   * token returned by attach.
   *
   * @param token the restore token returned by attach
   */
  public detach(token: symbol): void {
    return this._getContextManager().detach(token);
  }

  private _getContextManager(): ContextManager {
    return getGlobal(API_NAME) || NOOP_CONTEXT_MANAGER;
  }

  /** Disable and remove the global context manager */
  public disable() {
    this._getContextManager().disable();
    unregisterGlobal(API_NAME, DiagAPI.instance());
  }
}
