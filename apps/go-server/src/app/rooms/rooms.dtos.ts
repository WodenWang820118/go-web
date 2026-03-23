import {
  CreateRoomRequest,
  GameStartSettings,
  JoinRoomRequest,
} from '@org/go/contracts';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
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
}
