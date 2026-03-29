import { useState, useCallback } from 'react'
import { api } from './utils/api'
import { saveToLocal, addToStoryList, ensureShelves, getAllLocalStories } from './utils/storage'
import Particles from './components/Particles'
import WelcomeScreen from './components/WelcomeScreen'
import ChatScreen from './components/ChatScreen'
import ReaderScreen from './components/ReaderScreen'
import ComposeScreen from './components/ComposeScreen'

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [previousScreen, setPreviousScreen] = useState(null)
  const [chatProps, setChatProps] = useState(null)
  const [readerProps, setReaderProps] = useState(null)
  const [composeProps, setComposeProps] = useState(null)

  const goHome = useCallback(() => {
    setScreen('welcome')
    setPreviousScreen(null)
    setChatProps(null)
    setReaderProps(null)
    setComposeProps(null)
  }, [])

  // Go back from reader — returns to wherever the user came from
  const goBackFromReader = useCallback(() => {
    if (previousScreen === 'chat' && chatProps) {
      setScreen('chat')
    } else if (previousScreen === 'compose' && composeProps) {
      setScreen('compose')
    } else {
      goHome()
    }
    setReaderProps(null)
    setPreviousScreen(null)
  }, [previousScreen, chatProps, composeProps, goHome])

  const handleStartGuided = useCallback(async (name) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    saveToLocal({ personId, storyId, personName: name })
    addToStoryList({ personId, storyId, personName: name })

    setChatProps({ personName: name, storyId, initialChapter: 0 })
    setScreen('chat')
  }, [])

  const handleStartFreeform = useCallback(async (name) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    addToStoryList({ personId, storyId, personName: name, type: 'freeform', storyTitle: null })

    setChatProps({ personName: name, storyId, freeform: true })
    setScreen('chat')
  }, [])

  const handleContinue = useCallback(async (personId, storyId) => {
    const stories = getAllLocalStories()
    const entry = stories.find(s => s.personId === personId)
    const personName = entry?.personName || 'You'
    const isFreeform = entry?.type === 'freeform'

    setChatProps({ personName, storyId, initialChapter: 0, freeform: isFreeform })
    setScreen('chat')
  }, [])

  const handleOpenCompose = useCallback((personId, storyId, personName) => {
    // Freeform stories now use conversational chat
    setChatProps({ personName, storyId, freeform: true })
    setScreen('chat')
  }, [])

  const handleOpenReader = useCallback((personId, storyId, personName, isFreeform) => {
    // Remember where we came from so we can go back
    setPreviousScreen(screen === 'reader' ? previousScreen : screen)
    setReaderProps({ personId, storyId, personName, isFreeform })
    setScreen('reader')
  }, [screen, previousScreen])

  return (
    <>
      <Particles />

      {screen === 'welcome' && (
        <WelcomeScreen
          onStartGuided={handleStartGuided}
          onStartFreeform={handleStartFreeform}
          onContinue={handleContinue}
          onOpenCompose={handleOpenCompose}
          onOpenReader={handleOpenReader}
        />
      )}

      {screen === 'chat' && chatProps && (
        <ChatScreen
          {...chatProps}
          onGoHome={goHome}
          onOpenReader={handleOpenReader}
        />
      )}

      {screen === 'reader' && readerProps && (
        <ReaderScreen
          {...readerProps}
          onGoHome={goBackFromReader}
        />
      )}

      {screen === 'compose' && composeProps && (
        <ComposeScreen
          {...composeProps}
          onGoHome={goHome}
          onOpenReader={handleOpenReader}
        />
      )}
    </>
  )
}
