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
  API_BACKWARDS_COMPATIBILITY_VERSION,
  GLOBAL_DIAG_LOGGER_API_KEY,
  makeGetter,
  _global,
} from './global-utils';

/** Internal simple Noop Diag API that returns a noop logger and does not allow any changes */
function noopDiagApi(): DiagAPI {
  const noopLogger = createNoopDiagLogger();
  return {
    disable: () => {},
    getLogger: () => noopLogger,
    setLogger: () => {},
    ...noopLogger,
  };
}

/**
 * Singleton object which represents the entry point to the OpenTelemetry internal
 * diagnostic API
 */
export class DiagAPI implements DiagLogger {
  /** Get the singleton instance of the DiagAPI API */
  public static instance(): DiagAPI {
    let theInst = null;
    if (_global[GLOBAL_DIAG_LOGGER_API_KEY]) {
      // Looks like a previous instance was set, so try and fetch it
      theInst = _global[GLOBAL_DIAG_LOGGER_API_KEY]?.(
        API_BACKWARDS_COMPATIBILITY_VERSION
      ) as DiagAPI;
    }

    if (!theInst) {
      theInst = new DiagAPI();
      _global[GLOBAL_DIAG_LOGGER_API_KEY] = makeGetter(
        API_BACKWARDS_COMPATIBILITY_VERSION,
        theInst,
        noopDiagApi()
      );
    }

    return theInst;
  }

  /**
   * Private internal constructor
   * @private
   */
  private constructor() {
    const _noopLogger = createNoopDiagLogger();
    let _filteredLogger: FilteredDiagLogger | undefined;

    function _logProxy(funcName: keyof DiagLogger): DiagLogFunction {
      return function () {
        const orgArguments = arguments as unknown;
        const theLogger = _filteredLogger || _noopLogger;
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
      return _filteredLogger || _noopLogger;
    };

    self.setLogger = (
      logger: DiagLogger,
      logLevel: DiagLogLevel = DiagLogLevel.INFO
    ) => {
      // This is required to prevent an endless loop in the case where the diag
      // is used as a child of itself accidentally.
      logger = logger === self ? self.getLogger().getChild() : logger;
      logger = logger ?? _noopLogger;
      _filteredLogger = createLogLevelDiagLogger(logLevel, logger);
    };

    self.disable = () => {
      _filteredLogger = undefined;
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
   * Set the global DiagLogger and DiagLogLevel.
   * If a global diag logger is already set, this will override it.
   *
   * @param logger - [Optional] The DiagLogger instance to set as the default logger.
   * @param logLevel - [Optional] The DiagLogLevel used to filter logs sent to the logger. If not provided it will default to INFO.
   * @returns The previously registered DiagLogger
   */
  public setLogger!: (logger: DiagLogger, logLevel?: DiagLogLevel) => void;

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
