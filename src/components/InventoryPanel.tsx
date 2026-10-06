import React, { useState, useMemo } from 'react';
import {
  GameItem,
  InventorySlots,
  SlotKey,
  ItemCategory,
} from '../types/game';
import { ITEMS_DATABASE } from '../data/zombicideCatalog';
import {
  Search,
  Volume2,
  VolumeX,
  DoorOpen,
  Repeat,
  Trash2,
  ArrowLeftRight,
  Plus,
  Crosshair,
  ShieldAlert,
  Sparkles,
  Dices,
} from 'lucide-react';

interface InventoryPanelProps {
  inventory: InventorySlots;
  hasAmbidextrous: boolean;
  meleeDiceBonus: number;
  rangedDiceBonus: number;
  meleeRollPlus: number;
  rangedRollPlus: number;
  onEquipItem: (item: GameItem, targetSlot?: SlotKey) => void;
  onSwapSlots: (source: SlotKey, target: SlotKey) => void;
  onDiscardSlot: (slot: SlotKey) => void;
  onUseConsumable: (slot: SlotKey, item: GameItem) => void;
  onCombineMolotov: () => void;
  onRollWeaponAttack: (item: GameItem, isDualAkimbo: boolean) => void;
}

const CATEGORY_LABELS: Record<ItemCategory | 'ALL', string> = {
  ALL: 'Todas',
  MELEE: 'Corpo a Corpo',
  RANGED: 'À Distância',
  SPECIAL: 'Especiais',
  CONSUMABLE: 'Suporte',
  PROTECTION: 'Proteção',
  WOUND: 'Ferimento',
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  inventory,
  hasAmbidextrous,
  meleeDiceBonus,
  rangedDiceBonus,
  meleeRollPlus,
  rangedRollPlus,
  onEquipItem,
  onSwapSlots,
  onDiscardSlot,
  onUseConsumable,
  onCombineMolotov,
  onRollWeaponAttack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'ALL'>('ALL');
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<SlotKey | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<SlotKey | null>(null);
  const [targetSlotForSearch, setTargetSlotForSearch] = useState<SlotKey | null>(null);

  const isAkimboPaired = useMemo(() => {
    const left = inventory.handLeft;
    const right = inventory.handRight;
    if (!left || !right) return false;
    if (left.category === 'WOUND' || right.category === 'WOUND') return false;
    const isWeapon =
      left.category === 'MELEE' ||
      left.category === 'RANGED' ||
      left.category === 'SPECIAL';
    if (!isWeapon) return false;
    return left.id === right.id && (left.is_akimbo || hasAmbidextrous);
  }, [inventory.handLeft, inventory.handRight, hasAmbidextrous]);

  const canCraftMolotov = useMemo(() => {
    const allItems = [
      inventory.handLeft,
      inventory.handRight,
      ...inventory.backpack,
    ].filter(Boolean) as GameItem[];
    const hasGas = allItems.some((i) => i.id === 'eq_gasoline');
    const hasBottle = allItems.some((i) => i.id === 'eq_glass_bottle');
    return hasGas && hasBottle;
  }, [inventory]);

  const filteredCatalog = useMemo(() => {
    return ITEMS_DATABASE.filter((item) => {
      if (item.category === 'WOUND') return false;
      const matchesCategory =
        categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, categoryFilter]);

  const handleSlotClick = (slotKey: SlotKey, currentItem: GameItem | null) => {
    if (selectedSourceSlot === null) {
      if (currentItem) {
        setSelectedSourceSlot(slotKey);
      } else {
        setTargetSlotForSearch(slotKey);
      }
      return;
    }

    if (selectedSourceSlot === slotKey) {
      setSelectedSourceSlot(null);
      return;
    }

    const sourceItem = getSlotItem(selectedSourceSlot);
    if (sourceItem?.category === 'WOUND' || currentItem?.category === 'WOUND') {
      setSelectedSourceSlot(null);
      return;
    }

    onSwapSlots(selectedSourceSlot, slotKey);
    setSelectedSourceSlot(null);
  };

  const getSlotItem = (slot: SlotKey): GameItem | null => {
    if (slot === 'handLeft') return inventory.handLeft;
    if (slot === 'handRight') return inventory.handRight;
    if (slot === 'backpack0') return inventory.backpack[0] ?? null;
    if (slot === 'backpack1') return inventory.backpack[1] ?? null;
    if (slot === 'backpack2') return inventory.backpack[2] ?? null;
    return null;
  };

  const handleDragStart = (e: React.DragEvent, slotKey: SlotKey) => {
    const item = getSlotItem(slotKey);
    if (!item || item.category === 'WOUND') {
      e.preventDefault();
      return;
    }
    setDraggedSlot(slotKey);
    e.dataTransfer.setData('text/plain', slotKey);
  };

  const handleDrop = (e: React.DragEvent, targetSlot: SlotKey) => {
    e.preventDefault();
    const sourceSlot = draggedSlot || (e.dataTransfer.getData('text/plain') as SlotKey);
    setDraggedSlot(null);
    if (!sourceSlot || sourceSlot === targetSlot) return;
    const targetItem = getSlotItem(targetSlot);
    if (targetItem?.category === 'WOUND') return;
    onSwapSlots(sourceSlot, targetSlot);
  };

  const renderSlotCard = (
    slotKey: SlotKey,
    label: string,
    item: GameItem | null,
    isHandSlot: boolean
  ) => {
    const isWound = item?.category === 'WOUND';
    const isSelectedForSwap = selectedSourceSlot === slotKey;
    const isTargetForAdd = targetSlotForSearch === slotKey;

    const effectiveDice =
      item && (item.category === 'MELEE' || item.category === 'RANGED' || item.category === 'SPECIAL')
        ? item.stats_json.dice +
          (item.category === 'MELEE' ? meleeDiceBonus : 0) +
          (item.category === 'RANGED' ? rangedDiceBonus : 0)
        : 0;

    return (
      <div
        key={slotKey}
        draggable={!!item && !isWound}
        onDragStart={(e) => handleDragStart(e, slotKey)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, slotKey)}
        className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between min-h-[190px] ${
          isWound
            ? 'bg-red-950/45 border-red-600/80'
            : isSelectedForSwap
            ? 'bg-red-600/15 border-red-500'
            : isTargetForAdd
            ? 'bg-red-950/30 border-red-500'
            : isHandSlot && isAkimboPaired
            ? 'bg-zinc-950 border-red-500/70'
            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
        }`}
      >
        {/* Slot Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{label}</span>
            {item && (
              <>
                <span aria-hidden="true">·</span>
                <span>{CATEGORY_LABELS[item.category]}</span>
              </>
            )}
          </div>
          {isHandSlot && isAkimboPaired && (
            <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" />
              Akimbo Ativo
            </span>
          )}
        </div>

        {/* Slot Body */}
        {!item ? (
          <button
            type="button"
            onClick={() => handleSlotClick(slotKey, null)}
            className="flex-1 flex flex-col items-center justify-center py-6 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <Plus className="w-6 h-6 mb-1.5 opacity-60" />
            <span className="text-xs font-medium">
              {selectedSourceSlot
                ? 'Clique para Mover Aqui'
                : 'Slot Livre · Selecionar Carta'}
            </span>
          </button>
        ) : isWound ? (
          <div className="flex-1 flex flex-col justify-center py-3">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>SLOT BLOQUEADO POR FERIMENTO</span>
            </div>
            <p className="text-xs text-red-200/80 mt-1.5 leading-relaxed">
              {item.description} Use o botão de Cura no painel de Vida ou um Kit Médico para liberar este slot.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between py-2.5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-base text-white leading-snug">
                  {item.name}
                </h4>
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                  {item.noise_on_use ? (
                    <span title="Gera ficha de barulho ao usar" className="text-red-500">
                      <Volume2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span title="Silencioso" className="text-zinc-500">
                      <VolumeX className="w-4 h-4" />
                    </span>
                  )}
                  {item.can_open_doors && (
                    <span
                      title={
                        item.door_noise
                          ? 'Arromba portas com barulho'
                          : 'Arromba portas silenciosamente'
                      }
                      className="text-red-400"
                    >
                      <DoorOpen className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                {item.description}
              </p>
            </div>

            {/* Weapon Combat Telemetry Grid */}
            {item.stats_json.dice > 0 ? (
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 grid grid-cols-4 gap-2 text-center font-mono-tabular">
                <div>
                  <span className="block text-[10px] text-zinc-400">Alcance</span>
                  <span className="text-sm font-semibold text-white">
                    {item.stats_json.range}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400">Dados</span>
                  <span className="text-sm font-semibold text-red-500">
                    {isHandSlot && isAkimboPaired
                      ? effectiveDice * 2
                      : effectiveDice}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400">Acerto</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {item.stats_json.accuracy}
                    {(item.category === 'MELEE' && meleeRollPlus > 0) ||
                    (item.category === 'RANGED' && rangedRollPlus > 0)
                      ? ` (+1)`
                      : ''}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400">Dano</span>
                  <span className="text-sm font-semibold text-red-400">
                    {item.stats_json.damage}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-red-400">
                <span>Efeito Tático:</span>
                <span className="font-semibold">
                  {item.stats_json.specialRule || 'Suporte Passivo'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Slot Actions Footer */}
        {item && !isWound && (
          <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSlotClick(slotKey, item)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isSelectedForSwap
                    ? 'bg-red-600 text-white font-semibold'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isSelectedForSwap ? 'Mover...' : 'Trocar'}</span>
              </button>

              {isHandSlot && item.stats_json.dice > 0 && (
                <button
                  type="button"
                  onClick={() => onRollWeaponAttack(item, isAkimboPaired)}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Atacar</span>
                </button>
              )}

              {(item.id === 'eq_water' ||
                item.id === 'eq_canned_food' ||
                item.id === 'eq_medkit') && (
                <button
                  type="button"
                  onClick={() => onUseConsumable(slotKey, item)}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors whitespace-nowrap"
                >
                  Usar Carta
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDiscardSlot(slotKey)}
              title="Descartar carta"
              className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Molotov Crafting Banner if Gasoline + Glass Bottle are held */}
      {canCraftMolotov && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">
                Combinação Disponível: Cocktail Molotov!
              </h4>
              <p className="text-xs text-zinc-300">
                Você possui Galão de Gasolina + Garrafa de Vidro no inventário. Combine-os gratuitamente!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCombineMolotov}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors whitespace-nowrap"
          >
            Criar Cocktail Molotov
          </button>
        </div>
      )}

      {/* Equipped Hands (2 Slots) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Equipamento em Mãos
            </h3>
            <p className="text-xs text-zinc-400">
              Arraste e solte ou clique em &ldquo;Trocar&rdquo; para alternar cartas entre as Mãos e a Mochila.
            </p>
          </div>
          {selectedSourceSlot && (
            <button
              type="button"
              onClick={() => setSelectedSourceSlot(null)}
              className="text-xs text-red-500 hover:underline"
            >
              Cancelar troca de slot
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSlotCard('handLeft', 'Mão Esquerda (Principal)', inventory.handLeft, true)}
          {renderSlotCard('handRight', 'Mão Direita (Secundária)', inventory.handRight, true)}
        </div>
      </div>

      {/* Backpack Slots (3 Slots) */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3">
          Mochila de Reserva
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderSlotCard('backpack0', 'Mochila · Slot 1', inventory.backpack[0] ?? null, false)}
          {renderSlotCard('backpack1', 'Mochila · Slot 2', inventory.backpack[1] ?? null, false)}
          {renderSlotCard('backpack2', 'Mochila · Slot 3', inventory.backpack[2] ?? null, false)}
        </div>
      </div>

      {/* Physical Card Autocomplete Search & Catalog Integration (RF04.2) */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Busca Rápida de Cartas Físicas
            </h3>
            <p className="text-xs text-zinc-400">
              Comprou uma carta do baralho físico na mesa? Digite o nome abaixo para equipar instantaneamente.
            </p>
          </div>

          {/* Interactive Category Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-black border border-zinc-800 rounded-lg overflow-x-auto">
            {(['ALL', 'MELEE', 'RANGED', 'SPECIAL', 'CONSUMABLE', 'PROTECTION'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              )
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Digite o nome da carta comprada na mesa (ex: Pistola, Pé de Cabra, Katana, Água, Escopeta)..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Filtered Cards Catalog */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-zinc-400">
                      {CATEGORY_LABELS[item.category]}
                      {item.is_akimbo ? ' · Akimbo' : ''}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400 shrink-0">
                    {item.noise_on_use ? (
                      <Volume2 className="w-3.5 h-3.5 text-red-500" title="Barulhento" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-zinc-500" title="Silencioso" />
                    )}
                    {item.can_open_doors && (
                      <DoorOpen className="w-3.5 h-3.5 text-red-400" title="Arromba Portas" />
                    )}
                  </div>
                </div>

                {item.stats_json.dice > 0 ? (
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono-tabular text-zinc-300">
                    <span>Alc: {item.stats_json.range}</span>
                    <span>·</span>
                    <span>Dados: {item.stats_json.dice}</span>
                    <span>·</span>
                    <span>Acerto: {item.stats_json.accuracy}</span>
                    <span>·</span>
                    <span className="text-red-400">Dano: {item.stats_json.damage}</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-red-400">
                    {item.stats_json.specialRule}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onEquipItem(item, targetSlotForSearch || undefined);
                    setTargetSlotForSearch(null);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-red-600 hover:text-white text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>
                    {targetSlotForSearch
                      ? 'Equipar no Slot Selecionado'
                      : 'Adicionar ao Inventário'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
