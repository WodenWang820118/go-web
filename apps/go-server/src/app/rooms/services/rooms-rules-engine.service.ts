import {
  GameMode,
  RulesEngine,
  RulesEngineRegistryService,
} from '@gx/go/domain';
import { Injectable } from '@nestjs/common';

/**
 * Nest adapter that exposes domain rules engines through DI.
 */
@Injectable()
export class RoomsRulesEngineService {
  private readonly registry = new RulesEngineRegistryService();

  get(mode: GameMode): RulesEngine {
    return this.registry.get(mode);
  }
}
