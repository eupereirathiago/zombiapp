export type DangerLevel = 'BLUE' | 'YELLOW' | 'ORANGE' | 'RED';

export type ZombicideEdition =
  | '2nd_Edition'
  | 'Classic_S1'
  | 'Prison_Outbreak'
  | 'Rue_Morgue'
  | 'Toxic_City_Mall'
  | 'Angry_Neighbors'
  | 'Black_Plague'
  | 'Wulfsburg'
  | 'Green_Horde'
  | 'Invader'
  | 'Dark_Side'
  | 'Undead_or_Alive';

export type ItemCategory = 'MELEE' | 'RANGED' | 'CONSUMABLE' | 'PROTECTION' | 'WOUND' | 'SPECIAL';

export interface ItemStats {
  range: string; // e.g., "0", "0-1", "1-2", "1-3", "-"
  dice: number;
  accuracy: string; // e.g., "4+", "3+", "5+", "Auto", "-"
  damage: number;
  specialRule?: string;
  secondaryMode?: {
    modeName: string; // e.g., "BLADE (Corpo a Corpo)"
    range: string;
    dice: number;
    accuracy: string;
    damage: number;
    noise_on_use: boolean;
  };
}

export interface GameItem {
  id: string;
  name: string;
  card_title_en?: string;
  image_url?: string;
  category: ItemCategory;
  edition: string;
  is_akimbo: boolean;
  noise_on_use: boolean;
  can_open_doors: boolean;
  door_noise?: boolean;
  stats_json: ItemStats;
  description: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  effectType:
    | 'EXTRA_ACTION'
    | 'FREE_MOVE'
    | 'DOUBLE_ZONES_PER_MOVE'
    | 'FREE_COMBAT'
    | 'FREE_RANGED'
    | 'FREE_SEARCH'
    | 'REROLL_ONCE'
    | 'AMBIDEXTROUS'
    | 'SLIPPERY'
    | 'DICE_BONUS_MELEE'
    | 'DICE_BONUS_RANGED'
    | 'DICE_BONUS_COMBAT'
    | 'ROLL_PLUS_RANGED'
    | 'ROLL_PLUS_MELEE'
    | 'ROLL_PLUS_COMBAT'
    | 'PASSIVE_OTHER';
  isTurnTrackable: boolean; // Shows a per-turn usage checkbox that resets on Pass Turn
  bonusValue?: number;
}

export interface GameCharacter {
  id: string;
  name: string;
  title: string;
  edition: string;
  avatar_url: string;
  full_art_url: string;
  startingEquipmentId?: string;
  skills: {
    blue: SkillDefinition;
    yellow: SkillDefinition;
    orange: SkillDefinition[];
    red: SkillDefinition[];
  };
}

export type SlotKey = 'handLeft' | 'handRight' | 'backpack0' | 'backpack1' | 'backpack2';

export interface InventorySlots {
  handLeft: GameItem | null;
  handRight: GameItem | null;
  backpack: (GameItem | null)[]; // 3 slots (indices 0, 1, 2)
}

export interface SurvivorState {
  id: string;
  session_id: string;
  user_id: string;
  username: string;
  character_id: string;
  xp: number;
  health: number; // Number of wounds (0 to 3; 3 = Eliminated)
  max_health: number;
  actions_left: number;
  max_actions: number;
  moves_left: number;
  zones_per_move: number;
  inventory_json: InventorySlots;
  selected_skills_json: {
    orange: string | null;
    red: string | null;
  };
  skills_used_json: Record<string, boolean>; // skillId -> used this turn
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  password_hash: string; // Simulated Argon2id / Bcrypt hash string
  jwt_token: string;
  created_at: string;
}

export type SessionStatus = 'LOBBY' | 'IN_PROGRESS' | 'FINISHED';

export interface JoinedRoomPlayer {
  user_id: string;
  username: string;
  avatar_url?: string;
  is_host: boolean;
  joined_at: string;
}

export interface GameSession {
  id: string;
  room_code: string;
  room_name: string;
  room_password_hash: string;
  host_user_id: string;
  host_username: string;
  status: SessionStatus;
  round: number;
  first_player_index: number; // Rotates each round (RF02.4)
  turn_order_index: number; // Position within current round's order (0..N-1 = survivors, N = ZOMBIE_PHASE)
  is_zombie_phase: boolean;
  joined_players: JoinedRoomPlayer[];
  survivors: SurvivorState[];
  combat_log: {
    id: string;
    timestamp: string;
    message: string;
    type: 'TURN' | 'XP' | 'LEVEL_UP' | 'WOUND' | 'ITEM' | 'COMBAT';
  }[];
}
