import { useState, useCallback } from 'react'
import { api } from './utils/api'
import { saveToLocal, addToStoryList, ensureShelves, getAllLocalStories } from './utils/storage'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import LanguageSelector from './components/LanguageSelector'
import WelcomeScreen from './components/WelcomeScreen'
import ChatScreen from './components/ChatScreen'
import ReaderScreen from './components/ReaderScreen'

function AppInner() {
  const [screen, setScreen] = useState('welcome')
  const [chatProps, setChatProps] = useState(null)
  const [readerProps, setReaderProps] = useState(null)
  const [muted, setMuted] = useState(false)
  const { language } = useLanguage()

  const goHome = useCallback(() => {
    setScreen('welcome')
    setChatProps(null)
    setReaderProps(null)
  }, [])

  const handleStartGuided = useCallback(async (name, shelfId) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    saveToLocal({ personId, storyId, personName: name })
    addToStoryList({ personId, storyId, personName: name, shelfId, language })

    setChatProps({ personName: name, storyId, initialChapter: 0 })
    setScreen('chat')
  }, [language])

  const handleStartFreeform = useCallback(async (name, shelfId) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    addToStoryList({ personId, storyId, personName: name, type: 'freeform', storyTitle: null, shelfId, language })

    setChatProps({ personName: name, storyId, freeform: true })
    setScreen('chat')
  }, [language])

  const handleContinue = useCallback(async (personId, storyId) => {
    const stories = getAllLocalStories()
    const entry = stories.find(s => s.storyId === storyId) || stories.find(s => s.personId === personId)
    const personName = entry?.personName || 'You'
    const isFreeform = entry?.type === 'freeform'

    setChatProps({ personName, storyId, initialChapter: 0, freeform: isFreeform })
    setScreen('chat')
  }, [])

  const handleOpenReader = useCallback((personId, storyId, personName, isFreeform) => {
    setReaderProps({ personId, storyId, personName, isFreeform })
    setScreen('reader')
  }, [])

  return (
    <>
      <LanguageSelector />

      {screen === 'welcome' && (
        <WelcomeScreen
          onStartGuided={handleStartGuided}
          onStartFreeform={handleStartFreeform}
          onContinue={handleContinue}
          onOpenReader={handleOpenReader}
        />
      )}

      {screen === 'chat' && chatProps && (
        <ChatScreen
          {...chatProps}
          muted={muted}
          onSetMuted={setMuted}
          onGoHome={goHome}
          onOpenReader={handleOpenReader}
        />
      )}

      {screen === 'reader' && readerProps && (
        <ReaderScreen
          {...readerProps}
          onGoHome={goHome}
        />
      )}

    </>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  )
}
