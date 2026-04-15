import { Injectable } from '@angular/core';
import {
  GameMode,
  RulesEngine,
  RulesEngineRegistryService,
} from '@gx/go/domain';

/**
 * Angular adapter that exposes domain rules engines through DI.
 */
@Injectable({ providedIn: 'root' })
export class GameRulesEngineService {
  private readonly registry = new RulesEngineRegistryService();

  get(mode: GameMode): RulesEngine {
    return this.registry.get(mode);
  }
}
