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
  const [chatProps, setChatProps] = useState(null)
  const [readerProps, setReaderProps] = useState(null)
  const [composeProps, setComposeProps] = useState(null)

  const goHome = useCallback(() => {
    setScreen('welcome')
    setChatProps(null)
    setReaderProps(null)
    setComposeProps(null)
  }, [])

  const handleStartGuided = useCallback(async (name, shelfId) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    saveToLocal({ personId, storyId, personName: name })
    addToStoryList({ personId, storyId, personName: name, shelfId })

    setChatProps({ personName: name, storyId, initialChapter: 0 })
    setScreen('chat')
  }, [])

  const handleStartFreeform = useCallback(async (name, shelfId) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    addToStoryList({ personId, storyId, personName: name, type: 'freeform', storyTitle: null, shelfId })

    setComposeProps({ personId, storyId, personName: name })
    setScreen('compose')
  }, [])

  const handleContinue = useCallback(async (personId, storyId) => {
    const stories = getAllLocalStories()
    const entry = stories.find(s => s.personId === personId)
    const personName = entry?.personName || 'You'

    setChatProps({ personName, storyId, initialChapter: 0 })
    setScreen('chat')
  }, [])

  const handleOpenCompose = useCallback((personId, storyId, personName) => {
    setComposeProps({ personId, storyId, personName })
    setScreen('compose')
  }, [])

  const handleOpenReader = useCallback((personId, storyId, personName, isFreeform) => {
    setReaderProps({ personId, storyId, personName, isFreeform })
    setScreen('reader')
  }, [])

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
          onGoHome={goHome}
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
