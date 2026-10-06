import React, { useState } from 'react';
import {
  ITEMS_DATABASE,
  CHARACTERS_CATALOG,
} from '../data/zombicideCatalog';
import { ItemCategory } from '../types/game';
import { CharacterAvatar } from './CharacterAvatar';
import {
  Search,
  Volume2,
  VolumeX,
  DoorOpen,
  Repeat,
  BookOpen,
} from 'lucide-react';

export const CatalogExplorer: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ItemCategory | 'ALL'>('ALL');

  const filteredItems = ITEMS_DATABASE.filter((item) => {
    const matchesCat = category === 'ALL' || item.category === category;
    const matchesQuery =
      search.trim() === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-2">
        <div className="flex items-center gap-2 text-xs text-red-500 font-mono-tabular">
          <BookOpen className="w-4 h-4" />
          <span>BASE DE EQUIPAMENTOS E SOBREVIVENTES</span>
          <span aria-hidden="true">·</span>
          <span>{ITEMS_DATABASE.length} CARTAS REGISTRADAS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
          Catálogo de Cartas Físicas e Sobreviventes
        </h1>
        <p className="text-sm text-zinc-300 max-w-2xl">
          Consulte rapidamente estatísticas de alcance, dados, precisão, dano, regras de barulho, arrombamento de portas e habilidades por nível de perigo.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar carta por nome ou efeito..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0C]/95 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0A0A0C]/95 border border-zinc-800 rounded-xl overflow-x-auto">
            {(
              [
                { id: 'ALL', label: 'Todas' },
                { id: 'MELEE', label: 'Corpo a Corpo' },
                { id: 'RANGED', label: 'À Distância' },
                { id: 'SPECIAL', label: 'Super Armas' },
                { id: 'CONSUMABLE', label: 'Consumíveis' },
                { id: 'PROTECTION', label: 'Proteção' },
                { id: 'WOUND', label: 'Ferimentos' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  category === tab.id
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-mono-tabular">{item.id}</span>
                  <div className="flex items-center gap-2">
                    {item.is_akimbo && (
                      <span className="text-red-500 flex items-center gap-1">
                        <Repeat className="w-3.5 h-3.5" />
                        Akimbo
                      </span>
                    )}
                    {item.noise_on_use ? (
                      <Volume2 className="w-4 h-4 text-red-500" title="Gera Barulho" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-500" title="Silenciosa" />
                    )}
                    {item.can_open_doors && (
                      <DoorOpen className="w-4 h-4 text-red-400" title="Arromba Portas" />
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mt-1 font-display">
                  {item.name}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {item.stats_json.dice > 0 ? (
                <div className="pt-3 border-t border-zinc-800 grid grid-cols-4 gap-2 text-center font-mono-tabular">
                  <div>
                    <span className="block text-[10px] text-zinc-400">Alcance</span>
                    <span className="text-sm font-bold text-white">
                      {item.stats_json.range}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400">Dados</span>
                    <span className="text-sm font-bold text-red-500">
                      {item.stats_json.dice}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400">Acerto</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {item.stats_json.accuracy}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400">Dano</span>
                    <span className="text-sm font-bold text-red-400">
                      {item.stats_json.damage}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Regra Especial:</span>
                  <span className="font-semibold text-red-400">
                    {item.stats_json.specialRule}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Complete Character Skill Reference Table */}
      <div className="p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4 overflow-x-auto">
        <h2 className="text-xl font-bold text-white font-display">
          Mapeamento de Sobreviventes e Habilidades por Nível
        </h2>
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="py-3 px-4 font-semibold">Personagem</th>
              <th className="py-3 px-4 font-semibold text-sky-400">Nível Azul (0 XP)</th>
              <th className="py-3 px-4 font-semibold text-yellow-400">Nível Amarelo (7 XP)</th>
              <th className="py-3 px-4 font-semibold text-orange-400">Nível Laranja (19 XP · Escolha 1)</th>
              <th className="py-3 px-4 font-semibold text-red-500">Nível Vermelho (43 XP · Escolha 1)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {CHARACTERS_CATALOG.map((char) => (
              <tr key={char.id} className="hover:bg-zinc-900/50">
                <td className="py-3.5 px-4 font-bold text-white">
                  <div className="flex items-center gap-3">
                    <CharacterAvatar character={char} variant="circle" size="sm" />
                    <div>
                      <div>{char.name}</div>
                      <div className="text-xs font-normal text-zinc-400">{char.title}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-zinc-200">{char.skills.blue.name}</td>
                <td className="py-3.5 px-4 text-zinc-200">{char.skills.yellow.name}</td>
                <td className="py-3.5 px-4 text-zinc-300">
                  {char.skills.orange.map((s) => s.name).join(' · ')}
                </td>
                <td className="py-3.5 px-4 text-zinc-300">
                  {char.skills.red.map((s) => s.name).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
