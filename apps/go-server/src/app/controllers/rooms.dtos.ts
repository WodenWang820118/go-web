import {
  CloseRoomRequest,
  CreateRoomRequest,
  GameStartSettings,
  JoinRoomRequest,
} from '@gx/go/contracts';
import { type GoRuleOptions, type TimeControlSettings } from '@gx/go/domain';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsOptional,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRoomDto implements CreateRoomRequest {
  @IsString()
  @Transform(trimString)
  @MinLength(1)
  @MaxLength(24)
  displayName!: string;

  @IsString()
  @IsIn(['go', 'gomoku'])
  mode!: GameStartSettings['mode'];

  @IsInt()
  @Min(1)
  @Max(30)
  boardSize!: GameStartSettings['boardSize'];

  @IsOptional()
  @IsObject()
  goRules?: GoRuleOptions;

  @IsOptional()
  timeControl?: TimeControlSettings | null;
}

export class JoinRoomDto implements JoinRoomRequest {
  @IsString()
  @Transform(trimString)
  @MinLength(1)
  @MaxLength(24)
  displayName!: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @MaxLength(128)
  participantToken?: string;
}

export class CloseRoomDto implements CloseRoomRequest {
  @IsString()
  @Transform(trimString)
  @MaxLength(128)
  participantToken!: string;
}

export class GameStartSettingsDto implements GameStartSettings {
  @IsString()
  mode!: GameStartSettings['mode'];

  @IsInt()
  @Min(1)
  @Max(30)
  boardSize!: GameStartSettings['boardSize'];

  @IsOptional()
  @Min(0)
  @Max(20)
  komi?: number;

  @IsOptional()
  @IsObject()
  goRules?: GoRuleOptions;

  @IsOptional()
  timeControl?: TimeControlSettings | null;
}
