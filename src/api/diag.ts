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

import {
  DiagLogger,
  DiagLogFunction,
  createNoopDiagLogger,
  diagLoggerFunctions,
  FilteredDiagLogger,
} from '../diag/logger';
import { DiagLogLevel, createLogLevelDiagLogger } from '../diag/logLevel';
import {
  getGlobal,
  registerGlobal,
  unregisterGlobal,
} from '../internal/global-utils';

/**
 * Singleton object which represents the entry point to the OpenTelemetry internal
 * diagnostic API
 */
export class DiagAPI implements DiagLogger {
  private static _instance?: DiagAPI;

  /** Get the singleton instance of the DiagAPI API */
  public static instance(): DiagAPI {
    if (!this._instance) {
      this._instance = new DiagAPI();
    }

    return this._instance;
  }

  /**
   * Private internal constructor
   * @private
   */
  private constructor() {
    const _noopLogger = createNoopDiagLogger();

    function _logProxy(funcName: keyof DiagLogger): DiagLogFunction {
      return function () {
        const orgArguments = arguments as unknown;
        const theLogger = self.getLogger();
        const theFunc = theLogger[funcName];
        if (typeof theFunc === 'function') {
          return theFunc.apply(
            theLogger,
            orgArguments as Parameters<DiagLogFunction>
          );
        }
      };
    }

    // Using self local variable for minification purposes as 'this' cannot be minified
    const self = this;

    // DiagAPI specific functions

    self.getLogger = (): FilteredDiagLogger => {
      return getGlobal('diag') || _noopLogger;
    };

    self.setLogger = (
      logger: DiagLogger = _noopLogger,
      logLevel: DiagLogLevel = DiagLogLevel.INFO
    ) => {
      logger = logger === self ? self.getLogger().getChild() : logger;
      registerGlobal('diag', createLogLevelDiagLogger(logLevel, logger), true);
    };

    self.disable = () => {
      unregisterGlobal('diag');
    };

    for (let i = 0; i < diagLoggerFunctions.length; i++) {
      const name = diagLoggerFunctions[i];
      self[name] = _logProxy(name);
    }
  }

  /**
   * Return the currently configured logger instance, if no logger has been configured
   * it will return itself so any log level filtering will still be applied in this case.
   */
  public getLogger!: () => FilteredDiagLogger;

  /**
   * Set the global DiagLogger and DiagLogLevel
   *
   * @param logger - [Optional] The DiagLogger instance to set as the default logger. If not provided it will set it back as a noop.
   * @param logLevel - [Optional] The DiagLogLevel used to filter logs sent to the logger. If not provided it will default to INFO.
   * @returns The previously registered DiagLogger
   */
  public setLogger!: (logger?: DiagLogger, logLevel?: DiagLogLevel) => void;

  // DiagLogger implementation
  public verbose!: DiagLogFunction;
  public debug!: DiagLogFunction;
  public info!: DiagLogFunction;
  public warn!: DiagLogFunction;
  public error!: DiagLogFunction;

  /**
   * Unregister the global logger and return to Noop
   */
  public disable!: () => void;
}
