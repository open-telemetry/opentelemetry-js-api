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

import { DiagLogFunction, DiagLogger, DiagLogLevel } from '../types';
import { createNoopDiagLogger } from './noopLogger';

export function createLogLevelDiagLogger(
  maxLevel: DiagLogLevel,
  logger: DiagLogger
): DiagLogger {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }

  if (!logger) {
    // this shouldn't happen, but return a noop logger to not break the user
    return createNoopDiagLogger();
  }

  function _filterFunc(
    theLogger: DiagLogger,
    funcName: keyof DiagLogger,
    theLevel: DiagLogLevel
  ): DiagLogFunction {
    if (maxLevel >= theLevel) {
      return function () {
        const orgArguments = arguments as unknown;
        const theFunc = theLogger[funcName];
        if (theFunc && typeof theFunc === 'function') {
          return theFunc.apply(
            logger,
            orgArguments as Parameters<DiagLogFunction>
          );
        }
      };
    }
    return function () {};
  }

  return {
    error: _filterFunc(logger, 'error', DiagLogLevel.ERROR),
    warn: _filterFunc(logger, 'warn', DiagLogLevel.WARN),
    info: _filterFunc(logger, 'info', DiagLogLevel.INFO),
    debug: _filterFunc(logger, 'debug', DiagLogLevel.DEBUG),
    verbose: _filterFunc(logger, 'verbose', DiagLogLevel.VERBOSE),
  };
}
