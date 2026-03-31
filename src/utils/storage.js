export function saveToLocal({ personId, storyId, personName }) {
  localStorage.setItem('story_state', JSON.stringify({ personId, storyId, personName }))
}

export function getAllLocalStories() {
  try { return JSON.parse(localStorage.getItem('story_list') || '[]') }
  catch { return [] }
}

export function addToStoryList(entry) {
  const list = getAllLocalStories()
  const idx = list.findIndex(s => s.storyId === entry.storyId)
  if (idx >= 0) list[idx] = { ...list[idx], ...entry }
  else list.push(entry)
  localStorage.setItem('story_list', JSON.stringify(list))
}

export function removeFromStoryList(storyId) {
  const list = getAllLocalStories().filter(s => s.storyId !== storyId)
  localStorage.setItem('story_list', JSON.stringify(list))
}

export function updateStoryInList(storyId, updates) {
  const list = getAllLocalStories()
  const entry = list.find(s => s.storyId === storyId)
  if (entry) {
    Object.assign(entry, updates)
    localStorage.setItem('story_list', JSON.stringify(list))
  }
}

export function getShelves() {
  try { return JSON.parse(localStorage.getItem('library_shelves') || '[]') }
  catch { return [] }
}

export function saveShelves(shelves) {
  localStorage.setItem('library_shelves', JSON.stringify(shelves))
}

export function ensureShelves() {
  let shelves = getShelves()
  if (shelves.length === 0) {
    shelves = [{ id: 1, name: 'Family Library' }]
    saveShelves(shelves)
  }
  const stories = getAllLocalStories()
  let changed = false
  stories.forEach(s => {
    if (!s.shelfId) { s.shelfId = shelves[0].id; changed = true }
  })
  if (changed) localStorage.setItem('story_list', JSON.stringify(stories))
  return shelves
}

export function addShelf(name) {
  const shelves = getShelves()
  const maxId = shelves.reduce((max, s) => Math.max(max, s.id), 0)
  const newId = maxId + 1
  shelves.push({ id: newId, name })
  saveShelves(shelves)
  return newId
}

export function renameShelf(shelfId, name) {
  const shelves = getShelves()
  const shelf = shelves.find(s => s.id === shelfId)
  if (shelf) { shelf.name = name; saveShelves(shelves) }
}

export function deleteShelf(shelfId) {
  const shelves = getShelves()
  if (shelves.length <= 1) return null
  const remaining = shelves.filter(s => s.id !== shelfId)
  saveShelves(remaining)
  const stories = getAllLocalStories()
  stories.forEach(s => {
    if (s.shelfId === shelfId) s.shelfId = remaining[0].id
  })
  localStorage.setItem('story_list', JSON.stringify(stories))
  return remaining[0].id
}
