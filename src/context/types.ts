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

export interface Context {
  /**
   * Get a value from the context.
   *
   * @param key key which identifies a context value
   */
  getValue(key: symbol): unknown;

  /**
   * Create a new context which inherits from this context and has
   * the given key set to the given value.
   *
   * @param key context key for which to set the value
   * @param value value to set for the given key
   */
  setValue(key: symbol, value: unknown): Context;

  /**
   * Return a new context which inherits from this context but does
   * not contain a value for the given key.
   *
   * @param key context key for which to clear a value
   */
  deleteValue(key: symbol): Context;
}

export interface ContextManager {
  /**
   * Get the current active context
   */
  active(): Context;

  /**
   * Run the fn callback with object set as the current active context
   * @param context Any object to set as the current active context
   * @param fn A callback to be immediately run within a specific context
   * @param thisArg optional receiver to be used for calling fn
   * @param args optional arguments forwarded to fn
   */
  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F>;

  /**
   * Bind an object as the current context (or a specific one)
   * @param [context] Optionally specify the context which you want to assign
   * @param target Any object to which a context need to be set
   */
  bind<T>(context: Context, target: T): T;

  /**
   * @experimental this operation should be considered experimental and may make use of experimental APIs.
   * 
   * Make a context active in the current execution.
   * For more info, see {@Link ContextAPI.attach}.
   * 
   * @param context context to make active in the current execution
   * @returns a restore key
   */
  attach(context: Context): symbol;

  /**
   * @experimental this operation should be considered experimental and may make use of experimental APIs.
   *
   * Restore the context which was active when attach was called using the restore
   * token returned by attach.
   * For more info, see {@Link ContextAPI.detach}.
   *
   * @param token the restore token returned by attach
   */
  detach(token: symbol): void;

  /**
   * Enable context management
   */
  enable(): this;

  /**
   * Disable context management
   */
  disable(): this;
}
