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
        const theLogger = getGlobal('filteredDiagLogger') || _noopLogger;
        const theFunc = theLogger[funcName];
        if (typeof theFunc === 'function') {
          return theFunc.apply(
            theLogger,
            orgArguments as Parameters<DiagLogFunction>
          );
        }
      };
    }

    function getLevel(): DiagLogLevel {
      return getGlobal('diagLogLevel') ?? DiagLogLevel.INFO;
    }

    // Using self local variable for minification purposes as 'this' cannot be minified
    const self = this;

    // DiagAPI specific functions

    self.getLogger = (): DiagLogger => {
      return getGlobal('diagLogger') || _noopLogger;
    };

    self.setLogger = (logger?: DiagLogger): DiagLogger => {
      const previous = getGlobal('diagLogger') || _noopLogger;

      unregisterGlobal('diagLogger');
      unregisterGlobal('filteredDiagLogger');

      const newLogger = logger || _noopLogger;
      registerGlobal('diagLogger', newLogger);
      registerGlobal(
        'filteredDiagLogger',
        createLogLevelDiagLogger(getLevel(), newLogger)
      );

      return previous;
    };

    self.setLogLevel = (maxLogLevel: DiagLogLevel) => {
      const logger = self.getLogger();
      unregisterGlobal('diagLogLevel');
      unregisterGlobal('filteredDiagLogger');
      registerGlobal('diagLogLevel', maxLogLevel);
      registerGlobal(
        'filteredDiagLogger',
        createLogLevelDiagLogger(maxLogLevel, logger)
      );
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
  public getLogger!: () => DiagLogger;

  /**
   * Set the DiagLogger instance
   * @param logger - [Optional] The DiagLogger instance to set as the default logger, if not provided it will set it back as a noop
   * @returns The previously registered DiagLogger
   */
  public setLogger!: (logger?: DiagLogger) => DiagLogger;

  /** Set the default maximum diagnostic logging level */
  public setLogLevel!: (maxLogLevel: DiagLogLevel) => void;

  // DiagLogger implementation
  public verbose!: DiagLogFunction;
  public debug!: DiagLogFunction;
  public info!: DiagLogFunction;
  public warn!: DiagLogFunction;
  public error!: DiagLogFunction;
}
