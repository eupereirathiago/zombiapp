import React, { useState, useMemo } from 'react';
import {
  GameItem,
  InventorySlots,
  SlotKey,
  ItemCategory,
  ZombicideEdition,
} from '../types/game';
import { ITEMS_DATABASE, EDITION_LABELS } from '../data/zombicideCatalog';
import { CardArtPreview } from './CardArtPreview';
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
  X,
} from 'lucide-react';

interface InventoryPanelProps {
  inventory: InventorySlots;
  actionsLeft: number;
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

const SLOT_LABELS: Record<SlotKey, string> = {
  handLeft: 'Mão Esquerda (Principal)',
  handRight: 'Mão Direita (Secundária)',
  backpack0: 'Mochila · Slot 1',
  backpack1: 'Mochila · Slot 2',
  backpack2: 'Mochila · Slot 3',
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  inventory,
  actionsLeft,
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
  const [editionFilter, setEditionFilter] = useState<ZombicideEdition | 'ALL'>('ALL');
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<SlotKey | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<SlotKey | null>(null);
  const [targetSlotForSearch, setTargetSlotForSearch] = useState<SlotKey | null>(null);

  const availableItemEditions = useMemo(() => {
    const set = new Set<string>();
    ITEMS_DATABASE.forEach((item) => {
      if (item.category !== 'WOUND' && item.edition) {
        set.add(item.edition);
      }
    });
    return ['ALL', ...Array.from(set)] as (ZombicideEdition | 'ALL')[];
  }, []);

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
      const matchesEdition =
        editionFilter === 'ALL' || item.edition === editionFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(q) ||
        (item.card_title_en && item.card_title_en.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesEdition && matchesSearch;
    });
  }, [searchQuery, categoryFilter, editionFilter]);

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
          <div className="flex-1 flex flex-col justify-center py-3 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>SLOT BLOQUEADO POR FERIMENTO</span>
            </div>
            <ul className="text-xs text-red-200/90 space-y-1 pl-4 list-disc">
              <li>Este slot está inutilizado enquanto você estiver ferido.</li>
              <li>
                Para liberar: toque em um <strong>Coração Partido 💔</strong> no topo da ficha ou use uma carta de <strong>Kit Médico</strong>.
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between py-2.5 gap-3">
            <div className="flex items-start gap-3">
              <div className="w-24 shrink-0">
                <CardArtPreview item={item} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.card_title_en && (
                      <span className="block text-[10px] font-mono-tabular uppercase tracking-wider text-red-400 font-bold">
                        {item.card_title_en}
                      </span>
                    )}
                    <h4 className="font-bold text-base text-white leading-snug">
                      {item.name}
                    </h4>
                  </div>
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

                <p className="text-xs text-zinc-400 mt-1 line-clamp-3">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Weapon Combat Telemetry Grid */}
            {item.stats_json.dice > 0 ? (
              <div className="pt-2.5 border-t border-zinc-800/80 grid grid-cols-4 gap-2 text-center font-mono-tabular">
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
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-red-400">
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
                  disabled={actionsLeft <= 0}
                  onClick={() => onRollWeaponAttack(item, isAkimboPaired)}
                  title={
                    actionsLeft <= 0
                      ? 'Sem pontos de ação restantes neste turno'
                      : 'Gastar 1 Ação para Atacar'
                  }
                  className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1 whitespace-nowrap ${
                    actionsLeft <= 0
                      ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 opacity-50 cursor-not-allowed'
                      : 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600/30 cursor-pointer'
                  }`}
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>{actionsLeft <= 0 ? 'Sem PA' : 'Atacar'}</span>
                </button>
              )}

              {(item.id === 'eq_water' ||
                item.id === 'eq_canned_food' ||
                item.id === 'eq_bag_of_rice' ||
                item.id === 'eq_apples' ||
                item.id === 'eq_salted_meat' ||
                item.id === 'eq_cookies' ||
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
          <div className="flex items-center gap-1 p-1 bg-black border border-zinc-800 rounded-lg overflow-x-auto no-scrollbar">
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

        {/* Edition Filter Bar */}
        <div className="mb-4">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Filtrar Armas e Equipamentos por Edição:
          </span>
          <div className="flex items-center gap-1.5 p-1.5 bg-black border border-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
            {availableItemEditions.map((ed) => {
              const count =
                ed === 'ALL'
                  ? ITEMS_DATABASE.filter((i) => i.category !== 'WOUND').length
                  : ITEMS_DATABASE.filter(
                      (i) => i.category !== 'WOUND' && i.edition === ed
                    ).length;
              return (
                <button
                  key={ed}
                  type="button"
                  onClick={() => setEditionFilter(ed)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    editionFilter === ed
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <span>
                    {EDITION_LABELS[ed as ZombicideEdition | 'ALL'] || ed}
                  </span>
                  <span
                    className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded ${
                      editionFilter === ed
                        ? 'bg-black/30 text-white'
                        : 'bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-red-600/60 flex flex-col justify-between transition-colors gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-24 shrink-0">
                  <CardArtPreview item={item} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="block text-[10px] font-mono-tabular text-red-400 font-semibold">
                        {EDITION_LABELS[item.edition as ZombicideEdition] || item.edition}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {CATEGORY_LABELS[item.category]}
                        {item.is_akimbo ? ' · Akimbo' : ''}
                      </span>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {item.name}
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/70 flex items-center justify-between gap-2">
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
                      ? `Equipar em ${SLOT_LABELS[targetSlotForSearch]}`
                      : 'Adicionar ao Inventário'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Escolha de Equipamento ao clicar em um Slot Vazio */}
      {targetSlotForSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0A0A0C] border border-red-600/70 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-red-950/60 via-zinc-950 to-black flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-red-400 font-bold block">
                  ESCOLHER EQUIPAMENTO PARA O SLOT
                </span>
                <h3 className="text-base sm:text-xl font-bold text-white font-display">
                  {SLOT_LABELS[targetSlotForSearch]}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setTargetSlotForSearch(null)}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar seleção"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters & Search Bar */}
            <div className="p-4 sm:px-6 border-b border-zinc-800/90 bg-zinc-950/70 space-y-3 shrink-0">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar carta pelo nome (ex: Pistola, Katana, Pé de Cabra, Escopeta, Água)..."
                  className="w-full pl-10 pr-16 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
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

              {/* Category + Edition Filter Strips */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-black border border-zinc-800 rounded-lg overflow-x-auto no-scrollbar">
                  {(
                    [
                      'ALL',
                      'MELEE',
                      'RANGED',
                      'SPECIAL',
                      'CONSUMABLE',
                      'PROTECTION',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-red-600 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 p-1 bg-black border border-zinc-800 rounded-lg overflow-x-auto no-scrollbar">
                  {availableItemEditions.map((ed) => (
                    <button
                      key={ed}
                      type="button"
                      onClick={() => setEditionFilter(ed)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        editionFilter === ed
                          ? 'bg-red-600 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {EDITION_LABELS[ed as ZombicideEdition | 'ALL'] || ed}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Cards Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {filteredCatalog.length === 0 ? (
                <div className="py-12 text-center text-xs sm:text-sm text-zinc-400">
                  Nenhuma carta encontrada para este filtro.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onEquipItem(item, targetSlotForSearch);
                        setTargetSlotForSearch(null);
                      }}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500 flex flex-col justify-between transition-all gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-20 shrink-0">
                          <CardArtPreview item={item} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] font-mono-tabular text-red-400 font-semibold">
                            {EDITION_LABELS[item.edition as ZombicideEdition] ||
                              item.edition}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {CATEGORY_LABELS[item.category]}
                            {item.is_akimbo ? ' · Akimbo' : ''}
                          </span>
                          <h4 className="text-sm font-bold text-white leading-snug group-hover:text-red-400 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEquipItem(item, targetSlotForSearch);
                          setTargetSlotForSearch(null);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Equipar neste Slot</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
