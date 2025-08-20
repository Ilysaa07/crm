'use client'

import React, { useMemo, useState } from 'react'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

// Minimal default emoji set; can be extended or replaced with a full picker later
const DEFAULT_EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🥳','😭','😅','🙏','👍','👎','👏','🙌','💪','🔥','✨','❤️','💙','💚','💛','💜','🧡','🤍','🤎','⭐','🌟','☀️','🌈','⚡','🎉','🎊','🎁','🍕','🍔','🍟','🍰','🍩','☕','🍵','🍺','⚽','🏀','🎮','🎵','🚀','✈️','🏝️',
  '😐','😑','😒','😓','😔','😕','😖','😗','😘','😙','😚','😛','😜','😝','😞','😟','😠','😡','😢','😣','😤','😥','😦','😧','😨','😩','😪','😫','😬','😭','😮','😯','😰','😱','😲','😳','😴','😵','😶','😷','😸','😹','😺','😻','😼','😽','😾','😿',
  '🙀','🙁','🙂','🙃','🙄','🙅','🙆','🙇','🙈','🙉','🙊','🙋','🙌','🙍','🙎','🙏','🙐','🙑','🙒','🙓','🙔','🙕','🙖','🙗','🙘','🙙','🙚','🙛','🙜','🙝','🙞','🙟','🙠','🙡','🙢','🙣','🙤','🙥','🙦','🙧','🙨','🙩','🙪','🙫','🙬','🙭','🙮','🙯','🙰','🙱','🙲','🙳','🙴','🙵','🙶','🙷','🙸','🙹','🙺','🙻','🙼','🙽','🙾','🙿',
  '💀','💁','💂','💃','💄','💅','💆','💇','💈','💉','💊','💋','💌','💍','💎','💏','💐','💑','💒','💓','💔','💕','💖','💗','💘','💙','💚','💛','💜','💝','💞','💟','💠','💡','💢','💣','💤','💥','💦','💧','💨','💩','💪','💫','💬','💭','💮','💯','💰','💱','💲','💳','💴','💵','💶','💷','💸','💹','💺','💻','💼','💽','💾','💿'
]

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DEFAULT_EMOJIS
    // naive filter: not meaningful for emoji, but allows simple search by name later
    return DEFAULT_EMOJIS
  }, [query])

  return (
    <div className="w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="p-2 border-b border-gray-100">
        <input
          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Cari emoji..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="p-2 grid grid-cols-8 gap-1 max-h-56 overflow-y-auto">
        {filtered.map((e) => (
          <button key={e} className="text-xl hover:bg-gray-100 rounded" onClick={() => onSelect(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}


